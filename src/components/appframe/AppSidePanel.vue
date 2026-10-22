<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import MemberAvatar from '../members/MemberAvatar.vue'
import DateTile from './DateTile.vue'
import PanelRest from '../home/PanelRest.vue'

// The third column of an app's home on a desktop (AppHome's `side`): one live
// list from inside the app, the way the home of all apps keeps the week
// beside its work (HomeWeek) — the coming birthdays in People, the next
// Sunday's line-up in Schedules, the tasks of yours still open. It is the
// section it comes from, glimpsed, with the way into the whole of it in the
// corner, so it says nothing the cards beside it already say.
//
// Like every panel on a board it takes the height it is given and scrolls
// inside itself; with little in it, the room left says so (PanelRest).
//
// Rows: { key, to?, title, line?, aside?, tone? } and one picture, the first
// of: `date` (an ISO day, as a DateTile; `weekday`, `past` and `highlight` as
// it takes them), `photo`, `member`, `members` (the first two), `art`, `icon`.
// A row `{ key, heading }` is a small label over the rows under it (`today`
// tints it in the church's colour, as the week's today is).

const props = defineProps({
  title: { type: String, required: true },
  rows: { type: Array, default: () => [] },
  // Where the whole of it is: { to, label, short? } ("See all", "Calendar").
  link: { type: Object, default: null },
  // What the panel says with nothing in it.
  empty: { type: Object, default: () => ({ title: 'Nothing yet', line: '' }) },
  // The quiet moment drawn when it is empty or nearly (PanelRest).
  doodle: { type: String, default: 'hammock' },
  // Said under a few rows, in the room they leave.
  few: { type: String, default: 'That’s everything.' },
  // A count beside the title, of the rows that are not headings.
  count: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
})

const items = computed(() => props.rows.filter((row) => !row.heading))
const people = (row) => (row.members || []).filter(Boolean)

// The words on a row in a tone of its own: red for something late, amber for
// something waiting (DESIGN.md), and the plain grey otherwise.
const ASIDE = {
  urgent: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-700 dark:text-amber-400',
  accent: 'text-primary dark:text-primary-light',
}
</script>

<template>
  <section class="@container flex min-h-[9rem] flex-1 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-800/70 dark:ring-white/10">
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 pt-2.5 pb-2 dark:border-white/10">
      <h2 class="flex min-w-0 items-center gap-2.5 text-sm font-semibold text-gray-900 dark:text-white">
        <span class="truncate">{{ title }}</span>
        <span
          v-if="count && items.length"
          class="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300"
        >
          {{ items.length }}
        </span>
      </h2>
      <RouterLink
        v-if="link"
        :to="link.to"
        class="shrink-0 text-xs font-semibold whitespace-nowrap text-primary hover:underline dark:text-primary-light"
      >
        <template v-if="link.short">
          <span class="hidden @[18rem]:inline">{{ link.label }}</span><span class="@[18rem]:hidden">{{ link.short }}</span>
        </template>
        <template v-else>{{ link.label }}</template>
      </RouterLink>
    </header>

    <div v-if="loading && !items.length" class="flex flex-col gap-3 p-5" aria-hidden="true">
      <span v-for="n in 3" :key="n" class="h-11 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
    </div>

    <template v-else-if="items.length">
      <ol :class="['min-h-0 overflow-y-auto overscroll-contain py-1.5 [scrollbar-width:thin]', items.length <= 3 ? 'shrink-0' : 'flex-1']">
        <li
          v-for="row in rows"
          :key="row.key"
          :class="row.heading ? ['px-5 pt-3 pb-1 not-first:mt-1.5 not-first:border-t not-first:border-gray-100 dark:not-first:border-white/10'] : ''"
        >
          <p
            v-if="row.heading"
            :class="[
              'truncate text-xs font-semibold uppercase tracking-wide',
              row.today ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ row.heading }}
          </p>
          <component
            :is="row.to ? RouterLink : 'div'"
            v-else
            :to="row.to || undefined"
            :class="[
              'flex min-w-0 items-center gap-3 px-5 py-2',
              row.to ? 'transition-colors hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none dark:hover:bg-white/[0.04] dark:focus-visible:bg-white/[0.04]' : '',
            ]"
          >
            <slot name="picture" :row="row">
              <DateTile v-if="row.date" :date="row.date" :weekday="row.weekday" :past="row.past" :highlight="row.highlight" />
              <img v-else-if="row.photo" :src="row.photo" alt="" class="size-11 shrink-0 rounded-xl object-cover" />
              <span v-else-if="row.member" class="shrink-0"><MemberAvatar :member="row.member" alt="" size="h-11 w-11" /></span>
              <span v-else-if="people(row).length > 1" class="relative size-11 shrink-0" aria-hidden="true">
                <span class="absolute left-0 top-0"><MemberAvatar :member="people(row)[0]" alt="" size="h-8 w-8" /></span>
                <span class="absolute bottom-0 right-0">
                  <MemberAvatar :member="people(row)[1]" alt="" size="h-8 w-8" plain-class="ring-2 ring-white dark:ring-gray-800" />
                </span>
              </span>
              <span v-else-if="people(row).length" class="shrink-0"><MemberAvatar :member="people(row)[0]" alt="" size="h-11 w-11" /></span>
              <AppArt v-else-if="row.art" :app-key="row.art" class="size-11 shrink-0" />
              <span v-else-if="row.icon" class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
                <component :is="row.icon" class="size-5" />
              </span>
            </slot>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.title }}</span>
              <span v-if="row.line" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ row.line }}</span>
            </span>
            <span
              v-if="row.aside"
              :class="['shrink-0 text-xs font-semibold tabular-nums', ASIDE[row.tone] || 'text-gray-500 dark:text-gray-400']"
            >
              {{ row.aside }}
            </span>
          </component>
        </li>
      </ol>
      <PanelRest v-if="items.length <= 3" few :doodle="doodle" :title="few" />
    </template>

    <PanelRest v-else :doodle="doodle" :title="empty.title" :line="empty.line" />
  </section>
</template>
