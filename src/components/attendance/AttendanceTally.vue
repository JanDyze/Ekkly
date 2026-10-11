<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { ArrowCounterClockwise, Check, Minus, SpeakerHigh, SpeakerSlash, Warning } from '../../icons'
import ConfirmationModal from '../common/ConfirmationModal.vue'

// A clicker, for the usher at the back who counts heads rather than names.
// One tap for each person in the room; the count is then held up against the
// names marked on the roll, so a mismatch says something worth a second look:
// visitors nobody has added, someone ticked who stayed home, or a pew not yet
// counted. Neither number overrules the other - the head count is saved beside
// the names (headCount on the record), never in place of them.
//
// Each tap answers three ways at once, because the usher is looking at the
// room, not at the phone: a person pops up where the finger landed, a short
// note plays, and the phone buzzes. The sound can be turned off, and is
// remembered on this device - a phone clicking through a quiet prayer is not
// what anyone wants.

const props = defineProps({
  /** People counted so far. */
  count: { type: Number, default: 0 },
  /** Names marked present on the roll, to compare against. */
  marked: { type: Number, default: 0 },
})

const emit = defineEmits(['update:count'])

/* ------------------------------------------------------------------ sound */

const SOUND_KEY = 'ekkly:tally-sound'
const readSound = () => {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off'
  } catch {
    return true
  }
}
const soundOn = ref(readSound())
const toggleSound = () => {
  soundOn.value = !soundOn.value
  try {
    localStorage.setItem(SOUND_KEY, soundOn.value ? 'on' : 'off')
  } catch {
    // Not remembered this time; the switch itself still happened.
  }
}

// Made on the first tap rather than at load: a browser only lets sound play
// from an audio context started inside a gesture.
let audio = null

// The notes are drawn rather than recorded, so there is no file to load
// before the first tap: up for one more, down for one fewer, and a longer
// fall for starting again.
const NOTES = {
  up: { from: 660, to: 990, length: 0.12 },
  down: { from: 520, to: 330, length: 0.14 },
  reset: { from: 494, to: 196, length: 0.38 },
}

const play = (kind) => {
  if (!soundOn.value) return
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') audio.resume()
    const note = NOTES[kind]
    const t = audio.currentTime
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(note.from, t)
    osc.frequency.exponentialRampToValueAtTime(note.to, t + Math.min(0.08, note.length))
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.length)
    osc.connect(gain).connect(audio.destination)
    osc.start(t)
    osc.stop(t + note.length + 0.05)
  } catch {
    // No sound on this device; the count and the person still answer.
  }
}

onBeforeUnmount(() => {
  audio?.close?.()
  pops.value.forEach((pop) => clearTimeout(pop.timer))
})

/* ---------------------------------------------------------------- the pops */

// The people that pop up, each where its tap landed, gone again in under a
// second. Several can be on screen at once when the counting is quick.
const pops = ref([])
let nextPop = 0
const POP_MS = 900

const popAt = (x, y, kind = 'up') => {
  const id = nextPop++
  const timer = setTimeout(() => {
    pops.value = pops.value.filter((pop) => pop.id !== id)
  }, POP_MS)
  // Four shades of the church's colour, in turn, so a quick run of taps reads
  // as several people rather than the same one blinking.
  pops.value.push({ id, x, y, kind, shade: id % 4, timer })
}

// Pressed, not clicked: the count should move as the finger comes down, which
// is what a mechanical clicker does, and what keeps up with a fast usher.
const tap = (event) => {
  if (event.button > 0) return
  const box = event.currentTarget.getBoundingClientRect()
  popAt(event.clientX - box.left, event.clientY - box.top)
  add()
}

// The keyboard counts too, from the middle of the box.
const tapKey = (event) => {
  const box = event.currentTarget.getBoundingClientRect()
  popAt(box.width / 2, box.height / 2)
  add()
}

const add = () => {
  emit('update:count', props.count + 1)
  play('up')
  navigator.vibrate?.(8)
}

const boxRef = ref(null)

const takeOne = () => {
  if (props.count <= 0) return
  const box = boxRef.value?.getBoundingClientRect()
  if (box) popAt(box.width / 2, box.height / 2, 'down')
  emit('update:count', props.count - 1)
  play('down')
  navigator.vibrate?.(15)
}

const confirmReset = ref(false)
const reset = () => {
  emit('update:count', 0)
  play('reset')
  confirmReset.value = false
}

/* -------------------------------------------------------------- comparing */

const difference = computed(() => props.count - props.marked)
const verdict = computed(() => {
  if (!props.count) return null
  const n = Math.abs(difference.value)
  if (n === 0) {
    return {
      ok: true,
      text: `Matches the ${props.marked} ${props.marked === 1 ? 'name' : 'names'} marked`,
      hint: 'The head count and the roll agree.',
    }
  }
  if (difference.value > 0) {
    return {
      ok: false,
      text: `${n} more in the room than names marked`,
      hint: 'Visitors, or names not ticked yet.',
    }
  }
  return {
    ok: false,
    text: `${n} fewer in the room than names marked`,
    hint: 'Someone still to count, or marked by mistake.',
  }
})

const SHADES = ['text-primary', 'text-primary-light', 'text-primary-hover', 'text-primary/70']
</script>

<template>
  <div class="flex min-h-0 flex-col gap-3 px-4 pt-3 pb-[calc(5.5rem+max(env(safe-area-inset-bottom),var(--bottom-bar-space)))]">
    <!-- The box is the clicker: anywhere in it counts one more. -->
    <button
      ref="boxRef"
      type="button"
      class="tally-box relative flex min-h-0 flex-1 select-none flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 dark:border-primary-light/30 dark:bg-primary-light/10"
      aria-label="Count one more person"
      @pointerdown="tap"
      @keydown.enter.prevent="tapKey"
      @keydown.space.prevent="tapKey"
      @contextmenu.prevent
    >
      <span class="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">In the room</span>
      <span class="mt-1 text-8xl font-black leading-none tabular-nums text-gray-900 dark:text-white" aria-live="polite">{{ count }}</span>
      <span class="mt-3 max-w-[16rem] text-center text-sm text-gray-500 dark:text-gray-400">
        {{ count ? 'Tap for each person' : 'Tap anywhere in this box once for each person you see' }}
      </span>

      <!-- Each tap's person, popping up where it landed. -->
      <span
        v-for="pop in pops"
        :key="pop.id"
        :class="['pop pointer-events-none absolute', pop.kind === 'down' ? 'pop-down text-gray-400 dark:text-gray-500' : SHADES[pop.shade]]"
        :style="{ left: `${pop.x}px`, top: `${pop.y}px` }"
        aria-hidden="true"
      >
        <svg viewBox="0 0 40 44" class="size-11" fill="currentColor">
          <circle cx="20" cy="11" r="9" />
          <path d="M3 44c0-10.5 7.6-18 17-18s17 7.5 17 18Z" />
        </svg>
      </span>
    </button>

    <!-- How the head count compares with the names ticked on the roll. -->
    <div
      v-if="verdict"
      :class="[
        'flex shrink-0 items-start gap-3 rounded-xl px-4 py-3',
        verdict.ok
          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
      ]"
    >
      <Check v-if="verdict.ok" class="mt-0.5 size-5 shrink-0" />
      <Warning v-else class="mt-0.5 size-5 shrink-0" />
      <span class="min-w-0">
        <span class="block text-sm font-semibold">{{ verdict.text }}</span>
        <span class="block text-xs opacity-80">{{ verdict.hint }} {{ marked }} marked, {{ count }} counted.</span>
      </span>
    </div>

    <div class="flex shrink-0 items-center gap-2">
      <button
        type="button"
        class="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        :disabled="!count"
        @click="takeOne"
      >
        <Minus class="size-4" />
        One fewer
      </button>
      <button
        type="button"
        class="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        :disabled="!count"
        @click="confirmReset = true"
      >
        <ArrowCounterClockwise class="size-4" />
        Start again
      </button>
      <button
        type="button"
        class="flex size-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        :aria-label="soundOn ? 'Turn the sound off' : 'Turn the sound on'"
        :aria-pressed="soundOn"
        @click="toggleSound"
      >
        <SpeakerHigh v-if="soundOn" class="size-5" />
        <SpeakerSlash v-else class="size-5" />
      </button>
    </div>

    <ConfirmationModal
      :show="confirmReset"
      title="Start the count again"
      :message="`Set the head count back to 0? The ${count} counted so far will be gone. The names marked stay as they are.`"
      confirm-text="Start again"
      cancel-text="Keep counting"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="confirmReset = $event"
      @confirm="reset"
      @cancel="confirmReset = false"
    />
  </div>
</template>

<style scoped>
/* A quick run of taps must count every one: no double-tap zoom swallowing
   the second, and no text selection starting on a long press. */
.tally-box {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* A person popping up out of the tap, then drifting off upward as the next
   one comes - the count moving, shown. */
.pop {
  translate: -50% -50%;
  animation: pop-up 0.9s cubic-bezier(0.2, 0.9, 0.3, 1) forwards;
}

@keyframes pop-up {
  0% {
    transform: translateY(18px) scale(0.4);
    opacity: 0;
  }
  22% {
    transform: translateY(-8px) scale(1.08);
    opacity: 1;
  }
  38% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  100% {
    transform: translateY(-56px) scale(0.9);
    opacity: 0;
  }
}

/* One fewer: a grey person sinks away instead. */
.pop-down {
  animation-name: pop-out;
}

@keyframes pop-out {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.9;
  }
  100% {
    transform: translateY(40px) scale(0.6);
    opacity: 0;
  }
}

/* The count and the note still answer; nothing moves. */
@media (prefers-reduced-motion: reduce) {
  .pop {
    display: none;
  }
}
</style>
