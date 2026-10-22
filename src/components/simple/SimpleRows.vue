<script setup>
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import AppArt from '../common/AppArt.vue'
import MemberAvatar from '../members/MemberAvatar.vue'

// A list as simple view shows one (useSimpleView): a line each, large, in one
// white block, with a picture, what it is, a quiet line under it, and how
// many are waiting where any are. The same on the simple home (HomeSimple)
// and in every app's simple view, so simple reads the same everywhere.
//
// Rows: { key, title, detail?, to? | action?, member? | icon? | art?, warn?,
// badge? }. A `member` is drawn as their face.
// A row with `action` (and no `to`) is a button, and is handed back as `act`.

defineProps({
  rows: { type: Array, default: () => [] },
  // Two across on a desktop: for a set of choices (an app's sections), never
  // for a list read in order (Today, the roll).
  columns: { type: Boolean, default: false },
})

const emit = defineEmits(['act'])
</script>

<template>
  <div
    :class="[
      'overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700',
      columns
        ? 'grid gap-px bg-gray-100 lg:grid-cols-2 dark:bg-gray-700/60 *:bg-white dark:*:bg-gray-800 lg:[&>*:last-child:nth-child(odd)]:col-span-2'
        : 'divide-y divide-gray-100 dark:divide-gray-700/60',
    ]"
  >
    <component
      :is="row.to ? RouterLink : row.action ? 'button' : 'div'"
      v-for="row in rows"
      :key="row.key"
      :to="row.to || undefined"
      :type="row.action && !row.to ? 'button' : undefined"
      :class="[
        'flex w-full items-center gap-4 px-4 py-3.5 text-left lg:px-5 lg:py-4',
        row.to || row.action ? 'transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40' : '',
      ]"
      @click="row.action && !row.to ? emit('act', row) : undefined"
    >
      <MemberAvatar v-if="row.member" :member="row.member" alt="" size="h-11 w-11 lg:h-12 lg:w-12" class="shrink-0" />
      <AppArt v-else-if="row.art" :app-key="row.art" class="size-11 shrink-0 lg:size-12" />
      <span
        v-else-if="row.icon"
        :class="[
          'flex size-11 shrink-0 items-center justify-center rounded-xl lg:size-12',
          row.warn
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
            : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
        ]"
      >
        <component :is="row.icon" class="size-5" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-base font-semibold text-gray-900 lg:text-lg dark:text-white">{{ row.title }}</span>
        <span v-if="row.detail" class="block text-sm text-gray-500 lg:text-base dark:text-gray-400">{{ row.detail }}</span>
      </span>
      <span
        v-if="row.badge"
        :class="[
          'shrink-0 rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums',
          row.warn
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
        ]"
      >
        {{ row.badge.toLocaleString() }}
      </span>
      <ChevronRight v-if="row.to || row.action" class="size-5 shrink-0 text-gray-300 dark:text-gray-600" />
    </component>
    <slot name="empty" />
  </div>
</template>
