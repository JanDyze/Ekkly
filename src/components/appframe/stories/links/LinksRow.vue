<script setup>
import { Check, MoreHorizontal } from '../../../../icons'

// One link as the page lists it: its site's mark, its title, the line under
// it (what it is for, or where it goes), and the button for its actions,
// which shows a tick for a moment once the link has been copied.

const props = defineProps({
  link: { type: Object, required: true },
  copied: { type: Boolean, default: false },
  tapMore: { type: Boolean, default: false },
})
</script>

<template>
  <div class="flex items-center rounded-xl">
    <span class="flex min-w-0 flex-1 items-center gap-3 px-2 py-2">
      <span class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900">
        <component :is="props.link.icon" class="size-5" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ props.link.title }}</span>
        <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ props.link.note }}</span>
      </span>
    </span>
    <span
      :class="[
        'relative mr-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400',
        props.tapMore ? 'st-tap bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-white' : '',
      ]"
    >
      <Check v-if="props.copied" class="st-pop size-4 text-emerald-500" />
      <MoreHorizontal v-else class="size-4" />
    </span>
  </div>
</template>
