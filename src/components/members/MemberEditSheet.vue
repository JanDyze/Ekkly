<script setup>
// Adding or editing a person, a few questions at a time.
//
// The profile used to turn itself into a column of ten boxed inputs plus
// three chip clouds, each saving on blur, and adding someone was a drawer of
// collapsible sections. On a phone both were a wall: nothing said where you
// were, what was left, or whether it had saved. This asks in four short steps
// - name, personal, contact, church - and writes once, at the end.
//
// It is still an editor rather than a wizard. Only the name is required, so
// the steps can be tapped or swiped in any order, and Save is in the header
// as soon as there is something to save: fixing a phone number should not
// mean walking through three other screens to reach the button.
import { computed, ref, watch } from 'vue'
import { Camera, Check, ChevronLeft, ChevronRight, FlowerTulip, GenderFemale, GenderMale, Heart, HeartBreak, Trash2, User, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSwipePage } from '../../composables/useSwipePage'
import { useToast } from '../../composables/useToast'
import { useAppSettings } from '../../composables/useAppSettings'
import { BAND_ROLE } from '../../data/scheduleRoles'
import { INSTRUMENTS } from '../../data/instruments'
import InstrumentIcon from '../schedules/InstrumentIcon.vue'
import { uploadImage } from '../../api/blobService'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import MemberAvatar from './MemberAvatar.vue'
import BirthdayInput from './BirthdayInput.vue'
import AddressPicker from './AddressPicker.vue'
import ImageCropper from './ImageCropper.vue'
import { FIRST_TIMER_TAG } from '../../composables/useMemberForm'
import {
  calculateAgeFromDate,
  CIVIL_STATUS_OPTIONS,
  OCCUPATION_OPTIONS,
  getFullName,
  getSexIconColor,
  isYearless,
} from '../../utils/memberUtils'
import { samplePerson } from '../../data/samplePeople'

const props = defineProps({
  show: { type: Boolean, default: false },
  /** 'edit' changes `member`; 'add' starts a new record from nothing. */
  mode: { type: String, default: 'edit' },
  member: { type: Object, default: null },
  /** Which step to open on, so a "birthday missing" chip can land on it. */
  startStep: { type: Number, default: 0 },
  ministryNames: { type: Array, default: () => [] },
  allTags: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'save', 'delete'])

const toast = useToast()
const isAdd = computed(() => props.mode === 'add')

const STEPS = [
  { key: 'name', label: 'Name', title: 'What is their name?', fields: ['image', 'firstName', 'lastName', 'nickname'] },
  { key: 'personal', label: 'Personal', title: 'A little about them', fields: ['dateOfBirth', 'sex', 'civilStatus', 'occupation'] },
  { key: 'contact', label: 'Contact', title: 'How to reach them', fields: ['contactNumber', 'email', 'address', 'addressParts'] },
  { key: 'church', label: 'Church', title: 'Their place in the church', fields: ['isMember', 'ministries', 'instruments', 'tags'] },
]

const FIELDS = STEPS.flatMap((s) => s.fields)
const LIST_FIELDS = ['ministries', 'instruments', 'tags']

// Somebody being added is nearly always somebody who has just walked in, so a
// new record starts as an attendee tagged First Timer (useMemberForm.js says
// why). Sex and civil status start blank: guessing "Male" and "Single" put an
// answer on every record that nobody had given.
const NEW_PERSON = { isMember: false, tags: [FIRST_TIMER_TAG] }

const draft = ref({})
const step = ref(0)
// Which way the last move went, so the next screen slides in from that side.
const direction = ref('forward')
const nameError = ref(false)

const snapshot = (member) => {
  const out = {}
  FIELDS.forEach((key) => {
    const value = member?.[key]
    if (LIST_FIELDS.includes(key)) out[key] = Array.isArray(value) ? [...value] : []
    else if (key === 'isMember') out[key] = !!value
    else if (key === 'image') out[key] = value || null
    // The places an address was picked from (AddressPicker): an object, or none.
    else if (key === 'addressParts') out[key] = value || null
    else out[key] = value ?? ''
  })
  return out
}

/** What the draft is measured against: the record, or an empty new person. */
const baseline = () => snapshot(isAdd.value ? NEW_PERSON : props.member)

// A fresh copy every time it opens. The record is live, and a draft carried
// over from last time would quietly undo whatever changed in between.
watch(
  () => props.show,
  (open) => {
    if (!open) return
    draft.value = baseline()
    step.value = Math.min(Math.max(props.startStep, 0), STEPS.length - 1)
    direction.value = 'forward'
    nameError.value = false
  },
  { immediate: true }
)

const same = (a, b) =>
  Array.isArray(a) || Array.isArray(b) || (a && typeof a === 'object') || (b && typeof b === 'object')
    ? JSON.stringify(a || []) === JSON.stringify(b || [])
    : String(a ?? '').trim() === String(b ?? '').trim()

const clean = (value) => (typeof value === 'string' ? value.trim() : value)

/** Only what actually changed, trimmed - for an edit, this is the write. */
const changes = computed(() => {
  if (!isAdd.value && !props.member) return {}
  const original = baseline()
  const out = {}
  FIELDS.forEach((key) => {
    if (!same(draft.value[key], original[key])) out[key] = clean(draft.value[key])
  })
  return out
})

const dirty = computed(() => Object.keys(changes.value).length > 0)
const stepChanged = (s) => s.fields.some((key) => key in changes.value)

// A new record needs a surname as well: two Marias on the roll are one too
// many to tell apart. An existing one only has to keep its first name.
const nameMissing = computed(() => {
  if (!String(draft.value.firstName || '').trim()) return 'first'
  if (isAdd.value && !String(draft.value.lastName || '').trim()) return 'last'
  return null
})
const canSave = computed(
  () => !props.busy && !uploadingPhoto.value && !nameMissing.value && (isAdd.value || dirty.value)
)

const age = computed(() => calculateAgeFromDate(draft.value.dateOfBirth))
const isLast = computed(() => step.value === STEPS.length - 1)

const goTo = (index) => {
  if (index === step.value || index < 0 || index >= STEPS.length) return
  // The name is the one thing a record cannot be without, so it is checked on
  // the way out of its step rather than only at the very end.
  if (step.value === 0 && index > 0 && nameMissing.value) {
    nameError.value = true
    return
  }
  direction.value = index > step.value ? 'forward' : 'back'
  step.value = index
}

const next = () => (isLast.value ? save() : goTo(step.value + 1))
const back = () => goTo(step.value - 1)

const save = () => {
  if (props.busy || uploadingPhoto.value) return
  if (nameMissing.value) {
    nameError.value = true
    direction.value = 'back'
    step.value = 0
    return
  }
  if (isAdd.value) {
    const record = {}
    FIELDS.forEach((key) => {
      record[key] = clean(draft.value[key])
    })
    emit('save', record)
    return
  }
  if (!dirty.value) {
    emit('close')
    return
  }
  const out = { ...changes.value }
  // Age is stored beside the birthday for the lists that sort by it.
  if ('dateOfBirth' in out) out.age = out.dateOfBirth ? calculateAgeFromDate(out.dateOfBirth) : null
  emit('save', out)
}

/* ---------------------------------------------------------------- closing */
const confirmDiscard = ref(false)

const requestClose = () => {
  if (props.busy) return
  if (dirty.value) confirmDiscard.value = true
  else emit('close')
}

const discard = () => {
  confirmDiscard.value = false
  emit('close')
}

const dialogRef = ref(null)
const showImageCropper = ref(false)
useFocusTrap(
  dialogRef,
  () => props.show && !confirmDiscard.value && !showImageCropper.value,
  requestClose
)

/* ------------------------------------------------------------------ swipe */
// Sideways between steps, the way you would leaf through cards. Up and down
// stays scrolling - a step can be taller than a phone - and the step's own
// checks still apply, so a swipe cannot skip past a missing name.
const { swipeRef } = useSwipePage({
  onNext: () => goTo(step.value + 1),
  onPrevious: () => goTo(step.value - 1),
  enabled: () => props.show && !confirmDiscard.value && !showImageCropper.value,
})

/* ------------------------------------------------------------------ photo */
// The face at the top of the Name step: the draft over the record, so a new
// name or a new photo shows the moment it is entered.
const preview = computed(() => ({ ...(props.member || {}), ...draft.value }))
const uploadingPhoto = ref(false)

// The cropper hands back a full-quality PNG data URL. It goes to Blob storage
// and the draft keeps only the URL - a data URL is never written to Firestore.
const handlePhoto = async (dataUrl) => {
  if (!dataUrl) {
    draft.value.image = null
    return
  }
  uploadingPhoto.value = true
  try {
    draft.value.image = await uploadImage(dataUrl, 'members')
  } catch (error) {
    console.error('Error storing that photo:', error)
    toast.error('Could not save that photo. Please try again.')
  } finally {
    uploadingPhoto.value = false
  }
}

/* ------------------------------------------------------------------ lists */
const toggleIn = (key, value) => {
  const list = draft.value[key] || []
  draft.value[key] = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// A tag that is on the record but no longer in the church's list still has to
// be shown, or there would be no way to take it off.
const tagOptions = computed(() => [...new Set([...props.allTags, ...(draft.value.tags || [])])])
const ministryOptions = computed(() => [
  ...new Set([...props.ministryNames, ...(draft.value.ministries || [])]),
])

// What they play, asked only of somebody in one of the band's ministries —
// the ones Schedules offers first for the band (Settings > Schedule roles).
// Toggled in the order they are tapped, so the first one is their usual, and
// the one a Sunday's band suggests for them.
const { scheduleRoles } = useAppSettings()
const bandMinistries = computed(() =>
  (scheduleRoles.value.find((role) => role.id === BAND_ROLE)?.ministries || []).map((m) => m.toLowerCase())
)
const playsInBand = computed(
  () =>
    (draft.value.instruments || []).length > 0 ||
    (draft.value.ministries || []).some((m) => bandMinistries.value.includes(String(m).toLowerCase()))
)

// Each answer with a picture, so the choice is seen before it is read.
const sexOptions = [
  { value: 'Male', icon: GenderMale },
  { value: 'Female', icon: GenderFemale },
]
const CIVIL_ICONS = { Single: User, Married: Heart, Widowed: FlowerTulip, Separated: HeartBreak }

/** A tile that is one of a few answers: picture over word, the chosen one in the church's colour. */
const tile = (on) => [
  'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 text-sm font-medium transition-colors',
  on
    ? 'border-primary bg-primary/10 text-primary dark:border-primary-light dark:bg-primary-light/15 dark:text-primary-light'
    : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700',
]

// The occupation is a preset when it is one, and typed only when it is not.
const occupationIsPreset = computed(() => OCCUPATION_OPTIONS.includes(draft.value.occupation))

const onEnter = (event) => {
  // Enter moves on, the way a phone keyboard's "next" key suggests it will.
  if (event.target.tagName === 'TEXTAREA') return
  event.preventDefault()
  next()
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const chip = (on) => [
  'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
  on
    ? 'bg-primary text-white'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
]
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show && (member || isAdd)"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="requestClose"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-edit-title"
          tabindex="-1"
          class="sheet-panel flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:h-[min(640px,85dvh)] sm:max-w-lg sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <!-- Header: close, whose record this is, and Save the moment there
               is something to save. -->
          <div class="flex shrink-0 items-center gap-2 px-2 pt-2">
            <button
              type="button"
              @click="requestClose"
              aria-label="Close"
              class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X class="h-5 w-5" />
            </button>
            <div class="min-w-0 flex-1 text-center">
              <h2 id="member-edit-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                {{ isAdd ? 'Add person' : 'Edit profile' }}
              </h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">
                {{ isAdd ? getFullName(draft).trim() || 'New to the roll' : getFullName(member) }}
              </p>
            </div>
            <button
              type="button"
              @click="save"
              :disabled="!canSave"
              :class="[
                'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
                canSave
                  ? 'text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15'
                  : 'cursor-not-allowed text-gray-300 dark:text-gray-600',
              ]"
            >
              {{ busy ? 'Saving…' : isAdd ? 'Add' : 'Save' }}
            </button>
          </div>

          <!-- The stepper. Every step can be tapped: it shows where you are,
               not a gate you have to pass. A dot marks a step you have
               changed something on. -->
          <nav aria-label="Profile sections" class="shrink-0 px-4 pb-3 pt-3">
            <ol class="grid grid-cols-4 gap-2">
              <li v-for="(s, i) in STEPS" :key="s.key">
                <button
                  type="button"
                  @click="goTo(i)"
                  :aria-current="i === step ? 'step' : undefined"
                  class="group flex w-full flex-col gap-1.5 text-left"
                >
                  <span
                    :class="[
                      'block h-1 w-full rounded-full transition-colors duration-300',
                      i <= step ? 'bg-primary dark:bg-primary-light' : 'bg-gray-200 dark:bg-gray-700',
                    ]"
                  ></span>
                  <span class="flex min-w-0 items-center gap-1">
                    <span
                      :class="[
                        'truncate text-xs transition-colors',
                        i === step
                          ? 'font-semibold text-gray-900 dark:text-white'
                          : 'text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300',
                      ]"
                    >
                      {{ s.label }}
                    </span>
                    <span
                      v-if="stepChanged(s)"
                      class="h-1.5 w-1.5 shrink-0 rounded-full bg-primary dark:bg-primary-light"
                      aria-label="changed"
                    ></span>
                  </span>
                </button>
              </li>
            </ol>
          </nav>

          <!-- One step at a time. -->
          <div :ref="swipeRef" class="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <Transition :name="`step-${direction}`" mode="out-in">
              <form :key="step" class="space-y-5 px-4 pb-6 pt-2 sm:px-6" @submit.prevent="next">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white">{{ STEPS[step].title }}</h3>

                <!-- Name -->
                <template v-if="STEPS[step].key === 'name'">
                  <!-- The face first: it is how most people here are known. -->
                  <div class="flex items-center gap-4">
                    <div class="relative">
                      <MemberAvatar :member="preview" size="h-16 w-16" />
                      <span
                        v-if="uploadingPhoto"
                        class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40"
                      >
                        <span class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
                      </span>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button
                        type="button"
                        @click="showImageCropper = true"
                        :disabled="uploadingPhoto"
                        class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
                      >
                        <Camera class="h-4 w-4" />
                        {{ draft.image ? 'Change photo' : 'Add photo' }}
                      </button>
                      <button
                        v-if="draft.image && !uploadingPhoto"
                        type="button"
                        @click="draft.image = null"
                        class="h-10 rounded-lg px-3 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div>
                    <label for="me-first" :class="label">First name <span class="text-red-500">*</span></label>
                    <input
                      id="me-first"
                      v-model="draft.firstName"
                      @input="nameError = false"
                      @keydown.enter="onEnter"
                      enterkeyhint="next"
                      autocomplete="off"
                      autocapitalize="words"
                      :placeholder="samplePerson(draft.sex).firstName"
                      :class="[input, nameError && nameMissing === 'first' ? 'border-red-400 dark:border-red-500' : '']"
                    />
                    <p v-if="nameError && nameMissing === 'first'" class="mt-1 text-xs text-red-600 dark:text-red-400">
                      A first name is needed before this can be saved.
                    </p>
                  </div>
                  <div>
                    <label for="me-last" :class="label">
                      Last name <span v-if="isAdd" class="text-red-500">*</span>
                    </label>
                    <input
                      id="me-last"
                      v-model="draft.lastName"
                      @input="nameError = false"
                      @keydown.enter="onEnter"
                      enterkeyhint="next"
                      autocomplete="off"
                      autocapitalize="words"
                      :placeholder="samplePerson(draft.sex).lastName"
                      :class="[input, nameError && nameMissing === 'last' ? 'border-red-400 dark:border-red-500' : '']"
                    />
                    <p v-if="nameError && nameMissing === 'last'" class="mt-1 text-xs text-red-600 dark:text-red-400">
                      A last name is needed too, so they can be told apart on the roll.
                    </p>
                  </div>
                  <div>
                    <label for="me-nick" :class="label">Nickname</label>
                    <input
                      id="me-nick"
                      v-model="draft.nickname"
                      @keydown.enter="onEnter"
                      enterkeyhint="next"
                      autocomplete="off"
                      :placeholder="samplePerson(draft.sex).nickname"
                      :class="input"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">What people call them at church.</p>
                  </div>
                </template>

                <!-- Personal -->
                <template v-else-if="STEPS[step].key === 'personal'">
                  <div>
                    <label for="me-dob" :class="label">
                      Birthday
                      <span v-if="age !== undefined" class="font-normal text-gray-500 dark:text-gray-400">· {{ age }} years old</span>
                      <span v-else-if="isYearless(draft.dateOfBirth)" class="font-normal text-gray-500 dark:text-gray-400">· age not known</span>
                    </label>
                    <!-- color-scheme tells the browser the lists are dark, so
                         their own menus match rather than black on black. -->
                    <BirthdayInput id="me-dob" v-model="draft.dateOfBirth" :field-class="[input, 'dark:scheme-dark']" />
                  </div>

                  <fieldset>
                    <legend :class="label">Sex</legend>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="opt in sexOptions"
                        :key="opt.value"
                        type="button"
                        @click="draft.sex = draft.sex === opt.value ? '' : opt.value"
                        :aria-pressed="draft.sex === opt.value"
                        :class="[tile(draft.sex === opt.value), 'flex-row! gap-2! py-3!']"
                      >
                        <!-- The sign in its own colour, the one the record
                             shows beside the name. -->
                        <component :is="opt.icon" :class="['size-5', getSexIconColor(opt.value)]" />
                        {{ opt.value }}
                      </button>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend :class="label">Civil status</legend>
                    <!-- Four answers in one row, each a picture and a word: one
                         tap, and the same tap again to take it back. -->
                    <div class="grid grid-cols-4 gap-2">
                      <button
                        v-for="opt in CIVIL_STATUS_OPTIONS"
                        :key="opt.value"
                        type="button"
                        @click="draft.civilStatus = draft.civilStatus === opt.value ? '' : opt.value"
                        :aria-pressed="draft.civilStatus === opt.value"
                        :class="tile(draft.civilStatus === opt.value)"
                      >
                        <component :is="CIVIL_ICONS[opt.value]" class="size-5" />
                        <span class="text-xs">{{ opt.label }}</span>
                      </button>
                    </div>
                  </fieldset>

                  <div>
                    <label for="me-job" :class="label">Occupation</label>
                    <div class="mb-2 flex flex-wrap gap-1.5">
                      <button
                        v-for="opt in OCCUPATION_OPTIONS"
                        :key="opt"
                        type="button"
                        @click="draft.occupation = draft.occupation === opt ? '' : opt"
                        :aria-pressed="draft.occupation === opt"
                        :class="chip(draft.occupation === opt)"
                      >
                        {{ opt }}
                      </button>
                    </div>
                    <input
                      id="me-job"
                      :value="occupationIsPreset ? '' : draft.occupation"
                      @input="draft.occupation = $event.target.value"
                      @keydown.enter="onEnter"
                      enterkeyhint="next"
                      placeholder="Something else? Type it here"
                      :class="input"
                    />
                  </div>
                </template>

                <!-- Contact -->
                <template v-else-if="STEPS[step].key === 'contact'">
                  <div>
                    <label for="me-tel" :class="label">Phone number</label>
                    <input
                      id="me-tel"
                      v-model="draft.contactNumber"
                      @keydown.enter="onEnter"
                      type="tel"
                      inputmode="tel"
                      enterkeyhint="next"
                      autocomplete="off"
                      placeholder="0917 123 4567"
                      :class="input"
                    />
                  </div>
                  <div>
                    <label for="me-email" :class="label">Email</label>
                    <input
                      id="me-email"
                      v-model="draft.email"
                      @keydown.enter="onEnter"
                      type="email"
                      inputmode="email"
                      enterkeyhint="next"
                      autocomplete="off"
                      autocapitalize="off"
                      placeholder="juan@example.com"
                      :class="input"
                    />
                  </div>
                  <div>
                    <p :class="label">Address</p>
                    <AddressPicker
                      v-model="draft.address"
                      v-model:parts="draft.addressParts"
                      :field-class="[input, 'dark:scheme-dark']"
                      label-class="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
                    />
                  </div>
                </template>

                <!-- Church -->
                <template v-else>
                  <fieldset>
                    <legend :class="label">Standing</legend>
                    <div class="grid grid-cols-2 gap-2">
                      <button
                        v-for="opt in [
                          { on: true, label: 'Member', hint: 'Has joined the church' },
                          { on: false, label: 'Attendee', hint: 'Comes, not joined yet' },
                        ]"
                        :key="opt.label"
                        type="button"
                        @click="draft.isMember = opt.on"
                        :aria-pressed="draft.isMember === opt.on"
                        :class="[
                          'rounded-lg border px-3 py-2.5 text-left transition-colors',
                          draft.isMember === opt.on
                            ? 'border-primary bg-primary/10 dark:border-primary-light dark:bg-primary-light/15'
                            : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700',
                        ]"
                      >
                        <span
                          :class="[
                            'flex items-center gap-1.5 text-sm font-semibold',
                            draft.isMember === opt.on
                              ? 'text-primary dark:text-primary-light'
                              : 'text-gray-900 dark:text-white',
                          ]"
                        >
                          <Check v-if="draft.isMember === opt.on" class="h-4 w-4" />
                          {{ opt.label }}
                        </span>
                        <span class="block text-xs text-gray-500 dark:text-gray-400">{{ opt.hint }}</span>
                      </button>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend :class="label">Ministries</legend>
                    <p class="-mt-0.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
                      A ministry grants access to parts of the app.
                    </p>
                    <div v-if="ministryOptions.length" class="flex flex-wrap gap-2">
                      <button
                        v-for="name in ministryOptions"
                        :key="name"
                        type="button"
                        @click="toggleIn('ministries', name)"
                        :aria-pressed="draft.ministries.includes(name)"
                        :class="chip(draft.ministries.includes(name))"
                      >
                        {{ name }}
                      </button>
                    </div>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500">
                      No ministries yet. Add them in Settings.
                    </p>
                  </fieldset>

                  <fieldset v-if="playsInBand">
                    <legend :class="label">Plays</legend>
                    <p class="-mt-0.5 mb-2 text-xs text-gray-500 dark:text-gray-400">
                      The first one picked is their usual, and the one a Sunday's band suggests for them.
                    </p>
                    <div class="flex flex-wrap gap-2">
                      <button
                        v-for="instrument in INSTRUMENTS"
                        :key="instrument.id"
                        type="button"
                        @click="toggleIn('instruments', instrument.id)"
                        :aria-pressed="draft.instruments.includes(instrument.id)"
                        :class="[chip(draft.instruments.includes(instrument.id)), 'inline-flex items-center gap-1.5']"
                      >
                        <InstrumentIcon :id="instrument.id" class="h-4 w-4" />
                        {{ instrument.name }}
                      </button>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend :class="label">Tags</legend>
                    <div v-if="tagOptions.length" class="flex flex-wrap gap-2">
                      <button
                        v-for="tag in tagOptions"
                        :key="tag"
                        type="button"
                        @click="toggleIn('tags', tag)"
                        :aria-pressed="draft.tags.includes(tag)"
                        :class="chip(draft.tags.includes(tag))"
                      >
                        {{ tag }}
                      </button>
                    </div>
                    <p v-else class="text-sm text-gray-400 dark:text-gray-500">
                      No tags yet. Add one from the People list.
                    </p>
                  </fieldset>

                  <!-- Destructive, last, and out of the way of the footer. -->
                  <div v-if="canDelete && !isAdd" class="border-t border-gray-100 pt-4 dark:border-gray-700">
                    <button
                      type="button"
                      @click="emit('delete')"
                      class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 class="h-4 w-4" />
                      Delete this person
                    </button>
                  </div>
                </template>
              </form>
            </Transition>
          </div>

          <!-- Back and Next, where the thumb already is. -->
          <div
            class="flex shrink-0 items-center gap-3 border-t border-gray-200 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700"
          >
            <button
              v-if="step > 0"
              type="button"
              @click="back"
              class="inline-flex h-11 items-center gap-1 rounded-lg bg-gray-100 pl-3 pr-4 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              <ChevronLeft class="h-4 w-4" />
              Back
            </button>
            <span class="flex-1 text-center text-xs tabular-nums text-gray-400 dark:text-gray-500">
              {{ step + 1 }} of {{ STEPS.length }}
            </span>
            <button
              type="button"
              @click="next"
              :disabled="busy || uploadingPhoto"
              class="inline-flex h-11 items-center gap-1 rounded-lg bg-primary pl-4 pr-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              <template v-if="isLast">
                {{ busy ? 'Saving…' : isAdd ? 'Add person' : dirty ? 'Save changes' : 'Done' }}
                <Check class="ml-0.5 h-4 w-4" />
              </template>
              <template v-else>
                Next
                <ChevronRight class="h-4 w-4" />
              </template>
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- :modelValue, not v-model: the handler uploads first and is the only
         thing allowed to set the draft's photo. -->
    <ImageCropper
      v-model:show="showImageCropper"
      :modelValue="draft.image"
      @update:modelValue="handlePhoto"
    />

    <ConfirmationModal
      :show="confirmDiscard"
      title="Discard changes"
      message="You have changes that are not saved. Close without saving them?"
      confirm-text="Discard"
      cancel-text="Keep editing"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="confirmDiscard = $event"
      @confirm="discard"
      @cancel="confirmDiscard = false"
    />
  </Teleport>
</template>

<style scoped>
/* The same entrance as the other sheets: up from the bottom on a phone, a
   slight grow on a desktop where it is a centred card. */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}

.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.sheet-leave-active .sheet-panel {
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}

@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: translateY(0.5rem) scale(0.96);
  }
}

/* Steps slide the way you are going: Next brings the new one in from the
   right, Back from the left. A short distance, so it reads as a page turn
   rather than a journey. */
.step-forward-enter-active,
.step-forward-leave-active,
.step-back-enter-active,
.step-back-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.step-forward-enter-from,
.step-back-leave-to {
  opacity: 0;
  transform: translateX(1.5rem);
}

.step-forward-leave-to,
.step-back-enter-from {
  opacity: 0;
  transform: translateX(-1.5rem);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel,
  .step-forward-enter-active,
  .step-forward-leave-active,
  .step-back-enter-active,
  .step-back-leave-active {
    transition: opacity 0.15s ease;
    transform: none;
  }
}
</style>
