<script setup>
// A list where each entry is two lines: the thing, and a line about it.
//
// The church's core values and its basis of faith are the same editor with
// different words — a phrase and what it means, an article and the scripture it
// rests on — so they are one component rather than two blocks that would drift
// the moment either was touched.
//
// The rows themselves are edited in place: the array belongs to whatever draft
// was passed in, and add and remove hand back a new one.
import { Plus, Trash2 } from '../../icons'

const props = defineProps({
  label: { type: String, required: true },
  /** Which keys the two lines are stored under, and what to show in each. */
  first: { type: Object, required: true },
  second: { type: Object, required: true },
  /** Shown in place of the rows while there are none. */
  emptyText: { type: String, default: 'None yet.' },
})

const items = defineModel({ type: Array, default: () => [] })

const blank = () => ({ [props.first.key]: '', [props.second.key]: '' })

const add = () => {
  items.value = [...(items.value || []), blank()]
}

const remove = (index) => {
  items.value = items.value.filter((_, i) => i !== index)
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="min-w-0 text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</p>
      <button
        type="button"
        @click="add"
        class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary dark:text-primary-light"
      >
        <Plus class="h-3.5 w-3.5" />
        Add
      </button>
    </div>

    <div v-if="(items || []).length" class="space-y-2">
      <div
        v-for="(entry, index) in items"
        :key="index"
        class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-600"
      >
        <div class="flex items-center gap-2">
          <!-- A textarea for the first line too: an article of faith is a
               sentence, where a core value is two words, and one growing to fit
               is better than either being asked to sit in the other's box. -->
          <textarea
            v-model="entry[first.key]"
            rows="1"
            :placeholder="first.placeholder"
            :aria-label="`${label} ${index + 1}`"
            :class="[input, 'min-w-0 flex-1 resize-y']"
          ></textarea>
          <button
            type="button"
            @click="remove(index)"
            :aria-label="`Remove ${label.toLowerCase()} ${index + 1}`"
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
        <input
          v-model="entry[second.key]"
          type="text"
          :placeholder="second.placeholder"
          :aria-label="`${second.label} for ${label.toLowerCase()} ${index + 1}`"
          :class="input"
        />
      </div>
    </div>
    <p v-else class="text-xs italic text-gray-400 dark:text-gray-500">{{ emptyText }}</p>
  </div>
</template>
