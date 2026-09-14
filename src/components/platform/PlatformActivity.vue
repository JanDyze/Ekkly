<script setup>
import { computed, onActivated, ref } from 'vue'
import { ClockCounterClockwise, Loader2 } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import { callPlatform } from '../../api/platformService'
import { useToast } from '../../composables/useToast'

// Everything done from this console, and every app a church's administrators
// turned on or off themselves — who, what, and when — grouped by day. The
// entries are written by the server alongside each change and never edited.

const toast = useToast()
const entries = ref([])
const loading = ref(true)
const more = ref(true)
const loadingMore = ref(false)

const PAGE = 100

const load = async () => {
  loading.value = true
  try {
    entries.value = await callPlatform('activity', { limit: PAGE })
    more.value = entries.value.length === PAGE
  } catch (error) {
    toast.error(error.message || 'Could not load the activity.')
  } finally {
    loading.value = false
  }
}
onActivated(load)

const loadMore = async () => {
  const last = entries.value[entries.value.length - 1]
  if (!last) return
  loadingMore.value = true
  try {
    const page = await callPlatform('activity', { limit: PAGE, before: last.at })
    entries.value = [...entries.value, ...page]
    more.value = page.length === PAGE
  } catch (error) {
    toast.error(error.message || 'Could not load more.')
  } finally {
    loadingMore.value = false
  }
}

const days = computed(() => {
  const out = []
  entries.value.forEach((entry) => {
    const date = entry.at ? new Date(entry.at) : null
    const key = date ? date.toDateString() : 'Unknown'
    let day = out.find((d) => d.key === key)
    if (!day) {
      out.push(
        (day = {
          key,
          label: date ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown date',
          entries: [],
        })
      )
    }
    day.entries.push(entry)
  })
  return out
})

const time = (at) => (at ? new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '')
</script>

<template>
  <SectionCard :icon="ClockCounterClockwise" title="Activity" subtitle="Who changed what on the platform, newest first">
    <div v-if="loading && !entries.length" class="space-y-1 p-2">
      <div v-for="i in 4" :key="i" class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
    </div>

    <div v-else-if="!entries.length" class="flex flex-col items-center px-8 py-12 text-center text-gray-500 dark:text-gray-400">
      <ClockCounterClockwise class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="mb-1 text-lg">Nothing yet</p>
      <p class="text-sm">Approving a church, changing a price or adding an administrator shows up here.</p>
    </div>

    <template v-else>
      <section v-for="day in days" :key="day.key">
        <div class="sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <span class="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ day.label }}</span>
          <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ day.entries.length }}</span>
        </div>
        <ul class="divide-y divide-gray-100 dark:divide-gray-700">
          <li v-for="entry in day.entries" :key="entry.id" class="flex items-start gap-3 px-4 py-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm text-gray-900 dark:text-white">{{ entry.label || entry.action }}</p>
              <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {{ entry.actorName || entry.actorEmail || 'Someone' }}
                <RouterLink
                  v-if="entry.churchId"
                  :to="`/platform/churches/${entry.churchId}`"
                  class="font-medium text-primary hover:underline dark:text-primary-light"
                >&middot; {{ entry.churchId }}</RouterLink>
              </p>
            </div>
            <span class="shrink-0 text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ time(entry.at) }}</span>
          </li>
        </ul>
      </section>
      <div v-if="more" class="flex justify-center border-t border-gray-100 p-3 dark:border-gray-700">
        <button
          type="button"
          @click="loadMore"
          :disabled="loadingMore"
          class="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <Loader2 v-if="loadingMore" class="h-4 w-4 animate-spin" />
          Older
        </button>
      </div>
    </template>
  </SectionCard>
</template>
