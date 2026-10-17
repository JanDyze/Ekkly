<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ItemList from '../../components/inventory/ItemList.vue'
import { useInventory } from '../../composables/useInventory'

// What is kept in one place, under its categories: the same list as All
// items, asked of one shelf. '-' in the address is the things with no place
// set, which is the list to work through when tidying the records.

const route = useRoute()
const { items, loading } = useInventory()

const placeName = computed(() => String(route.params.place || ''))
const unplaced = computed(() => placeName.value === '-')
const title = computed(() => (unplaced.value ? 'No place set' : placeName.value))

const here = computed(() =>
  items.value.filter((item) =>
    unplaced.value ? !item.location.trim() : item.location.trim().toLowerCase() === placeName.value.toLowerCase()
  )
)

const query = ref('')
const subtitle = computed(() => (loading.value ? '' : `${here.value.length} ${here.value.length === 1 ? 'thing' : 'things'}`))
</script>

<template>
  <AppScreen :title="title" :subtitle="subtitle" :back="{ name: 'InventoryPlaces' }" root="/inventory" desk>
    <ItemList
      v-model:query="query"
      :items="here"
      :loading="loading"
      :empty="{ title: 'Nothing kept here', detail: 'Things moved elsewhere leave this list on their own.' }"
    />
  </AppScreen>
</template>
