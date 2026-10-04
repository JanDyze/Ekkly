<script setup>
import { computed } from 'vue'
import { ChevronRight, Plus, Warning } from '../../icons'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { isSundayPlanned } from '../../composables/useLineups'
import { findRosterMember, parseIso } from '../../utils/lineupUtils'
import { SONG_LEADER_ROLE, assignmentsOf, peopleOnService } from '../../data/scheduleRoles'
import { getDisplayName } from '../../utils/memberUtils'

// One Sunday on the Calendar, as a card.
//
// Enough to tell at a glance whether it is staffed and sung, and whether you
// are on it — the date, the theme, who leads, how many serve, a few faces,
// the songs — and for whoever plans, which roles are still empty. Everything
// else is a tap away on the Sunday's own screen, which is where this leads.
//
// A Sunday nobody has planned is drawn as a dashed outline with a Plan button
// that opens it straight in the editor; only planners are shown those.

const props = defineProps({
  sunday: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  // The roles the person looking holds on it.
  myRoles: { type: Array, default: () => [] },
  canPlan: { type: Boolean, default: false },
  past: { type: Boolean, default: false },
  // In search results, which span months: what matched, already worded.
  matches: { type: Array, default: null },
})

const planned = computed(() => isSundayPlanned(props.sunday))

const date = computed(() => parseIso(props.sunday.date))
const monthShort = computed(() => date.value?.toLocaleDateString('en-US', { month: 'short' }) || '')
const day = computed(() => date.value?.getDate() || '')

const assignments = computed(() => assignmentsOf(props.sunday))
const crew = computed(() =>
  peopleOnService(props.sunday)
    .map((id) => findRosterMember(props.members, id))
    .filter(Boolean)
)

const leader = computed(() => {
  const member = findRosterMember(props.members, assignments.value[SONG_LEADER_ROLE]?.[0])
  return member ? getDisplayName(member) : ''
})

const songCount = computed(() => props.sunday.songs?.length || 0)

// Only worth saying on a Sunday still to come, and only to whoever can fill it.
const empty = computed(() =>
  props.canPlan && !props.past
    ? props.roles.filter((role) => !(assignments.value[role.id] || []).length)
    : []
)

const summary = computed(() => {
  const parts = []
  if (leader.value) parts.push(`${leader.value} leading`)
  parts.push(`${crew.value.length} serving`)
  return parts.join(' · ')
})

const link = computed(() => ({ name: 'SchedulesSunday', params: { date: props.sunday.date } }))
const planLink = computed(() => ({ ...link.value, query: { edit: '1' } }))
</script>

<template>
  <!-- Not planned: an outline to fill in -->
  <RouterLink
    v-if="!planned"
    :to="planLink"
    class="flex items-center gap-3 rounded-2xl border border-dashed border-gray-300 p-3 transition-[transform,border-color] duration-200 ease-out hover:border-primary/50 pressed:scale-[0.99] dark:border-gray-700"
  >
    <span class="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
      <span class="text-[10px] font-bold uppercase leading-none">{{ monthShort }}</span>
      <span class="text-lg font-bold leading-tight">{{ day }}</span>
    </span>
    <span class="min-w-0 flex-1 text-sm text-gray-500 dark:text-gray-400">Not planned yet</span>
    <span class="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl bg-primary/10 px-3 text-sm font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light">
      <Plus class="size-4" />
      Plan
    </span>
  </RouterLink>

  <!-- Planned -->
  <RouterLink
    v-else
    :to="link"
    :class="[
      'group block rounded-2xl border p-3 transition-[transform,border-color,opacity] duration-200 ease-out pressed:scale-[0.99]',
      myRoles.length && !past
        ? 'border-primary/30 bg-primary/5 hover:border-primary/50 dark:border-primary-light/30 dark:bg-primary-light/10'
        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600',
      past ? 'opacity-60 hover:opacity-100' : '',
    ]"
  >
    <div class="flex gap-3">
      <span
        :class="[
          'flex size-12 shrink-0 flex-col items-center justify-center rounded-xl',
          past
            ? 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
        ]"
      >
        <span class="text-[10px] font-bold uppercase leading-none">{{ monthShort }}</span>
        <span class="text-lg font-bold leading-tight">{{ day }}</span>
      </span>

      <div class="min-w-0 flex-1">
        <div class="flex items-start gap-2">
          <p class="min-w-0 flex-1 truncate text-base font-semibold leading-tight text-gray-900 dark:text-white">
            {{ sunday.theme || 'Sunday service' }}
          </p>
          <span
            v-if="past"
            class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          >
            Done
          </span>
          <span
            v-else-if="myRoles.length"
            class="shrink-0 truncate rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white"
          >
            You · {{ myRoles.map((r) => r.name).join(', ') }}
          </span>
          <ChevronRight
            v-else
            class="size-4 shrink-0 text-gray-300 transition-transform duration-300 group-engaged:translate-x-1 dark:text-gray-600"
          />
        </div>

        <p v-if="matches?.length" class="mt-0.5 truncate text-xs font-medium text-primary dark:text-primary-light">
          {{ matches.join(' · ') }}
        </p>
        <p v-else class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{{ summary }}</p>

        <div class="mt-2 flex items-center gap-2">
          <div v-if="crew.length" class="flex -space-x-1.5">
            <MemberAvatar
              v-for="person in crew.slice(0, 5)"
              :key="person.firestoreId"
              :member="person"
              alt=""
              size="h-6 w-6"
              class="ring-2 ring-white dark:ring-gray-800"
            />
          </div>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            <template v-if="crew.length > 5">+{{ crew.length - 5 }} · </template>{{ songCount }} {{ songCount === 1 ? 'song' : 'songs' }}
          </span>
        </div>

        <p
          v-if="empty.length"
          class="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400"
        >
          <Warning class="size-3.5 shrink-0" />
          <span class="truncate">No {{ empty.map((r) => r.name.toLowerCase()).join(', ') }}</span>
        </p>
      </div>
    </div>
  </RouterLink>
</template>
