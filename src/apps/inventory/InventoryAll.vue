<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ItemList from '../../components/inventory/ItemList.vue'
import { useInventory } from '../../composables/useInventory'
import { usePermissions } from '../../composables/usePermissions'

// Everything the church owns, under its categories, with one search over all
// of it — a name, a place, who has it, "borrowed", "repair", "no photo". The
// + in the header is where a new thing is added, photo first.

const route = useRoute()
const { items, loading } = useInventory()
const { canManage } = usePermissions()
const canEdit = computed(() => canManage('inventory'))

const query = ref(String(route.query.q || ''))
watch(
  () => route.query.q,
  (q) => {
    query.value = String(q || '')
  }
)

const subtitle = computed(() => {
  if (loading.value) return ''
  const pieces = items.value.reduce((sum, item) => sum + item.quantity, 0)
  const n = items.value.length
  if (!n) return 'Nothing yet'
  return pieces > n ? `${n} items · ${pieces.toLocaleString()} pieces` : `${n} ${n === 1 ? 'item' : 'items'}`
})

const empty = computed(() => ({
  title: 'Nothing listed yet',
  detail: canEdit.value ? 'Tap + and photograph the first thing.' : 'Things will be here once they are added.',
}))
</script>

<template>
  <AppScreen title="All items" :subtitle="subtitle" :back="{ name: 'InventoryHome' }" root="/inventory" desk>
    <template #action>
      <RouterLink
        v-if="canEdit"
        :to="{ name: 'InventoryAdd' }"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover"
        aria-label="Add an item"
      >
        <Plus class="size-5" />
      </RouterLink>
    </template>

    <ItemList v-model:query="query" :items="items" :loading="loading" :empty="empty" />
  </AppScreen>
</template>
