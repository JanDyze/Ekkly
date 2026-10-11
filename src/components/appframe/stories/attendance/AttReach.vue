<script setup>
import { onUnmounted, ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: how many the church reached. The home's card that is always there
// counts up to everyone seen this month, each person once however often they
// came, with the last few turnouts rising along its foot; under it, the
// months side by side, as By month shows them.

const REACH = 214
const BARS = [
  { key: 'sep20', height: 74 },
  { key: 'sep27', height: 81 },
  { key: 'oct4', height: 88 },
  { key: 'oct7', height: 22 },
  { key: 'oct10', height: 30 },
  { key: 'oct11', height: 82, latest: true },
]
const MONTHS = [
  { key: 'oct', label: 'October 2026', line: '9 gatherings · 72% of the roll', count: 214 },
  { key: 'sep', label: 'September 2026', line: '10 gatherings · 66% of the roll', count: 196 },
]
const LARGEST = 214

const count = ref(0)
const grown = ref(false)
const { at, still } = useSceneTimeline()

let frame = 0
const climb = (duration) => {
  const start = performance.now()
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration)
    count.value = Math.round(REACH * (1 - Math.pow(1 - p, 3)))
    if (p < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
}

if (still) {
  count.value = REACH
  grown.value = true
} else {
  at(400, () => climb(1400))
  at(500, () => (grown.value = true))
}

onUnmounted(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="px-4 pt-5">
    <div class="st-rise st-filled flex flex-col rounded-[24px] border border-black/15 bg-primary px-4 pb-3 pt-3.5 text-white dark:border-black/40">
      <p class="inline-flex self-start rounded-full bg-white/18 px-2.5 py-1 text-[13px] font-semibold">Good morning, Pastor Ben</p>
      <p class="mt-1 leading-none">
        <span class="text-5xl font-bold tabular-nums tracking-tight">{{ count }}</span>
        <span class="ml-2 text-lg font-semibold text-white/80">people</span>
      </p>
      <p class="mt-1.5 truncate text-sm text-white/75">Seen in October, 18 more than September</p>
      <div class="mt-3 flex h-12 items-end gap-1.5">
        <span
          v-for="bar in BARS"
          :key="bar.key"
          :class="['reach-bar flex-1 rounded-t-md', bar.latest ? 'bg-white' : 'bg-white/35']"
          :style="{ height: grown ? `${bar.height}%` : '0%' }"
        />
      </div>
      <p class="mt-1.5 truncate text-xs text-white/80">Last: Sunday Service · 132 on Oct 11</p>
    </div>

    <p class="st-rise mb-1.5 mt-5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400" style="--d: 1400ms">
      People seen at least once
    </p>
    <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <li
        v-for="(m, i) in MONTHS"
        :key="m.key"
        class="st-rise flex items-center gap-3 px-4 py-2.5"
        :style="{ '--d': `${1550 + i * 150}ms` }"
      >
        <span class="min-w-0 flex-1">
          <span class="block truncate text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ m.label }}</span>
          <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ m.line }}</span>
        </span>
        <span class="flex w-[68px] shrink-0 items-center gap-2">
          <span class="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-700">
            <span
              class="st-grow block h-full rounded-full bg-primary dark:bg-primary-light"
              :style="{ width: `${Math.round((m.count / LARGEST) * 100)}%`, '--d': `${1800 + i * 150}ms` }"
            />
          </span>
          <span class="w-7 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-white">{{ m.count }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.reach-bar {
  transition: height 0.9s cubic-bezier(0.22, 1, 0.36, 1);
}
.reach-bar:nth-child(2) {
  transition-delay: 80ms;
}
.reach-bar:nth-child(3) {
  transition-delay: 160ms;
}
.reach-bar:nth-child(4) {
  transition-delay: 240ms;
}
.reach-bar:nth-child(5) {
  transition-delay: 320ms;
}
.reach-bar:nth-child(6) {
  transition-delay: 400ms;
}
@media (prefers-reduced-motion: reduce) {
  .reach-bar {
    transition: none;
  }
}
</style>
