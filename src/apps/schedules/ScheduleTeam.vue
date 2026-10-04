<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, ListChecks } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import ScheduleRolesSheet from '../../components/schedules/ScheduleRolesSheet.vue'
import { useLineup } from '../../composables/useLineups'
import { useMembers } from '../../composables/useMembers'
import { usePermissions } from '../../composables/usePermissions'
import { useAppSettings } from '../../composables/useAppSettings'
import { formatMonthLabel, monthKeyOf, servesInRole, servingLoad, shiftMonth } from '../../utils/lineupUtils'
import { memberKey } from '../../utils/sgUtils'
import { getDisplayName } from '../../utils/memberUtils'

// Who is serving, and how often — the fairness check, as a section of its own.
//
// It was a sheet off the month's floating menu, opened on purpose by whoever
// was assigning. It is the same check here with room to breathe, and with the
// other half of the question beside it: the people who could be on a Sunday
// this month, by the ministries the roles ask for, and are not. The usher on
// four Sundays running and the usher on none are the same conversation.
//
// The roles themselves are shaped here too, by an administrator, because which
// jobs a Sunday has is the team's structure rather than one month's plan.

const { isAdmin } = usePermissions()
const { members } = useMembers()
const { scheduleRoles: roles } = useAppSettings()

const month = ref(monthKeyOf())
const { loading, sundays } = useLineup(month)

const rows = computed(() => servingLoad(sundays.value, members.value, roles.value))
const sundayCount = computed(() => sundays.value.length)

// Everyone a role would offer first, by ministry, who is on no Sunday this
// month. Only roles that name ministries can say who belongs to them; a role
// that offers the whole roll would make this the whole roll.
const resting = computed(() => {
  const serving = new Set(rows.value.map((row) => String(row.id)))
  return members.value
    .filter((member) => !serving.has(memberKey(member)) && !serving.has(String(member.firestoreId)))
    .map((member) => ({ member, roles: roles.value.filter((role) => servesInRole(member, role)) }))
    .filter((row) => row.roles.length)
    .sort((a, b) => getDisplayName(a.member).localeCompare(getDisplayName(b.member)))
})

const nameOf = (member) => [getDisplayName(member), member?.lastName].filter(Boolean).join(' ') || 'Someone'

const showRoles = ref(false)

const card =
  'overflow-hidden rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 dark:divide-gray-700/60 dark:border-gray-700/80 dark:bg-gray-800'
</script>

<template>
  <AppScreen
    title="Team"
    :subtitle="`${formatMonthLabel(month)} · ${sundayCount} Sundays`"
    :back="{ name: 'SchedulesHome' }"
    root="/schedules"
  >
    <template #action>
      <button
        v-if="isAdmin"
        type="button"
        class="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200/70 dark:text-gray-300 dark:hover:bg-gray-800"
        @click="showRoles = true"
      >
        <ListChecks class="size-4" />
        Roles
      </button>
    </template>

    <!-- Which month is being checked -->
    <div class="mb-3 flex items-center gap-1">
      <button
        type="button"
        class="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Previous month"
        @click="month = shiftMonth(month, -1)"
      >
        <ChevronLeft class="size-5" />
      </button>
      <p class="min-w-0 flex-1 text-center text-base font-semibold text-gray-900 dark:text-white">
        {{ formatMonthLabel(month) }}
      </p>
      <button
        type="button"
        class="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800"
        aria-label="Next month"
        @click="month = shiftMonth(month, 1)"
      >
        <ChevronRight class="size-5" />
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <template v-else>
      <h2 class="mb-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">Serving · {{ rows.length }}</h2>
      <ul v-if="rows.length" :class="['animate-rise', card]">
        <li v-for="row in rows" :key="row.id" class="flex items-center gap-3 px-3 py-2.5">
          <MemberAvatar v-if="row.member" :member="row.member" alt="" size="h-9 w-9" />
          <span v-else class="h-9 w-9 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700" />
          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ row.name }}</span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
              {{ row.roles.map((r) => (r.count > 1 ? `${r.name} ×${r.count}` : r.name)).join(' · ') }}
            </span>
          </span>
          <!-- Marked only when it is every Sunday of the month: a fixed
               threshold would mean different things in a four-Sunday month and
               a five-Sunday one. -->
          <span
            :class="[
              'shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
              sundayCount > 1 && row.count >= sundayCount
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
            ]"
          >
            ×{{ row.count }}
          </span>
        </li>
      </ul>
      <p
        v-else
        class="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
      >
        Nobody is scheduled in {{ formatMonthLabel(month) }} yet.
      </p>

      <template v-if="resting.length">
        <h2 class="mb-2 mt-6 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
          Not on this month · {{ resting.length }}
        </h2>
        <ul :class="['animate-rise', card]" style="animation-delay: 60ms">
          <li v-for="row in resting" :key="row.member.firestoreId" class="flex items-center gap-3 px-3 py-2.5">
            <MemberAvatar :member="row.member" alt="" size="h-9 w-9" />
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ nameOf(row.member) }}</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                Could be {{ row.roles.map((r) => r.name.toLowerCase()).join(', ') }}
              </span>
            </span>
          </li>
        </ul>
      </template>
    </template>

    <ScheduleRolesSheet :show="showRoles" @close="showRoles = false" />
  </AppScreen>
</template>
