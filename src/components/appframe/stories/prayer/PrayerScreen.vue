<script setup>
import { ChevronLeft, MagnifyingGlass, Plus } from '../../../../icons'
import AppArt from '../../../common/AppArt.vue'

// A list in the Prayer app as apps/prayer/PrayerList.vue lays it out: the
// section's header (the way back, its drawing, its name and how many, and +
// for a new concern), the search above the list, and the list under it, which
// each scene fills.

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  art: { type: String, required: true },
  // What has been typed into the search, and whether it has the focus.
  query: { type: String, default: '' },
  searching: { type: Boolean, default: false },
  caret: { type: Boolean, default: false },
  tapAdd: { type: Boolean, default: false },
})
</script>

<template>
  <div class="relative h-full">
    <div class="st-rise flex h-16 items-center gap-2 border-b border-gray-200/70 px-4 pt-2 dark:border-gray-800/70">
      <span class="-ml-2 flex size-10 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400"><ChevronLeft class="size-5" /></span>
      <AppArt :app-key="props.art" class="size-8 shrink-0" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-xl font-bold leading-tight tracking-tight">{{ props.title }}</span>
        <span v-if="props.subtitle" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ props.subtitle }}</span>
      </span>
      <span
        :class="[
          'st-filled relative flex size-10 shrink-0 items-center justify-center rounded-xl text-white',
          props.tapAdd ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
      >
        <Plus class="size-5" />
      </span>
    </div>

    <div class="flex flex-col gap-4 px-3 pt-4">
      <span
        :class="[
          'st-rise relative flex h-11 items-center rounded-xl border bg-white pl-10 pr-3 text-sm dark:bg-gray-800',
          props.searching ? 'border-transparent ring-2 ring-primary dark:ring-primary-light' : 'border-gray-200 dark:border-gray-700',
        ]"
        style="--d: 60ms"
      >
        <MagnifyingGlass class="absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
        <span :class="['truncate', props.query ? '' : 'text-gray-400', props.caret ? 'st-caret' : '']">{{ props.query || 'Search — a name, a word, “urgent”' }}</span>
      </span>
      <slot />
    </div>

    <slot name="over" />
  </div>
</template>
