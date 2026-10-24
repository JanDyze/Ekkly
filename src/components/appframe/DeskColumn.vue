<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import MemberAvatar from '../members/MemberAvatar.vue'
import DateTile from './DateTile.vue'

// One of an app's sections, shown as itself on a desktop home (AppDesk): a
// heading that opens the section in full, and its first rows, scrolling on
// their own. People's and Tasks' homes drew these by hand (PeopleDesk,
// TasksDesk); this is that column for every other app, so they all read the
// same.
//
// Rows are AppSidePanel's: { key, to?, title, line?, aside?, tone? } and one
// picture, the first of `date` (with `weekday`, `past`, `highlight`),
// `photo`, `member`, `members`, `icon`. A row `{ key, heading }` is a small label over
// the rows under it.

const props = defineProps({
  title: { type: String, required: true },
  // Where the section is, opened from the heading.
  to: { type: [String, Object], default: null },
  rows: { type: Array, default: () => [] },
  // Said where the rows are, when there are none.
  empty: { type: String, default: 'Nothing here yet.' },
  loading: { type: Boolean, default: false },
})

const items = computed(() => props.rows.filter((row) => !row.heading))

const ASIDE = {
  urgent: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-700 dark:text-amber-400',
  accent: 'text-primary dark:text-primary-light',
}

// The same reach as PeopleDesk's rows: a little past the column's edge, so a
// row's highlight and its focus ring have room, the column padding by as much.
const ROW = '-mx-3 flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 transition-colors'
</script>

<template>
  <section class="flex min-h-0 min-w-0 flex-col px-7 first:pl-0 last:pr-0" :aria-label="title">
    <component
      :is="to ? RouterLink : 'div'"
      :to="to || undefined"
      class="group -mx-2 -mt-1 mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg px-2 py-1"
    >
      <h2
        :class="[
          'text-base font-bold text-gray-900 dark:text-white',
          to ? 'group-hover:text-primary dark:group-hover:text-primary-light' : '',
        ]"
      >
        {{ title }}
        <span v-if="items.length" class="ml-1 text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ items.length }}</span>
      </h2>
      <span v-if="to" class="flex items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light">
        See all
        <ChevronRight class="size-3.5" />
      </span>
    </component>

    <div class="-mx-3 min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 [scrollbar-width:thin]">
      <div v-if="loading && !items.length" class="flex flex-col gap-2" aria-hidden="true">
        <span v-for="n in 5" :key="n" class="h-12 animate-pulse rounded-xl bg-gray-200/60 dark:bg-white/5" />
      </div>
      <p v-else-if="!items.length" class="py-2 text-sm text-gray-500 dark:text-gray-400">{{ empty }}</p>
      <template v-else>
        <template v-for="row in rows" :key="row.key">
          <p
            v-if="row.heading"
            :class="[
              'pt-3 pb-1 text-xs font-semibold uppercase tracking-wide first:pt-0',
              row.today ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ row.heading }}
          </p>
          <component
            :is="row.to ? RouterLink : 'div'"
            v-else
            :to="row.to || undefined"
            :class="[ROW, row.to ? 'hover:bg-gray-200/50 dark:hover:bg-white/5' : '']"
          >
            <DateTile v-if="row.date" :date="row.date" :weekday="row.weekday" :past="row.past" :highlight="row.highlight" />
            <img v-else-if="row.photo" :src="row.photo" alt="" loading="lazy" class="size-10 shrink-0 rounded-xl object-cover" />
            <MemberAvatar v-else-if="row.member" :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
            <MemberAvatar v-else-if="(row.members || []).length" :member="row.members[0]" alt="" size="h-10 w-10" class="shrink-0" />
            <span
              v-else-if="row.icon"
              class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light"
            >
              <component :is="row.icon" class="size-5" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.title }}</span>
              <span v-if="row.line" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.line }}</span>
            </span>
            <span v-if="row.aside" :class="['shrink-0 text-xs font-semibold tabular-nums', ASIDE[row.tone] || 'text-gray-500 dark:text-gray-400']">
              {{ row.aside }}
            </span>
          </component>
        </template>
      </template>
    </div>
  </section>
</template>
