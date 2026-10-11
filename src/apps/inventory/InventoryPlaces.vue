<script setup>
import { computed } from 'vue'
import { MapPin } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import ItemThumb from '../../components/inventory/ItemThumb.vue'
import { useInventoryOverview } from '../../composables/useInventoryOverview'

// Where things are kept — the sound booth, the kitchen cabinet, the storeroom
// behind the stage — each with how many things are there and a few of their
// pictures, so the question "where do we keep the extension reels" is a look
// rather than a search. Each opens the list of what is there.

const { loading, places } = useInventoryOverview()

const subtitle = computed(() => {
  if (loading.value) return ''
  const named = places.value.filter((place) => place.key).length
  return named ? `${named} ${named === 1 ? 'place' : 'places'}` : 'No places set yet'
})

const routeOf = (place) => ({ name: 'InventoryPlace', params: { place: place.key ? place.label : '-' } })
const pictured = (place) => place.items.filter((item) => item.thumb).slice(0, 3)
</script>

<template>
  <AppScreen title="Places" :subtitle="subtitle" :back="{ name: 'InventoryHome' }" root="/inventory">
    <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!places.length">
      <ListRow title="No places yet" subtitle="Say where each thing is kept as it is added, and the places gather here." muted />
    </ListGroup>

    <ListGroup v-else>
      <ListRow
        v-for="place in places"
        :key="place.key || 'none'"
        :to="routeOf(place)"
        :title="place.label"
        :subtitle="`${place.items.length} ${place.items.length === 1 ? 'thing' : 'things'}`"
        :warn="!place.key"
      >
        <template #leading>
          <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
            <MapPin class="size-5" />
          </span>
        </template>
        <template #trailing>
          <span class="hidden shrink-0 -space-x-2 min-[380px]:flex">
            <ItemThumb v-for="item in pictured(place)" :key="item.id" :item="item" size="size-8 rounded-lg ring-2 ring-white dark:ring-gray-800" />
          </span>
        </template>
      </ListRow>
    </ListGroup>
  </AppScreen>
</template>
