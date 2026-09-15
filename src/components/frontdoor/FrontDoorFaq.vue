<script setup>
import { ref } from 'vue'
import { ChevronDown } from '../../icons'

// Questions and answers, one open at a time.

defineProps({
  items: { type: Array, default: () => [] },
})

const open = ref(0)
</script>

<template>
  <ul class="space-y-3">
    <li v-for="(item, index) in items" :key="item.q" class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <button
        type="button"
        @click="open = open === index ? -1 : index"
        :aria-expanded="open === index"
        class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span class="text-base font-semibold">{{ item.q }}</span>
        <ChevronDown :class="['h-5 w-5 shrink-0 text-gray-400 transition-transform duration-300', open === index ? 'rotate-180' : '']" />
      </button>
      <div class="grid transition-all duration-300" :class="open === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'">
        <p class="overflow-hidden px-5 text-sm leading-relaxed text-gray-600 dark:text-gray-400" :class="open === index ? 'pb-5' : ''">
          {{ item.a }}
        </p>
      </div>
    </li>
  </ul>
</template>
