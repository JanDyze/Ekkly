<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { Check, ImagePlus, Loader2, PauseFill, PlayFill, Trash2, UploadSimple } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ToggleSwitch from '../../components/common/ToggleSwitch.vue'
import VideoPlayer from '../../components/videos/VideoPlayer.vue'
import VideoStill from '../../components/videos/VideoStill.vue'
import { useVideoOverview } from '../../composables/useVideoOverview'
import { useVideoBuild } from '../../composables/useVideoBuild'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import { getChurchId } from '../../api/church'
import { deleteImages, uploadAudio, uploadImage } from '../../api/blobService'
import { compressImageToBase64 } from '../../utils/imageUtils'
import { ASPECTS, LOOKS, TRANSITIONS, backgroundsOf, buildVideo } from '../../utils/video/render'
import { FONT_OPTIONS, accentFor, ensureFont, loadImage, stackFor } from '../../utils/video/assets'
import { SOURCE_OPTIONS, SPLIT_LIMIT, SPLIT_MODES, SPLIT_OPTIONS } from '../../utils/video/scenes'
import {
  TRACKS,
  cacheOwnTrack,
  decodeOwnTrack,
  forgetOwnTrack,
  loadOwnTrack,
  renderMusic,
} from '../../utils/video/music'
import { fontsUrl } from '../../../lib/platformDefaults.js'
import { currentTheme } from '../../composables/useBrandTheme'

// How every month's video looks and sounds: the shape, the colours and type,
// how the cards move, what gets announced, the words around them and the
// music. Chosen once and used every month, so the videos read as one series.
//
// Every choice saves the moment it is made, and the player at the top is this
// month's video redrawn with it, so there is nothing to preview separately and
// no Save to forget.

const toast = useToast()
const { settings, saveSettings, thisMonthScenes, announcements, monthName, thisMonth } = useVideoOverview()
const { video, music, volume, preparing } = useVideoBuild(thisMonthScenes, settings)
const { lightLogoUrl, darkLogoUrl } = useAppSettings()

const style = computed(() => settings.value.style)
const musicChoice = computed(() => settings.value.music)

const save = async (section, changes, failure = 'Could not save that change. Please try again.') => {
  try {
    await saveSettings({ [section]: { ...settings.value[section], ...changes } })
  } catch (error) {
    console.error('Could not save the video settings:', error)
    toast.error(failure)
  }
}

const setStyle = (changes) => save('style', changes)
const setMusic = (changes) => save('music', changes)

/* -------------------------------------------------------------- the looks */

// Each look drawn with this month's first announcement, so the choice is made
// on the church's own words rather than on a sample.
const swatchAssets = shallowRef(null)

watch(
  () => [style.value.font, style.value.showLogo, backgroundsOf(style.value)[0], lightLogoUrl.value, darkLogoUrl.value],
  async () => {
    const [stack, light, dark, background] = await Promise.all([
      ensureFont(style.value.font),
      style.value.showLogo ? loadImage(lightLogoUrl.value) : null,
      style.value.showLogo ? loadImage(darkLogoUrl.value) : null,
      loadImage(backgroundsOf(style.value)[0]),
    ])
    swatchAssets.value = { stack, light, dark, background }
  },
  { immediate: true }
)

const sample = computed(() => announcements(thisMonthScenes.value)[0] || thisMonthScenes.value[0] || null)

const swatches = computed(() => {
  const assets = swatchAssets.value
  if (!assets || !sample.value) return LOOKS.map((look) => ({ ...look, video: null }))
  return LOOKS.map((look) => ({
    ...look,
    video: buildVideo({
      scenes: [{ ...sample.value, image: '', seconds: 6 }],
      style: { ...style.value, look: look.key, showProgress: false },
      palette: accentFor(style.value),
      stack: assets.stack,
      assets: { logo: look.key === 'light' ? assets.light : assets.dark, backgrounds: [assets.background] },
    }),
  }))
})

/* ------------------------------------------------------------- the colour */

const churchColour = computed(() => currentTheme().primary)
const ownColour = ref(style.value.accent || churchColour.value)
watch(
  () => style.value.accent,
  (value) => {
    if (value) ownColour.value = value
  }
)
let colourTimer = null
const onColour = (event) => {
  ownColour.value = event.target.value
  clearTimeout(colourTimer)
  colourTimer = setTimeout(() => setStyle({ accent: ownColour.value }), 250)
}

/* ------------------------------------------------------------ typefaces */

// Every face's sample is set in that face, so one stylesheet asks for all of
// them while this screen is open.
onMounted(() => {
  const href = fontsUrl(FONT_OPTIONS.map((f) => f.key).filter((k) => k !== 'church'))
  if (href && !document.querySelector(`link[href="${href}"]`)) {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    document.head.appendChild(link)
  }
})

/* ------------------------------------------------------------ the timing */

const seconds = ref(Number(style.value.seconds) || 6)
watch(
  () => style.value.seconds,
  (value) => (seconds.value = Number(value) || 6)
)
let secondsTimer = null
const onSeconds = () => {
  clearTimeout(secondsTimer)
  secondsTimer = setTimeout(() => setStyle({ seconds: seconds.value }), 300)
}

/* ------------------------------------------------- the background photos */

// The video's own photos. A card with a photo of its own keeps it; every
// other card takes the next of these in turn.
const photos = computed(() => backgroundsOf(style.value))
const photoInput = ref(null)
const uploadingPhoto = ref(false)

const onBackground = async (event) => {
  const picked = [...(event.target.files || [])]
  event.target.value = ''
  if (!picked.length) return
  uploadingPhoto.value = true
  try {
    const added = []
    for (const file of picked.slice(0, 12)) {
      const dataUrl = await compressImageToBase64(file, { maxDim: 1920, maxSize: 900_000 })
      added.push(await uploadImage(dataUrl, 'videos'))
    }
    await setStyle({ backgrounds: [...photos.value, ...added], background: '' })
  } catch (error) {
    console.error('Could not upload the background:', error)
    toast.error('Could not add that photo. Please try another.')
  } finally {
    uploadingPhoto.value = false
  }
}

const removePhoto = (url) =>
  setStyle({ backgrounds: photos.value.filter((p) => p !== url), background: '' })

/* ----------------------------------------------------------- the words */

const words = reactive({ ...settings.value.words })
watch(
  () => settings.value.words,
  (value) => Object.assign(words, value),
  { deep: true }
)
const saveWords = () => save('words', { ...words }, 'Could not save those words. Please try again.')

const outroHint = computed(() => {
  const outro = thisMonthScenes.value.find((s) => s.kind === 'outro')
  return settings.value.words.outroLine ? '' : outro?.body || ''
})

/* ------------------------------------------------------------- the music */

// The church's own song: stored with the church, so it is the same on every
// device. A song chosen before that, in 0.30.0, is only in the browser that
// chose it, and is found there for as long as it is.
const legacyTrack = ref(null)
const ownTrack = computed(() =>
  musicChoice.value.ownUrl ? { name: musicChoice.value.ownName || 'Your own music', shared: true } : legacyTrack.value
)
const trackInput = ref(null)
const addingTrack = ref(false)
const uploadProgress = ref(0)

const MAX_TRACK_BYTES = 25 * 1024 * 1024

onMounted(async () => {
  if (musicChoice.value.ownUrl) return
  const stored = await loadOwnTrack({}, getChurchId())
  legacyTrack.value = stored ? { name: stored.name, shared: false } : null
})

const onTrack = async (event) => {
  const picked = event.target.files?.[0]
  event.target.value = ''
  if (!picked) return
  if (picked.size > MAX_TRACK_BYTES) {
    toast.error('That song is over 25 MB. Please choose a shorter or smaller file.')
    return
  }
  addingTrack.value = true
  uploadProgress.value = 0
  const previous = { ...musicChoice.value }
  try {
    // Decoded before it is stored, so a file the browser cannot play is
    // turned away here rather than failing quietly under every video.
    await decodeOwnTrack({ name: picked.name, blob: picked })
  } catch (error) {
    console.error('Could not read that music:', error)
    toast.error('Could not play that file. Please choose an MP3, M4A or WAV.')
    addingTrack.value = false
    return
  }
  try {
    const url = await uploadAudio(picked, (percent) => (uploadProgress.value = percent))
    await cacheOwnTrack(url, picked)
    await setMusic({ track: 'upload', ownUrl: url, ownName: picked.name, start: 0 })
    // The song it replaces is no longer anyone's, here or in the store.
    if (previous.ownUrl) deleteImages([previous.ownUrl]).catch((e) => console.error('Could not delete the old song:', e))
    forgetOwnTrack(previous.ownUrl ? previous : {}, previous.ownUrl ? '' : getChurchId())
    legacyTrack.value = null
    toast.success('Music added')
  } catch (error) {
    console.error('Could not upload that music:', error)
    toast.error('Could not upload that song. Please try again.')
  } finally {
    addingTrack.value = false
  }
}

const removeTrack = async () => {
  const previous = { ...musicChoice.value }
  try {
    await setMusic({
      track: previous.track === 'upload' ? 'morning' : previous.track,
      ownUrl: '',
      ownName: '',
    })
    if (previous.ownUrl) await deleteImages([previous.ownUrl])
    forgetOwnTrack(previous, getChurchId())
    legacyTrack.value = null
  } catch (error) {
    console.error('Could not remove the music:', error)
    toast.error('Could not remove that music. Please try again.')
  }
}

const volumeLevel = ref(Number(musicChoice.value.volume) || 70)
const startAt = ref(Number(musicChoice.value.start) || 0)
watch(
  () => musicChoice.value,
  (value) => {
    volumeLevel.value = Number(value.volume) || 0
    startAt.value = Number(value.start) || 0
  },
  { deep: true }
)
let musicTimer = null
const onVolume = () => {
  clearTimeout(musicTimer)
  musicTimer = setTimeout(() => setMusic({ volume: volumeLevel.value }), 250)
}
const onStartAt = () => {
  clearTimeout(musicTimer)
  musicTimer = setTimeout(() => setMusic({ start: startAt.value }), 300)
}

// A few seconds of a track on its own, to choose by ear.
const listening = ref('')
let listenContext = null
let listenSource = null

const stopListening = () => {
  try {
    listenSource?.stop()
  } catch {
    // Already finished.
  }
  listenSource = null
  listenContext?.close?.()
  listenContext = null
  listening.value = ''
}

const listen = async (key) => {
  const again = listening.value === key
  stopListening()
  if (again || key === 'none') return
  const Context = window.AudioContext || window.webkitAudioContext
  if (!Context) return
  // Made before anything is awaited, inside the tap, or Safari stays silent.
  const context = new Context()
  listenContext = context
  listening.value = key
  try {
    let file = null
    if (key === 'upload') {
      file = await decodeOwnTrack(await loadOwnTrack(musicChoice.value, getChurchId()))
      if (!file) throw new Error('No track on this device')
    }
    const buffer = await renderMusic({ track: key, seconds: 18, file, start: startAt.value })
    if (listenContext !== context) return
    const source = context.createBufferSource()
    const gain = context.createGain()
    gain.gain.value = Math.max(0.05, volumeLevel.value / 100)
    source.buffer = buffer
    source.connect(gain).connect(context.destination)
    source.onended = () => {
      if (listenSource === source) stopListening()
    }
    listenSource = source
    source.start()
  } catch (error) {
    console.error('Could not play that track:', error)
    toast.error('Could not play that music. Please try again.')
    stopListening()
  }
}

onBeforeUnmount(() => {
  stopListening()
  clearTimeout(colourTimer)
  clearTimeout(secondsTimer)
  clearTimeout(musicTimer)
})

const trackOptions = computed(() => [
  ...TRACKS.filter((t) => t.key !== 'none'),
  ...(ownTrack.value || musicChoice.value.track === 'upload'
    ? [
        {
          key: 'upload',
          label: ownTrack.value?.name || musicChoice.value.ownName || 'Your own music',
          hint: !ownTrack.value
            ? 'Chosen on another device. Add it again to keep it with the church'
            : ownTrack.value.shared
              ? 'Your own music, kept with the church'
              : 'Only on this device. Add it again to keep it with the church',
        },
      ]
    : []),
  TRACKS.find((t) => t.key === 'none'),
])

/* ---------------------------------------------------------------- shared */

const card = 'rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700/80 dark:bg-gray-800'
const heading = 'mb-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400'
const option = (on) => [
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
  on ? 'bg-primary/10 dark:bg-primary-light/15' : 'hover:bg-gray-100 dark:hover:bg-gray-700/60',
]
const optionLabel = (on) => [
  'block truncate text-sm font-semibold',
  on ? 'text-primary dark:text-primary-light' : 'text-gray-900 dark:text-white',
]
const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <AppScreen
    title="Look and sound"
    :subtitle="`Every month’s video · shown with ${monthName(thisMonth)}`"
    :back="{ name: 'VideosHome' }"
    root="/videos"
  >
    <div class="flex flex-col gap-6">
      <VideoPlayer
        :video="video"
        :music="music"
        :volume="volume"
        :preparing="preparing"
        :aspect="style.aspect"
        max-height="46dvh"
      />

      <!-- Shape -->
      <section>
        <h2 :class="heading">Shape</h2>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            v-for="shape in ASPECTS"
            :key="shape.key"
            type="button"
            :aria-pressed="style.aspect === shape.key"
            :class="[
              'flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-colors',
              style.aspect === shape.key
                ? 'border-primary bg-primary/10 dark:border-primary-light dark:bg-primary-light/15'
                : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600',
            ]"
            @click="setStyle({ aspect: shape.key })"
          >
            <span class="flex h-12 items-center justify-center">
              <span
                :class="[
                  'block rounded-md border-2',
                  style.aspect === shape.key ? 'border-primary dark:border-primary-light' : 'border-gray-300 dark:border-gray-600',
                ]"
                :style="{ height: shape.height >= shape.width ? '44px' : `${(44 * shape.height) / shape.width}px`, aspectRatio: `${shape.width} / ${shape.height}` }"
              />
            </span>
            <span>
              <span :class="optionLabel(style.aspect === shape.key)">{{ shape.label }} · {{ shape.ratio }}</span>
              <span class="mt-0.5 block text-xs leading-snug text-gray-500 dark:text-gray-400">{{ shape.hint }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- Look -->
      <section>
        <h2 :class="heading">Look</h2>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="look in swatches"
            :key="look.key"
            type="button"
            :aria-pressed="style.look === look.key"
            :class="[
              'overflow-hidden rounded-2xl border-2 text-left transition-colors',
              style.look === look.key ? 'border-primary dark:border-primary-light' : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600',
            ]"
            @click="setStyle({ look: look.key })"
          >
            <div class="max-h-48 overflow-hidden bg-gray-100 dark:bg-gray-900">
              <VideoStill :video="look.video" :time="2.6" />
            </div>
            <div class="flex items-center gap-2 bg-white px-3 py-2 dark:bg-gray-800">
              <span class="min-w-0 flex-1">
                <span :class="optionLabel(style.look === look.key)">{{ look.label }}</span>
                <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ look.hint }}</span>
              </span>
              <Check v-if="style.look === look.key" class="h-4.5 w-4.5 shrink-0 text-primary dark:text-primary-light" />
            </div>
          </button>
        </div>
      </section>

      <!-- Colour and type -->
      <section>
        <h2 :class="heading">Colour</h2>
        <div :class="[card, 'space-y-1 p-2']">
          <button type="button" :class="option(!style.accent)" @click="setStyle({ accent: '' })">
            <span class="size-7 shrink-0 rounded-full ring-1 ring-black/10" :style="{ background: churchColour }" />
            <span class="min-w-0 flex-1">
              <span :class="optionLabel(!style.accent)">The church’s colour</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">Follows the app if the colour changes</span>
            </span>
            <Check v-if="!style.accent" class="h-4.5 w-4.5 shrink-0 text-primary dark:text-primary-light" />
          </button>
          <label :class="[option(Boolean(style.accent)), 'cursor-pointer']">
            <span class="relative size-7 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10" :style="{ background: ownColour }">
              <input
                type="color"
                :value="ownColour"
                class="absolute inset-0 size-full cursor-pointer opacity-0"
                aria-label="Choose a colour for the videos"
                @input="onColour"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span :class="optionLabel(Boolean(style.accent))">A colour for the videos</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">Tap the circle to choose one</span>
            </span>
            <Check v-if="style.accent" class="h-4.5 w-4.5 shrink-0 text-primary dark:text-primary-light" />
          </label>
        </div>
      </section>

      <section>
        <h2 :class="heading">Typeface</h2>
        <div :class="[card, 'space-y-1 p-2']">
          <button
            v-for="face in FONT_OPTIONS"
            :key="face.key"
            type="button"
            :class="option(style.font === face.key)"
            @click="setStyle({ font: face.key })"
          >
            <span class="min-w-0 flex-1">
              <span :class="optionLabel(style.font === face.key)" :style="{ fontFamily: stackFor(face.key) }">
                {{ face.label }}
              </span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ face.hint }}</span>
            </span>
            <Check v-if="style.font === face.key" class="h-4.5 w-4.5 shrink-0 text-primary dark:text-primary-light" />
          </button>
        </div>
      </section>

      <!-- Movement -->
      <section>
        <h2 :class="heading">Movement</h2>
        <div :class="[card, 'space-y-4']">
          <div>
            <span :class="labelClass">Between cards</span>
            <div class="flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
              <button
                v-for="kind in TRANSITIONS"
                :key="kind.key"
                type="button"
                :class="[
                  'h-9 flex-1 rounded-md px-2.5 text-xs font-medium sm:text-sm',
                  style.transition === kind.key
                    ? 'bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light'
                    : 'text-gray-500 dark:text-gray-400',
                ]"
                @click="setStyle({ transition: kind.key })"
              >
                {{ kind.label }}
              </button>
            </div>
          </div>
          <div>
            <label for="video-seconds" :class="labelClass">
              Each announcement shows for about
              <span class="tabular-nums text-primary dark:text-primary-light">{{ seconds }} seconds</span>
            </label>
            <input
              id="video-seconds"
              v-model.number="seconds"
              type="range"
              min="4"
              max="10"
              step="1"
              class="video-range h-10 w-full"
              @input="onSeconds"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400">Longer lists get a little more time on their own.</p>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-gray-700 dark:text-gray-300">The church’s logo on every card</span>
            <ToggleSwitch
              :model-value="style.showLogo"
              label="The church’s logo on every card"
              @update:model-value="setStyle({ showLogo: $event })"
            />
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-gray-700 dark:text-gray-300">A bar showing how far through it is</span>
            <ToggleSwitch
              :model-value="style.showProgress"
              label="A bar showing how far through it is"
              @update:model-value="setStyle({ showProgress: $event })"
            />
          </div>
        </div>
      </section>

      <!-- Background photos -->
      <section>
        <h2 :class="heading">Background photos</h2>
        <div :class="card">
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Behind the cards, under the look’s colour so the words stay readable. A card with a photo of its own
            keeps it; the rest take these in turn.
          </p>
          <div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            <div v-for="url in photos" :key="url" class="group relative aspect-video overflow-hidden rounded-lg">
              <img :src="url" alt="" class="size-full object-cover" />
              <button
                type="button"
                class="absolute right-1 top-1 flex size-8 items-center justify-center rounded-full bg-black/55 text-white hover:bg-black/75"
                aria-label="Remove this photo"
                @click="removePhoto(url)"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              class="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-xs font-medium text-primary hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60 dark:border-gray-600 dark:text-primary-light"
              :disabled="uploadingPhoto"
              @click="photoInput?.click()"
            >
              <Loader2 v-if="uploadingPhoto" class="h-5 w-5 animate-spin" />
              <ImagePlus v-else class="h-5 w-5" />
              {{ uploadingPhoto ? 'Adding…' : 'Add photos' }}
            </button>
          </div>
          <input ref="photoInput" type="file" accept="image/*" multiple class="hidden" @change="onBackground" />
        </div>
      </section>

      <!-- What gets announced -->
      <section>
        <h2 :class="heading">What it announces</h2>
        <div :class="[card, 'divide-y divide-gray-100 py-1 dark:divide-gray-700']">
          <div v-for="source in SOURCE_OPTIONS" :key="source.key" class="flex items-center gap-3 py-3">
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ source.label }}</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">{{ source.hint }}</span>
            </span>
            <ToggleSwitch
              :model-value="settings.sources[source.key]"
              :label="source.label"
              @update:model-value="save('sources', { [source.key]: $event })"
            />
          </div>
        </div>
      </section>

      <!-- One card or one each -->
      <section>
        <h2 :class="heading">One card, or one each</h2>
        <div :class="[card, 'space-y-4']">
          <div v-for="option in SPLIT_OPTIONS" :key="option.key">
            <span :class="labelClass">{{ option.label }}</span>
            <div class="flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
              <button
                v-for="mode in SPLIT_MODES"
                :key="mode.key"
                type="button"
                :class="[
                  'h-9 flex-1 rounded-md px-2.5 text-xs font-medium sm:text-sm',
                  settings.split[option.key] === mode.key
                    ? 'bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light'
                    : 'text-gray-500 dark:text-gray-400',
                ]"
                @click="save('split', { [option.key]: mode.key })"
              >
                {{ mode.label }}
              </button>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {{
                settings.split[option.key] === 'auto'
                  ? `${option.each} when there are ${SPLIT_LIMIT} or fewer, one card when there are more.`
                  : settings.split[option.key] === 'each'
                    ? `${option.each}, with their picture large.`
                    : 'All on one card.'
              }}
            </p>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">A month can change this on the card itself.</p>
        </div>
      </section>

      <!-- Words -->
      <section>
        <h2 :class="heading">The opening and closing</h2>
        <div :class="[card, 'space-y-4']">
          <div>
            <label for="video-intro" :class="labelClass">Under the month’s name</label>
            <input id="video-intro" v-model="words.introLine" :class="inputClass" maxlength="80" @change="saveWords" />
          </div>
          <div>
            <label for="video-outro-title" :class="labelClass">The last card says</label>
            <input id="video-outro-title" v-model="words.outroTitle" :class="inputClass" maxlength="60" @change="saveWords" />
          </div>
          <div>
            <label for="video-outro-line" :class="labelClass">And under it</label>
            <input
              id="video-outro-line"
              v-model="words.outroLine"
              :class="inputClass"
              :placeholder="outroHint || 'Every Sunday · 9:00 AM'"
              maxlength="100"
              @change="saveWords"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Left empty, it gives the time of the main service.</p>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span class="text-sm text-gray-700 dark:text-gray-300">The church’s link at the very end</span>
            <ToggleSwitch
              :model-value="words.showLink"
              label="The church’s link at the very end"
              @update:model-value="
                (value) => {
                  words.showLink = value
                  saveWords()
                }
              "
            />
          </div>
        </div>
      </section>

      <!-- Music -->
      <section id="music" class="scroll-mt-20">
        <h2 :class="heading">Music</h2>
        <div :class="[card, 'space-y-1 p-2']">
          <div v-for="track in trackOptions" :key="track.key" :class="option(musicChoice.track === track.key)">
            <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" @click="setMusic({ track: track.key })">
              <span class="min-w-0 flex-1">
                <span :class="optionLabel(musicChoice.track === track.key)">{{ track.label }}</span>
                <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ track.hint }}</span>
              </span>
              <Check
                v-if="musicChoice.track === track.key"
                class="h-4.5 w-4.5 shrink-0 text-primary dark:text-primary-light"
              />
            </button>
            <button
              v-if="track.key !== 'none' && (track.key !== 'upload' || ownTrack)"
              type="button"
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              :aria-label="listening === track.key ? `Stop ${track.label}` : `Listen to ${track.label}`"
              @click="listen(track.key)"
            >
              <PauseFill v-if="listening === track.key" class="h-4 w-4" />
              <PlayFill v-else class="ml-0.5 h-4 w-4" />
            </button>
            <button
              v-if="track.key === 'upload' && ownTrack"
              type="button"
              class="flex size-9 shrink-0 items-center justify-center rounded-full text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              aria-label="Remove your own music"
              @click="removeTrack"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            class="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60 dark:text-primary-light dark:hover:bg-primary-light/15"
            :disabled="addingTrack"
            @click="trackInput?.click()"
          >
            <Loader2 v-if="addingTrack" class="h-4 w-4 animate-spin" />
            <UploadSimple v-else class="h-4 w-4" />
            {{
              addingTrack
                ? uploadProgress
                  ? `Uploading ${uploadProgress}%`
                  : 'Checking the file…'
                : ownTrack
                  ? 'Use different music of your own'
                  : 'Use music of your own'
            }}
          </button>
          <input ref="trackInput" type="file" accept="audio/*" class="hidden" @change="onTrack" />
        </div>
        <p class="mt-2 px-0.5 text-xs text-gray-500 dark:text-gray-400">
          Your own music is kept with the church, so every phone and computer plays it. Only use music the church has the right
          to post; Facebook and YouTube mute songs they recognise.
        </p>

        <div v-if="musicChoice.track !== 'none'" :class="[card, 'mt-3 space-y-3']">
          <div>
            <label for="video-volume" :class="labelClass">
              Volume <span class="tabular-nums text-primary dark:text-primary-light">{{ volumeLevel }}%</span>
            </label>
            <input
              id="video-volume"
              v-model.number="volumeLevel"
              type="range"
              min="5"
              max="100"
              step="5"
              class="video-range h-10 w-full"
              @input="onVolume"
            />
          </div>
          <div v-if="musicChoice.track === 'upload'">
            <label for="video-start" :class="labelClass">
              Start the song
              <span class="tabular-nums text-primary dark:text-primary-light">{{ startAt }} seconds</span> in
            </label>
            <input
              id="video-start"
              v-model.number="startAt"
              type="range"
              min="0"
              max="180"
              step="1"
              class="video-range h-10 w-full"
              @input="onStartAt"
            />
          </div>
        </div>
      </section>
    </div>
  </AppScreen>
</template>

<style scoped>
.video-range {
  accent-color: var(--color-primary);
}
</style>
