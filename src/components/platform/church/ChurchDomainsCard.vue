<script setup>
import { computed, ref } from 'vue'
import { CheckCircle2, Globe, Info, Loader2, Plus, Trash2, WarningCircle } from '../../../icons'
import SectionCard from '../../common/SectionCard.vue'
import ConfirmationModal from '../../common/ConfirmationModal.vue'
import { callPlatform } from '../../../api/platformService'
import { useToast } from '../../../composables/useToast'

// Domains a church brings. Adding one connects it here, authorises it for
// Google sign-in, and — when the deployment has a Vercel token — adds it to
// the Vercel project; then says exactly which DNS record the church has to add
// at its registrar, which is the one step only they can take.

const props = defineProps({ church: { type: Object, required: true } })
const emit = defineEmits(['updated'])
const toast = useToast()

const host = ref('')
const primary = ref(false)
const adding = ref(false)
const result = ref(null)

const hosts = computed(() => props.church.domainDetails || [])

const STEP_LABELS = { mapping: 'Connected to this church', signIn: 'Google sign-in', vercel: 'Vercel project' }

const stepState = (value) => {
  const text = String(value || '')
  if (text === 'done' || text.startsWith('authorised') || text.startsWith('already')) return 'done'
  if (text === 'skipped') return 'skipped'
  return text.startsWith('failed') ? 'failed' : 'pending'
}

const stepText = (key, value) => {
  const text = String(value || '')
  if (key === 'vercel' && text === 'skipped') {
    return 'Not done: add the domain in the Vercel project’s Domains settings. (Set VERCEL_API_TOKEN and VERCEL_PROJECT_ID to have this done for you.)'
  }
  if (key === 'vercel' && text === 'needs verification') return 'Added, waiting for the DNS record below'
  if (text === 'done' || text === 'authorised') return 'Done'
  if (text === 'already authorised') return 'Already set up'
  return text.replace(/^failed: /, 'Failed: ')
}

const add = async () => {
  if (!host.value.trim()) return
  adding.value = true
  result.value = null
  try {
    const answer = await callPlatform('addDomain', { churchId: props.church.id, host: host.value, primary: primary.value })
    emit('updated', answer.church)
    result.value = answer.result
    host.value = ''
    primary.value = false
    toast.success(`${answer.result.host} connected`)
  } catch (error) {
    console.error('Error adding domain:', error)
    toast.error(error.message || 'Could not add that domain. Please try again.')
  } finally {
    adding.value = false
  }
}

const settingPrimary = ref('')
const makePrimary = async (name) => {
  settingPrimary.value = name || 'none'
  try {
    emit('updated', await callPlatform('setPrimaryDomain', { churchId: props.church.id, host: name }))
    toast.success(name ? `Links and emails now use ${name}` : 'Links and emails use the church’s own subdomain')
  } catch (error) {
    toast.error(error.message || 'Could not change that. Please try again.')
  } finally {
    settingPrimary.value = ''
  }
}

const pendingRemove = ref('')
const confirmRemove = async () => {
  const name = pendingRemove.value
  if (!name) return
  try {
    const answer = await callPlatform('removeDomain', { churchId: props.church.id, host: name })
    emit('updated', answer.church)
    if (result.value?.host === name) result.value = null
    toast.success(`${name} disconnected`)
  } catch (error) {
    toast.error(error.message || 'Could not remove that domain. Please try again.')
  } finally {
    pendingRemove.value = ''
  }
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <SectionCard :icon="Globe" title="Domains" subtitle="A domain the church owns, used instead of its subdomain">
    <ul v-if="hosts.length" class="divide-y divide-gray-100 dark:divide-gray-700">
      <li v-for="item in hosts" :key="item.host" class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="truncate font-mono text-sm text-gray-900 dark:text-white">{{ item.host }}</p>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <template v-if="church.primaryDomain === item.host">Used in emails and links</template>
            <button
              v-else
              type="button"
              @click="makePrimary(item.host)"
              :disabled="Boolean(settingPrimary)"
              class="font-medium text-primary hover:underline disabled:opacity-50 dark:text-primary-light"
            >
              Use in emails and links
            </button>
          </p>
        </div>
        <button
          type="button"
          @click="pendingRemove = item.host"
          :aria-label="`Disconnect ${item.host}`"
          class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>
    <p v-else class="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
      None yet. The church is reached at its own subdomain.
    </p>

    <form class="space-y-3 border-t border-gray-100 p-4 dark:border-gray-700" @submit.prevent="add">
      <label for="domain-host" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Add a domain</label>
      <div class="flex gap-2">
        <input
          id="domain-host"
          v-model="host"
          type="text"
          inputmode="url"
          autocapitalize="off"
          spellcheck="false"
          placeholder="app.yourchurch.com"
          :class="input"
        />
        <button
          type="submit"
          :disabled="!host.trim() || adding"
          :class="[
            'flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 transition-colors',
            host.trim() ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          <Loader2 v-if="adding" class="h-4 w-4 animate-spin" />
          <Plus v-else class="h-4 w-4" />
          Add
        </button>
      </div>
      <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input v-model="primary" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
        Use it in emails and links
      </label>
      <p class="text-xs text-gray-500 dark:text-gray-400">
        For sign-in from an iPhone home screen, the domain also needs its own redirect URI in Google Cloud — see the README.
      </p>
    </form>

    <!-- What adding did, and what is left for the church to do. -->
    <div v-if="result" class="space-y-3 border-t border-gray-100 p-4 dark:border-gray-700">
      <h3 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ result.host }}</h3>
      <ul class="space-y-2">
        <li v-for="(value, key) in result.steps" v-show="STEP_LABELS[key]" :key="key" class="flex items-start gap-2 text-sm">
          <CheckCircle2 v-if="stepState(value) === 'done'" class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <WarningCircle v-else-if="stepState(value) === 'failed'" class="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <Info v-else class="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span class="text-gray-700 dark:text-gray-300">
            <span class="font-medium">{{ STEP_LABELS[key] }}:</span> {{ stepText(key, value) }}
          </span>
        </li>
      </ul>

      <div class="rounded-lg bg-gray-50 p-3 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
        <p class="font-medium">The church adds this DNS record at its registrar:</p>
        <div v-if="result.dns?.record" class="mt-2 overflow-x-auto">
          <table class="w-full text-left font-mono text-xs">
            <thead class="text-gray-500 dark:text-gray-400">
              <tr><th class="pr-4 font-medium">Type</th><th class="pr-4 font-medium">Name</th><th class="font-medium">Value</th></tr>
            </thead>
            <tbody>
              <tr>
                <td class="pr-4">{{ result.dns.record.type }}</td>
                <td class="pr-4">{{ result.dns.record.name }}</td>
                <td>{{ result.dns.record.value }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="mt-1 text-xs">
          A <span class="font-mono">CNAME</span> from the subdomain to <span class="font-mono">cname.vercel-dns.com</span>, or for a bare
          domain an <span class="font-mono">A</span> record to <span class="font-mono">76.76.21.21</span>. Vercel's Domains page shows the exact record.
        </p>
        <ul v-if="result.steps?.verification?.length" class="mt-2 space-y-1 font-mono text-xs">
          <li v-for="item in result.steps.verification" :key="item.value">
            Also {{ item.type }} {{ item.domain }} = {{ item.value }}
          </li>
        </ul>
      </div>
    </div>

    <ConfirmationModal
      :show="Boolean(pendingRemove)"
      title="Disconnect domain"
      :message="`Disconnect ${pendingRemove}? It stops opening this church straight away.` "
      confirm-text="Disconnect"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="(open) => { if (!open) pendingRemove = '' }"
      @confirm="confirmRemove"
      @cancel="pendingRemove = ''"
    />
  </SectionCard>
</template>
