<script setup>
import { computed, onActivated, ref } from 'vue'
import { ChatCircleDots, Loader2, Save, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { agoFrom } from '../../composables/usePlatformConsole'
import { SUPPORT_STATUSES, supportKindLabel, supportStatusLabel } from '../../../lib/platformDefaults.js'

// What churches have asked the platform for: apps they wish existed, changes,
// bugs, feedback. Grouped by where each stands, so what is new is at the top
// and what is finished is out of the way. A reply is shown to the church in
// its own Settings, beside the request.

const toast = useToast()
const requests = ref([])
const loading = ref(true)

const load = async () => {
  try {
    requests.value = await callPlatform('supportRequests')
  } catch (error) {
    console.error('Error loading support requests:', error)
    toast.error(error.message || 'Could not load the requests.')
  } finally {
    loading.value = false
  }
}
onActivated(load)

// Open ones in the order they move through; finished ones last.
const ORDER = ['new', 'in-progress', 'planned', 'done', 'declined']
const groups = computed(() =>
  ORDER.map((key) => ({ key, label: supportStatusLabel(key), items: requests.value.filter((r) => r.status === key) })).filter(
    (g) => g.items.length
  )
)

const STATUS_TONE = {
  new: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  planned: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  'in-progress': 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  done: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  declined: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
}

/* --------------------------------------------------------------- drawer */

const open = ref(null)
const form = ref({ status: 'new', reply: '' })
const saving = ref(false)

const openRequest = (request) => {
  open.value = request
  form.value = { status: request.status, reply: request.reply }
}
const close = () => {
  open.value = null
}

const save = async () => {
  if (!open.value) return
  saving.value = true
  try {
    requests.value = await callPlatform('replySupportRequest', { id: open.value.id, ...form.value })
    toast.success('Saved — the church sees it in Settings')
    close()
  } catch (error) {
    console.error('Error replying:', error)
    toast.error(error.message || 'Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => Boolean(open.value), close)

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <SectionCard :icon="ChatCircleDots" title="Support requests" subtitle="Sent by church administrators from their Settings">
    <div v-if="loading" class="space-y-1 p-2">
      <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
    </div>

    <div v-else-if="!requests.length" class="flex flex-col items-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
      <ChatCircleDots class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">No requests yet</p>
      <p class="text-sm">When a church asks for a new app, a change or sends feedback, it lands here.</p>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.key">
        <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white/95 px-3 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <span class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ group.label }}</span>
          <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ group.items.length }}</span>
        </div>
        <ul class="space-y-1 p-2">
          <li v-for="request in group.items" :key="request.id">
            <button
              type="button"
              @click="openRequest(request)"
              class="w-full rounded-lg p-3 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/50"
            >
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ request.title }}</p>
              <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {{ request.churchName }} &middot; {{ supportKindLabel(request.kind) }} &middot; {{ agoFrom(request.createdAt) }}
                <template v-if="request.reply"> &middot; replied</template>
              </p>
            </button>
          </li>
        </ul>
      </section>
    </template>

    <Teleport to="body">
      <div v-if="open" class="fixed inset-0 z-80 flex items-end justify-center sm:items-stretch sm:justify-end">
        <div class="absolute inset-0 bg-black/50" @click="close"></div>
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="support-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl sm:m-3 sm:max-h-none sm:max-w-lg sm:rounded-2xl sm:border-2 sm:border-primary/30 dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <h3 id="support-title" class="flex min-w-0 items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
              <ChatCircleDots class="h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
              <span class="truncate">{{ open.title }}</span>
            </h3>
            <button type="button" @click="close" aria-label="Close" class="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300">
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <span :class="['rounded-full px-2 py-0.5 font-medium', STATUS_TONE[open.status]]">{{ supportStatusLabel(open.status) }}</span>
              <span>{{ supportKindLabel(open.kind) }}</span>
              <span>&middot; {{ open.churchName }}</span>
              <span>&middot; {{ open.displayName || open.email }}</span>
              <span>&middot; {{ agoFrom(open.createdAt) }}</span>
            </div>
            <p v-if="open.details" class="whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
              {{ open.details }}
            </p>
            <p v-else class="text-sm text-gray-500 dark:text-gray-400">No details were given.</p>
            <a
              v-if="open.email"
              :href="`mailto:${open.email}?subject=${encodeURIComponent(open.title)}`"
              class="inline-block text-sm font-medium text-primary hover:underline dark:text-primary-light"
            >
              Email {{ open.email }}
            </a>

            <div>
              <label for="support-status" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Where it stands</label>
              <select id="support-status" v-model="form.status" :class="input">
                <option v-for="status in SUPPORT_STATUSES" :key="status.key" :value="status.key">{{ status.label }}</option>
              </select>
            </div>
            <div>
              <label for="support-reply" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Reply</label>
              <textarea
                id="support-reply"
                v-model="form.reply"
                rows="5"
                maxlength="4000"
                placeholder="What will happen, and roughly when"
                :class="[input, 'resize-none']"
              ></textarea>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">The church's administrators see this beside their request.</p>
            </div>
          </div>

          <div class="flex shrink-0 justify-end gap-3 border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 dark:border-gray-700">
            <button type="button" @click="close" class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
              Cancel
            </button>
            <button
              type="button"
              @click="save"
              :disabled="saving"
              class="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover disabled:opacity-60"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              <Save v-else class="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </SectionCard>
</template>
