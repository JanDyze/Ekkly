<script setup>
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, Copy, Loader2, Sparkles, Trash2 } from '../../icons'
import { useToast } from '../../composables/useToast'
import { copyText } from '../../utils/clipboard'
import { timeAgo } from '../../utils/timeUtils'
import {
  getConnectorStatus,
  issueConnectorToken,
  revokeConnectorLink,
  revokeConnectorToken,
} from '../../api/mcpTokenService'

// The Claude connector: a link that lets Claude answer questions about this
// church's records in a conversation (see MCP.md).
//
// A link belongs to the account that made it, not to the church, so everyone
// who needs one makes their own and nobody's link switches off anybody else's.
// It opens this church and no other, and it can only reach what its owner can
// reach in the app — so a link is never a way round the permissions.
//
// It is shown once, when it is made — only a fingerprint of it is kept — so
// making a new one is also how an old one that went astray is switched off.

const toast = useToast()

const loading = ref(true)
const status = ref({ isAdmin: false, mine: null, links: [] })
const failed = ref('')
const busy = ref('')
const allowWrites = ref(false)
const issued = ref(null) // { url } — only for as long as this page is open

// Everybody else's, for an administrator: a link left behind by somebody who
// has moved on is the one worth being able to see and switch off.
const others = computed(() => (status.value.links || []).filter((link) => link.id !== status.value.mine?.id))

const owner = (link) => link.displayName || link.email || (link.uid ? 'Someone who has left' : 'An older church-wide link')

const load = async () => {
  loading.value = true
  failed.value = ''
  try {
    status.value = await getConnectorStatus()
    allowWrites.value = status.value.mine?.allowWrites === true
  } catch (error) {
    failed.value = error.message
  } finally {
    loading.value = false
  }
}

onMounted(load)

const issue = async () => {
  if (status.value.mine && !window.confirm('Make a new link? Your current one stops working straight away.')) return
  busy.value = 'mine'
  try {
    const { url } = await issueConnectorToken(allowWrites.value)
    issued.value = { url }
    await load()
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = ''
  }
}

const revoke = async () => {
  if (!window.confirm('Switch your link off? Any conversation using it loses access.')) return
  busy.value = 'mine'
  try {
    await revokeConnectorToken()
    issued.value = null
    await load()
    toast.success('Your link is off')
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = ''
  }
}

const revokeOther = async (link) => {
  if (!window.confirm(`Switch off ${owner(link)}’s link? Any conversation using it loses access.`)) return
  busy.value = link.id
  try {
    await revokeConnectorLink(link.id)
    await load()
    toast.success('Link switched off')
  } catch (error) {
    toast.error(error.message)
  } finally {
    busy.value = ''
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
          Anyone holding this link can read everything you can read in the app. Treat it like
          a password.
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

      <p v-if="status.mine" class="text-sm text-gray-700 dark:text-gray-300">
        Your link is <span class="font-semibold text-emerald-600 dark:text-emerald-400">on</span>,
        {{ status.mine.allowWrites ? 'and can add and change records' : 'read-only' }}.
        <span v-if="status.mine.createdAt" class="text-gray-500 dark:text-gray-400">
          Made {{ timeAgo(new Date(status.mine.createdAt)) }}.
        </span>
      </p>
      <p v-else class="text-sm text-gray-500 dark:text-gray-400">You have no link yet.</p>

      <label class="flex items-start gap-3">
        <input
          v-model="allowWrites"
          type="checkbox"
          class="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span class="text-sm text-gray-700 dark:text-gray-300">
          Let Claude add and change records
          <span class="block text-xs text-gray-500 dark:text-gray-400">
            Adding people, events, tasks, songs, prayer concerns and ledger entries — and only
            the ones you can add yourself. Nothing is ever deleted. Leave off for read-only.
          </span>
        </span>
      </label>

      <div class="flex gap-2">
        <button
          :disabled="busy === 'mine'"
          class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-semibold text-white disabled:opacity-60"
          @click="issue"
        >
          <Loader2 v-if="busy === 'mine'" class="h-4 w-4 animate-spin" />
          {{ status.mine ? 'Make a new link' : 'Make a link' }}
        </button>
        <button
          v-if="status.mine"
          :disabled="busy === 'mine'"
          class="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 px-3 text-sm font-semibold text-red-600 dark:text-red-400 disabled:opacity-60"
          @click="revoke"
        >
          <Trash2 class="h-4 w-4" />
          Switch off
        </button>
      </div>

      <!-- Everybody else's, for an administrator. A link is somebody's own, so
           there is nothing here to change about it — only to switch it off. -->
      <div v-if="status.isAdmin && others.length" class="border-t border-gray-100 dark:border-gray-700 pt-4">
        <h3 class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Other links in this church
        </h3>
        <ul class="mt-2 space-y-2">
          <li
            v-for="link in others"
            :key="link.id"
            class="flex items-center gap-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 px-3 py-2"
          >
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium text-gray-900 dark:text-white">
                {{ owner(link) }}
              </span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">
                {{ link.allowWrites ? 'Can add and change records' : 'Read-only' }}<template
                  v-if="link.createdAt"
                >
                  · made {{ timeAgo(new Date(link.createdAt)) }}</template
                >
              </span>
            </span>
            <button
              :disabled="busy === link.id"
              class="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-60"
              @click="revokeOther(link)"
            >
              <Loader2 v-if="busy === link.id" class="h-3.5 w-3.5 animate-spin" />
              <Trash2 v-else class="h-3.5 w-3.5" />
              Switch off
            </button>
          </li>
        </ul>
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        A link is yours: it opens this church only, reaches only what you can reach in the app,
        and stops working if you leave the church.
      </p>
    </div>
  </section>
</template>
