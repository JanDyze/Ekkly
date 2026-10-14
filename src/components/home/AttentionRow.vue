<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { X } from '../../icons'
import TodayPicture from './TodayPicture.vue'

// One issue in the desktop home's Needs attention (HomeAttention), and in the
// sheet that lists them all (HomeSheet): how pressing it is — red for
// something late, amber for something waiting or missing (DESIGN.md) — what
// it is, a line on it, and the one thing to do about it. Where the issue
// covers several records (gatherings not counted, accounts asking to be
// linked, tasks overdue) they are links under it, the first three and the
// rest a tap away, so the issue is said once however many records it covers.
//
// The row answers to its list's width (an @container): wide, the action sits
// at the right; in a narrow column it joins the end of the records' line
// (or takes a line of its own where there are none), and the line on it is
// kept to one, so the headline keeps its room and the row stays short.

const props = defineProps({
  card: { type: Object, required: true },
  dismiss: { type: Function, default: null },
  leaving: { type: Boolean, default: false },
})

// How many records show before "+N more": three where the row is wide, two
// where it is narrow (the third is hidden by the container query, and the
// count beside it says one more).
const RECORDS = 3
const NARROW = 2
const opened = ref(false)
const all = computed(() => props.card.records || [])
const records = computed(() => (opened.value ? all.value : all.value.slice(0, RECORDS)))
const moreButtons = computed(() => {
  const total = all.value.length
  if (opened.value) return total > NARROW ? [{ key: 'fewer', count: 0, class: '' }] : []
  const list = []
  if (total > NARROW) list.push({ key: 'narrow', count: total - NARROW, class: '@lg:hidden' })
  if (total > RECORDS) list.push({ key: 'wide', count: total - RECORDS, class: 'hidden @lg:list-item' })
  return list
})

const STATUS = {
  urgent: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  pending: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
}
const ACTION =
  'items-center rounded-full px-3.5 py-1.5 text-[13px] font-semibold text-gray-900 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:text-white dark:ring-white/20 dark:hover:bg-white/10'
</script>

<template>
  <li class="flex items-start gap-3.5 px-4 py-3.5 transition-opacity duration-200 @lg:gap-4 @lg:px-5" :class="leaving ? 'opacity-0' : ''">
    <TodayPicture :card="card" />

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span :class="['rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset', STATUS[card.severity] || STATUS.pending]">
          {{ card.kicker }}
        </span>
        <h3 class="text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ card.title }}</h3>
      </div>
      <p v-if="card.detail" class="mt-1 line-clamp-1 text-sm text-gray-600 @lg:line-clamp-2 dark:text-gray-400">{{ card.detail }}</p>

      <!-- The records it covers, each a way to the one record, and in a
           narrow column the action after them. -->
      <ul class="mt-2 flex flex-wrap items-center gap-1.5" :class="card.records?.length ? '' : '@lg:hidden'">
        <!-- Three records in a wide column, two in a narrow one. -->
        <li v-for="(record, i) in records" :key="record.key" :class="!opened && i === NARROW ? 'hidden @lg:list-item' : ''">
          <RouterLink
            :to="record.to"
            class="inline-flex max-w-60 items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
          >
            <span class="truncate">{{ record.label }}</span>
          </RouterLink>
        </li>
        <li v-for="extra in moreButtons" :key="extra.key" :class="extra.class">
          <button
            type="button"
            class="rounded-full px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
            :aria-expanded="opened"
            @click="opened = !opened"
          >
            {{ opened ? 'Show fewer' : `+${extra.count} more` }}
          </button>
        </li>
        <li class="@lg:hidden">
          <RouterLink :to="card.to" :class="['inline-flex !py-1 text-xs', ACTION]">
            {{ card.action || 'Open' }}
            <span v-if="card.destLabel" class="sr-only">, in {{ card.destLabel }}</span>
          </RouterLink>
        </li>
      </ul>
    </div>

    <div class="flex shrink-0 items-center gap-1">
      <RouterLink :to="card.to" :class="['hidden @lg:inline-flex', ACTION]">
        {{ card.action || 'Open' }}
        <span v-if="card.destLabel" class="sr-only">, in {{ card.destLabel }}</span>
      </RouterLink>
      <button
        v-if="card.dismissible && dismiss"
        type="button"
        class="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-200"
        :aria-label="card.remember ? `Put away “${card.title}” until there are more` : `Put away “${card.title}” until the app is opened again`"
        @click="dismiss(card)"
      >
        <X class="size-4" />
      </button>
    </div>
  </li>
</template>
