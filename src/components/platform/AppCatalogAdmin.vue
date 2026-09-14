<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Save, Storefront } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ToggleSwitch from '../common/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import { usePlatformConsole } from '../../composables/usePlatformConsole'
import { centavosToInput, formatMoney, parseAmount } from '../../utils/moneyUtils'

// The price list. Each app has a monthly price, whether it is on offer, and the
// sentence a church reads when deciding whether it wants it. A church's bill is
// the sum of the apps it has on, unless its billing carries a custom price.
//
// Taking an app off offer stops churches turning it on; churches that already
// have it keep it.

const toast = useToast()
const { config, loadConfig, saveConfig } = usePlatformConsole()

const rows = ref([])
const loading = ref(true)

const fill = (catalog) => {
  rows.value = (catalog || []).map((app) => ({
    ...app,
    priceInput: centavosToInput(app.price),
    defaultDescription: app.description,
  }))
}

onMounted(async () => {
  try {
    await loadConfig()
  } catch (error) {
    toast.error(error.message || 'Could not load the prices.')
  } finally {
    loading.value = false
  }
})

watch(() => config.value?.catalog, fill, { immediate: true })

const groups = computed(() => {
  const out = []
  rows.value.forEach((row) => {
    let group = out.find((g) => g.label === row.group)
    if (!group) out.push((group = { label: row.group, rows: [] }))
    group.rows.push(row)
  })
  return out
})

const stored = computed(() => new Map((config.value?.catalog || []).map((a) => [a.key, a])))

const changed = computed(() =>
  rows.value.some((row) => {
    const before = stored.value.get(row.key)
    return (
      !before ||
      parseAmount(row.priceInput) !== before.price ||
      row.available !== before.available ||
      row.description.trim() !== before.description
    )
  })
)

const everything = computed(() => rows.value.reduce((n, row) => n + parseAmount(row.priceInput), 0))

const saving = ref(false)
const save = async () => {
  saving.value = true
  try {
    await saveConfig('saveCatalog', {
      apps: rows.value.map((row) => ({
        key: row.key,
        price: parseAmount(row.priceInput),
        available: row.available,
        description: row.description,
      })),
    })
    toast.success('Prices saved')
  } catch (error) {
    console.error('Error saving prices:', error)
    toast.error(error.message || 'Could not save the prices. Please try again.')
  } finally {
    saving.value = false
  }
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="space-y-4">
    <SectionCard
      :icon="Storefront"
      title="Apps & prices"
      :subtitle="`Every app together: ${formatMoney(everything)} a month`"
    >
      <div v-if="loading && !rows.length" class="space-y-3 p-4">
        <div v-for="i in 5" :key="i" class="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
      </div>

      <template v-else>
        <section v-for="group in groups" :key="group.label">
          <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
            <span class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ group.label }}</span>
            <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ group.rows.length }}</span>
          </div>
          <ul class="divide-y divide-gray-100 dark:divide-gray-700">
            <li v-for="row in group.rows" :key="row.key" class="space-y-2 px-4 py-3">
              <div class="flex items-center gap-3">
                <div class="min-w-0 flex-1">
                  <p class="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
                    <span class="truncate">{{ row.name }}</span>
                    <span v-if="row.core" class="shrink-0 text-xs font-normal text-gray-400">always on — its price is the base fee</span>
                  </p>
                </div>
                <div class="relative w-32 shrink-0">
                  <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">₱</span>
                  <input
                    v-model="row.priceInput"
                    type="text"
                    inputmode="decimal"
                    :aria-label="`${row.name} monthly price`"
                    :class="[input, 'pl-7 text-right tabular-nums']"
                  />
                </div>
                <ToggleSwitch
                  v-if="!row.core"
                  v-model="row.available"
                  :label="`${row.name} on offer`"
                />
                <span v-else class="w-11 shrink-0"></span>
              </div>
              <textarea
                v-model="row.description"
                rows="2"
                maxlength="300"
                :aria-label="`${row.name} description`"
                :class="[input, 'resize-none text-xs']"
              ></textarea>
              <p v-if="!row.core && !row.available" class="text-xs text-amber-600 dark:text-amber-400">
                Not on offer: churches that have it keep it, others cannot turn it on.
              </p>
            </li>
          </ul>
        </section>

        <div class="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <button
            v-if="changed"
            type="button"
            @click="fill(config?.catalog)"
            class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            @click="save"
            :disabled="!changed || saving"
            :class="[
              'flex items-center gap-2 rounded-lg px-4 py-2 transition-colors',
              changed ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
            ]"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Save prices
          </button>
        </div>
      </template>
    </SectionCard>
  </div>
</template>
