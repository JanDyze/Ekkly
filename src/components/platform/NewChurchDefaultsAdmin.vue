<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Loader2, PuzzlePiece, Save, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ToggleSwitch from '../common/ToggleSwitch.vue'
import { useToast } from '../../composables/useToast'
import { usePlatformConsole } from '../../composables/usePlatformConsole'
import { APPS } from '../../../lib/apps.js'

// What a church has on the day it is approved: its timezone, whether its
// public page is switched on, which apps it starts with, how long its trial
// runs, and the ministries and tags already in place so its administrator is
// not facing empty lists. Changes here apply to churches approved from now on.

const toast = useToast()
const { config, loadConfig, saveConfig } = usePlatformConsole()

const form = ref(null)
const loading = ref(true)

const fill = (defaults) => {
  if (!defaults) return
  form.value = {
    timezone: defaults.timezone,
    landingEnabled: defaults.landingEnabled,
    allApps: !defaults.apps,
    apps: new Set(defaults.apps || APPS.map((a) => a.key)),
    ministries: [...defaults.ministries],
    tags: [...defaults.tags],
    trialDays: defaults.trialDays,
  }
}

onMounted(async () => {
  try {
    await loadConfig()
  } catch (error) {
    toast.error(error.message || 'Could not load the defaults.')
  } finally {
    loading.value = false
  }
})
watch(() => config.value?.defaults, fill, { immediate: true })

const zones = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return []
  }
})()

const toggleApp = (key, on) => {
  const next = new Set(form.value.apps)
  if (on) next.add(key)
  else next.delete(key)
  form.value.apps = next
}

// Ministries and tags are typed one at a time and shown as chips.
const draft = ref({ ministries: '', tags: '' })
const addName = (field) => {
  const name = draft.value[field].trim()
  if (name && !form.value[field].some((n) => n.toLowerCase() === name.toLowerCase())) form.value[field].push(name)
  draft.value[field] = ''
}
const removeName = (field, index) => form.value[field].splice(index, 1)

const saving = ref(false)
const save = async () => {
  saving.value = true
  try {
    await saveConfig('saveDefaults', {
      defaults: {
        timezone: form.value.timezone,
        landingEnabled: form.value.landingEnabled,
        apps: form.value.allApps ? null : [...form.value.apps],
        ministries: form.value.ministries,
        tags: form.value.tags,
        trialDays: Number(form.value.trialDays) || 0,
      },
    })
    toast.success('Defaults saved')
  } catch (error) {
    console.error('Error saving defaults:', error)
    toast.error(error.message || 'Could not save the defaults. Please try again.')
  } finally {
    saving.value = false
  }
}

const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const LISTS = computed(() => [
  { field: 'ministries', label: 'Starter ministries', placeholder: 'Worship team', hint: 'A ministry grants access in the church, so keep these to the ones nearly every church has.' },
  { field: 'tags', label: 'Starter tags', placeholder: 'First Timer', hint: 'Labels for people. They grant nothing.' },
])
</script>

<template>
  <SectionCard :icon="PuzzlePiece" title="New church defaults" subtitle="Applied when a church request is approved">
    <div v-if="loading && !form" class="space-y-3 p-4">
      <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
    </div>

    <form v-else-if="form" class="space-y-5 p-4" @submit.prevent="save">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label for="defaults-zone" :class="label">Timezone</label>
          <select v-if="zones.length" id="defaults-zone" v-model="form.timezone" :class="input">
            <option v-for="zone in zones" :key="zone" :value="zone">{{ zone }}</option>
          </select>
          <input v-else id="defaults-zone" v-model="form.timezone" type="text" :class="input" />
        </div>
        <div>
          <label for="defaults-trial" :class="label">Free trial (days)</label>
          <input id="defaults-trial" v-model="form.trialDays" type="number" min="0" max="365" :class="input" />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">0 starts it with no plan instead.</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-gray-900 dark:text-white">Public page on from the start</p>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Off is safer: its starting words are another church's example until edited.</p>
        </div>
        <ToggleSwitch v-model="form.landingEnabled" label="Public page on from the start" />
      </div>

      <div>
        <div class="flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-white">Every app</p>
            <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Turn off to choose which apps a new church starts with.</p>
          </div>
          <ToggleSwitch v-model="form.allApps" label="New churches start with every app" />
        </div>
        <ul v-if="!form.allApps" class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <li
            v-for="app in APPS"
            :key="app.key"
            class="flex items-center justify-between gap-3 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-700"
          >
            <span class="truncate text-sm text-gray-900 dark:text-white">{{ app.name }}</span>
            <ToggleSwitch
              :model-value="app.core || form.apps.has(app.key)"
              :disabled="app.core"
              :label="`New churches start with ${app.name}`"
              @update:model-value="toggleApp(app.key, $event)"
            />
          </li>
        </ul>
      </div>

      <div v-for="list in LISTS" :key="list.field">
        <label :for="`defaults-${list.field}`" :class="label">{{ list.label }}</label>
        <div v-if="form[list.field].length" class="mb-2 flex flex-wrap gap-1.5">
          <span
            v-for="(name, index) in form[list.field]"
            :key="name"
            class="flex items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1 text-sm text-primary dark:bg-primary/20 dark:text-primary-light"
          >
            {{ name }}
            <button type="button" @click="removeName(list.field, index)" class="rounded-full p-0.5 hover:bg-primary/20" :aria-label="`Remove ${name}`">
              <X class="h-3.5 w-3.5" />
            </button>
          </span>
        </div>
        <input
          :id="`defaults-${list.field}`"
          v-model="draft[list.field]"
          type="text"
          maxlength="60"
          :placeholder="`${list.placeholder}, then Enter`"
          :class="input"
          @keydown.enter.prevent="addName(list.field)"
          @blur="addName(list.field)"
        />
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ list.hint }}</p>
      </div>

      <div class="flex justify-end">
        <button
          type="submit"
          :disabled="saving"
          class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-60"
        >
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          <Save v-else class="h-4 w-4" />
          Save defaults
        </button>
      </div>
    </form>
  </SectionCard>
</template>
