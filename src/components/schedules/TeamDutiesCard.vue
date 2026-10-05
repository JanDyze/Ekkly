<script setup>
/**
 * A team's jobs for one Sunday: the list it does every week, ticked off as
 * each is done.
 *
 * The list is the team's own and repeats every Sunday; the ticks belong to
 * the day, so next week starts clean without anybody resetting anything. Who
 * ticked a job is kept beside it, because "who counted the room?" is the
 * question that gets asked afterwards.
 *
 * Whoever plans the team can change the list here, in place. A team with no
 * list yet is offered the usual one to start from rather than a blank page.
 */
import { computed, ref } from 'vue'
import { Check, Pencil, Plus, Trash2 } from '../../icons'
import ListGroup from '../appframe/ListGroup.vue'
import ListRow from '../appframe/ListRow.vue'
import { useTeamDuties } from '../../composables/useTeamDuties'
import { useToast } from '../../composables/useToast'

const props = defineProps({
  team: { type: String, required: true },
  date: { type: String, default: '' },
  // Ticking: the people on the team that Sunday, and whoever plans it.
  canTick: { type: Boolean, default: false },
  // Changing the list itself: whoever plans the team.
  canEdit: { type: Boolean, default: false },
  title: { type: String, default: 'Every Sunday' },
})

const toast = useToast()
const { dutiesOf, doneOn, toggle, saveDuties } = useTeamDuties()

const SUGGESTED = {
  ushers: [
    'Open the doors and turn on the lights',
    'Set out chairs, bulletins and offering bags',
    'Greet people and help them to a seat',
    'Take the offering',
    'Count everyone in the room',
    'Tidy up and lock up',
  ],
  welcome: [
    'Greet everyone at the door',
    'Give each newcomer a welcome card',
    'Write down the names of first-timers',
    'Introduce newcomers to a pastor or leader',
    'Send each newcomer a welcome message this week',
  ],
}

const list = computed(() => dutiesOf(props.team))
const done = computed(() => (props.date ? doneOn(props.date, props.team) : {}))
const doneCount = computed(() => list.value.filter((d) => done.value[d.id]).length)

const busy = ref('')
const onToggle = async (duty) => {
  if (!props.canTick || !props.date || busy.value) return
  busy.value = duty.id
  try {
    await toggle(props.date, props.team, duty.id)
  } catch (error) {
    console.error('Could not tick that job:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    busy.value = ''
  }
}

/* --------------------------------------------------------- editing the list */

const editing = ref(false)
const draft = ref([])
const newDuty = ref('')

const newId = () => `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

const startEditing = (fromSuggested = false) => {
  draft.value = fromSuggested
    ? (SUGGESTED[props.team] || []).map((text) => ({ id: newId(), text }))
    : list.value.map((d) => ({ ...d }))
  newDuty.value = ''
  editing.value = true
}

const addDuty = () => {
  const text = newDuty.value.trim()
  if (!text) return
  draft.value.push({ id: newId(), text })
  newDuty.value = ''
}

const saveList = async () => {
  addDuty()
  try {
    await saveDuties(props.team, draft.value)
    editing.value = false
    toast.success('List saved')
  } catch (error) {
    console.error('Could not save the list:', error)
    toast.error('Could not save the list. Please try again.')
  }
}

const tickedBy = (duty) => done.value[duty.id]?.by || ''

const inputClass =
  'h-10 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <ListGroup :title="title" :count="list.length && date && !editing ? `${doneCount} of ${list.length}` : null">
    <template v-if="canEdit && list.length && !editing" #action>
      <button
        type="button"
        class="-my-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
        @click="startEditing()"
      >
        <Pencil class="size-3.5" />
        Edit list
      </button>
    </template>

    <!-- Changing the list -->
    <div v-if="editing" class="space-y-2 p-3">
      <div v-for="(duty, index) in draft" :key="duty.id" class="flex items-center gap-2">
        <input v-model="duty.text" :class="inputClass" :aria-label="`Job ${index + 1}`" maxlength="80" />
        <button
          type="button"
          class="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          :aria-label="`Remove ${duty.text}`"
          @click="draft.splice(index, 1)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
      <form class="flex items-center gap-2" @submit.prevent="addDuty">
        <input v-model="newDuty" :class="inputClass" placeholder="Another job, e.g. Set up the sound desk" maxlength="80" />
        <button
          type="submit"
          class="shrink-0 rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
          aria-label="Add the job"
        >
          <Plus class="h-4 w-4" />
        </button>
      </form>
      <div class="flex justify-end gap-2 pt-1">
        <button
          type="button"
          class="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          @click="editing = false"
        >
          Cancel
        </button>
        <button type="button" class="rounded-lg bg-primary px-4 py-2 text-sm text-white hover:bg-primary-hover" @click="saveList">
          Save
        </button>
      </div>
    </div>

    <!-- The jobs, ticked off -->
    <template v-else-if="list.length">
      <ListRow
        v-for="duty in list"
        :key="duty.id"
        :title="duty.text"
        :subtitle="tickedBy(duty)"
        :muted="Boolean(done[duty.id])"
        :aria-pressed="Boolean(done[duty.id])"
        v-on="canTick && date ? { click: () => onToggle(duty) } : {}"
      >
        <template #leading>
          <span
            :class="[
              'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
              done[duty.id] ? 'border-primary bg-primary text-white' : 'border-gray-300 dark:border-gray-600',
            ]"
          >
            <Check v-if="done[duty.id]" class="h-4 w-4" />
          </span>
        </template>
      </ListRow>
    </template>

    <!-- Nothing yet -->
    <div v-else class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
      <p>No weekly jobs listed yet.</p>
      <div v-if="canEdit" class="mt-3 flex flex-wrap gap-2">
        <button
          v-if="SUGGESTED[team]"
          type="button"
          class="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          @click="startEditing(true)"
        >
          Start from the usual list
        </button>
        <button
          type="button"
          class="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
          @click="startEditing()"
        >
          Write our own
        </button>
      </div>
    </div>
  </ListGroup>
</template>
