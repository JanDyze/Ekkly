<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { X } from '../../icons'
import TodayPicture from './TodayPicture.vue'

// One issue in the desktop home's Needs attention (HomeAttention): the whole
// row opens it, so it carries no button of its own. How pressing it is comes
// first — red for something late, amber for something waiting or missing
// (DESIGN.md) — then what it is, and one quiet line under it. Where the issue
// covers several records (gatherings not counted, accounts asking to be
// linked, tasks overdue) that line names the first of them and counts the
// rest; otherwise it is the issue's own line. The records themselves are a
// tap away in the place the row opens, so the row stays one thing to read.

const props = defineProps({
  card: { type: Object, required: true },
  dismiss: { type: Function, default: null },
  leaving: { type: Boolean, default: false },
})

const SHOWN = 2
const line = computed(() => {
  const records = props.card.records || []
  if (!records.length) return props.card.detail || ''
  const names = records.slice(0, SHOWN).map((record) => record.label).join(' · ')
  return records.length > SHOWN ? `${names} · +${records.length - SHOWN} more` : names
})

const STATUS = {
  urgent: 'text-red-700 bg-red-50 dark:bg-red-500/15 dark:text-red-300',
  pending: 'text-amber-800 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-300',
}
</script>

<template>
  <li class="group/row relative transition-opacity duration-200" :class="leaving ? 'opacity-0' : ''">
    <RouterLink
      :to="card.to"
      class="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none @lg:px-5 dark:hover:bg-white/[0.04] dark:focus-visible:bg-white/[0.04]"
      :class="card.dismissible && dismiss ? 'pr-12' : ''"
      :title="card.detail || undefined"
    >
      <TodayPicture :card="card" />
      <span class="min-w-0 flex-1">
        <span class="flex min-w-0 items-center gap-2">
          <span :class="['shrink-0 rounded-full px-1.5 py-px text-[11px] font-semibold', STATUS[card.severity] || STATUS.pending]">{{ card.kicker }}</span>
          <h3 class="min-w-0 truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ card.title }}</h3>
        </span>
        <span v-if="line" class="mt-0.5 block truncate text-[13px] text-gray-500 dark:text-gray-400">{{ line }}</span>
      </span>
      <span v-if="card.destLabel" class="sr-only">Opens {{ card.destLabel }}</span>
    </RouterLink>
    <button
      v-if="card.dismissible && dismiss"
      type="button"
      class="absolute right-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:opacity-100 group-hover/row:opacity-100 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200 [@media(hover:hover)]:opacity-0"
      :aria-label="card.remember ? `Put away “${card.title}” until there are more` : `Put away “${card.title}” until the app is opened again`"
      @click="dismiss(card)"
    >
      <X class="size-4" />
    </button>
  </li>
</template>
