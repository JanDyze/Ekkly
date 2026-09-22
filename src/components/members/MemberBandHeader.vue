<script setup>
// The heading over one group on the People list: an age band, a letter, a
// month or a ministry, depending on the sort. It carries no colour dot of its
// own — the grey band already marks it as a heading, and a dot that meant
// something only when sorting by age read as noise under every other sort.

defineProps({
  band: {
    type: Object,
    required: true,
  },
  count: {
    type: Number,
    default: 0,
  },
  /** Selection mode: the heading doubles as "take this whole band". */
  picking: {
    type: Boolean,
    default: false,
  },
  checked: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['toggle'])
</script>

<template>
  <!-- A solid grey band, one step darker than the rows: enough to read as a
       divider without competing with the primary, which belongs to actions.
       Solid rather than see-through because the heading is sticky, and the
       names would otherwise show through it as they scroll underneath. -->
  <div
    class="sticky top-0 z-20 flex items-center gap-2 border-y border-gray-200 bg-gray-100 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900"
  >
    <span class="text-xs font-bold uppercase tracking-wide text-gray-600 dark:text-gray-300">
      {{ band.label }}
    </span>
    <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ count }}</span>

    <!-- Tagging a whole age band is the common bulk edit — the kids become
         WLA Kids, the youth get a tag of their own — so picking one is one tap
         from its heading rather than a scroll and forty. -->
    <button
      v-if="picking"
      type="button"
      @click="$emit('toggle')"
      class="ml-auto rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 dark:text-primary-light"
    >
      {{ checked ? 'Clear' : `Select all ${count}` }}
    </button>
  </div>
</template>
