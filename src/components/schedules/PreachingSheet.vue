<script setup>
/**
 * One Sunday's message, for the preaching team: who preaches, the series it
 * belongs to, its title, the passages, an outline, and the slides.
 *
 * Who preaches and the theme are the Sunday's, shared with the rota; the rest
 * is the sermon's own record (sermonsService). The caller saves both, merging
 * the rota part onto the live Sunday so nothing another team changed is lost.
 *
 * Passages are looked up as they are added, the way the presenter does, so a
 * mistyped reference is caught here rather than on the screen on Sunday.
 * Slides come in as a PDF and go up as one picture per slide. The recording
 * of the message goes up as it is, straight to the file store, for anyone who
 * missed it to listen back to.
 */
import { computed, ref, watch } from 'vue'
import { BookOpen, Loader2, Microphone, Plus, Slideshow, Trash2, UploadSimple, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useBibleVersion } from '../../composables/useBibleVersion'
import { useToast } from '../../composables/useToast'
import { lookupReference } from '../../api/bibleService'
import { deleteImages, uploadAudio, uploadImage } from '../../api/blobService'
import { assignmentsOf } from '../../data/scheduleRoles'
import { rolesOfTeam } from '../../data/scheduleTeams'
import { findRosterMember, formatServiceDate, rosterName } from '../../utils/lineupUtils'
import { isPdf, isPowerPoint, pdfToImages } from '../../utils/pdfSlides'
import MemberAvatar from '../members/MemberAvatar.vue'
import PeoplePickerSheet from './PeoplePickerSheet.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  sunday: { type: Object, default: null },
  sermon: { type: Object, default: null },
  members: { type: Array, default: () => [] },
  roles: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'save'])

const toast = useToast()
const isMobile = useMediaQuery('(max-width: 1023px)')
const { version: bibleVersion } = useBibleVersion()
const dialogRef = ref(null)
const form = ref(null)
// Slides uploaded while the sheet was open, so Cancel can take them back out.
let uploadedHere = []

const preachingRoles = computed(() => rolesOfTeam(props.roles, 'preaching'))

// The passage being typed, declared before the watcher below resets it.
const newReference = ref('')
const lookingUp = ref(false)
const lookupError = ref('')

watch(
  () => [props.show, props.sunday?.date],
  ([show]) => {
    if (!show || !props.sunday) return
    const assignments = assignmentsOf(props.sunday)
    const sermon = props.sermon || {}
    form.value = {
      date: props.sunday.date,
      theme: props.sunday.theme || '',
      assignments: Object.fromEntries(preachingRoles.value.map((role) => [role.id, [...(assignments[role.id] || [])]])),
      title: sermon.title || '',
      passages: (sermon.passages || []).map((p) => ({ ...p })),
      pointsText: (sermon.points || []).join('\n'),
      showOutline: sermon.showOutline === true,
      slides: (sermon.slides || []).map((s) => ({ ...s })),
      slidesName: sermon.slidesName || '',
      audio: sermon.audio ? { ...sermon.audio } : null,
      notes: sermon.notes || '',
    }
    uploadedHere = []
    newReference.value = ''
    lookupError.value = ''
  },
  { immediate: true }
)

const close = () => {
  // Pictures uploaded for a deck that was never saved belong to nothing.
  if (uploadedHere.length) deleteImages(uploadedHere).catch(() => null)
  uploadedHere = []
  emit('update:show', false)
}
useFocusTrap(dialogRef, computed(() => props.show), close)

/* ------------------------------------------------------------- preachers */

const pickingRole = ref(null)
const pickerOpen = computed({
  get: () => Boolean(pickingRole.value),
  set: (open) => {
    if (!open) pickingRole.value = null
  },
})
const peopleOn = (roleId) => form.value?.assignments[roleId] || []
const togglePerson = (id) => {
  const roleId = pickingRole.value.id
  const current = peopleOn(roleId)
  form.value.assignments[roleId] = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
}
const removePerson = (roleId, id) => {
  form.value.assignments[roleId] = peopleOn(roleId).filter((x) => x !== id)
}
const memberOf = (id) => findRosterMember(props.members, id)

/* -------------------------------------------------------------- passages */

const addPassage = async () => {
  const typed = newReference.value.trim()
  if (!typed || lookingUp.value) return
  lookingUp.value = true
  lookupError.value = ''
  const result = await lookupReference(typed, bibleVersion.value)
  lookingUp.value = false
  if (result.error || !result.verses?.length) {
    lookupError.value = result.error || 'That passage has no verses in it.'
    return
  }
  form.value.passages.push({
    reference: result.reference,
    version: result.version || bibleVersion.value,
    verses: result.verses,
  })
  newReference.value = ''
}

const removePassage = (index) => form.value.passages.splice(index, 1)

/* ---------------------------------------------------------------- slides */

const slidesInput = ref(null)
const slidesBusy = ref('')

const onSlides = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (isPowerPoint(file)) {
    toast.error('Save the deck as a PDF first: in PowerPoint, File → Save as → PDF.')
    return
  }
  if (!isPdf(file)) {
    toast.error('Choose a PDF of the slides.')
    return
  }
  try {
    slidesBusy.value = 'Reading the slides…'
    const { images, skipped } = await pdfToImages(file, {
      onPage: (n, total) => (slidesBusy.value = `Reading slide ${n} of ${total}…`),
    })
    const urls = []
    for (const [index, dataUrl] of images.entries()) {
      slidesBusy.value = `Uploading slide ${index + 1} of ${images.length}…`
      urls.push(await uploadImage(dataUrl, `sermons/${form.value.date}`))
    }
    uploadedHere.push(...urls)
    form.value.slides = urls.map((url) => ({ url }))
    form.value.slidesName = file.name
    if (skipped) toast.info(`Only the first ${images.length} slides were added.`)
  } catch (error) {
    console.error('Could not add the slides:', error)
    toast.error('Could not add those slides. Please try again.')
  } finally {
    slidesBusy.value = ''
  }
}

const removeSlides = () => {
  form.value.slides = []
  form.value.slidesName = ''
}

/* ------------------------------------------------------------- recording */

// Up to the length a whole message runs to; the file store allows the same.
const MAX_RECORDING_BYTES = 200 * 1024 * 1024
const audioInput = ref(null)
const audioBusy = ref('')

const onAudio = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  if (!file.type.startsWith('audio/') && !/\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|webm)$/i.test(file.name)) {
    toast.error('Choose a sound file: an MP3, M4A or WAV.')
    return
  }
  if (file.size > MAX_RECORDING_BYTES) {
    toast.error('That recording is over 200 MB. Please save it at a lower quality and try again.')
    return
  }
  audioBusy.value = 'Uploading…'
  try {
    const url = await uploadAudio(file, (percent) => (audioBusy.value = `Uploading ${percent}%`), {
      use: 'sermon',
      date: form.value.date,
    })
    uploadedHere.push(url)
    form.value.audio = { url, name: file.name }
  } catch (error) {
    console.error('Could not upload the recording:', error)
    toast.error('Could not upload that recording. Please try again.')
  } finally {
    audioBusy.value = ''
  }
}

/* ------------------------------------------------------------------ save */

const handleSave = () => {
  if (!form.value || props.saving || slidesBusy.value || audioBusy.value) return
  const previousSlides = (props.sermon?.slides || []).map((s) => s.url)
  const keptSlides = new Set(form.value.slides.map((s) => s.url))
  const previousAudio = props.sermon?.audio?.url || ''
  uploadedHere = []
  emit('save', {
    sunday: { date: form.value.date, theme: form.value.theme.trim(), assignments: form.value.assignments },
    sermon: {
      title: form.value.title,
      passages: form.value.passages,
      points: form.value.pointsText.split('\n'),
      showOutline: form.value.showOutline,
      slides: form.value.slides,
      slidesName: form.value.slidesName,
      audio: form.value.audio,
      notes: form.value.notes,
    },
    // A deck or a recording replaced or removed: its files are nobody's any more.
    discardedSlides: [
      ...previousSlides.filter((url) => !keptSlides.has(url)),
      ...(previousAudio && previousAudio !== form.value.audio?.url ? [previousAudio] : []),
    ],
  })
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
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
          aria-labelledby="preaching-sheet-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl dark:bg-gray-800"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <div class="min-w-0">
              <h2 id="preaching-sheet-title" class="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {{ formatServiceDate(form.date) }}
              </h2>
              <p class="text-xs text-gray-500 dark:text-gray-400">Preaching · the message and its slides</p>
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
            <!-- Who preaches -->
            <div v-for="role in preachingRoles" :key="role.id">
              <div class="mb-1 flex items-center justify-between gap-2">
                <span :class="labelClass">{{ role.name }}</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary dark:text-primary-light"
                  @click="pickingRole = role"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Choose
                </button>
              </div>
              <div v-if="peopleOn(role.id).length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="id in peopleOn(role.id)"
                  :key="id"
                  class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-2 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  <MemberAvatar v-if="memberOf(id)" :member="memberOf(id)" alt="" size="h-5 w-5" />
                  {{ rosterName({ member: memberOf(id) }) }}
                  <button
                    type="button"
                    class="text-gray-400 hover:text-red-600"
                    :aria-label="`Remove ${rosterName({ member: memberOf(id) })}`"
                    @click="removePerson(role.id, id)"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <p v-else class="text-xs text-gray-400 dark:text-gray-500">Nobody yet</p>
            </div>

            <div>
              <label for="preaching-theme" :class="labelClass">Series or theme</label>
              <input id="preaching-theme" v-model="form.theme" :class="inputClass" placeholder="Faithful in little" maxlength="80" />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Shown on the schedule and in the month’s video.</p>
            </div>

            <div>
              <label for="preaching-title" :class="labelClass">Title of the message</label>
              <input id="preaching-title" v-model="form.title" :class="inputClass" placeholder="The widow’s two coins" maxlength="120" />
            </div>

            <!-- Passages -->
            <div>
              <span :class="labelClass">Passages</span>
              <ul v-if="form.passages.length" class="mb-2 space-y-1.5">
                <li
                  v-for="(passage, index) in form.passages"
                  :key="`${passage.reference}-${index}`"
                  class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-700/50"
                >
                  <BookOpen class="h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ passage.reference }}</span>
                    <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ passage.verses[0]?.text }}</span>
                  </span>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    :aria-label="`Remove ${passage.reference}`"
                    @click="removePassage(index)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </li>
              </ul>
              <div class="flex gap-2">
                <input
                  v-model="newReference"
                  :class="inputClass"
                  placeholder="Mark 12:41-44"
                  aria-label="A passage to add"
                  @keydown.enter.prevent="addPassage"
                />
                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary disabled:opacity-50 dark:text-primary-light"
                  :disabled="!newReference.trim() || lookingUp"
                  @click="addPassage"
                >
                  <Loader2 v-if="lookingUp" class="h-4 w-4 animate-spin" />
                  <Plus v-else class="h-4 w-4" />
                  Add
                </button>
              </div>
              <p v-if="lookupError" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ lookupError }}</p>
              <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Each passage goes up on the screen as a reading on Sunday.
              </p>
            </div>

            <!-- Outline -->
            <div>
              <label for="preaching-points" :class="labelClass">Outline</label>
              <textarea
                id="preaching-points"
                v-model="form.pointsText"
                rows="4"
                :class="inputClass"
                placeholder="One point to a line"
              />
              <label class="mt-2 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input v-model="form.showOutline" type="checkbox" class="size-4 rounded accent-[var(--color-primary)]" />
                Put the outline on the screen, a point to a slide
              </label>
            </div>

            <!-- Slides -->
            <div>
              <span :class="labelClass">Slides</span>
              <div v-if="form.slides.length" class="flex items-center gap-3 rounded-xl bg-gray-50 p-2 dark:bg-gray-700/50">
                <img :src="form.slides[0].url" alt="" class="h-14 w-24 shrink-0 rounded-lg object-cover" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ form.slidesName || 'Slides' }}</span>
                  <span class="block text-xs text-gray-500 dark:text-gray-400">{{ form.slides.length }} {{ form.slides.length === 1 ? 'slide' : 'slides' }}</span>
                </span>
                <button
                  type="button"
                  class="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  aria-label="Remove the slides"
                  @click="removeSlides"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                class="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
                :disabled="Boolean(slidesBusy)"
                @click="slidesInput?.click()"
              >
                <Loader2 v-if="slidesBusy" class="h-4 w-4 animate-spin" />
                <UploadSimple v-else class="h-4 w-4" />
                {{ slidesBusy || (form.slides.length ? 'Replace the slides' : 'Add slides (PDF)') }}
              </button>
              <p class="mt-1 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Slideshow class="mt-px h-3.5 w-3.5 shrink-0" />
                From PowerPoint or Keynote, save the deck as a PDF first. Each slide shows on the screen exactly as made.
              </p>
              <input ref="slidesInput" type="file" accept="application/pdf,.pdf,.ppt,.pptx,.key" class="hidden" @change="onSlides" />
            </div>

            <!-- Recording -->
            <div>
              <span :class="labelClass">Recording of the message</span>
              <div v-if="form.audio" class="space-y-2 rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50">
                <div class="flex items-center gap-2">
                  <Microphone class="h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
                  <span class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">{{ form.audio.name || 'Recording' }}</span>
                  <button
                    type="button"
                    class="shrink-0 rounded-lg p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    aria-label="Remove the recording"
                    @click="form.audio = null"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
                <audio :src="form.audio.url" controls preload="none" class="w-full" />
              </div>
              <button
                type="button"
                class="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
                :disabled="Boolean(audioBusy)"
                @click="audioInput?.click()"
              >
                <Loader2 v-if="audioBusy" class="h-4 w-4 animate-spin" />
                <UploadSimple v-else class="h-4 w-4" />
                {{ audioBusy || (form.audio ? 'Replace the recording' : 'Add the recording') }}
              </button>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                An MP3 or M4A from the sound desk or a phone, up to 200 MB. Anyone can listen back from the Sunday.
              </p>
              <input ref="audioInput" type="file" accept="audio/*" class="hidden" @change="onAudio" />
            </div>

            <div>
              <label for="preaching-notes" :class="labelClass">Notes for the team</label>
              <textarea
                id="preaching-notes"
                v-model="form.notes"
                rows="2"
                :class="inputClass"
                placeholder="Video clip after the second point"
              />
            </div>
          </form>

          <div class="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="saving || Boolean(slidesBusy) || Boolean(audioBusy)"
              :class="[
                'rounded-lg px-4 py-2',
                saving || slidesBusy || audioBusy
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-primary text-white hover:bg-primary-hover',
              ]"
              @click="handleSave"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PeoplePickerSheet
      v-model:show="pickerOpen"
      :role="pickingRole"
      :members="members"
      :selected-ids="pickingRole ? peopleOn(pickingRole.id) : []"
      @toggle="togglePerson"
    />
  </Teleport>
</template>
