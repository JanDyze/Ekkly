<script setup>
import { computed, ref } from 'vue'
import { HandWaving } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import DateTile from '../../components/appframe/DateTile.vue'
import TeamDutiesCard from '../../components/schedules/TeamDutiesCard.vue'
import FollowUpSheet from '../../components/schedules/FollowUpSheet.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { useMembers } from '../../composables/useMembers'
import { usePermissions } from '../../composables/usePermissions'
import { useFollowUps } from '../../composables/useFollowUps'
import { useToast } from '../../composables/useToast'
import { rolesOfTeam } from '../../data/scheduleTeams'
import { assignmentsOf } from '../../data/scheduleRoles'
import { formatShortDate } from '../../utils/lineupUtils'
import { getDisplayName, getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'

// The welcome team's section: greeting on Sunday, and following newcomers up
// through the week — consolidation, in the church's own word for it.
//
// Sunday is the same as any team's: a checklist and a rota. The follow-up is
// the part that is new. Everyone on the roll as an attendee, rather than a
// member, is someone the welcome team may still be walking with; each carries
// a step — new, contacted, visited, connected — someone looking after them,
// and notes. Those notes are about real people, so the list is shown only to
// whoever has been given follow-up (consolidation.view).

const { loading, roles, comingSundays, canPlanTeam, myRolesOn } = useScheduleOverview()
const { members } = useMembers()
const { can } = usePermissions()
const { followUpOf, save, steps } = useFollowUps()
const toast = useToast()

const teamRoles = computed(() => rolesOfTeam(roles.value, 'welcome'))
const canPlan = computed(() => canPlanTeam('welcome'))
const canSeeFollowUps = computed(() => can('consolidation.view'))
const canFollowUp = computed(() => can('consolidation.manage'))

const thisSunday = computed(() => comingSundays.value[0] || null)
const canTick = computed(() => {
  if (canPlan.value) return true
  if (!thisSunday.value) return false
  const ids = new Set(teamRoles.value.map((r) => r.id))
  return myRolesOn(thisSunday.value).some((role) => ids.has(role.id))
})

/* ------------------------------------------------------------- follow-up */

const STEP_ORDER = Object.fromEntries(steps.map((s, i) => [s.key, i]))
const stepLabel = (key) => steps.find((s) => s.key === key)?.label || 'New'

const filter = ref('active')
const FILTERS = [
  { key: 'active', label: 'Following up' },
  { key: 'connected', label: 'Connected' },
  { key: 'all', label: 'Everyone' },
]

const newcomers = computed(() =>
  members.value
    .filter((m) => m.isMember === false)
    .map((person) => ({ person, followUp: followUpOf(person.firestoreId || person.id) }))
    .sort(
      (a, b) =>
        STEP_ORDER[a.followUp.step] - STEP_ORDER[b.followUp.step] ||
        getDisplayName(a.person).localeCompare(getDisplayName(b.person))
    )
)

const shown = computed(() =>
  newcomers.value.filter(({ followUp }) =>
    filter.value === 'all' ? true : filter.value === 'connected' ? followUp.step === 'connected' : followUp.step !== 'connected'
  )
)

const counts = computed(() => ({
  active: newcomers.value.filter((n) => n.followUp.step !== 'connected').length,
  connected: newcomers.value.filter((n) => n.followUp.step === 'connected').length,
  all: newcomers.value.length,
}))

// Whoever is on the welcome team on any Sunday coming up is offered first.
const caretakers = computed(() => {
  const onTeam = new Set()
  const ids = new Set(teamRoles.value.map((r) => r.id))
  comingSundays.value.forEach((sunday) => {
    Object.entries(assignmentsOf(sunday)).forEach(([roleId, people]) => {
      if (ids.has(roleId)) people.forEach((id) => onTeam.add(String(id)))
    })
  })
  const options = members.value
    .filter((m) => m.isMember !== false)
    .map((m) => ({ id: String(memberKey(m)), name: getFullName(m), team: onTeam.has(String(memberKey(m))) || onTeam.has(String(m.firestoreId)) }))
  return [...options.filter((o) => o.team), ...options.filter((o) => !o.team)]
})

const caretakerName = (id) => caretakers.value.find((c) => c.id === String(id))?.name || ''

/** Who is greeting that Sunday, by the name they go by. */
const crewOf = (sunday) => {
  const all = assignmentsOf(sunday)
  const ids = [...new Set(teamRoles.value.flatMap((role) => all[role.id] || []))]
  return ids.map((id) => members.value.find((m) => String(memberKey(m)) === String(id) || String(m.firestoreId) === String(id))).filter(Boolean).map(getDisplayName)
}

/** The quiet line under a newcomer: who has them, and when they last spoke. */
const followUpLine = (followUp) =>
  [
    caretakerName(followUp.caretakerId) ? `With ${caretakerName(followUp.caretakerId)}` : 'Nobody looking after them yet',
    followUp.lastContact ? `last in touch ${formatShortDate(followUp.lastContact)}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

const open = ref(null)
const saving = ref(false)

const onSave = async (followUp) => {
  saving.value = true
  try {
    await save(open.value.person.firestoreId || open.value.person.id, followUp)
    open.value = null
    toast.success('Saved')
  } catch (error) {
    console.error('Could not save the follow-up:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

const STEP_STYLE = {
  new: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  contacted: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  visited: 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
  connected: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
}
</script>

<template>
  <AppScreen title="Welcome" subtitle="Greeting newcomers, and following them up" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <div class="flex flex-col gap-5">
      <div v-if="loading" class="h-48 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <template v-else>
        <TeamDutiesCard
          v-if="thisSunday"
          team="welcome"
          :date="thisSunday.date"
          :can-tick="canTick"
          :can-edit="canPlan"
          :title="`Jobs for ${formatShortDate(thisSunday.date)}`"
        />

        <!-- Following newcomers up -->
        <section v-if="canSeeFollowUps">
          <div class="mb-3 flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
            <button
              v-for="option in FILTERS"
              :key="option.key"
              type="button"
              :class="[
                'h-9 flex-1 rounded-md px-2.5 text-xs font-medium sm:text-sm',
                filter === option.key
                  ? 'bg-white text-primary dark:bg-gray-800 dark:text-primary-light ring-1 ring-gray-200 dark:ring-gray-700'
                  : 'text-gray-500 dark:text-gray-400',
              ]"
              @click="filter = option.key"
            >
              {{ option.label }} <span class="tabular-nums opacity-70">{{ counts[option.key] }}</span>
            </button>
          </div>

          <ListGroup v-if="shown.length" title="Newcomers" :count="shown.length">
            <ListRow
              v-for="{ person, followUp } in shown"
              :key="person.firestoreId"
              :title="getFullName(person)"
              :subtitle="followUpLine(followUp)"
              @click="open = { person, followUp }"
            >
              <template #leading>
                <MemberAvatar :member="person" alt="" size="h-10 w-10" class="shrink-0" />
              </template>
              <template #trailing>
                <span :class="['shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold', STEP_STYLE[followUp.step]]">
                  {{ stepLabel(followUp.step) }}
                </span>
              </template>
            </ListRow>
          </ListGroup>
          <div v-else class="flex flex-col items-center justify-center px-8 py-10 text-center text-gray-500 dark:text-gray-400">
            <HandWaving class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p class="mb-1 text-lg">{{ newcomers.length ? 'Nobody here' : 'No newcomers yet' }}</p>
            <p class="text-sm">
              {{
                newcomers.length
                  ? 'Try another of the three above.'
                  : 'Anyone added to People as an attendee rather than a member shows here to be followed up.'
              }}
            </p>
          </div>
        </section>

        <ListGroup title="Greeting" :count="comingSundays.length">
          <ListRow
            v-for="sunday in comingSundays"
            :key="sunday.date"
            :to="{ name: 'SchedulesSunday', params: { date: sunday.date } }"
            :title="crewOf(sunday).length ? crewOf(sunday).join(', ') : 'Nobody yet'"
            :warn="!crewOf(sunday).length && canPlan"
            :muted="!crewOf(sunday).length && !canPlan"
          >
            <template #leading><DateTile :date="sunday.date" :highlight="myRolesOn(sunday).length > 0" /></template>
          </ListRow>
        </ListGroup>
      </template>
    </div>

    <FollowUpSheet
      :show="Boolean(open)"
      :person="open?.person"
      :follow-up="open?.followUp"
      :caretakers="caretakers"
      :can-edit="canFollowUp"
      :saving="saving"
      @update:show="(value) => !value && (open = null)"
      @save="onSave"
    />
  </AppScreen>
</template>
