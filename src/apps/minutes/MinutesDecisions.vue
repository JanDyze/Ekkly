<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { MagnifyingGlass, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useMinutesOverview } from '../../composables/useMinutesOverview'
import { meetingWhen } from '../../utils/minuteSummary'

// Everything the meetings settled, read out of the write-ups
// (utils/minuteDecisions.js), under the meeting that settled it, newest
// first. This is what old minutes are opened for — "when did we agree to
// that?" — and it used to mean opening meetings one by one.
//
// The search sits open here, unlike Meetings': this screen is a lookup far
// more often than a scroll. A decision is shown whole, never cut to one line,
// because half a decision is the one thing worse than none. Each opens the
// meeting it was made in, for what was said around it.

const router = useRouter()
const { loading, decisions, idOf, dayOf } = useMinutesOverview()

const query = ref('')

// Case and accents folded away, so "pasko" finds "Pasko" and "Niño" is found
// typed without its tilde.
const fold = (text) =>
  String(text || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
const matches = (field, wanted) => fold(field).includes(fold(wanted).trim())

const found = computed(() =>
  query.value.trim()
    ? decisions.value.filter((d) =>
        [d.text, d.topic, d.minute.title, meetingWhen(dayOf(d.minute)).label].some((field) => matches(field, query.value))
      )
    : decisions.value
)

const byMeeting = computed(() => {
  const groups = new Map()
  for (const decision of found.value) {
    const id = idOf(decision.minute)
    if (!groups.has(id)) groups.set(id, { id, minute: decision.minute, decisions: [] })
    groups.get(id).decisions.push(decision)
  }
  return [...groups.values()]
})

const headingOf = (minute) => `${minute.title || 'Meeting'} · ${meetingWhen(dayOf(minute)).label}`

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = decisions.value.length
  return n ? `${n.toLocaleString()} ${n === 1 ? 'decision' : 'decisions'}` : ''
})

const open = (id) => router.push({ name: 'MinuteDetails', params: { id } })
</script>

<template>
  <AppScreen title="Decisions" :subtitle="subtitle" :back="{ name: 'MinutesHome' }" root="/minutes" desk>
    <div class="relative mb-4">
      <MagnifyingGlass class="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
      <input
        v-model="query"
        type="text"
        inputmode="search"
        enterkeyhint="search"
        autocomplete="off"
        aria-label="Search decisions"
        placeholder="Search what was decided"
        class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
      />
      <button
        v-if="query"
        type="button"
        class="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="Clear search"
        @click="query = ''"
      >
        <X class="size-4" />
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!byMeeting.length">
      <ListRow
        :title="query ? 'No decision matches that' : 'No decisions yet'"
        :subtitle="query ? 'Try a name, an amount, or the month.' : 'They are read from meetings once they are written up.'"
        muted
      />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="group in byMeeting" :key="group.id" :title="headingOf(group.minute)" :count="group.decisions.length">
        <button
          v-for="decision in group.decisions"
          :key="decision.key"
          type="button"
          class="flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/40 dark:active:bg-gray-700/60"
          @click="open(group.id)"
        >
          <span v-if="decision.topic" class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ decision.topic }}</span>
          <span class="text-[15px] font-medium leading-snug text-gray-900 dark:text-white">{{ decision.text }}</span>
        </button>
      </ListGroup>
    </div>
  </AppScreen>
</template>
