<script setup>
// A heading over a card of rows, the way ListGroup groups a list's concerns:
// by month, or "Pray for these first" over the urgent ones.

const props = defineProps({
  title: { type: String, required: true },
  count: { type: Number, default: null },
})
</script>

<template>
  <section>
    <h2 class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {{ props.title }}
      <span v-if="props.count !== null" class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ props.count }}</span>
    </h2>
    <div class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
      <slot />
    </div>
  </section>
</template>
