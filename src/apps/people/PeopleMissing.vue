<script setup>
import { computed, ref } from 'vue'
import { RouterLink, onBeforeRouteLeave } from 'vue-router'
import { GenderFemale, GenderMale } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import DeskTable from '../../components/appframe/DeskTable.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import BirthdayInput from '../../components/members/BirthdayInput.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { useMembers } from '../../composables/useMembers'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useToast } from '../../composables/useToast'
import { calculateAgeFromDate, formatBirthday, getFullName, isBlankDetail, listPhrase } from '../../utils/memberUtils'

// The records still missing a detail the rest of Ekkly counts on — a birthday
// for the birthday list and the age groups, a sex for the count of men and
// women.
//
// The roll marks a thin record with an amber count on its row, which says
// there is a gap but leaves finding them all to scrolling. This is the list of
// them. On a phone each opens straight into its editor, so filling in a dozen
// is a dozen taps and saves rather than a search.
//
// On a desktop it is a sheet to work down instead: each row has the missing
// answers in it, to be filled in where they are, and saved a row at a time or
// all at once. Opening twelve editors one after another is a phone's way of
// doing a desk's job.

const { loading, incomplete, counts } = usePeopleOverview()
const { updateMemberInFirestore } = useMembers()
const toast = useToast()
const desk = useMediaQuery('(min-width: 1024px)')

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = incomplete.value.length
  return n ? `${n} of ${counts.value.total.toLocaleString()} ${n === 1 ? 'record' : 'records'}` : 'Every record is complete'
})

const keyOf = (member) => String(member.firestoreId || member.id)
const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
const editorOf = (member) => ({ ...recordOf(member), query: { edit: '1' } })

/* ------------------------------------------------- filling in, on a desk */

// What has been typed into each row and not saved yet, by record. Kept apart
// from the records themselves, which are live: a save from somewhere else
// lands without wiping what is half-typed here.
const drafts = ref({})
const saving = ref(new Set())

const draftOf = (member) => drafts.value[keyOf(member)] || {}
const setDraft = (member, field, value) => {
  drafts.value = { ...drafts.value, [keyOf(member)]: { ...draftOf(member), [field]: value } }
}

/** What saving this row would write: only the gaps, and only those answered. */
const changesOf = (member) => {
  const draft = draftOf(member)
  const out = {}
  if (isBlankDetail(member.dateOfBirth) && draft.dateOfBirth) {
    out.dateOfBirth = draft.dateOfBirth
    out.age = calculateAgeFromDate(draft.dateOfBirth) ?? null
  }
  if (isBlankDetail(member.sex) && draft.sex) out.sex = draft.sex
  return out
}

const isDirty = (member) => Object.keys(changesOf(member)).length > 0
const dirtyRows = computed(() => incomplete.value.filter((row) => isDirty(row.member)))

const dropDraft = (member) => {
  const { [keyOf(member)]: _drop, ...rest } = drafts.value
  drafts.value = rest
}

const write = async (member) => {
  const key = keyOf(member)
  saving.value = new Set([...saving.value, key])
  try {
    await updateMemberInFirestore(member, changesOf(member))
    dropDraft(member)
    return true
  } catch (error) {
    console.error('Error filling in a record:', error)
    return false
  } finally {
    const next = new Set(saving.value)
    next.delete(key)
    saving.value = next
  }
}

const saveRow = async (member) => {
  if (!isDirty(member)) return
  if (await write(member)) toast.success(`${getFullName(member)} saved`)
  else toast.error(`Could not save ${getFullName(member)}. Please try again.`)
}

const saveAll = async () => {
  const members = dirtyRows.value.map((row) => row.member)
  if (!members.length) return
  const results = await Promise.all(members.map(write))
  const saved = results.filter(Boolean).length
  if (saved) toast.success(`${saved} ${saved === 1 ? 'record' : 'records'} saved`)
  if (saved < members.length) toast.error(`${members.length - saved} could not be saved. Please try again.`)
}

// Leaving with answers typed and not saved asks first, rather than losing them.
onBeforeRouteLeave(() => {
  if (!dirtyRows.value.length) return true
  const n = dirtyRows.value.length
  return window.confirm(`${n} ${n === 1 ? 'row has' : 'rows have'} answers that are not saved yet. Leave without saving them?`)
})

const SEXES = [
  { value: 'Male', label: 'Male', icon: GenderMale },
  { value: 'Female', label: 'Female', icon: GenderFemale },
]

// Sized to fit beside the rail on the narrowest desktop, so the sheet never
// scrolls sideways: the sex buttons are their icons alone until there is room
// for the words too.
const columns = [
  { key: 'person', label: 'Name', width: 'minmax(10rem, 1fr)' },
  { key: 'birthday', label: 'Birthday', width: 'minmax(14rem, 1.4fr)' },
  { key: 'sex', label: 'Sex', width: 'minmax(6.5rem, 12rem)' },
  { key: 'save', label: '', width: '5rem', align: 'right' },
]

const field =
  'h-9 w-full rounded-lg border-0 bg-gray-50 px-2 text-sm text-gray-900 ring-1 ring-gray-200 focus:bg-white focus:ring-2 focus:ring-primary dark:bg-gray-900 dark:text-white dark:ring-gray-700 dark:focus:bg-gray-800'
</script>

<template>
  <AppScreen title="Missing info" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/people" desk :fill="desk">
    <template v-if="desk && dirtyRows.length" #action>
      <button
        type="button"
        class="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        :disabled="saving.size > 0"
        @click="saveAll"
      >
        Save all {{ dirtyRows.length }}
      </button>
    </template>

    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <!-- A desk: the gaps filled in where they are. -->
    <template v-else-if="desk && incomplete.length">
      <p class="mb-3 px-1 text-sm text-gray-500 dark:text-gray-400">
        Fill in what you know and save each row, or save them all at once. A birthday with no year is fine: they are
        still greeted on the day.
      </p>
      <DeskTable label="Records still missing a detail" :columns="columns" :rows="incomplete" :row-key="(row) => keyOf(row.member)" fill>
        <template #cell-person="{ row }">
          <RouterLink :to="recordOf(row.member)" class="flex min-w-0 items-center gap-3 hover:text-primary dark:hover:text-primary-light">
            <MemberAvatar :member="row.member" alt="" size="h-9 w-9" class="shrink-0" />
            <span class="min-w-0">
              <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ getFullName(row.member) }}</span>
              <span class="block truncate text-xs text-amber-700 dark:text-amber-400">No {{ listPhrase(row.missing) }}</span>
            </span>
          </RouterLink>
        </template>

        <template #cell-birthday="{ row }">
          <BirthdayInput
            v-if="row.missing.includes('birthday')"
            compact
            :model-value="draftOf(row.member).dateOfBirth || ''"
            :field-class="field"
            @update:model-value="setDraft(row.member, 'dateOfBirth', $event)"
          />
          <span v-else class="text-gray-600 dark:text-gray-300">{{ formatBirthday(row.member.dateOfBirth) }}</span>
        </template>

        <template #cell-sex="{ row }">
          <div v-if="row.missing.includes('sex')" class="grid grid-cols-2 gap-1.5" role="group" :aria-label="`Sex of ${getFullName(row.member)}`">
            <button
              v-for="option in SEXES"
              :key="option.value"
              type="button"
              :aria-pressed="draftOf(row.member).sex === option.value"
              :aria-label="option.label"
              :title="option.label"
              :class="[
                'inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium ring-1 transition-colors',
                draftOf(row.member).sex === option.value
                  ? 'bg-primary/10 text-primary ring-primary dark:bg-primary-light/15 dark:text-primary-light dark:ring-primary-light'
                  : 'text-gray-600 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-gray-700/40',
              ]"
              @click="setDraft(row.member, 'sex', draftOf(row.member).sex === option.value ? '' : option.value)"
            >
              <component :is="option.icon" class="size-4 shrink-0" />
              <span class="hidden xl:inline">{{ option.label }}</span>
            </button>
          </div>
          <span v-else class="text-gray-600 dark:text-gray-300">{{ row.member.sex }}</span>
        </template>

        <template #cell-save="{ row }">
          <button
            v-if="isDirty(row.member)"
            type="button"
            class="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            :disabled="saving.has(keyOf(row.member))"
            @click="saveRow(row.member)"
          >
            {{ saving.has(keyOf(row.member)) ? 'Saving' : 'Save' }}
          </button>
        </template>
      </DeskTable>
    </template>

    <!-- A phone: each opens straight into its editor. -->
    <ListGroup
      v-else-if="incomplete.length"
      :count="incomplete.length"
      title="To complete"
      note="A birthday puts someone on the birthday list and in the right age group. Sex is how the church's men and women are counted."
    >
      <ListRow
        v-for="row in incomplete"
        :key="row.member.firestoreId || row.member.id"
        :to="editorOf(row.member)"
        :title="getFullName(row.member)"
        :subtitle="`Add their ${listPhrase(row.missing)}`"
      >
        <template #leading>
          <MemberAvatar :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
        </template>
      </ListRow>
    </ListGroup>

    <ListGroup v-else>
      <ListRow title="Every record is complete" muted />
    </ListGroup>
  </AppScreen>
</template>
