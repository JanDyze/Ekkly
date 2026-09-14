<script setup>
// A SectionCard that has not loaded yet: the same frame — icon tile, title,
// subtitle — with grey bars where its rows will be, so the page holds its shape
// and nothing jumps when the real card arrives. See DESIGN.md, "Loading".

defineProps({
  // How many rows of content to draw.
  rows: { type: Number, default: 3 },
  // 'rows' for a list of label/value lines, 'form' for label-over-field pairs.
  variant: { type: String, default: 'rows' },
})
</script>

<template>
  <section
    class="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    aria-hidden="true"
  >
    <div class="flex items-start gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-700">
      <div class="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
      <div class="flex-1 space-y-2 pt-0.5">
        <div class="h-3.5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
        <div class="h-3 w-56 max-w-full animate-pulse rounded bg-gray-100 dark:bg-gray-700/60"></div>
      </div>
    </div>

    <div v-if="variant === 'form'" class="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
      <div v-for="i in rows" :key="i" class="space-y-2">
        <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
        <div class="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/60"></div>
      </div>
    </div>

    <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
      <li v-for="i in rows" :key="i" class="flex items-center gap-3 px-4 py-3.5">
        <div class="flex-1 space-y-2">
          <div class="h-3.5 animate-pulse rounded bg-gray-200 dark:bg-gray-700" :style="{ width: `${40 + ((i * 17) % 35)}%` }"></div>
          <div class="h-3 animate-pulse rounded bg-gray-100 dark:bg-gray-700/60" :style="{ width: `${25 + ((i * 23) % 30)}%` }"></div>
        </div>
        <div class="h-6 w-11 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
      </li>
    </ul>
  </section>
</template>
