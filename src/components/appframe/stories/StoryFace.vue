<script setup>
// A made-up person's face in a story: their initials on a soft colour, the
// way the roll draws someone with no photo.

const props = defineProps({
  person: { type: Object, required: true },
  size: { type: String, default: 'size-9 text-xs' },
})

const TONES = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-200',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200',
}
</script>

<template>
  <span
    :class="['flex shrink-0 items-center justify-center rounded-full font-bold', props.size, TONES[props.person.tone] || TONES.sky]"
    aria-hidden="true"
  >
    {{ props.person.first[0] }}{{ props.person.last[0] }}
  </span>
</template>
