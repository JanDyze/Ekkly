<script setup>
import { nextTick, ref } from 'vue'
import { Building2, Check, Loader2, Pencil } from '../../icons'
import { usePermissions } from '../../composables/usePermissions'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import ChurchLogoPicker from './ChurchLogoPicker.vue'
import CategoryListEditor from './CategoryListEditor.vue'
import InfoHint from '../common/InfoHint.vue'
import { DEFAULT_CATEGORIES } from '../../data/appDefaults'
import { eventTypeLabel } from '../../utils/eventColors'

const toast = useToast()
const { isAdmin } = usePermissions()
const { church, categories, saveChurch, saveCategories } = useAppSettings()

/* ----------------------------------------------------------------- names */
// Three lines that read as what the church is called, not as a form to fill
// in: they were three boxes and a Save button, standing open on a screen
// nobody came to type on.
//
// So: Edit turns the lines into fields and Done turns them back. One switch
// for the three of them, because whoever came to rename the branch did not
// come to hunt for the one line that is tappable. There is still no Save —
// each line writes itself as you leave it, the way the logo and the lists on
// this page already do.
const FIELDS = [
  {
    key: 'shortName',
    label: 'Short name',
    required: true,
    placeholder: 'Grace Community',
    hint: 'What the church is called day to day. It appears in the sidebar, on the sign-in screen and in the filenames of spreadsheets you export.',
  },
  {
    key: 'fullName',
    label: 'Full legal name',
    placeholder: 'Grace Community Church Inc.',
    hint: 'The name as it is registered. With the branch below, it forms the letterhead on printed forms and exports.',
  },
  {
    key: 'branch',
    label: 'Branch or outreach',
    placeholder: 'Bacolod',
    hint: 'Which congregation this is, where a church has more than one. It sits under the full name on printed forms and exports.',
  },
]

const editing = ref(false)
const drafts = ref({})
const savingField = ref('')
const fieldInput = ref(null)

const startEditing = async () => {
  drafts.value = Object.fromEntries(FIELDS.map((field) => [field.key, church.value[field.key] || '']))
  editing.value = true
  await nextTick()
  fieldInput.value?.[0]?.focus()
  fieldInput.value?.[0]?.select()
}

/** Written as each line is left, so Done has nothing left to do but close. */
const commitField = async (field) => {
  const value = String(drafts.value[field.key] || '').trim()
  const current = church.value[field.key] || ''

  // The short name is on every screen and in every export filename, so it is
  // the one that cannot be blank. Emptying it puts the old one back.
  if (field.required && !value) {
    drafts.value = { ...drafts.value, [field.key]: current }
    toast.error('The short name cannot be empty.')
    return
  }
  if (value === current) return

  savingField.value = field.key
  try {
    await saveChurch({ [field.key]: value })
  } catch (e) {
    console.error('Error saving church details:', e)
    toast.error('Could not save. Please try again.')
    drafts.value = { ...drafts.value, [field.key]: current }
  } finally {
    savingField.value = ''
  }
}

const stopEditing = async () => {
  // Whatever is under the cursor has not been left yet, so it is written now.
  for (const field of FIELDS) await commitField(field)
  editing.value = false
}

/* ------------------------------------------------------------- categories */
// An event type is stored as a key the calendar colours by ('worship'), not as
// the words it shows, so it is written down and read back differently from the
// other three.
const LISTS = [
  { key: 'gallery', label: 'Gallery albums', hint: 'What an album in the photo gallery can be filed under.' },
  { key: 'links', label: 'Links', hint: 'How saved links are grouped on the Links page.' },
  { key: 'songs', label: 'Song list', hint: 'What a song can be filed under on the Song list.' },
  {
    key: 'eventTypes',
    label: 'Event types',
    hint: 'What an event can be. The calendar colours an event by its type, and attendance reports on it.',
    format: eventTypeLabel,
    store: (value) => value.trim().toLowerCase().replace(/\s+/g, '-'),
  },
]

const savingList = ref(null)
const editingLists = ref(false)

const persist = async (key, values) => {
  savingList.value = key
  try {
    await saveCategories({ ...categories.value, [key]: values })
  } catch (e) {
    console.error('Error saving categories:', e)
    toast.error('Could not save that change.')
  } finally {
    savingList.value = null
  }
}

const addEntry = (list, raw) => {
  const value = (list.store ? list.store(raw) : raw.trim())
  if (!value) return
  const current = categories.value[list.key] || []
  if (current.some((v) => String(v).toLowerCase() === value.toLowerCase())) {
    toast.info('That one is already on the list')
    return
  }
  persist(list.key, [...current, value])
}

const removeEntry = (key, value) => {
  persist(
    key,
    (categories.value[key] || []).filter((v) => v !== value)
  )
}

// Puts back whichever of the built-in entries have been taken off, keeping
// everything the church added and the order it is in.
const restoreDefaults = (key) => {
  const current = categories.value[key] || []
  const present = new Set(current.map((value) => String(value).toLowerCase()))
  const missing = (DEFAULT_CATEGORIES[key] || []).filter(
    (value) => !present.has(String(value).toLowerCase())
  )
  if (!missing.length) return
  persist(key, [...current, ...missing])
}
</script>

<template>
  <section
    class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
  >
    <div class="section-head flex items-start gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
      <div class="p-2 rounded-lg bg-primary/10 shrink-0">
        <Building2 class="h-5 w-5 text-primary dark:text-primary-light" />
      </div>
      <div class="min-w-0">
        <h2 class="flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-white">
          Church
          <InfoHint
            label="church settings"
            text="The name on every screen and printed report, the logo, and the lists the rest of the app chooses from."
          />
        </h2>
      </div>
    </div>

    <p v-if="!isAdmin" class="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
      Only administrators can change church details.
    </p>

    <template v-else>
      <div class="p-4 space-y-3 border-b border-gray-100 dark:border-gray-700">
        <!-- Saves on pick, like the category lists: there is nothing to type
             alongside it, so it does not belong behind the Save button. -->
        <ChurchLogoPicker />

        <!-- Reading, until Edit says otherwise. -->
        <div class="flex items-center justify-between gap-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Names
          </p>
          <button
            type="button"
            @click="editing ? stopEditing() : startEditing()"
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
          >
            <template v-if="editing">
              <Check class="h-3.5 w-3.5" />
              Done
            </template>
            <template v-else>
              <Pencil class="h-3.5 w-3.5" />
              Edit
            </template>
          </button>
        </div>

        <div v-for="field in FIELDS" :key="field.key">
          <p class="mb-1 flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            {{ field.label }}
            <InfoHint :label="field.label.toLowerCase()" :text="field.hint" />
          </p>

          <!-- Each line writes itself as you leave it, so Done is a way out
               rather than a Save button in disguise. -->
          <div v-if="editing" class="relative">
            <input
              ref="fieldInput"
              :value="drafts[field.key]"
              @input="drafts = { ...drafts, [field.key]: $event.target.value }"
              type="text"
              :placeholder="field.placeholder"
              :aria-label="field.label"
              enterkeyhint="done"
              @keydown.enter.prevent="$event.target.blur()"
              @blur="commitField(field)"
              class="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 pr-9 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
            <Loader2
              v-if="savingField === field.key"
              class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400"
            />
          </div>

          <p
            v-else
            :class="[
              'truncate px-3 py-2 text-sm',
              church[field.key] ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
            ]"
          >
            {{ church[field.key] || 'Not set' }}
          </p>
        </div>
      </div>

      <!-- Category vocabularies -->
      <div class="p-4 space-y-5">
        <div class="flex items-center justify-between gap-2">
          <h3 class="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Lists
            <InfoHint
              label="the lists"
              text="What the rest of the app offers when something has to be filed under a category. Removing one does not change records already filed under it — they keep the old label until you edit them."
            />
          </h3>
          <button
            type="button"
            @click="editingLists = !editingLists"
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
          >
            <template v-if="editingLists">
              <Check class="h-3.5 w-3.5" />
              Done
            </template>
            <template v-else>
              <Pencil class="h-3.5 w-3.5" />
              Edit
            </template>
          </button>
        </div>

        <CategoryListEditor
          v-for="list in LISTS"
          :key="list.key"
          :label="list.label"
          :hint="list.hint"
          :values="categories[list.key] || []"
          :defaults="DEFAULT_CATEGORIES[list.key] || []"
          :format="list.format || ((value) => value)"
          :busy="savingList === list.key"
          :editing="editingLists"
          @add="(value) => addEntry(list, value)"
          @remove="(value) => removeEntry(list.key, value)"
          @restore="restoreDefaults(list.key)"
        />
      </div>
    </template>
  </section>
</template>
