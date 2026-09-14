<script setup>
import { computed, ref, watch } from 'vue'
import { Loader2, LockSimple, LockSimpleOpen, Save, SquaresFour } from '../../../icons'
import SectionCard from '../../common/SectionCard.vue'
import ToggleSwitch from '../../common/ToggleSwitch.vue'
import { callPlatform } from '../../../api/platformService'
import { useToast } from '../../../composables/useToast'
import { formatMoney } from '../../../utils/moneyUtils'
import { APP_KEYS } from '../../../../lib/apps.js'

// Which apps a church has. The church's own administrators can change this
// from their Settings; here the platform can too, and can lock an app off —
// a church that stopped paying for it, say — so they cannot turn it back on.

const props = defineProps({ church: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const toast = useToast()

const enabled = ref(new Set())
const locked = ref(new Set())

const reset = () => {
  enabled.value = new Set(props.church.plan?.apps || APP_KEYS)
  locked.value = new Set(props.church.plan?.lockedOff || [])
}
watch(() => props.church, reset, { immediate: true })

const catalog = computed(() => props.church.catalog || [])

// Replaced rather than mutated: a Set changed in place is not what the
// template is watching.
const toggle = (key, on) => {
  const next = new Set(enabled.value)
  if (on) next.add(key)
  else next.delete(key)
  enabled.value = next
}

const toggleLock = (key) => {
  const next = new Set(locked.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
    toggle(key, false)
  }
  locked.value = next
}

const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k))
const changed = computed(
  () =>
    !sameSet(enabled.value, new Set(props.church.plan?.apps || APP_KEYS)) ||
    !sameSet(locked.value, new Set(props.church.plan?.lockedOff || []))
)

const listTotal = computed(() =>
  catalog.value.filter((app) => enabled.value.has(app.key)).reduce((n, app) => n + (app.price || 0), 0)
)

const saving = ref(false)
const save = async () => {
  saving.value = true
  try {
    emit(
      'updated',
      await callPlatform('setChurchApps', {
        churchId: props.church.id,
        apps: [...enabled.value],
        lockedOff: [...locked.value],
      })
    )
    toast.success('Apps saved')
  } catch (error) {
    console.error('Error saving apps:', error)
    toast.error(error.message || 'Could not save the apps. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SectionCard
    :icon="SquaresFour"
    title="Apps"
    :subtitle="`${enabled.size} of ${catalog.length} on · ${formatMoney(listTotal)} a month at list price`"
  >
    <ul class="divide-y divide-gray-100 dark:divide-gray-700">
      <li v-for="app in catalog" :key="app.key" class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
            <span class="truncate">{{ app.name }}</span>
            <span v-if="app.core" class="shrink-0 text-xs font-normal text-gray-400">always on</span>
            <span v-else-if="!app.available" class="shrink-0 text-xs font-normal text-amber-600 dark:text-amber-400">not offered</span>
          </p>
          <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
            {{ app.price ? `${formatMoney(app.price)} a month` : 'No charge' }}
            <template v-if="locked.has(app.key)"> &middot; <span class="text-red-600 dark:text-red-400">locked off</span></template>
          </p>
        </div>
        <button
          v-if="!app.core"
          type="button"
          @click="toggleLock(app.key)"
          :aria-pressed="locked.has(app.key)"
          :aria-label="locked.has(app.key) ? `Let the church turn ${app.name} on` : `Lock ${app.name} off`"
          :title="locked.has(app.key) ? 'Locked off: the church cannot turn it on' : 'Lock it off'"
          :class="[
            'rounded-lg p-2 transition-colors',
            locked.has(app.key)
              ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700',
          ]"
        >
          <LockSimple v-if="locked.has(app.key)" class="h-4 w-4" />
          <LockSimpleOpen v-else class="h-4 w-4" />
        </button>
        <ToggleSwitch
          :model-value="enabled.has(app.key)"
          :label="`${app.name} on for this church`"
          :disabled="app.core || locked.has(app.key)"
          @update:model-value="toggle(app.key, $event)"
        />
      </li>
    </ul>
    <div class="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
      <button
        v-if="changed"
        type="button"
        @click="reset"
        class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
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
        Save apps
      </button>
    </div>
  </SectionCard>
</template>
