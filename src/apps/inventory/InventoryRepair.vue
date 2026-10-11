<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ItemList from '../../components/inventory/ItemList.vue'
import { useInventoryOverview } from '../../composables/useInventoryOverview'
import { daysBetween } from '../../utils/taskUtils'

// What is broken, the longest-waiting first, each row saying what is wrong
// with it and how long it has waited, so whoever takes things to be fixed can
// plan one trip for several. An item is marked fixed from its own page.

const { loading, needsRepair, today } = useInventoryOverview()

const waited = (item) => {
  if (!item.conditionSince) return ''
  const days = Math.max(0, daysBetween(item.conditionSince, today))
  if (days === 0) return 'since today'
  if (days < 14) return `${days} ${days === 1 ? 'day' : 'days'}`
  return `${Math.round(days / 7)} weeks`
}

const lineOf = (item) => [item.repairNote || 'Nothing said about what is wrong', waited(item)].filter(Boolean).join(' · ')

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = needsRepair.value.length
  return n ? `${n} waiting` : 'Everything works'
})
</script>

<template>
  <AppScreen title="Needs repair" :subtitle="subtitle" :back="{ name: 'InventoryHome' }" root="/inventory">
    <ItemList
      :items="needsRepair"
      :loading="loading"
      group-by=""
      :subtitle-of="lineOf"
      placeholder="Search what needs repair"
      :empty="{ title: 'Nothing needs repair', detail: 'Mark something as needing repair from its page, and it waits here.' }"
    />
  </AppScreen>
</template>
