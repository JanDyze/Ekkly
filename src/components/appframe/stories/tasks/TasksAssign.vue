<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, MagnifyingGlass, User, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { CAST, nameOf, person } from './cast'

// Scene: handed to the right person. The task's sheet is open; "Jo" is typed
// into Who is doing it, the roll offers the two it matches, Joy is tapped and
// becomes a name on the task, and Save puts it on her list.

const search = ref('')
const picking = ref(false)
const picked = ref(false)
const saving = ref(false)
const { at, type, still } = useSceneTimeline()

const typed = type(search, 'Jo', 900, 180)
at(typed + 500, () => (picking.value = true))
at(typed + 800, () => {
  picked.value = true
  search.value = ''
})
at(typed + 1900, () => (saving.value = true))

const joy = person('joy')
const MATCHES = computed(() => (search.value ? CAST.filter((p) => p.first.startsWith('Jo')) : []))

const FIELDS = [
  { label: 'Due', value: 'Sat, Oct 17' },
  { label: 'Priority', value: 'Normal' },
]
</script>

<template>
  <div class="flex h-full flex-col px-4 pt-5">
    <div class="st-rise flex items-center justify-between">
      <p class="text-lg font-semibold">New task</p>
      <X class="size-5 text-gray-400" />
    </div>

    <div class="st-rise mt-3" style="--d: 60ms">
      <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Task</p>
      <div class="flex h-9 items-center rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">Print the bulletins</div>
    </div>

    <div class="st-rise relative mt-3" style="--d: 120ms">
      <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Who is doing it</p>
      <div v-if="picked" class="st-pop mb-1.5 flex">
        <span class="flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-sm text-primary dark:bg-primary-light/15 dark:text-primary-light">
          {{ nameOf(joy) }}
          <X class="size-3.5" />
        </span>
      </div>
      <div class="flex h-9 items-center gap-2 rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
        <MagnifyingGlass class="size-4 shrink-0 text-gray-400" />
        <span :class="['flex-1', search ? '' : 'text-gray-400', search && !still ? 'st-caret' : '']">{{ search || (picked ? 'Add someone else...' : 'Search people...') }}</span>
        <ChevronDown class="size-4 text-gray-400" />
      </div>
      <!-- The roll's matches, over what is below, as the picker's list is. -->
      <div
        v-if="MATCHES.length && !picked"
        class="st-rise absolute inset-x-0 top-full z-10 mt-1 rounded-lg bg-white py-1 ring-1 ring-gray-300 dark:bg-gray-800 dark:ring-gray-600"
      >
        <div
          v-for="p in MATCHES"
          :key="p.id"
          :class="[
            'relative flex items-center gap-2 px-3 py-2 text-sm',
            picking && p.id === 'joy' ? 'st-tap bg-gray-100 text-primary dark:bg-gray-700 dark:text-primary-light' : '',
          ]"
        >
          <User class="size-4 shrink-0 text-gray-400" />
          <span class="text-gray-900 dark:text-white">{{ nameOf(p) }}</span>
        </div>
      </div>
      <p class="mt-1 text-[11px] text-gray-500 dark:text-gray-400">Anyone listed here can tick it off themselves.</p>
    </div>

    <div class="st-rise mt-3 grid grid-cols-2 gap-2.5" style="--d: 180ms">
      <div v-for="f in FIELDS" :key="f.label">
        <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">{{ f.label }}</p>
        <div class="flex h-9 items-center rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">{{ f.value }}</div>
      </div>
    </div>

    <div class="st-rise mt-3" style="--d: 240ms">
      <p class="mb-1 text-xs font-medium text-gray-600 dark:text-gray-300">Ministry</p>
      <div class="flex h-9 items-center rounded-lg bg-white px-2.5 text-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">Media</div>
    </div>

    <div class="mt-auto pb-5">
      <span
        :class="['st-rise st-filled relative flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-white', saving ? 'st-tap bg-primary-hover' : 'bg-primary']"
        style="--d: 300ms"
      >
        {{ saving ? 'On Joy’s list' : 'Save' }}
      </span>
    </div>
  </div>
</template>
