<script setup>
import { computed } from 'vue'
import { MagnifyingGlass } from '../../icons'
import ListGroup from '../appframe/ListGroup.vue'
import ListRow from '../appframe/ListRow.vue'
import ItemRow from './ItemRow.vue'
import { byName, groupItems, matchesItemQuery } from '../../utils/inventoryUtils'

// The list most of the Inventory app's screens are: a search over everything
// a row says, then the items, under their categories or in one block, each a
// row (ItemRow). Loading draws rows' shapes, and an empty list says why it is
// empty — nothing yet, or nothing matching.

const props = defineProps({
  items: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  // 'category', or '' for one alphabetical block.
  groupBy: { type: String, default: 'category' },
  // What to say when there is nothing at all, as { title, detail }.
  empty: { type: Object, default: () => ({ title: 'Nothing here', detail: '' }) },
  // A row's quiet line, when the screen has something better than the place.
  subtitleOf: { type: Function, default: null },
  placeholder: { type: String, default: 'Search — a name, a place, “borrowed”' },
})

const query = defineModel('query', { type: String, default: '' })

const matching = computed(() => props.items.filter((item) => matchesItemQuery(item, query.value)))

const groups = computed(() =>
  props.groupBy === 'category'
    ? groupItems(matching.value, (item) => item.category, 'No category')
    : [{ key: 'all', label: '', items: [...matching.value].sort(byName) }]
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <label v-if="items.length || query" class="relative block">
      <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="search"
        autocomplete="off"
        enterkeyhint="search"
        :placeholder="placeholder"
        aria-label="Search items"
        class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
    </label>
    <p v-if="query && matching.length" class="-mt-2 px-1 text-xs tabular-nums text-gray-500 dark:text-gray-400">
      {{ matching.length }} of {{ items.length }}
    </p>

    <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="n in 6" :key="n" class="flex h-16 items-center gap-3 rounded-2xl bg-white px-4 ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
        <span class="size-11 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-600" />
        <span class="flex-1">
          <span class="block h-3.5 w-2/5 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
          <span class="mt-2 block h-3 w-1/4 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
        </span>
      </div>
    </div>

    <ListGroup v-else-if="!matching.length">
      <ListRow
        :title="query ? `Nothing matches “${query}”` : empty.title"
        :subtitle="query ? 'Try a name, a place, or a word like “borrowed” or “repair”.' : empty.detail"
        muted
      />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in groups" :key="group.key" :title="group.label" :count="group.label ? group.items.length : null">
        <ItemRow v-for="item in group.items" :key="item.id" :item="item" :subtitle="subtitleOf ? subtitleOf(item) : ''" />
      </ListGroup>
    </div>
  </div>
</template>
