<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PauseFill, PlayFill, SpeakerHigh, SpeakerSlash } from '../../icons'
import { aspectOf } from '../../utils/video/render'
import { formatLength } from '../../composables/useVideoOverview'

// The video, playing in the page: the same drawing the export records, at the
// size of the screen, with the music under it.
//
// It owns its own clock. With music, the clock is the audio's, so the picture
// can never drift away from the sound; without, it is the page's.

const props = defineProps({
  video: { type: Object, default: null },
  music: { type: Object, default: null },
  volume: { type: Number, default: 0.7 },
  preparing: { type: Boolean, default: false },
  aspect: { type: String, default: 'wide' },
  // How tall the frame may grow, so a tall video fits a desktop screen.
  maxHeight: { type: String, default: '70dvh' },
})

const emit = defineEmits(['time'])

const wrapper = ref(null)
const canvas = ref(null)
const playing = ref(false)
const muted = ref(false)
const time = ref(0)

const shape = computed(() => aspectOf(props.aspect))
const frameStyle = computed(() => ({
  aspectRatio: `${shape.value.width} / ${shape.value.height}`,
  width: `min(100%, calc(${props.maxHeight} * ${shape.value.width / shape.value.height}))`,
}))

const duration = computed(() => props.video?.duration || 0)

/* ------------------------------------------------------------- drawing */

let ctx = null
let scale = 1

const size = () => {
  const el = canvas.value
  const video = props.video
  if (!el || !video) return
  const width = Math.min(video.width, Math.round(el.clientWidth * (window.devicePixelRatio || 1)))
  if (!width) return
  const height = Math.round((width * video.height) / video.width)
  if (el.width !== width || el.height !== height) {
    el.width = width
    el.height = height
  }
  scale = el.width / video.width
  ctx = el.getContext('2d')
}

const draw = () => {
  if (!props.video) return
  if (!ctx) size()
  if (!ctx) return
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  props.video.draw(ctx, time.value)
}

let observer = null
onMounted(() => {
  observer = new ResizeObserver(() => {
    size()
    draw()
  })
  if (wrapper.value) observer.observe(wrapper.value)
})

/* ------------------------------------------------------------- playback */

let audio = null
let source = null
let gain = null
let startedAt = 0
let frame = 0

const clock = () => (audio ? audio.currentTime : performance.now() / 1000)

const stopSource = () => {
  try {
    source?.stop()
  } catch {
    // Never started, or already over.
  }
  source?.disconnect()
  source = null
}

const startSource = () => {
  stopSource()
  if (!props.music || !audio) return
  source = audio.createBufferSource()
  source.buffer = props.music
  source.connect(gain)
  source.start(0, Math.min(time.value, props.music.duration))
}

const tick = () => {
  time.value = Math.min(duration.value, clock() - startedAt)
  draw()
  emit('time', time.value)
  if (time.value >= duration.value) {
    pause()
    return
  }
  frame = requestAnimationFrame(tick)
}

const play = async () => {
  if (!props.video) return
  if (!audio) {
    const Context = window.AudioContext || window.webkitAudioContext
    audio = Context ? new Context() : null
    if (audio) {
      gain = audio.createGain()
      gain.connect(audio.destination)
    }
  }
  if (gain) gain.gain.value = muted.value ? 0 : props.volume
  await audio?.resume?.()
  if (time.value >= duration.value - 0.05) time.value = 0
  startedAt = clock() - time.value
  startSource()
  playing.value = true
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(tick)
}

const pause = () => {
  playing.value = false
  cancelAnimationFrame(frame)
  stopSource()
}

const toggle = () => (playing.value ? pause() : play())

/** Jumps to `seconds`, carrying on playing if it was. */
const seek = (seconds) => {
  time.value = Math.max(0, Math.min(duration.value, seconds))
  if (playing.value) {
    startedAt = clock() - time.value
    startSource()
  }
  draw()
  emit('time', time.value)
}

const onScrub = (event) => seek(Number(event.target.value))

const toggleMute = () => {
  muted.value = !muted.value
  if (gain) gain.gain.value = muted.value ? 0 : props.volume
}

// A rebuilt video — a word changed, a new look — is drawn where the playhead
// already is, so editing while it plays does not throw you back to the start.
watch(
  () => props.video,
  (video) => {
    if (!video) return
    if (time.value > video.duration) time.value = video.duration
    size()
    if (!playing.value) draw()
  }
)

watch(
  () => props.music,
  () => {
    if (playing.value) startSource()
  }
)

watch(
  () => props.volume,
  (value) => {
    if (gain && !muted.value) gain.gain.value = value
  }
)

onBeforeUnmount(() => {
  pause()
  observer?.disconnect()
  audio?.close?.()
})

defineExpose({ seek, play, pause, playing, time })
</script>

<template>
  <div class="flex flex-col items-center">
    <div
      ref="wrapper"
      :style="frameStyle"
      class="group relative overflow-hidden rounded-2xl bg-gray-900 ring-1 ring-black/5 dark:ring-white/10"
    >
      <canvas ref="canvas" class="block size-full" @click="toggle" />

      <!-- Placeholder while the face and pictures load, shaped like the frame. -->
      <div v-if="!video" class="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700" />

      <button
        v-if="video && !playing"
        type="button"
        class="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-transform duration-200 ease-out hover:bg-black/60"
        aria-label="Play"
        @click="play"
      >
        <PlayFill class="ml-1 size-7" />
      </button>

      <span
        v-if="preparing && video"
        class="absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm"
      >
        Updating…
      </span>
    </div>

    <div class="mt-2 flex w-full items-center gap-2" :style="{ maxWidth: frameStyle.width }">
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-800"
        :aria-label="playing ? 'Pause' : 'Play'"
        :disabled="!video"
        @click="toggle"
      >
        <PauseFill v-if="playing" class="size-5" />
        <PlayFill v-else class="size-5" />
      </button>
      <input
        type="range"
        min="0"
        :max="duration || 1"
        step="0.05"
        :value="time"
        :disabled="!video"
        aria-label="Position in the video"
        class="video-scrub h-10 min-w-0 flex-1 cursor-pointer"
        @input="onScrub"
      />
      <span class="w-20 shrink-0 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
        {{ formatLength(time) }} / {{ formatLength(duration) }}
      </span>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
        :aria-label="muted ? 'Turn the music on' : 'Mute the music'"
        @click="toggleMute"
      >
        <SpeakerSlash v-if="muted || !music" class="size-5" />
        <SpeakerHigh v-else class="size-5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.video-scrub {
  accent-color: var(--color-primary);
}
</style>
