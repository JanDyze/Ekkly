<script setup>
// A note beside the device that says what the scene is showing, in a few
// words. It arrives once, after `delay`, and stays put. Where it sits is the
// scene's to say, through classes, because a note beside a phone and a note on
// the corner of a monitor are in different places. On a phone-width page there
// is no room beside the device, so notes only show from `sm` up.

defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  body: { type: String, default: '' },
  tone: { type: String, default: 'primary' },
  delay: { type: Number, default: 0 },
})

const TONES = {
  primary: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light',
  emerald: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  orange: 'bg-orange-100 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
}
</script>

<template>
  <div
    class="fd-pop absolute z-30 hidden items-center gap-2 whitespace-nowrap rounded-xl bg-white px-3 py-2 shadow-xl ring-1 ring-gray-900/5 sm:flex dark:bg-gray-800 dark:ring-white/10"
    :style="{ '--d': `${delay}ms` }"
  >
    <span v-if="icon" :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', TONES[tone] || TONES.primary]">
      <component :is="icon" class="h-4 w-4" />
    </span>
    <span class="text-xs">
      <span class="block font-semibold text-gray-900 dark:text-white">{{ title }}</span>
      <span v-if="body" class="block text-gray-500 dark:text-gray-400">{{ body }}</span>
      <slot />
    </span>
  </div>
</template>
