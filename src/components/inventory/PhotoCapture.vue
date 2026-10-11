<script setup>
import { computed, ref } from 'vue'
import { Camera, CheckCircle, ImagePlus, Info, Loader2, Trash } from '../../icons'
import ItemThumb from './ItemThumb.vue'
import { canRemoveBackground, cutOut, preparePhoto, previewOf } from '../../utils/removeBackground'

// Taking an item's picture: the camera opens, the photo comes back, and the
// thing in it is cut out of its background right there on the phone
// (utils/removeBackground.js). Then both are shown side by side, the cut-out
// and the photo as taken, and whichever is picked is the one kept — so a
// cut-out that took the table with it, or lost a guitar's neck, costs a tap
// rather than a retake.
//
// `picture` is the outcome for the form: left undefined, the item keeps the
// picture it has; null, its picture is taken away; `{ canvas, cut }`, this is
// its new picture (encoded and uploaded by the form when it saves). `busy` is
// true while a photo is still being worked on, so the form waits for it.

const props = defineProps({
  // The item as it is now, for the picture it already has. Null when adding.
  item: { type: Object, default: null },
})

const picture = defineModel('picture', { default: undefined })
const busy = defineModel('busy', { type: Boolean, default: false })

const cameraInput = ref(null)
const libraryInput = ref(null)

// 'idle' | 'preparing' | 'cutting' | 'done'
const stage = ref('idle')
const progress = ref(0)
const original = ref(null)
const cut = ref(null)
const cutGood = ref(true)
// Why there is no cut-out, in words for whoever is holding the phone.
const failure = ref('')
const chosen = ref('cut')

const originalUrl = ref('')
const cutUrl = ref('')

const emitChoice = () => {
  if (!original.value) return
  picture.value =
    chosen.value === 'cut' && cut.value ? { canvas: cut.value, cut: true } : { canvas: original.value, cut: false }
}

const choose = (which) => {
  chosen.value = which
  emitChoice()
}

const reasonFor = (error) => {
  const message = String(error?.message || '')
  if (message === 'unsupported') return 'This browser cannot remove backgrounds, so the photo is kept as taken.'
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'The background could not be removed while offline — the tool downloads once, the first time. The photo is kept as taken.'
  }
  if (message === 'timeout') return 'Removing the background took too long on this phone, so the photo is kept as taken.'
  return 'The background could not be removed this time, so the photo is kept as taken.'
}

const take = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return

  busy.value = true
  stage.value = 'preparing'
  failure.value = ''
  cut.value = null
  cutUrl.value = ''
  progress.value = 0
  try {
    original.value = await preparePhoto(file)
    originalUrl.value = previewOf(original.value)
  } catch (error) {
    console.error('Could not read that photo:', error)
    failure.value = 'That file could not be opened as a photo. Please try another.'
    stage.value = original.value ? 'done' : 'idle'
    busy.value = false
    return
  }

  // Kept as taken straight away, so whatever happens next the form has a
  // picture to save.
  chosen.value = 'original'
  emitChoice()

  stage.value = 'cutting'
  try {
    const result = await cutOut(original.value, { onProgress: (p) => (progress.value = p) })
    cut.value = result.canvas
    cutUrl.value = previewOf(result.canvas)
    cutGood.value = result.good
    chosen.value = result.good ? 'cut' : 'original'
    emitChoice()
  } catch (error) {
    console.error('Background removal failed:', error)
    failure.value = reasonFor(error)
  } finally {
    stage.value = 'done'
    busy.value = false
  }
}

const removePhoto = () => {
  original.value = null
  cut.value = null
  originalUrl.value = ''
  cutUrl.value = ''
  failure.value = ''
  stage.value = 'idle'
  picture.value = null
}

const hasCurrent = computed(() => picture.value === undefined && Boolean(props.item?.photo))

const cuttingLine = computed(() =>
  progress.value > 0 && progress.value < 1
    ? `Getting the cut-out ready on this phone… ${Math.round(progress.value * 100)}%`
    : 'Removing the background…'
)

const OPTION =
  'relative flex flex-col overflow-hidden rounded-2xl bg-white text-left ring-2 transition-colors dark:bg-gray-800'
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- The camera, and the photos already on the phone. -->
    <input ref="cameraInput" type="file" accept="image/*" capture="environment" class="sr-only" tabindex="-1" aria-hidden="true" @change="take" />
    <input ref="libraryInput" type="file" accept="image/*" class="sr-only" tabindex="-1" aria-hidden="true" @change="take" />

    <!-- Nothing new yet: the picture it has, or a big invitation to take one. -->
    <template v-if="stage === 'idle'">
      <div v-if="hasCurrent" class="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <ItemThumb :item="item" size="size-20 rounded-xl" large />
        <p class="min-w-0 flex-1 text-sm text-gray-500 dark:text-gray-400">
          {{ item.photoCut ? 'Cut out of its background.' : 'Kept as taken.' }}
        </p>
        <button type="button" class="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" aria-label="Remove photo" @click="removePhoto">
          <Trash class="size-5" />
        </button>
      </div>
      <button
        v-else
        type="button"
        class="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-white text-gray-500 transition-colors hover:border-primary hover:text-primary dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
        @click="cameraInput.click()"
      >
        <Camera class="size-10" />
        <span class="text-base font-semibold">Take a photo</span>
        <span class="px-6 text-center text-xs">The background is taken out on this phone, so the item stands on its own.</span>
      </button>
    </template>

    <!-- Working on it: the photo as taken, and how far along. -->
    <div v-else-if="stage !== 'done'" class="relative overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800" aria-live="polite">
      <img v-if="originalUrl" :src="originalUrl" alt="The photo just taken" class="aspect-[4/3] w-full object-contain opacity-60" />
      <div v-else class="aspect-[4/3] w-full" />
      <div class="absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-3 ring-1 ring-gray-200 dark:bg-gray-900/90 dark:ring-gray-700">
        <p class="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Loader2 class="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
          <span class="truncate">{{ stage === 'preparing' ? 'Opening the photo…' : cuttingLine }}</span>
        </p>
        <div v-if="stage === 'cutting' && progress > 0 && progress < 1" class="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div class="h-full rounded-full bg-primary transition-[width] duration-300 dark:bg-primary-light" :style="{ width: `${Math.round(progress * 100)}%` }" />
        </div>
      </div>
    </div>

    <!-- Done: the cut-out and the photo as taken, side by side; the one
         ringed is the one kept. -->
    <template v-else>
      <div v-if="cutUrl" class="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Which picture to keep">
        <button
          type="button"
          role="radio"
          :aria-checked="chosen === 'cut'"
          :class="[OPTION, chosen === 'cut' ? 'ring-primary dark:ring-primary-light' : 'ring-gray-200 dark:ring-gray-700']"
          @click="choose('cut')"
        >
          <span class="flex aspect-square items-center justify-center bg-gray-100 p-3 dark:bg-gray-700/70">
            <img :src="cutUrl" alt="The item cut out of its background" class="max-h-full max-w-full object-contain" />
          </span>
          <span class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
            <CheckCircle v-if="chosen === 'cut'" class="size-4 text-primary dark:text-primary-light" />
            Cut out
          </span>
        </button>
        <button
          type="button"
          role="radio"
          :aria-checked="chosen === 'original'"
          :class="[OPTION, chosen === 'original' ? 'ring-primary dark:ring-primary-light' : 'ring-gray-200 dark:ring-gray-700']"
          @click="choose('original')"
        >
          <span class="flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-700/70">
            <img :src="originalUrl" alt="The photo as taken" class="size-full object-cover" />
          </span>
          <span class="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
            <CheckCircle v-if="chosen === 'original'" class="size-4 text-primary dark:text-primary-light" />
            As taken
          </span>
        </button>
      </div>
      <img v-else-if="originalUrl" :src="originalUrl" alt="The photo as taken" class="aspect-[4/3] w-full rounded-2xl bg-gray-100 object-contain dark:bg-gray-800" />

      <p v-if="cutUrl && !cutGood" class="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
        <Info class="mt-0.5 size-4 shrink-0" />
        There is no one clear thing in this photo, so it is kept as taken. Pick the cut-out if it looks right.
      </p>
      <p v-else-if="cutUrl" class="px-1 text-xs text-gray-500 dark:text-gray-400">
        If the cut-out lost part of it, keep the photo as taken instead.
      </p>
    </template>

    <p v-if="failure" class="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200" role="status">
      <Info class="mt-0.5 size-4 shrink-0" />
      {{ failure }}
    </p>

    <div class="flex flex-wrap gap-2">
      <button
        v-if="stage !== 'idle' || hasCurrent"
        type="button"
        :disabled="busy"
        class="flex h-10 items-center gap-2 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
        @click="cameraInput.click()"
      >
        <Camera class="size-4" />
        {{ hasCurrent ? 'Take a new photo' : 'Take it again' }}
      </button>
      <button
        type="button"
        :disabled="busy"
        class="flex h-10 items-center gap-2 rounded-lg bg-gray-100 px-3 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        @click="libraryInput.click()"
      >
        <ImagePlus class="size-4" />
        Choose from photos
      </button>
      <button
        v-if="stage === 'done'"
        type="button"
        :disabled="busy"
        class="flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/20"
        @click="removePhoto"
      >
        <Trash class="size-4" />
        No photo
      </button>
    </div>
    <p v-if="!canRemoveBackground()" class="px-1 text-xs text-gray-500 dark:text-gray-400">
      This browser cannot remove backgrounds; photos are kept as taken.
    </p>
  </div>
</template>
