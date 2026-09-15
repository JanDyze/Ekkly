import { computed, ref, watch } from 'vue'
import { initAuth, useAuth } from './useAuth'
import { useFrontDoorConsent } from './useFrontDoorConsent'
import { isPlatformAdmin, sendFrontDoorSignal } from '../api/platformService'

// What the front door's pages share, now that it is more than one page: the
// home page, Pricing, and Get started.
//
// A visitor builds up two things as they go — the apps they would use and the
// name of their church — and each page picks them up where the last left off:
// "Add to my plan" on the home page is already ticked on Pricing, and the church
// they named in the welcome is already in the form on Get started.
//
// The plan lives for the tab (sessionStorage), so a new visit starts fresh. The
// church's name is kept on the device (localStorage): once someone has said
// which church they are with, every preview on the front door — the tour, How
// it works — shows theirs, this visit and the next.

const PICKS_KEY = 'ekkly.frontDoor.plan'
const CHURCH_KEY = 'ekkly.frontDoor.church'

const storage = (kind) => {
  try {
    return kind === 'local' ? localStorage : sessionStorage
  } catch {
    return null
  }
}

const read = (key, kind = 'session') => {
  try {
    return storage(kind)?.getItem(key) ?? null
  } catch {
    return null
  }
}

const write = (key, value, kind = 'session') => {
  try {
    storage(kind)?.setItem(key, value)
  } catch {
    // A browser that cannot remember starts again next time. That is all.
  }
}

// A sensible first plan: the roll, the calendar and attendance.
const STARTER = ['members', 'events', 'attendance']

const readPicks = () => {
  try {
    const list = JSON.parse(read(PICKS_KEY))
    return Array.isArray(list) ? list.filter((key) => typeof key === 'string') : STARTER
  } catch {
    return STARTER
  }
}

const picks = ref(readPicks())
watch(picks, (list) => write(PICKS_KEY, JSON.stringify(list)))

// A name kept from before this change lived in the tab; it carries over.
const namedChurch = ref(read(CHURCH_KEY, 'local') || read(CHURCH_KEY) || '')
watch(namedChurch, (name) => write(CHURCH_KEY, name.trim(), 'local'), { immediate: true })

// Whether the signed-in person runs the platform, for the console link. Looked
// up once per sign-in, however many pages ask.
const admin = ref(false)
let watchingAdmin = false
const watchAdmin = () => {
  if (watchingAdmin) return
  watchingAdmin = true
  const { user } = useAuth()
  initAuth().then(() => {
    watch(
      () => user.value?.uid,
      async (uid) => {
        admin.value = false
        if (uid) admin.value = await isPlatformAdmin(uid)
      },
      { immediate: true }
    )
  })
}

export function useFrontDoor() {
  const { allowed } = useFrontDoorConsent()
  watchAdmin()

  const hasPick = (key) => picks.value.includes(key)
  const addPick = (key) => {
    if (!hasPick(key)) picks.value = [...picks.value, key]
  }
  const togglePick = (key) => {
    picks.value = hasPick(key) ? picks.value.filter((k) => k !== key) : [...picks.value, key]
  }

  // What the console is told, and only with the visitor's say-so: that someone
  // looked, and that they pressed a call to action. Nothing waits on it.
  const signal = (kind) => {
    if (!allowed.value) return
    // The visitor's own date, so an evening here is not tomorrow in UTC.
    const day = new Date().toLocaleDateString('en-CA')
    sendFrontDoorSignal(kind, { day })
  }

  return {
    picks: computed(() => picks.value),
    hasPick,
    addPick,
    togglePick,
    namedChurch,
    admin: computed(() => admin.value),
    signal,
  }
}

// The apps in a plan and what they come to a month: every core app, and
// whichever of the rest were picked.
export const planFrom = (catalog, picked) => {
  const apps = catalog.filter((app) => app.available && (app.core || picked.includes(app.key)))
  return { apps, total: apps.reduce((sum, app) => sum + (app.price || 0), 0) }
}
