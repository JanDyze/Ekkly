<script setup>
/**
 * One Sunday, read: who is on it, team by team, and what each team has ready.
 *
 * Laid out as the app's other screens are now (ListGroup, ListRow): a group
 * per team, each role one row — the faces, the names, and the role under them
 * — so the eye runs down one column of names instead of across a table. The
 * songs follow the worship team as a group of their own; the message sits in
 * Preaching, with its recording to listen back to when there is one; the ushers' jobs are one line in Ushers. Roles no team owns close
 * the list under "Also serving".
 *
 * Reading only. Each team's group carries a Plan for whoever plans that team,
 * and the Sunday's own header carries Edit all for whoever plans everything
 * (ScheduleSunday). An empty role shows only to someone who could fill it,
 * in amber, as the thing left to do.
 *
 * Being on the schedule grants nothing extra. It adds one line at the top
 * saying so, because the person serving is the one who most needs to find
 * their own name.
 */
import { computed } from 'vue'
import { BookOpen, ListChecks, Microphone, Slideshow } from '../../icons'
import ListGroup from '../appframe/ListGroup.vue'
import ListRow from '../appframe/ListRow.vue'
import FacePile from '../appframe/FacePile.vue'
import { rosterName, serviceRoles } from '../../utils/lineupUtils'
import { BAND_ROLE, SONG_LEADER_ROLE } from '../../data/scheduleRoles'
import { instrumentName, instrumentOn } from '../../data/instruments'
import { TEAMS, teamOfRole } from '../../data/scheduleTeams'

const props = defineProps({
  sunday: { type: Object, required: true },
  members: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false },
  // The roles this account holds on this Sunday.
  myRoles: { type: Array, default: () => [] },
  isNext: { type: Boolean, default: false },
  isPast: { type: Boolean, default: false },
  // Whether this account plans a team's part: (teamKey) => boolean.
  canEditTeam: { type: Function, default: () => false },
  // This Sunday's message, when the preaching team has written one.
  sermon: { type: Object, default: null },
  // The ushers' Sunday jobs: { done, total }.
  duties: { type: Object, default: null },
})

defineEmits(['edit'])

const rows = computed(() => serviceRoles(props.sunday, props.roles, props.members))

const canEditRow = (row) => props.canEdit || props.canEditTeam(teamOfRole(row.role))

// An empty role is the planners' to-do list, and only noise to everyone else.
const visibleRows = computed(() => rows.value.filter((row) => row.people.length || canEditRow(row)))

const songs = computed(() => props.sunday.songs || [])

/**
 * The rows, team by team. A team shows when it has someone on it, something
 * of its own to say, or a planner looking at it.
 */
const groups = computed(() => {
  const teams = TEAMS.map((team) => ({
    key: team.key,
    name: team.name,
    rows: visibleRows.value.filter((row) => teamOfRole(row.role) === team.key),
    editable: props.canEdit || props.canEditTeam(team.key),
  }))
  const loose = visibleRows.value.filter((row) => !teamOfRole(row.role))
  return [
    ...teams.filter(
      (group) =>
        group.rows.length ||
        (group.key === 'worship' && songs.value.length) ||
        (group.key === 'preaching' && props.sermon) ||
        (group.key === 'ushers' && props.duties?.total)
    ),
    ...(loose.length ? [{ key: '', name: 'Also serving', rows: loose, editable: false }] : []),
  ]
})

/** The names on a role, one line: "Ana, Benjie". */
const namesOf = (row) => row.people.map((person) => rosterName(person)).join(', ')

/** Under the names: the role, and for the band who is on what. */
const detailOf = (row) => {
  if (row.role.id !== BAND_ROLE) return row.role.name
  const parts = row.people
    .map((person) => {
      const instrument = instrumentOn(props.sunday, person.id, person.member)
      return instrument ? `${rosterName(person)} on ${instrumentName(instrument).toLowerCase()}` : ''
    })
    .filter(Boolean)
  return parts.length ? `Band · ${parts.join(', ')}` : row.role.name
}

const isMine = computed(() => props.myRoles.length > 0)
const isLeading = computed(() => props.myRoles.some((role) => role.id === SONG_LEADER_ROLE))
const myRoleNames = computed(() => props.myRoles.map((role) => role.name).join(' and '))
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Your own part in it, in one line -->
    <p
      v-if="isMine && !isPast"
      class="rounded-2xl bg-primary/10 px-4 py-3 text-[15px] font-medium text-primary dark:bg-primary-light/15 dark:text-primary-light"
    >
      You’re serving as {{ myRoleNames }}<template v-if="isLeading && !songs.length"> · no songs picked yet</template>
    </p>

    <template v-for="group in groups" :key="group.key || 'loose'">
      <ListGroup :title="group.name">
        <template v-if="group.editable && group.key && !isPast" #action>
          <button
            type="button"
            class="-my-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
            @click="$emit('edit', group.key)"
          >
            Plan
          </button>
        </template>

        <ListRow
          v-for="row in group.rows"
          :key="row.role.id"
          :title="row.people.length ? namesOf(row) : 'Nobody yet'"
          :subtitle="detailOf(row)"
          :muted="!row.people.length && isPast"
          :warn="!row.people.length && !isPast"
        >
          <template #leading>
            <FacePile :members="row.people.map((person) => person.member).filter(Boolean)" />
          </template>
        </ListRow>

        <!-- Preaching: the message -->
        <ListRow
          v-if="group.key === 'preaching' && sermon"
          :title="sermon.title || 'Untitled message'"
          :subtitle="
            [sermon.passages?.map((p) => p.reference).join(', '), sermon.slides?.length ? `${sermon.slides.length} slides` : '']
              .filter(Boolean)
              .join(' · ')
          "
        >
          <template #leading>
            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <component :is="sermon.slides?.length ? Slideshow : BookOpen" class="size-5" />
            </span>
          </template>
        </ListRow>

        <!-- Preaching: the message as it was preached. preload="none", so the
             file only downloads for whoever presses play. -->
        <div v-if="group.key === 'preaching' && sermon?.audio" class="px-4 py-3">
          <p class="mb-2 flex items-center gap-2 text-[15px] font-medium text-gray-900 dark:text-white">
            <Microphone class="size-4 shrink-0 text-primary dark:text-primary-light" />
            Listen to the message
          </p>
          <audio :src="sermon.audio.url" controls preload="none" class="w-full" />
        </div>

        <!-- Ushers: the jobs done every Sunday -->
        <ListRow
          v-if="group.key === 'ushers' && duties?.total"
          :to="{ name: 'SchedulesUshers' }"
          :title="`${duties.done} of ${duties.total} jobs done`"
          subtitle="The Sunday checklist"
        >
          <template #leading>
            <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
              <ListChecks class="size-5" />
            </span>
          </template>
        </ListRow>

        <ListRow v-if="group.key === 'worship' && !group.rows.length && songs.length" title="Nobody leading yet" muted />
      </ListGroup>

      <!-- The songs, right after the people singing them -->
      <ListGroup v-if="group.key === 'worship'" title="Songs" :count="songs.length || null">
        <ListRow
          v-for="(entry, index) in songs"
          :key="`${entry.songId}-${index}`"
          :title="entry.title"
          :subtitle="entry.note"
        >
          <template #leading>
            <span class="w-6 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-400 dark:text-gray-500">
              {{ index + 1 }}
            </span>
          </template>
          <template #trailing>
            <span
              v-if="entry.key"
              class="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-sm font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200"
            >
              {{ entry.key }}
            </span>
          </template>
        </ListRow>
        <ListRow v-if="!songs.length" title="No songs chosen yet" muted />
      </ListGroup>
    </template>

    <p v-if="!groups.length" class="px-1 text-sm text-gray-500 dark:text-gray-400">Nobody has been scheduled yet.</p>
  </div>
</template>
