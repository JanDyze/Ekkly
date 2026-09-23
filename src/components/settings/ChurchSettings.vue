<script setup>
// The church as a record, read the way a person's profile is read.
//
// It used to be a form: three name boxes behind an Edit toggle, and the four
// category lists behind another one. Two of the three things it held were not
// the church at all — the lists are the app's vocabulary, and they now have a
// section of their own (ChurchListsAdmin.vue) — and what a church would
// actually come here to check, what it is for and where to find it, was not
// here. Those lived under Settings > Public page, as though a mission
// statement were a property of a web page.
//
// So: what the church is, in plain type, grouped the way somebody would say it
// out loud. One Edit, opening the stepped sheet — the shape the app already
// uses for a record (see MemberDetails.vue). The logo keeps saving on pick,
// because there is nothing to type alongside it.
import { computed, ref } from 'vue'
import { Building2, Pencil } from '../../icons'
import { usePermissions } from '../../composables/usePermissions'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import ChurchLogoPicker from './ChurchLogoPicker.vue'
import ChurchEditSheet from './ChurchEditSheet.vue'
import SectionCard from '../common/SectionCard.vue'

const toast = useToast()
const { isAdmin } = usePermissions()
const { church, saveChurchIdentity } = useAppSettings()

/** One of the church's pair lists, with the entries that say nothing left out. */
const pairs = (key, first) =>
  (Array.isArray(church.value[key]) ? church.value[key] : []).filter((entry) =>
    String(entry?.[first] || '').trim()
  )

/**
 * What the page shows, in the order it reads.
 *
 * `step` is which step of the editor a group belongs to, so tapping a group's
 * heading opens the sheet where that group is rather than at the beginning.
 */
const GROUPS = computed(() => [
  {
    key: 'names',
    label: 'Names',
    step: 0,
    rows: [
      { label: 'Short name', value: church.value.shortName },
      { label: 'Full legal name', value: church.value.fullName },
      { label: 'Branch or outreach', value: church.value.branch },
      { label: 'Year founded', value: church.value.founded },
      { label: 'Affiliation', value: church.value.affiliation },
    ],
  },
  {
    key: 'words',
    label: 'Mission and values',
    step: 1,
    rows: [
      { label: 'Mission', value: church.value.mission, wrap: true },
      { label: 'Vision', value: church.value.vision, wrap: true },
    ],
    // The two that are lists of their own, under the statements above them.
    lists: [
      { label: 'Basis of faith', items: pairs('basisOfFaith', 'belief'), first: 'belief', second: 'reference' },
      { label: 'Core values', items: pairs('values', 'value'), first: 'value', second: 'note' },
    ],
  },
  {
    key: 'place',
    label: 'Finding us',
    step: 2,
    rows: [
      { label: 'Address', value: church.value.address, wrap: true },
      { label: 'Phone', value: church.value.phone },
      { label: 'Email', value: church.value.email },
      { label: 'Facebook', value: church.value.facebook },
      { label: 'Map link', value: church.value.mapUrl },
    ],
  },
])

/* ------------------------------------------------------------------ editing */

const sheet = ref(null)
const showEditor = ref(false)
const editorStep = ref(0)
const saving = ref(false)

const openEditor = (step = 0) => {
  if (!isAdmin.value) return
  editorStep.value = step
  // Seeded before it is shown, and told which step it is opening on: the prop
  // set on the line above has not reached the sheet yet.
  sheet.value?.reset(step)
  showEditor.value = true
}

const saveEdit = async (changes) => {
  saving.value = true
  try {
    await saveChurchIdentity(changes)
    showEditor.value = false
    toast.success('Church details saved')
  } catch (error) {
    console.error('Error saving church details:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SectionCard
    :icon="Building2"
    title="Church details"
    subtitle="What the church is called, what it is here for, and where to find it"
    head-class="section-head"
  >
    <p v-if="!isAdmin" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
      Only administrators can change church details.
    </p>

    <template v-else>
      <!-- Saves on pick: there is nothing to type alongside a logo, so it does
           not belong behind an editor you have to finish. -->
      <div class="border-b border-gray-100 p-4 dark:border-gray-700">
        <ChurchLogoPicker />
      </div>

      <div
        v-for="group in GROUPS"
        :key="group.key"
        class="border-b border-gray-100 p-4 last:border-b-0 dark:border-gray-700"
      >
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ group.label }}
          </h3>
          <button
            type="button"
            @click="openEditor(group.step)"
            :aria-label="`Edit ${group.label.toLowerCase()}`"
            class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
          >
            <Pencil class="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        <dl class="space-y-3">
          <div v-for="row in group.rows" :key="row.label">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ row.label }}</dt>
            <dd
              :class="[
                'mt-0.5 text-sm',
                row.wrap ? 'whitespace-pre-line' : 'truncate',
                row.value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
              ]"
            >
              {{ row.value || 'Not set' }}
            </dd>
          </div>

          <!-- The lists belong to the group they are part of rather than a
               section of their own: the articles and the values are the same
               answer as the mission, said at more length. -->
          <div v-for="list in group.lists || []" :key="list.label">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ list.label }}</dt>
            <dd v-if="list.items.length" class="mt-1.5 space-y-1.5">
              <div
                v-for="(entry, index) in list.items"
                :key="index"
                class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/40"
              >
                <p class="text-sm font-medium text-gray-900 dark:text-white">{{ entry[list.first] }}</p>
                <p v-if="entry[list.second]" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ entry[list.second] }}
                </p>
              </div>
            </dd>
            <dd v-else class="mt-0.5 text-sm text-gray-400 dark:text-gray-500">Not set</dd>
          </div>
        </dl>
      </div>
    </template>

    <ChurchEditSheet
      ref="sheet"
      :show="showEditor"
      :church="church"
      :start-step="editorStep"
      :busy="saving"
      @close="showEditor = false"
      @save="saveEdit"
    />
  </SectionCard>
</template>
