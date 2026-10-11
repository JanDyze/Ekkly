<script setup>
import { ArrowLeft, Calendar, Menu } from '../../../../icons'
import { MEETING } from './cast'

// A meeting's header as views/MinuteDetails.vue draws it on a phone: the way
// back, the meeting's name and date, and the one button that opens the agenda.
// Under it, pinned, the part of the meeting that is open and what can be done
// with it, which each scene fills in.
</script>

<template>
  <div>
    <div class="flex items-center gap-1.5 rounded-t-[28px] border-b border-gray-200 bg-white px-2 pb-2 pt-5 dark:border-gray-700 dark:bg-gray-800">
      <span class="p-2 text-gray-600 dark:text-gray-300"><ArrowLeft class="size-5" /></span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-bold">{{ MEETING.title }}</span>
        <span class="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
          <Calendar class="size-3.5" />
          {{ MEETING.date }}
        </span>
      </span>
      <span class="p-2 text-gray-600 dark:text-gray-300"><Menu class="size-5" /></span>
    </div>
    <div class="flex h-11 items-center gap-2 border-b border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-800">
      <slot />
    </div>
  </div>
</template>
