<script setup>
import { computed } from 'vue'
import { Camera } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useInventoryOverview } from '../../composables/useInventoryOverview'

// The things with no picture yet, by where they are kept, so one walk round
// the building with the phone can photograph a whole shelf. Each opens
// straight onto the camera screen for that item, and saving brings you back
// here for the next one.

const { loading, unphotographed } = useInventoryOverview()

const byPlace = computed(() => {
  const groups = new Map()
  for (const item of unphotographed.value) {
    const label = item.location.trim() || 'No place set'
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(item)
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, list]) => ({ label, items: list }))
})

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = unphotographed.value.length
  return n ? `${n} to go` : 'Every item has a picture'
})
</script>

<template>
  <AppScreen title="To photograph" :subtitle="subtitle" :back="{ name: 'InventoryHome' }" root="/inventory">
    <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!byPlace.length">
      <ListRow title="Every item has a picture" subtitle="New things are photographed as they are added." muted />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in byPlace" :key="group.label" :title="group.label" :count="group.items.length">
        <ListRow
          v-for="item in group.items"
          :key="item.id"
          :to="{ name: 'InventoryEdit', params: { id: item.id }, query: { photo: '1', back: 'photos' } }"
          :title="item.name"
          :subtitle="item.category || 'No category'"
          no-chevron
        >
          <template #leading>
            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-gray-700/70 dark:text-gray-500">
              <Camera class="size-5" />
            </span>
          </template>
          <template #trailing>
            <span class="shrink-0 text-sm font-medium text-primary dark:text-primary-light">Photograph</span>
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>
