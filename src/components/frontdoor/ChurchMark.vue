<script setup>
import { computed } from 'vue'
import { BirdFill, BookOpenTextFill, ChurchFill, SunHorizonFill } from '../../icons'

// A sample church's logo, for the hero's scenes: a mark on a badge of the
// church's own shape, in the church's colour. They are made up, like the
// churches — enough to show that a church's app wears its own logo rather
// than a letter in a square.
//
// A church the visitor typed in has no logo to show, so it gets its initial on
// a plain badge, which is what a new church sees before it uploads one.
//
// The badge is bg-primary, so it follows whichever colour the stage has
// dressed the device in.

const props = defineProps({
  // One of MARKS' keys, or '' for a church without a logo.
  church: { type: String, default: '' },
  // Shown when there is no logo.
  initial: { type: String, default: '' },
})

// Each church a mark and a badge of its own, so four logos read as four
// churches and not one icon set.
const MARKS = {
  grace: { icon: BirdFill, shape: 'rounded-full', size: 'h-[58%] w-[58%]', rim: true },
  hope: { icon: SunHorizonFill, shape: 'rounded-[30%]', size: 'h-[58%] w-[58%]', rim: true },
  // A diamond has less room inside it, and a border cannot follow its cut.
  cornerstone: { icon: ChurchFill, shape: 'badge-diamond', size: 'h-[46%] w-[46%]', rim: false },
  livingword: { icon: BookOpenTextFill, shape: 'badge-shield', size: 'h-[54%] w-[54%]', rim: true },
}

const mark = computed(() => MARKS[props.church] || null)
</script>

<template>
  <span
    :class="[
      'relative flex h-full w-full items-center justify-center bg-linear-to-br from-primary to-primary-hover text-white shadow-md shadow-primary/30',
      mark ? mark.shape : 'rounded-[30%]',
    ]"
  >
    <Transition name="mark" mode="out-in">
      <component :is="mark.icon" v-if="mark" :key="church" :class="mark.size" />
      <span v-else :key="initial" class="text-[0.9em] font-black leading-none">{{ initial }}</span>
    </Transition>
    <!-- A thin inner rim, the way a printed logo badge has one. -->
    <span v-if="!mark || mark.rim" :class="['pointer-events-none absolute inset-[8%] border border-white/35', mark ? mark.shape : 'rounded-[30%]']" aria-hidden="true"></span>
  </span>
</template>

<style scoped>
/* The two badges a Tailwind radius cannot draw. */
.badge-diamond {
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}

.badge-shield {
  border-radius: 18% 18% 50% 50% / 14% 14% 42% 42%;
}

.mark-enter-active,
.mark-leave-active {
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.mark-enter-from,
.mark-leave-to {
  opacity: 0;
  filter: blur(4px);
}
</style>
