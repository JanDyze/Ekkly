<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Users,
  X,
} from '../icons'
import { initAuth, useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import {
  isPlatformAdmin,
  reviewChurchRequest,
  subscribeToChurchRequests,
} from '../api/platformService'
import { churchOrigin, isValidChurchId, suggestChurchId } from '../../lib/churchId.js'
import { canSwitchChurchHere, devChurchLink } from '../api/churchService'

// Where the platform's administrators answer requests for a church.
//
// Approving is done by /api/platform with the Admin SDK: it creates the church
// under the id chosen here, makes the requester its first administrator, and
// adds the church's address to Firebase's authorised domains so Google sign-in
// works there. The id is the church's address and cannot be changed after, so
// it is settled here, by a person, rather than taken on trust from the form.

const toast = useToast()
const { user } = useAuth()
const rootDomain = import.meta.env.VITE_ROOT_DOMAIN || ''

const checking = ref(true)
const allowed = ref(false)
const requests = ref([])
let unsubscribe = null

watch(
  () => user.value?.uid,
  async (uid) => {
    await initAuth()
    unsubscribe?.()
    unsubscribe = null
    checking.value = true
    allowed.value = await isPlatformAdmin(uid)
    checking.value = false
    if (allowed.value) {
      unsubscribe = subscribeToChurchRequests((list) => {
        requests.value = list
      })
    }
  },
  { immediate: true }
)

onUnmounted(() => unsubscribe?.())

const FILTERS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'Approved' },
  { key: 'declined', label: 'Declined' },
]
const filter = ref('pending')
const visible = computed(() => requests.value.filter((r) => r.status === filter.value))
const countOf = (key) => requests.value.filter((r) => r.status === key).length

/* ------------------------------------------------------------- decisions */

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
    ids[request.id] = isValidChurchId(request.churchId)
      ? request.churchId
      : suggestChurchId(request.churchName)
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
    const result = await reviewChurchRequest('approve', {
      requestId: request.id,
      churchId,
    })
    results[request.id] = result
    toast.success(`${request.churchName} is open`)
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
</script>

<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-950">
    <div class="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
      >
        <ArrowLeft class="h-4 w-4" />
        Back
      </RouterLink>

      <h1 class="mt-4 text-xl font-bold text-gray-900 dark:text-white">Church requests</h1>
      <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
        Approving creates the church and makes the person who asked its first administrator.
      </p>

      <div v-if="checking" class="flex justify-center py-16">
        <Loader2 class="h-6 w-6 animate-spin text-gray-400" />
      </div>

      <div
        v-else-if="!allowed"
        class="mt-8 rounded-xl border border-gray-200 bg-white px-4 py-10 text-center dark:border-gray-800 dark:bg-gray-900"
      >
        <ShieldAlert class="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">Platform administrators only</p>
        <p class="mx-auto mt-1 max-w-xs text-xs text-gray-500 dark:text-gray-400">
          This account is not one. See TENANCY.md for how to make one with
          scripts/make-platform-admin.mjs.
        </p>
      </div>

      <template v-else>
        <div class="mt-5 flex gap-1.5">
          <button
            v-for="item in FILTERS"
            :key="item.key"
            :class="[
              'h-9 rounded-full border px-3.5 text-xs font-semibold transition-colors',
              filter === item.key
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400',
            ]"
            @click="filter = item.key"
          >
            {{ item.label }} <span class="opacity-70">{{ countOf(item.key) }}</span>
          </button>
        </div>

        <p
          v-if="!visible.length"
          class="mt-6 rounded-xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"
        >
          Nothing here.
        </p>

        <ul v-else class="mt-4 space-y-3">
          <li
            v-for="request in visible"
            :key="request.id"
            class="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-base font-semibold text-gray-900 dark:text-white">{{ request.churchName }}</p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ request.displayName || 'Unnamed' }} &middot; asked {{ formatDate(request.createdAt) }}
                </p>
              </div>
              <a
                v-if="request.status === 'approved' && request.churchId && addressOf(request.churchId)"
                :href="addressOf(request.churchId)"
                target="_blank"
                rel="noopener"
                class="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary dark:text-primary-light"
              >
                {{ request.churchId }} <ExternalLink class="h-3.5 w-3.5" />
              </a>
            </div>

            <dl class="mt-3 grid gap-1.5 text-sm text-gray-600 dark:text-gray-300 sm:grid-cols-2">
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
              class="mt-3 whitespace-pre-line rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              {{ request.message }}
            </p>

            <!-- Deciding -->
            <div v-if="request.status === 'pending'" class="mt-4 space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
              <div>
                <label :for="`id-${request.id}`" class="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Church id and address
                </label>
                <div class="mt-1 flex items-center gap-2">
                  <input
                    :id="`id-${request.id}`"
                    :value="ids[request.id]"
                    type="text"
                    maxlength="40"
                    spellcheck="false"
                    autocapitalize="off"
                    :class="[
                      'h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 font-mono text-sm text-gray-900 dark:bg-gray-800 dark:text-white',
                      isValidChurchId(ids[request.id]) ? 'border-gray-200 dark:border-gray-700' : 'border-red-400',
                    ]"
                    @input="ids[request.id] = $event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')"
                  />
                  <span v-if="rootDomain" class="shrink-0 font-mono text-xs text-gray-400">.{{ rootDomain }}</span>
                </div>
                <p class="mt-1 text-xs text-gray-400">Cannot be changed once the church exists.</p>
              </div>

              <input
                v-model="notes[request.id]"
                type="text"
                maxlength="500"
                placeholder="Reason, if declining (shown to them)"
                class="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />

              <div class="flex gap-2">
                <button
                  type="button"
                  :disabled="busy === request.id"
                  class="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60"
                  @click="approve(request)"
                >
                  <Loader2 v-if="busy === request.id" class="h-4 w-4 animate-spin" />
                  <Check v-else class="h-4 w-4" />
                  Approve
                </button>
                <button
                  type="button"
                  :disabled="busy === request.id"
                  class="flex h-10 items-center justify-center gap-1.5 rounded-lg border border-gray-200 px-4 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  @click="decline(request)"
                >
                  <X class="h-4 w-4" />
                  Decline
                </button>
              </div>
            </div>

            <!-- What approving did -->
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
      </template>
    </div>
  </div>
</template>
