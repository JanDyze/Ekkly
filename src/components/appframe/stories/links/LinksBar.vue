<script setup>
import { ListFilter, MagnifyingGlass, Plus } from '../../../../icons'

// The bar over the links, as views/Links.vue draws it on a phone: the search
// folded to a button, the category filter (filled, and named, once one is
// chosen) and Add.

const props = defineProps({
  filter: { type: String, default: 'All' },
  tapFilter: { type: Boolean, default: false },
  tapAdd: { type: Boolean, default: false },
})
</script>

<template>
  <div class="flex items-center gap-1.5 rounded-xl border border-gray-200/80 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/95">
    <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
      <MagnifyingGlass class="size-5" />
    </span>
    <span class="ml-auto flex items-center gap-1.5">
      <span
        :class="[
          'relative flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg',
          props.filter !== 'All' ? 'st-filled bg-primary px-2.5 text-white' : 'w-10 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
          props.tapFilter ? 'st-tap' : '',
        ]"
      >
        <ListFilter class="size-5 shrink-0" />
        <span v-if="props.filter !== 'All'" class="text-sm font-semibold">{{ props.filter }}</span>
      </span>
      <span
        :class="[
          'st-filled relative flex size-10 shrink-0 items-center justify-center rounded-lg text-white',
          props.tapAdd ? 'st-tap bg-primary-hover' : 'bg-primary',
        ]"
      >
        <Plus class="size-5" />
      </span>
    </span>
  </div>
</template>
