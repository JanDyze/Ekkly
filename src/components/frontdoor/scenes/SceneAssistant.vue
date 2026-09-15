<script setup>
import { computed, ref } from 'vue'
import { Cake, CheckCircle, PaperPlaneRight, PlugsConnected, ShieldCheck, Sparkle } from '../../../icons'
import FloatNote from '../FloatNote.vue'
import ScaledScreen from '../ScaledScreen.vue'
import { useSceneTimeline } from '../useSceneTimeline'

// Scene: asking EKRIS, the church's own assistant. It can read the roll and
// the calendar, so a plain question is answered from the church's own records,
// and it can make the task that follows from it. It never deletes anything,
// which is why the follow-up is adding a task rather than tidying one away.

const props = defineProps({
  domain: { type: String, default: '' },
  desktop: { type: Boolean, default: false },
  church: { type: String, default: '' },
})

// Whoever the visitor said they were, if they said.
const churchName = computed(() => props.church.trim() || 'Grace Fellowship')

const BIRTHDAYS = [
  { name: 'Ana Reyes', day: 'Tue' },
  { name: 'Lola Rosa', day: 'Thu · turns 80' },
  { name: 'Ben Cruz', day: 'Sat' },
]

const step = ref(0)
const { at } = useSceneTimeline()

// 1 question · 2 thinking · 3 answer · 4 names · 5 offer · 6 yes · 7 done
at(300, () => (step.value = 1))
at(900, () => (step.value = 2))
at(2000, () => (step.value = 3))
at(2200, () => (step.value = 4))
at(3300, () => (step.value = 5))
at(4500, () => (step.value = 6))
at(5000, () => (step.value = 7))
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="flex h-full flex-col pt-10">
        <div class="fd-rise flex items-center gap-2.5 border-b border-gray-200 px-4 pb-3 dark:border-gray-800">
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-white shadow-sm shadow-primary/30">
            <Sparkle class="h-4 w-4" />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-bold text-gray-900 dark:text-white">EKRIS</p>
            <p class="truncate text-[10px] text-gray-500 dark:text-gray-400">Your church’s assistant</p>
          </div>
        </div>

        <div class="min-h-0 flex-1 space-y-2.5 overflow-hidden px-3 pt-3 text-xs">
          <p v-if="step >= 1" class="fd-rise ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white">
            Who has a birthday this week?
          </p>

          <div v-if="step === 2" class="fd-rise flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3 shadow-sm dark:bg-gray-800">
            <span v-for="n in 3" :key="n" class="dot h-1.5 w-1.5 rounded-full bg-gray-400" :style="{ animationDelay: `${n * 150}ms` }"></span>
          </div>

          <div v-if="step >= 3" class="fd-rise w-[88%] rounded-2xl rounded-bl-md bg-white px-3 py-2.5 text-gray-800 shadow-sm dark:bg-gray-800 dark:text-gray-200">
            <p>Three people this week:</p>
            <ul v-if="step >= 4" class="mt-2 space-y-1.5">
              <li v-for="(person, i) in BIRTHDAYS" :key="person.name" class="fd-rise flex items-center gap-2" :style="{ '--d': `${i * 220}ms` }">
                <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  <Cake class="h-3.5 w-3.5" />
                </span>
                <span class="min-w-0 flex-1 truncate font-semibold">{{ person.name }}</span>
                <span class="shrink-0 text-[10px] text-gray-500 dark:text-gray-400">{{ person.day }}</span>
              </li>
            </ul>
            <p v-if="step >= 5" class="fd-rise mt-2.5">Shall I add a task to send them cards?</p>
          </div>

          <p v-if="step >= 6" class="fd-rise ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white">Yes please</p>

          <p v-if="step >= 7" class="fd-rise flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle class="h-3.5 w-3.5" /> Task added for Friday
          </p>
        </div>

        <div class="mx-3 mb-4 mt-2 flex h-10 items-center gap-2 rounded-full bg-white pl-4 pr-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
          <span class="flex-1 truncate text-xs text-gray-400">Ask about your church…</span>
          <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            <PaperPlaneRight class="h-4 w-4" />
          </span>
        </div>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <ScaledScreen v-else>
      <div class="flex h-full flex-col">
        <div class="flex h-10 shrink-0 items-center gap-2 border-b border-gray-100 px-3 dark:border-gray-800">
          <span class="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-primary to-primary-hover text-white shadow-sm shadow-primary/30">
            <Sparkle class="h-3.5 w-3.5" />
          </span>
          <span class="text-[13px] font-bold text-gray-900 dark:text-white">EKRIS</span>
          <span class="text-[10px] text-gray-400">{{ churchName }}</span>
          <span class="ml-auto flex h-6 items-center gap-1 rounded-md bg-emerald-50 px-2 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <PlugsConnected class="h-3 w-3" /> Connected to your records
          </span>
        </div>

        <div class="mx-auto flex w-[340px] flex-1 flex-col gap-2 pt-4 text-[11px]">
          <p v-if="step >= 1" class="fd-rise ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white">
            Who has a birthday this week?
          </p>

          <div v-if="step === 2" class="fd-rise flex w-fit items-center gap-1 rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2.5 dark:bg-gray-800">
            <span v-for="n in 3" :key="n" class="dot h-1.5 w-1.5 rounded-full bg-gray-400" :style="{ animationDelay: `${n * 150}ms` }"></span>
          </div>

          <div v-if="step >= 3" class="fd-rise w-[85%] rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2.5 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <p>Three people this week:</p>
            <ul v-if="step >= 4" class="mt-1.5 space-y-1">
              <li v-for="(person, i) in BIRTHDAYS" :key="person.name" class="fd-rise flex items-center gap-2" :style="{ '--d': `${i * 220}ms` }">
                <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  <Cake class="h-3 w-3" />
                </span>
                <span class="min-w-0 flex-1 truncate font-semibold">{{ person.name }}</span>
                <span class="shrink-0 text-[9px] text-gray-500 dark:text-gray-400">{{ person.day }}</span>
              </li>
            </ul>
            <p v-if="step >= 5" class="fd-rise mt-2">Shall I add a task to send them cards?</p>
          </div>

          <p v-if="step >= 6" class="fd-rise ml-auto w-fit rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white">Yes please</p>

          <p v-if="step >= 7" class="fd-rise flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle class="h-3 w-3" /> Task added for Friday
          </p>

          <div class="mb-3 mt-auto flex h-9 items-center gap-2 rounded-full bg-white pl-3.5 pr-1 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
            <span class="flex-1 truncate text-[10px] text-gray-400">Ask about your church…</span>
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white">
              <PaperPlaneRight class="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>
    </ScaledScreen>

    <FloatNote
      :icon="PlugsConnected"
      tone="orange"
      title="Reads your records"
      body="people, calendar, songs"
      :delay="1200"
      :class="props.desktop ? '-bottom-6 -left-3 sm:-left-10' : 'fd-out-left sm:-left-44 top-32'"
    />
    <FloatNote
      :icon="ShieldCheck"
      tone="emerald"
      title="Never deletes"
      body="and keeps contacts private"
      :delay="2600"
      :class="props.desktop ? '-bottom-6 -right-3 sm:-right-8' : 'fd-out-right sm:-right-40 bottom-36'"
    />
  </div>
</template>

<style scoped>
/* EKRIS is thinking. */
.dot {
  animation: dot 0.9s ease-in-out infinite;
}

@keyframes dot {
  50% {
    opacity: 0.3;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot {
    animation: none;
  }
}
</style>
