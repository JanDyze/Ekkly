import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { clearUserPref, saveUserPrefs, subscribeToUserPrefs } from '../api/userPrefsService'
import { useAppSettings } from './useAppSettings'
import { useAuth } from './useAuth'

/**
 * The sky over the church, for the home's picture (HomeScene): the time of
 * day there — dawn, day, dusk or night, from that day's sunrise and sunset —
 * and its weather, from Open-Meteo (free, no key). The scene draws them as a
 * `data-sky` and a `data-weather` on its wrapper.
 *
 * Over the church's own town, not wherever the person is: everyone sees the
 * sky over their church, and nobody is asked for their location. The town
 * comes from the church's map link where it carries coordinates, otherwise
 * from its address, read a part at a time until one is a place Open-Meteo
 * knows; and Manila when neither says.
 *
 * On unless the person turns "Live sky" off in Preferences; off, the picture
 * follows the theme as it always did (day when light, night when dark). Kept
 * against the account like their other preferences (userPrefs).
 */

/* ------------------------------------------------------------ the switch */

const PREF_KEY = 'liveSky'
const cacheKey = (uid) => `ekkly:liveSky:${uid}`

const enabled = ref(true)
const uid = ref(null)
let started = false
let unsubscribe = null

/** Starts following the signed-in account's choice, once per session. */
export const initLiveSky = () => {
  if (started) return
  started = true
  const { user } = useAuth()
  watch(
    () => user.value?.uid || null,
    (now) => {
      unsubscribe?.()
      unsubscribe = null
      uid.value = now
      if (!now) {
        enabled.value = true
        return
      }
      try {
        enabled.value = localStorage.getItem(cacheKey(now)) !== 'off'
      } catch {
        enabled.value = true
      }
      unsubscribe = subscribeToUserPrefs(now, (prefs) => {
        if (!prefs) return
        // Stored only when turned off, so "on" is the default for everyone.
        enabled.value = prefs[PREF_KEY] !== false
        try {
          if (enabled.value) localStorage.removeItem(cacheKey(now))
          else localStorage.setItem(cacheKey(now), 'off')
        } catch {
          // Only the head start is lost.
        }
      })
    },
    { immediate: true }
  )
}

/* ------------------------------------------------------------- the place */

const MANILA = { latitude: 14.5995, longitude: 120.9842 }

/** Coordinates in a Google Maps link: "@14.6,121.0" or "q=14.6,121.0". */
const fromMapUrl = (url) => {
  const match = String(url || '').match(/(?:@|[?&](?:q|ll|query)=)(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/)
  return match ? { latitude: Number(match[1]), longitude: Number(match[2]) } : null
}

const PLACE_STORE = 'ekkly:sky-place'

/** The church's town, found once per address and remembered on the device. */
const placeOf = async (church) => {
  const fromLink = fromMapUrl(church?.mapUrl)
  if (fromLink) return fromLink

  const address = String(church?.address || '').trim()
  if (!address) return MANILA
  try {
    const kept = JSON.parse(localStorage.getItem(PLACE_STORE) || 'null')
    if (kept?.address === address) return kept.place
  } catch {
    // Look it up again.
  }

  // Most specific first, skipping the house and street: "123 Rizal St,
  // Antipolo, Rizal" tries Antipolo, then Rizal.
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean)
  const tries = parts.length > 1 ? parts.slice(1) : parts
  for (const name of tries) {
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&countryCode=PH`
      )
      const hit = (await res.json())?.results?.[0]
      if (hit) {
        const place = { latitude: hit.latitude, longitude: hit.longitude }
        try {
          localStorage.setItem(PLACE_STORE, JSON.stringify({ address, place }))
        } catch {
          // Found again next time.
        }
        return place
      }
    } catch {
      // Offline or refused: the next part, then Manila.
    }
  }
  return MANILA
}

/* ----------------------------------------------------------- the weather */

// Open-Meteo's WMO codes, reduced to what the picture can draw.
const weatherOf = (code) => {
  if (code === 45 || code === 48) return 'fog'
  if (code >= 95) return 'storm'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'cloudy'
  if (code === 3 || code === 2) return 'cloudy'
  return 'clear'
}

const SKY_STORE = 'ekkly:sky'
const FRESH_MS = 30 * 60 * 1000

const report = ref(null)
let fetching = null

const fetchSky = async (church) => {
  try {
    const kept = JSON.parse(sessionStorage.getItem(SKY_STORE) || 'null')
    if (kept && Date.now() - kept.at < FRESH_MS) {
      report.value = kept
      return
    }
  } catch {
    // Fetch it.
  }
  if (fetching) return fetching
  fetching = (async () => {
    try {
      const { latitude, longitude } = await placeOf(church)
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
          '&current=weather_code&daily=sunrise,sunset&timezone=auto&forecast_days=1&timeformat=unixtime'
      )
      const data = await res.json()
      const next = {
        at: Date.now(),
        weather: weatherOf(Number(data?.current?.weather_code)),
        sunrise: Number(data?.daily?.sunrise?.[0]) * 1000 || null,
        sunset: Number(data?.daily?.sunset?.[0]) * 1000 || null,
      }
      report.value = next
      try {
        sessionStorage.setItem(SKY_STORE, JSON.stringify(next))
      } catch {
        // Fetched again on the next home.
      }
    } catch {
      // No weather: the time of day still works, from the clock alone.
    } finally {
      fetching = null
    }
  })()
  return fetching
}

/* ------------------------------------------------------------- the time */

const HOUR = 60 * 60 * 1000
// Dawn and dusk last about three quarters of an hour either side of the sun
// crossing the horizon; without a report, 6 and 6.
const phaseAt = (now, sunrise, sunset) => {
  const day = new Date(now)
  const rise = sunrise || new Date(day).setHours(6, 0, 0, 0)
  const set = sunset || new Date(day).setHours(18, 0, 0, 0)
  const edge = 0.75 * HOUR
  if (now >= rise - edge && now < rise + edge) return 'dawn'
  if (now >= rise + edge && now < set - edge) return 'day'
  if (now >= set - edge && now < set + edge) return 'dusk'
  return 'night'
}

export function useLiveSky() {
  const { church } = useAppSettings()
  const now = ref(Date.now())

  // The time moves the sky on its own; a tick every five minutes is plenty.
  const timer = setInterval(() => {
    now.value = Date.now()
    if (enabled.value) fetchSky(church.value)
  }, 5 * 60 * 1000)
  onBeforeUnmount(() => clearInterval(timer))

  watch(
    [enabled, () => church.value?.address, () => church.value?.mapUrl],
    ([on]) => {
      if (on) fetchSky(church.value)
    },
    { immediate: true }
  )

  /** What the scene's wrapper carries: nothing when live sky is off. */
  const sky = computed(() => {
    if (!enabled.value) return {}
    return {
      'data-sky': phaseAt(now.value, report.value?.sunrise, report.value?.sunset),
      'data-weather': report.value?.weather || 'clear',
    }
  })

  /** Turns live sky on or off for this person, everywhere they sign in. */
  const setLiveSky = async (value) => {
    enabled.value = Boolean(value)
    if (!uid.value) return
    try {
      if (enabled.value) localStorage.removeItem(cacheKey(uid.value))
      else localStorage.setItem(cacheKey(uid.value), 'off')
    } catch {
      // Firestore still has it.
    }
    if (enabled.value) await clearUserPref(uid.value, PREF_KEY)
    else await saveUserPrefs(uid.value, { [PREF_KEY]: false })
  }

  return { liveSky: enabled, sky, setLiveSky }
}
