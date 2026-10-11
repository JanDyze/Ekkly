<script setup>
/**
 * Writing a lesson: a plan for the library, or a class's lesson for a Sunday.
 *
 * One form for both, because they are one record (lessonsService). Leave the
 * class and the Sunday empty and it is a plan kept for later; choose them and
 * it is what that class is taught that day, by whoever is chosen to teach it.
 *
 * A new lesson can start from one already written. The plan's words are
 * copied in, not linked, so changing them here changes only this lesson.
 *
 * Teachers are offered the way the schedule offers its Sunday school role:
 * whoever serves in that role's ministries first, then everyone, because a
 * parent covering a class is still somebody the church needs to write down.
 */
import { computed, ref, watch } from 'vue'
import { BookmarkSimple, Loader2, Plus, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useBibleVersion } from '../../composables/useBibleVersion'
import { lookupReference } from '../../api/bibleService'
import { blankLesson } from '../../api/lessonsService'
import { findRosterMember, formatServiceDate, formatShortDate } from '../../utils/lineupUtils'
import { getDisplayName, getFullName } from '../../utils/memberUtils'
import { BAND_OPTIONS, bandLabel, linesOf } from '../../utils/teachingUtils'
import MemberAvatar from '../members/MemberAvatar.vue'
import PeoplePickerSheet from '../schedules/PeoplePickerSheet.vue'
import PassageList from './PassageList.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  // The lesson being changed, or null for a new one.
  lesson: { type: Object, default: null },
  // What a new lesson starts with: its class, its Sunday, a plan to copy.
  draft: { type: Object, default: null },
  classes: { type: Array, default: () => [] },
  members: { type: Array, default: () => [] },
  // The schedule's Sunday school role, so the picker offers its ministries first.
  teachingRole: { type: Object, default: null },
  // Every lesson, to start a new one from.
  plans: { type: Array, default: () => [] },
  // The Sundays a lesson can be put on.
  dates: { type: Array, default: () => [] },
  today: { type: String, default: '' },
  // (classId, date) -> the teachers a new lesson is offered to.
  suggest: { type: Function, default: null },
  saving: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'save', 'delete'])

const isMobile = useMediaQuery('(max-width: 1023px)')
const { version: bibleVersion } = useBibleVersion()
const dialogRef = ref(null)
const form = ref(null)
const editing = computed(() => Boolean(props.lesson?.id))

const fromLesson = (lesson) => ({
  title: lesson.title || '',
  series: lesson.series || '',
  band: lesson.band || '',
  objective: lesson.objective || '',
  passages: (lesson.passages || []).map((p) => ({ ...p })),
  memoryVerse: lesson.memoryVerse ? { ...lesson.memoryVerse } : null,
  activities: lesson.activities || '',
  materialsText: (lesson.materials || []).join('\n'),
  takeHome: lesson.takeHome || '',
})

const verseTyped = ref('')
const verseError = ref('')
const lookingUp = ref(false)
const startFrom = ref('')

watch(
  () => [props.show, props.lesson?.id],
  ([show]) => {
    if (!show) return
    const source = props.lesson || blankLesson(props.draft || {})
    form.value = {
      ...fromLesson(source),
      classId: source.classId || '',
      date: source.date || '',
      teacherIds: [...(source.teacherIds || [])],
      review: source.review || '',
      fromId: source.fromId || '',
    }
    if (!editing.value && !form.value.teacherIds.length && props.suggest && form.value.classId) {
      form.value.teacherIds = [...props.suggest(form.value.classId, form.value.date)]
    }
    startFrom.value = ''
    verseTyped.value = ''
    verseError.value = ''
  },
  { immediate: true }
)

// Declared before the focus trap, which hands Escape to the picker while it is open.
const pickerOpen = ref(false)
const close = () => emit('update:show', false)
useFocusTrap(dialogRef, computed(() => props.show && !pickerOpen.value), close)

/* ---------------------------------------------------------- where, when */

// The chosen Sunday stays offered even when it is no longer coming, so an
// old lesson can be edited without losing its date.
const dateOptions = computed(() => [...new Set([form.value?.date, ...props.dates].filter(Boolean))].sort())

const onClassChange = () => {
  if (editing.value || !props.suggest || form.value.teacherIds.length) return
  form.value.teacherIds = [...props.suggest(form.value.classId, form.value.date)]
}

const isPast = computed(() => Boolean(form.value?.date && props.today && form.value.date < props.today))

/* ------------------------------------------------------- starting from */

// The same band first, then the rest; a plan with a title only.
const startOptions = computed(() => {
  const band = props.classes.find((cls) => cls.id === form.value?.classId)?.band || ''
  return props.plans
    .filter((plan) => plan.title)
    .sort((a, b) => Number(b.band === band) - Number(a.band === band) || a.title.localeCompare(b.title))
})

const applyStart = () => {
  const plan = props.plans.find((p) => p.id === startFrom.value)
  if (!plan) return
  Object.assign(form.value, fromLesson(plan), { fromId: plan.fromId || plan.id })
}

/* ------------------------------------------------------------ teachers */

const pickerRole = computed(() => ({
  id: props.teachingRole?.id || 'sunday-school',
  name: 'Who is teaching it',
  ministries: props.teachingRole?.ministries || [],
}))
const toggleTeacher = (id) => {
  const ids = form.value.teacherIds
  form.value.teacherIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}
const memberOf = (id) => findRosterMember(props.members, id)

/* --------------------------------------------------------- memory verse */

const lookUpVerse = async () => {
  const typed = verseTyped.value.trim()
  if (!typed || lookingUp.value) return
  lookingUp.value = true
  verseError.value = ''
  const result = await lookupReference(typed, bibleVersion.value)
  lookingUp.value = false
  if (result.error || !result.verses?.length) {
    verseError.value = result.error || 'That reference has no verses in it.'
    return
  }
  form.value.memoryVerse = {
    reference: result.reference,
    version: result.version || bibleVersion.value,
    text: result.verses.map((v) => v.text).join(' '),
  }
  verseTyped.value = ''
}

/* ----------------------------------------------------------------- save */

const valid = computed(() => Boolean(form.value?.title.trim()) && (!form.value.date || form.value.classId))

const handleSave = () => {
  if (!valid.value || props.saving) return
  const teacherIds = form.value.teacherIds
  emit('save', {
    title: form.value.title,
    series: form.value.series,
    band: form.value.band,
    objective: form.value.objective,
    passages: form.value.passages,
    memoryVerse: form.value.memoryVerse,
    activities: form.value.activities,
    materials: linesOf(form.value.materialsText),
    takeHome: form.value.takeHome,
    classId: form.value.classId,
    date: form.value.classId ? form.value.date : '',
    teacherIds,
    teacherNames: teacherIds.map((id) => getFullName(memberOf(id) || {}) || ''),
    review: form.value.review,
    fromId: form.value.fromId,
  })
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const hintClass = 'mt-1 text-xs text-gray-500 dark:text-gray-400'
</script>

<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'modal-sheet' : 'fade'">
      <div v-if="show && form" class="fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-4">
        <div class="absolute inset-0 bg-black/50" @click="close" />
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lesson-editor-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white ring-1 ring-gray-200 sm:max-w-xl sm:rounded-2xl dark:bg-gray-800 dark:ring-gray-700"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <div class="min-w-0">
              <h2 id="lesson-editor-title" class="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {{ editing ? 'Edit lesson' : 'New lesson' }}
              </h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ form.date ? formatServiceDate(form.date) : 'A plan for the library, or a class’s Sunday' }}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <form class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" @submit.prevent="handleSave">
            <!-- Starting from a plan already written -->
            <div v-if="!editing && startOptions.length">
              <label for="lesson-start" :class="labelClass">Start from a lesson already written</label>
              <select id="lesson-start" v-model="startFrom" :class="inputClass" @change="applyStart">
                <option value="">Start from blank</option>
                <option v-for="plan in startOptions" :key="plan.id" :value="plan.id">
                  {{ plan.title }}{{ plan.series ? ` · ${plan.series}` : '' }}{{ plan.band ? ` · ${bandLabel(plan.band)}` : '' }}
                </option>
              </select>
              <p :class="hintClass">Its words are copied in. Changing them here leaves the original as it was.</p>
            </div>

            <div>
              <label for="lesson-title" :class="labelClass">What is the lesson called <span class="text-red-500">*</span></label>
              <input id="lesson-title" v-model="form.title" :class="inputClass" placeholder="Zacchaeus climbs a tree" maxlength="120" />
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="lesson-series" :class="labelClass">Series</label>
                <input id="lesson-series" v-model="form.series" :class="inputClass" placeholder="Jesus meets people" maxlength="80" />
              </div>
              <div>
                <label for="lesson-band" :class="labelClass">Written for</label>
                <select id="lesson-band" v-model="form.band" :class="inputClass">
                  <option v-for="band in BAND_OPTIONS" :key="band.key" :value="band.key">{{ band.label }}</option>
                </select>
              </div>
            </div>

            <!-- Which class, which Sunday -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="lesson-class" :class="labelClass">Which class</label>
                <select id="lesson-class" v-model="form.classId" :class="inputClass" @change="onClassChange">
                  <option value="">No class yet</option>
                  <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
                </select>
              </div>
              <div>
                <label for="lesson-date" :class="labelClass">Which Sunday</label>
                <select id="lesson-date" v-model="form.date" :class="inputClass" :disabled="!form.classId" @change="onClassChange">
                  <option value="">Keep it in the library</option>
                  <option v-for="date in dateOptions" :key="date" :value="date">{{ formatShortDate(date) }}</option>
                </select>
              </div>
            </div>

            <div v-if="form.classId">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span :class="labelClass">Who is teaching it</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
                  @click="pickerOpen = true"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Choose
                </button>
              </div>
              <div v-if="form.teacherIds.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="id in form.teacherIds"
                  :key="id"
                  class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-2 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  <MemberAvatar v-if="memberOf(id)" :member="memberOf(id)" alt="" size="h-5 w-5" />
                  {{ memberOf(id) ? getDisplayName(memberOf(id)) : 'Former member' }}
                  <button
                    type="button"
                    class="text-gray-500 hover:text-red-600 dark:text-gray-400"
                    :aria-label="`Remove ${memberOf(id) ? getDisplayName(memberOf(id)) : 'this teacher'}`"
                    @click="toggleTeacher(id)"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <p v-else class="text-xs text-gray-500 dark:text-gray-400">Nobody yet</p>
            </div>

            <div>
              <label for="lesson-objective" :class="labelClass">What they should leave knowing</label>
              <textarea
                id="lesson-objective"
                v-model="form.objective"
                rows="2"
                :class="inputClass"
                placeholder="Jesus wants to be friends with people others leave out"
              />
            </div>

            <PassageList v-model="form.passages" input-id="lesson-passage" label="Scripture" placeholder="Luke 19:1-10" />

            <!-- Memory verse -->
            <div>
              <label for="lesson-verse" :class="labelClass">Memory verse</label>
              <div
                v-if="form.memoryVerse"
                class="mb-2 flex items-start gap-2 rounded-xl bg-primary/5 px-3 py-2.5 ring-1 ring-primary/15 dark:bg-primary-light/10 dark:ring-primary-light/20"
              >
                <BookmarkSimple class="mt-0.5 h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
                <span class="min-w-0 flex-1">
                  <span class="block text-sm text-gray-900 dark:text-white">“{{ form.memoryVerse.text }}”</span>
                  <span class="mt-0.5 block text-xs font-semibold text-primary dark:text-primary-light">{{ form.memoryVerse.reference }}</span>
                </span>
                <button
                  type="button"
                  class="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="Remove the memory verse"
                  @click="form.memoryVerse = null"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
              <div class="flex gap-2">
                <input
                  id="lesson-verse"
                  v-model="verseTyped"
                  :class="inputClass"
                  :placeholder="form.memoryVerse ? 'A different verse' : 'Luke 19:10'"
                  @keydown.enter.prevent="lookUpVerse"
                />
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary disabled:opacity-50 dark:bg-primary-light/15 dark:text-primary-light"
                  :disabled="!verseTyped.trim() || lookingUp"
                  @click="lookUpVerse"
                >
                  <Loader2 v-if="lookingUp" class="h-4 w-4 animate-spin" />
                  <Plus v-else class="h-4 w-4" />
                  {{ form.memoryVerse ? 'Change' : 'Add' }}
                </button>
              </div>
              <p v-if="verseError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ verseError }}</p>
            </div>

            <div>
              <label for="lesson-activities" :class="labelClass">How the lesson goes</label>
              <textarea
                id="lesson-activities"
                v-model="form.activities"
                rows="7"
                :class="inputClass"
                placeholder="## Welcome (5 min)&#10;Everyone stands on a chair: who can see the furthest?&#10;&#10;## The story (10 min)&#10;- Read Luke 19:1-10&#10;- Act it out with a cardboard tree"
              />
              <p :class="hintClass">Step by step. ## starts a heading, - starts a point.</p>
            </div>

            <div>
              <label for="lesson-materials" :class="labelClass">What to bring</label>
              <textarea id="lesson-materials" v-model="form.materialsText" rows="3" :class="inputClass" placeholder="One to a line&#10;Cardboard tree&#10;Crayons" />
            </div>

            <div>
              <label for="lesson-take-home" :class="labelClass">What they take home</label>
              <textarea
                id="lesson-take-home"
                v-model="form.takeHome"
                rows="2"
                :class="inputClass"
                placeholder="Ask your family: who could you invite for a meal this week?"
              />
            </div>

            <div v-if="editing && isPast">
              <label for="lesson-review" :class="labelClass">How it went</label>
              <textarea
                id="lesson-review"
                v-model="form.review"
                rows="2"
                :class="inputClass"
                placeholder="The tree was a hit. The take-home was too hard for the four-year-olds."
              />
              <p :class="hintClass">For whoever teaches it next.</p>
            </div>
          </form>

          <div class="flex shrink-0 items-center gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700">
            <button
              v-if="editing && canDelete"
              type="button"
              class="rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              @click="emit('delete')"
            >
              Delete
            </button>
            <span class="flex-1" />
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!valid || saving"
              :class="[
                'rounded-lg px-4 py-2',
                !valid || saving
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-primary text-white hover:bg-primary-hover',
              ]"
              @click="handleSave"
            >
              {{ editing ? 'Update' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PeoplePickerSheet
      v-model:show="pickerOpen"
      :role="pickerRole"
      :members="members"
      :selected-ids="form?.teacherIds || []"
      @toggle="toggleTeacher"
    />
  </Teleport>
</template>
