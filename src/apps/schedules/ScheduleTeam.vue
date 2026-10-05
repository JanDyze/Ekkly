<script setup>
import { computed, ref } from 'vue'
import { ChevronLeft, ChevronRight, ListChecks } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
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

</script>

<template>
  <AppScreen
    title="Who serves"
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

    <div v-else class="flex flex-col gap-5">
      <ListGroup title="Serving" :count="rows.length">
        <ListRow
          v-for="row in rows"
          :key="row.id"
          :title="row.name"
          :subtitle="row.roles.map((r) => (r.count > 1 ? `${r.name} ×${r.count}` : r.name)).join(' · ')"
        >
          <template #leading>
            <MemberAvatar v-if="row.member" :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
            <span v-else class="size-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700" />
          </template>
          <!-- Marked only when it is every Sunday of the month: a fixed
               threshold would mean different things in a four-Sunday month
               and a five-Sunday one. -->
          <template #trailing>
            <span
              :class="[
                'shrink-0 text-sm font-semibold tabular-nums',
                sundayCount > 1 && row.count >= sundayCount ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400',
              ]"
            >
              {{ row.count }} {{ row.count === 1 ? 'Sunday' : 'Sundays' }}
            </span>
          </template>
        </ListRow>
        <ListRow v-if="!rows.length" :title="`Nobody is scheduled in ${formatMonthLabel(month)} yet`" muted />
      </ListGroup>

      <ListGroup v-if="resting.length" title="Not on this month" :count="resting.length">
        <ListRow
          v-for="row in resting"
          :key="row.member.firestoreId"
          :title="nameOf(row.member)"
          :subtitle="`Could be ${row.roles.map((r) => r.name.toLowerCase()).join(', ')}`"
        >
          <template #leading>
            <MemberAvatar :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
          </template>
        </ListRow>
      </ListGroup>
    </div>

    <ScheduleRolesSheet :show="showRoles" @close="showRoles = false" />
  </AppScreen>
</template>
