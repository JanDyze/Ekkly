<script setup>
import { RouterLink } from 'vue-router'
import { X } from '../../icons'
import TodayPicture from './TodayPicture.vue'

// One item of the home's Community (HomeCommunity): its picture, the line
// that says what kind of news it is, its headline and a line under it, and
// where it can be put away, the × for that. A component of its own so the
// panel and its every-item view (useOverColumn) draw it the same.

defineProps({
  card: { type: Object, required: true },
  dismiss: { type: Function, required: true },
  leaving: { type: String, default: null },
  detailOf: { type: Function, required: true },
})
</script>

<template>
  <li
    class="group/row relative min-w-0 transition-opacity duration-200"
    :class="card.key === leaving ? 'opacity-0' : ''"
  >
    <component
      :is="card.to ? RouterLink : 'div'"
      :to="card.to || undefined"
      class="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2 transition-colors hover:bg-gray-900/[0.04] dark:hover:bg-white/[0.06]"
      :class="card.dismissible ? 'pr-10' : ''"
    >
      <TodayPicture :card="card" size="sm" />
      <span class="min-w-0 flex-1">
        <span
          :class="[
            'block truncate text-xs font-semibold',
            card.tone === 'celebrate' ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
          ]"
        >
          {{ card.kicker }}
        </span>
        <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ card.title }}</span>
        <span v-if="detailOf(card)" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ detailOf(card) }}</span>
      </span>
      <span v-if="card.to && card.destLabel" class="sr-only">Opens {{ card.destLabel }}</span>
    </component>
    <button
      v-if="card.dismissible"
      type="button"
      class="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-900/5 hover:text-gray-700 focus-visible:opacity-100 group-hover/row:opacity-100 dark:hover:bg-white/10 dark:hover:text-gray-200 [@media(hover:hover)]:opacity-0"
      :aria-label="`Put away “${card.title}” until the app is opened again`"
      @click="dismiss(card)"
    >
      <X class="size-3.5" />
    </button>
  </li>
</template>
