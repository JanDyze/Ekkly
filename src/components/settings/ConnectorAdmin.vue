<script setup>
import { onMounted, ref } from 'vue'
import { AlertTriangle, Copy, Loader2, Sparkles, Trash2 } from '../../icons'
import { useToast } from '../../composables/useToast'
import { copyText } from '../../utils/clipboard'
import { timeAgo } from '../../utils/timeUtils'
import {
  getConnectorStatus,
  issueConnectorToken,
  revokeConnectorToken,
} from '../../api/mcpTokenService'

// This church's Claude connector: the link that lets Claude answer questions
// about the church's records in a conversation (see MCP.md).
//
// Each church has its own link, and the link opens that church and no other.
// It is shown once, when it is made — only a fingerprint of it is kept — so
// making a new one is also how an old one that went astray is switched off.

const toast = useToast()

const loading = ref(true)
const status = ref({ exists: false })
const failed = ref('')
const busy = ref(false)
const allowWrites = ref(false)
const issued = ref(null) // { url } — only for as long as this page is open

const load = async () => {
  loading.value = true
  failed.value = ''
  try {
    status.value = await getConnectorStatus()
  } catch (error) {
    failed.value = error.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

const issue = async () => {
  if (status.value.exists && !window.confirm('Make a new link? The current one stops working straight away.')) return
  busy.value = true
  try {
    const { url } = await issueConnectorToken(allowWrites.value)
    issued.value = { url }
    await load()
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = false
  }
}

const revoke = async () => {
  if (!window.confirm('Switch the connector off? Any conversation using the link loses access.')) return
  busy.value = true
  try {
    await revokeConnectorToken()
    issued.value = null
    await load()
    toast.success('Connector switched off')
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = false
  }
}

const copy = async () => {
  if (await copyText(issued.value.url)) toast.success('Link copied')
  else toast.error('Could not copy. Select the link and copy it yourself.')
}
</script>

<template>
  <section class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
    <div class="flex items-start gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
      <div class="p-2 rounded-lg bg-primary/10 shrink-0">
        <Sparkles class="h-5 w-5 text-primary dark:text-primary-light" />
      </div>
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Claude connector</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          A link that lets Claude answer questions about this church's records in a
          conversation. Add it in Claude under Settings &rsaquo; Connectors.
        </p>
      </div>
    </div>

    <div v-if="loading" class="p-4">
      <div class="h-14 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"></div>
    </div>

    <p v-else-if="failed" class="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
      {{ failed }}
    </p>

    <div v-else class="p-4 space-y-4">
      <!-- Just made: the only time the link can be seen -->
      <div
        v-if="issued"
        class="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3"
      >
        <p class="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
          <AlertTriangle class="h-4 w-4" />
          Copy it now — it is not shown again
        </p>
        <p class="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
          Anyone holding this link can read every record the church keeps. Treat it like a
          password.
        </p>
        <div class="mt-2 flex items-center gap-2">
          <input
            :value="issued.url"
            readonly
            class="h-10 min-w-0 flex-1 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-gray-900 px-3 font-mono text-xs text-gray-800 dark:text-gray-200"
            @focus="$event.target.select()"
          />
          <button
            class="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-semibold text-white"
            @click="copy"
          >
            <Copy class="h-4 w-4" />
            Copy
          </button>
        </div>
      </div>

      <p v-if="status.exists" class="text-sm text-gray-700 dark:text-gray-300">
        The connector is <span class="font-semibold text-emerald-600 dark:text-emerald-400">on</span>,
        {{ status.allowWrites ? 'and can add and change records' : 'read-only' }}.
        <span v-if="status.createdAt" class="text-gray-500 dark:text-gray-400">
          Made {{ timeAgo(new Date(status.createdAt)) }}<template v-if="status.createdByEmail"> by {{ status.createdByEmail }}</template>.
        </span>
      </p>
      <p v-else class="text-sm text-gray-500 dark:text-gray-400">The connector is off.</p>

      <label class="flex items-start gap-3">
        <input
          v-model="allowWrites"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span class="text-sm text-gray-700 dark:text-gray-300">
          Let Claude add and change records
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            Adding people, events, tasks, songs, prayer concerns and ledger entries. Nothing
            is ever deleted. Leave off for read-only.
          </span>
        </span>
      </label>

      <div class="flex gap-2">
        <button
          :disabled="busy"
          class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-60"
          @click="issue"
        >
          <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
          {{ status.exists ? 'Make a new link' : 'Make a link' }}
        </button>
        <button
          v-if="status.exists"
          :disabled="busy"
          class="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 px-3 text-sm font-semibold text-red-600 dark:text-red-400 disabled:opacity-60"
          @click="revoke"
        >
          <Trash2 class="h-4 w-4" />
          Switch off
        </button>
      </div>
    </div>
  </section>
</template>
