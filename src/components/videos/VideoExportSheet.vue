<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { AlertCircle, CheckCircle, DownloadSimple, FilmSlate, ShareNetwork, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useToast } from '../../composables/useToast'
import { formatLength } from '../../composables/useVideoOverview'
import { aspectOf } from '../../utils/video/render'
import { canRecord, extensionOf, fileNameFor, pickType, recordVideo } from '../../utils/video/record'

// Making the file: the video played once, out of sight, while the browser
// records it. It takes as long as the video does, so the sheet says so before
// it starts and shows how far it has got while it runs.
//
// Once it is done, the file can be saved, or on a phone handed straight to
// Messenger or Facebook through the share sheet.

const props = defineProps({
  show: { type: Boolean, default: false },
  video: { type: Object, default: null },
  music: { type: Object, default: null },
  volume: { type: Number, default: 0.7 },
  aspect: { type: String, default: 'wide' },
  // "October 2026", for the file's name.
  title: { type: String, required: true },
})

const emit = defineEmits(['close'])

const toast = useToast()
const dialogRef = ref(null)
const state = ref('ready') // ready | recording | done | failed
const progress = ref(0)
const elapsed = ref(0)
const file = ref(null)
const url = ref('')
let controller = null
let audio = null

const supported = canRecord()
const type = supported ? pickType() : ''
const format = computed(() => (extensionOf(type) === 'mp4' ? 'MP4' : 'WebM'))
const shape = computed(() => aspectOf(props.aspect))

const close = () => {
  if (state.value === 'recording') controller?.abort()
  emit('close')
}

useFocusTrap(dialogRef, () => props.show, close)

const reset = () => {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
  file.value = null
  progress.value = 0
  elapsed.value = 0
  state.value = 'ready'
}

watch(
  () => props.show,
  (open) => {
    if (open && state.value !== 'recording') reset()
  }
)

const start = async () => {
  if (!props.video) return
  // Made inside the tap: Safari only lets a context it saw a gesture create
  // make any sound.
  const Context = window.AudioContext || window.webkitAudioContext
  audio = props.music && Context ? new Context() : null
  await audio?.resume?.()
  controller = new AbortController()
  state.value = 'recording'
  try {
    const blob = await recordVideo({
      video: props.video,
      music: props.music,
      volume: props.volume,
      audioContext: audio,
      signal: controller.signal,
      onProgress: (fraction, seconds) => {
        progress.value = fraction
        elapsed.value = seconds
      },
    })
    const name = fileNameFor(props.title, blob.type)
    file.value = new File([blob], name, { type: blob.type })
    url.value = URL.createObjectURL(blob)
    state.value = 'done'
  } catch (error) {
    if (error?.name === 'AbortError') {
      reset()
    } else {
      console.error('Could not record the video:', error)
      state.value = 'failed'
    }
  } finally {
    audio?.close?.()
    audio = null
  }
}

const canShare = computed(
  () => Boolean(file.value && navigator.canShare?.({ files: [file.value] }))
)

const share = async () => {
  try {
    await navigator.share({ files: [file.value], title: `${props.title} announcements` })
  } catch (error) {
    // Closing the share sheet without picking anything is not a failure.
    if (error?.name !== 'AbortError') {
      console.error('Could not share the video:', error)
      toast.error('Could not share the video. Please save it instead.')
    }
  }
}

onBeforeUnmount(() => {
  controller?.abort()
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="close"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="export-sheet-title"
          tabindex="-1"
          class="sheet-panel flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-linear-to-r from-primary/10 to-transparent px-4 py-3.5 dark:border-gray-700 dark:from-primary-light/10"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="shrink-0 rounded-xl bg-primary p-2.5">
                <FilmSlate class="h-5 w-5 text-white" />
              </div>
              <div class="min-w-0">
                <h2 id="export-sheet-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                  {{ state === 'done' ? 'Your video is ready' : 'Make the video file' }}
                </h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ shape.label }} {{ shape.width }} × {{ shape.height }} · {{ format }} ·
                  {{ formatLength(video?.duration) }}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
            <!-- A browser that cannot record at all -->
            <div v-if="!supported" class="flex gap-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
              <AlertCircle class="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                This browser cannot record video. Open Ekkly in Chrome, Edge or Safari on a phone or computer
                to make the file.
              </p>
            </div>

            <template v-else-if="state === 'ready'">
              <p class="text-sm text-gray-600 dark:text-gray-300">
                The video plays through once while it records, so this takes
                {{ formatLength(video?.duration) }}. Keep this screen open until it finishes.
              </p>
              <p v-if="format === 'WebM'" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                This browser saves WebM, which Facebook and YouTube accept. For a file every phone plays, use
                Safari or a recent Chrome.
              </p>
              <button
                type="button"
                class="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
                :disabled="!video"
                @click="start"
              >
                <FilmSlate class="h-5 w-5" />
                Start recording
              </button>
            </template>

            <template v-else-if="state === 'recording'">
              <div class="flex items-baseline justify-between text-sm">
                <span class="font-medium text-gray-900 dark:text-white">Recording…</span>
                <span class="tabular-nums text-gray-500 dark:text-gray-400">
                  {{ formatLength(elapsed) }} of {{ formatLength(video?.duration) }}
                </span>
              </div>
              <div class="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  class="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
                  :style="{ width: `${Math.round(progress * 100)}%` }"
                />
              </div>
              <p class="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Keep this screen open. Switching apps or locking the phone pauses the recording.
              </p>
              <button
                type="button"
                class="mt-4 h-10 w-full rounded-lg bg-gray-100 px-4 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                @click="controller?.abort()"
              >
                Stop
              </button>
            </template>

            <template v-else-if="state === 'done'">
              <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <CheckCircle class="h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
                <span class="min-w-0 truncate">{{ file?.name }}</span>
              </div>
              <div class="mt-4 grid gap-2" :class="canShare ? 'grid-cols-2' : 'grid-cols-1'">
                <button
                  v-if="canShare"
                  type="button"
                  class="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-white hover:bg-primary-hover"
                  @click="share"
                >
                  <ShareNetwork class="h-5 w-5" />
                  Share
                </button>
                <a
                  :href="url"
                  :download="file?.name"
                  :class="[
                    'flex h-12 items-center justify-center gap-2 rounded-xl font-semibold',
                    canShare
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      : 'bg-primary text-white hover:bg-primary-hover',
                  ]"
                >
                  <DownloadSimple class="h-5 w-5" />
                  Save
                </a>
              </div>
              <button
                type="button"
                class="mt-2 h-10 w-full rounded-lg px-3 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                @click="reset"
              >
                Record it again
              </button>
            </template>

            <template v-else>
              <div class="flex gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                <AlertCircle class="mt-0.5 h-5 w-5 shrink-0" />
                <p>Could not record the video. Please try again, and keep this screen open while it runs.</p>
              </div>
              <button
                type="button"
                class="mt-4 h-11 w-full rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary-hover"
                @click="reset"
              >
                Try again
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-leave-active .sheet-panel {
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: translateY(0.5rem) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel {
    transition: none;
  }
}
</style>
