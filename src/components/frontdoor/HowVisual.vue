<script setup>
import { computed } from 'vue'
import { CheckCircle2, LinkSimple, PaperPlaneTilt } from '../../icons'
import { suggestChurchId } from '../../../lib/churchId.js'

// What one step of "How it works" looks like while it happens, drawn as a small
// illustration rather than a screen from the app: a screen, with its fields and
// buttons, looks like something to fill in, and the hero already shows the app
// on a device. So each step is a few moving parts on a soft panel — a name
// writing itself and its link appearing, an Approved stamp landing, faces
// joining — with nothing that looks tappable.
//
// `p` runs from 0 to 1 as the reader moves through the step, and everything has
// happened by about two thirds of the way, so a reader who stops there sees it
// finished. Sample data, with their church's name if they gave one.

const props = defineProps({
  step: { type: Number, required: true },
  p: { type: Number, default: 1 },
  church: { type: String, default: '' },
  domain: { type: String, default: 'ekkly.online' },
})

const clamp = (n) => Math.min(1, Math.max(0, n))
const name = computed(() => props.church.trim() || 'Grace Baptist Church')
const slug = (text) => suggestChurchId(text) || 'your-church'

/* ---------------------------------------------------- 1. ask for a church */

const typed = computed(() => name.value.slice(0, Math.round(clamp(props.p / 0.45) * name.value.length)))
const typing = computed(() => typed.value.length < name.value.length)
const sent = computed(() => props.p >= 0.6)

/* ------------------------------------------------------- 2. we open it */

const approved = computed(() => props.p >= 0.2)
const DONE = ['Your church is open', 'Its link works', 'You are its first administrator', 'Its apps are switched on']
const doneCount = computed(() => Math.floor(clamp((props.p - 0.3) / 0.38) * DONE.length + 0.001))

/* ------------------------------------------------ 3. bring your people in */

const shared = computed(() => props.p >= 0.1)
const FACES = [
  { initials: 'AR', tone: 'bg-amber-200 text-amber-800' },
  { initials: 'BC', tone: 'bg-sky-200 text-sky-800' },
  { initials: 'CS', tone: 'bg-teal-200 text-teal-800' },
  { initials: 'JL', tone: 'bg-rose-200 text-rose-800' },
  { initials: 'MV', tone: 'bg-violet-200 text-violet-800' },
  { initials: 'RP', tone: 'bg-lime-200 text-lime-800' },
]
const JOINED = 24
const joined = computed(() => Math.round(clamp((props.p - 0.2) / 0.48) * JOINED))
// The first to join fill the seats; everyone after them is counted beside.
const facesIn = computed(() => Math.min(FACES.length, joined.value))
</script>

<template>
  <div class="flex min-h-64 flex-col justify-center rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 sm:p-7" aria-hidden="true">
    <!-- 1. The name writing itself, its link appearing, and the request going. -->
    <template v-if="step === 0">
      <p class="flex items-center gap-2 text-sm text-white/60">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-800">PM</span>
        Pastor Mark, signed in with Google
      </p>
      <p class="mt-5 min-h-9 text-2xl font-black leading-tight text-white sm:text-3xl">
        {{ typed }}<span v-if="typing" class="caret">|</span>
      </p>
      <p class="mt-3">
        <span class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-light/15 px-3 py-1 font-mono text-xs text-primary-light">
          <LinkSimple class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">{{ slug(typed) }}.{{ domain }}</span>
        </span>
      </p>
      <p :class="['mt-6 flex items-center gap-2 text-sm font-semibold transition-all duration-500', sent ? 'text-emerald-300' : 'text-white/0']">
        <PaperPlaneTilt :class="['h-5 w-5 transition-transform duration-500', sent ? 'translate-x-0' : '-translate-x-3']" />
        Request sent
      </p>
    </template>

    <!-- 2. The stamp, and what approving does. -->
    <template v-else-if="step === 1">
      <div class="flex items-center gap-4">
        <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-white shadow-lg shadow-primary/40">{{ name[0] }}</span>
        <div class="min-w-0">
          <p class="truncate text-lg font-bold text-white">{{ name }}</p>
          <span :class="['stamp mt-1 inline-flex items-center gap-1 rounded-md border-2 px-2 py-0.5 text-xs font-black uppercase tracking-wider', approved ? 'is-in border-emerald-400 text-emerald-300' : 'border-white/20 text-white/40']">
            {{ approved ? 'Approved' : 'Looking it over' }}
          </span>
        </div>
      </div>
      <ul class="mt-6 space-y-2.5">
        <li
          v-for="(item, i) in DONE"
          :key="item"
          :class="['flex items-center gap-2.5 text-sm transition-all duration-300', i < doneCount ? 'translate-x-0 text-white opacity-100' : '-translate-x-2 text-white opacity-0']"
        >
          <CheckCircle2 class="h-5 w-5 shrink-0 text-emerald-400" />
          {{ item }}
        </li>
      </ul>
    </template>

    <!-- 3. The link going out, and people coming in. -->
    <template v-else>
      <p>
        <span class="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-light/15 px-3 py-1 font-mono text-xs text-primary-light">
          <LinkSimple class="h-3.5 w-3.5 shrink-0" />
          <span class="truncate">{{ slug(name) }}.{{ domain }}</span>
        </span>
        <span :class="['ml-2 text-xs font-semibold transition-colors duration-300', shared ? 'text-emerald-300' : 'text-white/0']">Shared</span>
      </p>
      <!-- A row of seats, each filled as someone joins. -->
      <div class="mt-6 flex flex-wrap items-center gap-2">
        <span
          v-for="(face, i) in FACES"
          :key="face.initials"
          :class="[
            'face flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold',
            i < facesIn ? ['is-in', face.tone] : 'border-2 border-dashed border-white/20 text-transparent',
          ]"
        >
          {{ face.initials }}
        </span>
        <span :class="['ml-1 text-sm font-semibold text-white/60 transition-opacity duration-300', joined > FACES.length ? 'opacity-100' : 'opacity-0']">
          +{{ Math.max(0, joined - FACES.length) }}
        </span>
      </div>
      <p class="mt-6 flex items-baseline gap-2">
        <span class="text-4xl font-black tabular-nums text-white">{{ joined }}</span>
        <span class="text-sm text-white/60">people in {{ name }}</span>
      </p>
    </template>
  </div>
</template>

<style scoped>
.caret {
  margin-left: 2px;
  color: var(--color-primary-light);
  font-weight: 400;
}

/* The Approved stamp lands with a little weight. */
.stamp.is-in {
  animation: stamp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes stamp {
  from {
    scale: 1.6;
    rotate: -8deg;
    opacity: 0;
  }
}

/* A face fills its seat with a little give. */
.face.is-in {
  animation: seat 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes seat {
  from {
    scale: 0.5;
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stamp.is-in {
    animation: none;
  }
  .face.is-in {
    animation: none;
  }
}
</style>
