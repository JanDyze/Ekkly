<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, Robot, Save } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import SectionCardSkeleton from '../common/SectionCardSkeleton.vue'
import ToggleSwitch from '../common/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import { usePlatformConsole } from '../../composables/usePlatformConsole'
import { AI_FEATURES, AI_MODELS, isModelId, modelLabel } from '../../../lib/aiModels.js'

// The platform's AI: whether it runs at all, and which Claude model each
// feature uses. Every call is paid for by the platform, which is why this is
// here and not in a church's Settings. A church only gets AI if the switch
// here is on and its plan includes the AI assist app. Changes reach the
// endpoints within a minute.

const toast = useToast()
const { config, churches, usage, loadConfig, saveConfig, loadChurches } = usePlatformConsole()

const form = ref(null)
const custom = ref({})

const fill = (ai) => {
  if (!ai) return
  form.value = { enabled: ai.enabled, models: { ...ai.models } }
  // A model that is not one of the offered ones was typed in; keep showing
  // the box it was typed into.
  custom.value = Object.fromEntries(
    AI_FEATURES.map((f) => [f.key, f.models.includes(ai.models[f.key]) ? '' : ai.models[f.key]])
  )
}

onMounted(async () => {
  try {
    await Promise.all([loadConfig(), loadChurches()])
  } catch (error) {
    toast.error(error.message || 'Could not load the AI settings.')
  }
})
watch(() => config.value?.ai, fill, { immediate: true })

const choose = (feature, value) => {
  if (value === '__custom') {
    custom.value[feature] = custom.value[feature] || 'claude-'
    form.value.models[feature] = custom.value[feature]
  } else {
    custom.value[feature] = ''
    form.value.models[feature] = value
  }
}

const invalid = computed(() => form.value && AI_FEATURES.some((f) => !isModelId(form.value.models[f.key])))

const callsThisMonth = computed(() =>
  churches.value
    .map((church) => {
      const ai = usage.value[church.id]?.ai || {}
      return { church, total: AI_FEATURES.reduce((n, f) => n + (ai[f.key] || 0), 0) }
    })
    .filter((row) => row.total)
    .sort((a, b) => b.total - a.total)
)

const saving = ref(false)
const save = async () => {
  saving.value = true
  try {
    await saveConfig('saveAi', { ai: form.value })
    toast.success('AI settings saved')
  } catch (error) {
    console.error('Error saving AI settings:', error)
    toast.error(error.message || 'Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="space-y-4">
    <SectionCardSkeleton v-if="!form" :rows="4" />
    <SectionCard v-else :icon="Robot" title="AI" subtitle="Which Claude model each feature runs on. The platform pays for every call.">
      <form v-if="form" class="divide-y divide-gray-100 dark:divide-gray-700" @submit.prevent="save">
        <div class="flex items-center gap-3 px-4 py-4">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white">AI features on</p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Off stops every AI call on every church at once, whatever their plan says.
            </p>
          </div>
          <ToggleSwitch v-model="form.enabled" label="AI features on" />
        </div>

        <div v-for="feature in AI_FEATURES" :key="feature.key" class="space-y-2 px-4 py-4" :class="{ 'opacity-60': !form.enabled }">
          <div>
            <label :for="`model-${feature.key}`" class="block text-sm font-medium text-gray-900 dark:text-white">{{ feature.label }}</label>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{{ feature.description }}</p>
          </div>
          <select
            :id="`model-${feature.key}`"
            :value="custom[feature.key] ? '__custom' : form.models[feature.key]"
            @change="choose(feature.key, $event.target.value)"
            :class="input"
          >
            <option v-for="id in feature.models" :key="id" :value="id">
              {{ modelLabel(id) }} — {{ AI_MODELS.find((m) => m.id === id)?.note }}{{ id === feature.defaultModel ? ' (default)' : '' }}
            </option>
            <option value="__custom">Another model id…</option>
          </select>
          <div v-if="custom[feature.key]">
            <input
              v-model="form.models[feature.key]"
              @input="custom[feature.key] = form.models[feature.key] || 'claude-'"
              type="text"
              spellcheck="false"
              :aria-label="`${feature.label} model id`"
              :class="[input, 'font-mono', isModelId(form.models[feature.key]) ? '' : 'border-red-400 dark:border-red-500']"
            />
            <p class="mt-1 text-xs text-amber-600 dark:text-amber-400">
              A model not on the list has not been tried with this feature. If it rejects the request, the feature stops working until this is changed back.
            </p>
          </div>
        </div>

        <div class="flex justify-end px-4 py-3">
          <button
            type="submit"
            :disabled="invalid || saving"
            class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Save v-else class="h-4 w-4" />
            Save
          </button>
        </div>
      </form>
    </SectionCard>

    <SectionCard :icon="Robot" title="AI calls this month" subtitle="Per church, counted as each call finishes">
      <p v-if="!callsThisMonth.length" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        No AI calls yet this month.
      </p>
      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
        <li v-for="row in callsThisMonth" :key="row.church.id" class="flex items-center justify-between gap-3 px-4 py-3">
          <span class="truncate text-sm text-gray-900 dark:text-white">{{ row.church.name }}</span>
          <span class="text-sm font-medium tabular-nums text-gray-900 dark:text-white">{{ row.total }}</span>
        </li>
      </ul>
    </SectionCard>
  </div>
</template>
