<script setup>
// The lists the rest of the app chooses from: what an album can be filed under,
// how a link is grouped, what a song is, what a gathering is.
//
// They were the second half of Church details, which is where anyone looking for
// the church's name would find them and nobody looking for them would think to
// look. They are the app's vocabulary rather than anything about the church, so
// they are their own section.
//
// Read here, changed in a sheet of short steps — the same shape as Church
// details, because it is the same kind of thing: a record you come to check and
// occasionally correct. It was four blocks each with an Edit of its own and each
// pill saving itself as it was tapped, which made one card behave four ways and
// none of them the way the rest of the app behaves. One Edit per list still, but
// it opens the sheet on that list's step rather than turning the block into a
// form.
import { computed, ref } from 'vue'
import { CalendarDays, Images, LinkSimple, ListChecks, ListMusic, Pencil } from '../../icons'
import { usePermissions } from '../../composables/usePermissions'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import ListsEditSheet from './ListsEditSheet.vue'
import SectionCard from '../common/SectionCard.vue'
import { DEFAULT_CATEGORIES } from '../../data/appDefaults'
import {
  EVENT_HUES,
  eventTypeLabel,
  getEventTypeDot,
  getEventTypeHue,
  hueColours,
} from '../../utils/eventColors'

const toast = useToast()
const { isAdmin } = usePermissions()
const { categories, saveCategories, eventColours, saveEventColours } = useAppSettings()

// The swatches offered for an event type, each drawn in the hue it stands for.
const EVENT_PALETTE = EVENT_HUES.map((hue) => ({ hue, dot: hueColours(hue).dot }))

// An event type is stored as the key the calendar colours by ('worship'), not as
// the words it shows, so it is written down and read back differently from the
// other three — and it is the only list whose entries carry a colour. The dot is
// that colour, and in the sheet it is also how the colour is changed: a church
// that adds "Baptism" picks what the calendar paints it, rather than finding it
// grey with nothing to be done.
const LISTS = computed(() => [
  {
    key: 'gallery',
    label: 'Gallery albums',
    short: 'Albums',
    icon: Images,
    hint: 'What an album in the photo gallery can be filed under.',
    defaults: DEFAULT_CATEGORIES.gallery,
  },
  {
    key: 'links',
    label: 'Links',
    short: 'Links',
    icon: LinkSimple,
    hint: 'How saved links are grouped on the Links page.',
    defaults: DEFAULT_CATEGORIES.links,
  },
  {
    key: 'songs',
    label: 'Song list',
    short: 'Songs',
    icon: ListMusic,
    hint: 'What a song can be filed under on the Song list.',
    defaults: DEFAULT_CATEGORIES.songs,
  },
  {
    key: 'eventTypes',
    label: 'Event types',
    short: 'Events',
    icon: CalendarDays,
    hint: 'What an event can be. The calendar colours an event by its type, and attendance reports on it.',
    defaults: DEFAULT_CATEGORIES.eventTypes,
    format: eventTypeLabel,
    // Two ways of asking the same question: what this value wears now, and what
    // a given hue looks like. The sheet needs the second, because in there the
    // answer comes from its own draft rather than from the settings.
    dot: getEventTypeDot,
    dotFor: (hue) => hueColours(hue).dot,
    hueOf: getEventTypeHue,
    palette: EVENT_PALETTE,
    store: (value) => value.trim().toLowerCase().replace(/\s+/g, '-'),
  },
])

const values = computed(() =>
  Object.fromEntries(LISTS.value.map((list) => [list.key, categories.value[list.key] || []]))
)

/* ------------------------------------------------------------------ editing */

const sheet = ref(null)
const showEditor = ref(false)
const editorStep = ref(0)
const saving = ref(false)

const openEditor = (step = 0) => {
  if (!isAdmin.value) return
  editorStep.value = step
  // Seeded before it is shown, and told which step it opens on: the prop set on
  // the line above has not reached the sheet yet.
  sheet.value?.reset(step)
  showEditor.value = true
}

const saveEdit = async ({ values: changed, hues }) => {
  saving.value = true
  try {
    if (Object.keys(changed).length) await saveCategories({ ...categories.value, ...changed })
    if (hues) await saveEventColours(hues)
    showEditor.value = false
    toast.success('Lists saved')
  } catch (error) {
    console.error('Error saving the lists:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SectionCard
    :icon="ListChecks"
    title="Lists"
    subtitle="What the app offers when something has to be filed under a category"
    head-class="section-head"
  >
    <p v-if="!isAdmin" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
      Only administrators can change these lists.
    </p>

    <template v-else>
      <div
        v-for="(list, index) in LISTS"
        :key="list.key"
        class="border-b border-gray-100 p-4 last:border-b-0 dark:border-gray-700"
      >
        <div class="mb-2 flex items-center gap-2">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
          >
            <component :is="list.icon" class="h-4 w-4" />
          </span>
          <h3
            class="min-w-0 truncate text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
          >
            {{ list.label }}
          </h3>
          <span class="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
            {{ values[list.key].length }}
          </span>
          <button
            type="button"
            @click="openEditor(index)"
            :aria-label="`Edit ${list.label.toLowerCase()}`"
            class="ml-auto inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
          >
            <Pencil class="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        <!-- Reading: no crosses, no add box, nothing to tap by accident. -->
        <div v-if="values[list.key].length" class="flex flex-wrap items-center gap-1.5">
          <span
            v-for="value in values[list.key]"
            :key="value"
            class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
          >
            <span v-if="list.dot" :class="['h-2 w-2 shrink-0 rounded-full', list.dot(value)]"></span>
            {{ (list.format || ((v) => v))(value) }}
          </span>
        </div>
        <p v-else class="text-xs italic text-gray-400 dark:text-gray-500">None yet</p>
      </div>
    </template>

    <ListsEditSheet
      ref="sheet"
      :show="showEditor"
      :lists="LISTS"
      :values="values"
      :hues="eventColours"
      :start-step="editorStep"
      :busy="saving"
      @close="showEditor = false"
      @save="saveEdit"
    />
  </SectionCard>
</template>
