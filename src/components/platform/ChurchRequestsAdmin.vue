<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { Check, CheckCircle2, ExternalLink, Loader2, Mail, MapPin, Phone, Tray, Users, X } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { useToast } from '../../composables/useToast'
import { usePlatformConsole } from '../../composables/usePlatformConsole'
import { reviewChurchRequest, subscribeToChurchRequests } from '../../api/platformService'
import { churchOrigin, isValidChurchId, suggestChurchId } from '../../../lib/churchId.js'
import { canSwitchChurchHere, devChurchLink } from '../../api/churchService'

// Answering requests for a church.
//
// Approving is done by /api/platform with the Admin SDK: it creates the church
// under the id chosen here, makes the requester its first administrator, gives
// it what New church defaults says a church starts with, and adds its address
// to Firebase's authorised domains so Google sign-in works there. The id is the
// church's address and cannot be changed after, so it is settled here, by a
// person, rather than taken on trust from the form.

const toast = useToast()
const { loadChurches } = usePlatformConsole()
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''

const requests = ref([])
const loading = ref(true)
const unsubscribe = subscribeToChurchRequests((list) => {
  requests.value = list
  loading.value = false
})
onUnmounted(() => unsubscribe?.())

const FILTERS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
]
const filter = ref('pending')
const visible = computed(() => requests.value.filter((r) => r.status === filter.value))
const countOf = (key) => requests.value.filter((r) => r.status === key).length

// Per request: the id being approved under, a decline note, and what the
// server said, keyed by request id so a live update does not lose them.
const ids = reactive({})
const notes = reactive({})
const results = reactive({})
const busy = ref('')

// The id each request starts from: the one they asked for if it is usable,
// otherwise one made from the church's name. Set once, so editing it sticks.
watch(requests, (list) => {
  list.forEach((request) => {
    if (ids[request.id] !== undefined) return
    ids[request.id] = isValidChurchId(request.churchId) ? request.churchId : suggestChurchId(request.churchName)
  })
})

const approve = async (request) => {
  const churchId = String(ids[request.id] || '').trim()
  if (!isValidChurchId(churchId)) {
    toast.error('That address is not a valid church id.')
    return
  }
  busy.value = request.id
  try {
    results[request.id] = await reviewChurchRequest('approve', { requestId: request.id, churchId })
    toast.success(`${request.churchName} is open`)
    loadChurches({ force: true }).catch(() => {})
  } catch (e) {
    toast.error(e.message)
  } finally {
    busy.value = ''
  }
}

const decline = async (request) => {
  busy.value = request.id
  try {
    await reviewChurchRequest('decline', { requestId: request.id, note: notes[request.id] || '' })
    toast.success('Request declined')
  } catch (e) {
    toast.error(e.message)
  } finally {
    busy.value = ''
  }
}

// Locally there is no domain, so a church opens on this same address instead.
const addressOf = (churchId) =>
  rootDomain ? churchOrigin(churchId, { rootDomain }) : canSwitchChurchHere() ? devChurchLink(churchId) : ''

const formatDate = (date) =>
  date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''

const input =
  'h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="space-y-4">
    <SectionCard
      :icon="Tray"
      title="Church requests"
      subtitle="Approving creates the church and makes the person who asked its first administrator."
    >
      <div class="px-4 pt-4">
        <div class="flex h-10 w-full items-center rounded-lg bg-gray-100 p-0.5 sm:w-auto sm:max-w-sm dark:bg-gray-700" role="group" aria-label="Which requests">
          <button
            v-for="item in FILTERS"
            :key="item.key"
            type="button"
            @click="filter = item.key"
            :aria-pressed="filter === item.key"
            :class="[
              'flex h-9 flex-1 items-center justify-center gap-1 rounded-md px-2.5 text-xs font-medium transition-colors sm:text-sm',
              filter === item.key
                ? 'bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light'
                : 'text-gray-500 dark:text-gray-400',
            ]"
          >
            {{ item.label }}
            <span class="text-xs tabular-nums opacity-70">{{ countOf(item.key) }}</span>
          </button>
        </div>
      </div>

      <div v-if="loading" class="space-y-3 p-4">
        <div v-for="i in 2" :key="i" class="h-28 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
      </div>

      <div v-else-if="!visible.length" class="flex flex-col items-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
        <Tray class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">
          {{ filter === 'pending' ? 'Nothing waiting' : filter === 'approved' ? 'No churches approved yet' : 'Nothing declined' }}
        </p>
        <p v-if="filter === 'pending'" class="text-sm">New requests from the front door appear here.</p>
      </div>

      <ul v-else class="space-y-3 p-4">
        <li
          v-for="request in visible"
          :key="request.id"
          class="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ request.churchName }}</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {{ request.displayName || 'Unnamed' }} &middot; asked {{ formatDate(request.createdAt) }}
              </p>
            </div>
            <a
              v-if="request.status === 'approved' && request.churchId && addressOf(request.churchId)"
              :href="addressOf(request.churchId)"
              target="_blank"
              rel="noopener"
              class="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary dark:text-primary-light"
            >
              {{ request.churchId }} <ExternalLink class="h-3.5 w-3.5" />
            </a>
          </div>

          <dl class="mt-3 grid gap-1.5 text-sm text-gray-600 sm:grid-cols-2 dark:text-gray-300">
            <div v-if="request.email" class="flex min-w-0 items-center gap-2">
              <Mail class="h-4 w-4 shrink-0 text-gray-400" />
              <a :href="`mailto:${request.email}`" class="truncate hover:underline">{{ request.email }}</a>
            </div>
            <div v-if="request.contactNumber" class="flex items-center gap-2">
              <Phone class="h-4 w-4 shrink-0 text-gray-400" />
              <span>{{ request.contactNumber }}</span>
            </div>
            <div v-if="request.location" class="flex items-center gap-2">
              <MapPin class="h-4 w-4 shrink-0 text-gray-400" />
              <span>{{ request.location }}</span>
            </div>
            <div v-if="request.size" class="flex items-center gap-2">
              <Users class="h-4 w-4 shrink-0 text-gray-400" />
              <span>{{ request.size }}</span>
            </div>
          </dl>

          <p
            v-if="request.message"
            class="mt-3 whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-900/40 dark:text-gray-300"
          >
            {{ request.message }}
          </p>

          <div v-if="request.status === 'pending'" class="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-700">
            <div>
              <label :for="`id-${request.id}`" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Church id and address
              </label>
              <div class="flex items-center gap-2">
                <input
                  :id="`id-${request.id}`"
                  :value="ids[request.id]"
                  type="text"
                  maxlength="40"
                  spellcheck="false"
                  autocapitalize="off"
                  :class="[input, 'font-mono', isValidChurchId(ids[request.id]) ? '' : 'border-red-400 dark:border-red-500']"
                  @input="ids[request.id] = $event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')"
                />
                <span v-if="rootDomain" class="shrink-0 font-mono text-xs text-gray-400">.{{ rootDomain }}</span>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Cannot be changed once the church exists.</p>
            </div>

            <input
              v-model="notes[request.id]"
              type="text"
              maxlength="500"
              placeholder="Reason, if declining (they will see it)"
              :class="input"
            />

            <div class="flex gap-2">
              <button
                type="button"
                :disabled="busy === request.id"
                class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
                @click="approve(request)"
              >
                <Loader2 v-if="busy === request.id" class="h-4 w-4 animate-spin" />
                <Check v-else class="h-4 w-4" />
                Approve
              </button>
              <button
                type="button"
                :disabled="busy === request.id"
                class="flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-900/20"
                @click="decline(request)"
              >
                <X class="h-4 w-4" />
                Decline
              </button>
            </div>
          </div>

          <div
            v-if="results[request.id]"
            class="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            <p class="flex items-center gap-1.5 font-semibold">
              <CheckCircle2 class="h-4 w-4" /> Created {{ results[request.id].churchId }}
            </p>
            <p class="mt-1">Google sign-in at {{ results[request.id].domain || 'its address' }}: {{ results[request.id].authorizedDomain }}</p>
          </div>

          <p v-if="request.status === 'declined' && request.note" class="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Declined: &ldquo;{{ request.note }}&rdquo;
          </p>
        </li>
      </ul>
    </SectionCard>
  </div>
</template>
