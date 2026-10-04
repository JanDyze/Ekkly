<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  Check,
  DeviceMobile,
  EyeOff,
  ImageSquare,
  Monitor,
  Palette,
  SlidersHorizontal,
  TextT,
  X,
} from '../icons'
import LabPreview from '../components/landinglab/LabPreview.vue'
import PartFields from '../components/landinglab/PartFields.vue'
import LabSheet from '../components/landinglab/LabSheet.vue'
import ChurchSheetHost from '../components/landinglab/ChurchSheetHost.vue'
import { model, moveSection } from '../composables/useLandingLab'
import { useAppSettings } from '../composables/useAppSettings'
import { STOCK } from '../data/landingLabMock'
import { SECTION_TYPES } from '../data/landingSchema'

// PROTOTYPE — /public-page/preview. The page the builder builds, on its own
// screen: no rail, no fields. A church's public page should be judged the way a
// visitor meets it, which a preview squeezed into a third of a builder cannot
// show.
//
// It is also where a phone edits the page. A form on one side and a shrunken
// page on the other is too much for a phone's width, so here the page is the
// editor: tap a part and a small bar of things to do with it comes up — edit
// the words you tapped, change the photo, open its fields, move it, hide it, or
// leave it alone, which is what a tap that was only scrolling wants. Nothing
// changes until one of them is chosen.
//
// The model comes from src/composables/useLandingLab.js, shared with the
// builder, so walking between the two keeps the arrangement.

// On a phone the screen is the phone, so the page simply fills it: no frame,
// no width switch, nothing between the visitor's view and yours. The switch is
// for a desktop, where phone is the default because that is how nearly every
// visitor arrives — the frame is the phone, and wide drops it and lets the page
// have the window.
const wide = ref(false)

const { church, logoUrl } = useAppSettings()

const route = useRoute()
// The part the builder had open, if it had one. The preview opens on it.
const part = typeof route.query.part === 'string' ? route.query.part : ''

const page = ref(null)
// Bumped to draw the page afresh after typing into it. Typing edits the page's
// own text in place, and Vue no longer owns text the browser has rewritten;
// drawing it again from the model hands it back.
const pageKey = ref(0)

/* --------------------------------------------------------- choosing a part */

// The part tapped, and what in it was under the finger: a line of text, a
// photo, one of the church's own details, or nothing in particular.
const selected = ref('')
const tapped = ref(null)

const ownerOf = (id) => (id === 'hero' ? model.hero : model.sections.find((one) => one.id === id) || null)
const selectedSection = computed(() => model.sections.find((one) => one.id === selected.value) || null)

const partLabel = computed(() => {
  if (selected.value === 'hero') return 'Header'
  return selectedSection.value ? SECTION_TYPES[selectedSection.value.type].label : ''
})

const getPath = (owner, path) => path.split('.').reduce((at, key) => (at == null ? at : at[key]), owner)

const setPath = (owner, path, value) => {
  const keys = path.split('.')
  const last = keys.pop()
  const parent = keys.reduce((at, key) => (at == null ? at : at[key]), owner)
  if (parent != null) parent[last] = value
}

/** What a tap landed on, within the part it belongs to. */
const describe = (target, id) => {
  if (!(target instanceof Element)) return null
  const within = (el) => el && el.closest('[data-lab-id]')?.dataset.labId === id
  const detail = target.closest('[data-lab-church]')
  if (within(detail)) return { kind: 'church', step: Number(detail.dataset.labChurch) || 0 }
  const photo = target.closest('[data-lab-photo]')
  if (within(photo)) return { kind: 'photo', path: photo.dataset.labPhoto }
  const text = target.closest('[data-lab-field]')
  if (within(text)) {
    return { kind: 'text', el: text, path: text.dataset.labField, multiline: text.hasAttribute('data-lab-multiline') }
  }
  return null
}

const onPick = (id, event) => {
  // A tap inside the words being typed is placing the caret, not choosing.
  if (editing.value?.el.contains(event?.target)) return
  if (editing.value) commitText()
  const wasDimmed = selected.value && selected.value !== id
  selected.value = id
  tapped.value = describe(event?.target, id)
  // The other parts are dimmed while one is chosen, and nothing inside a dimmed
  // part can be touched — so a tap on one lands on the part as a whole. Once it
  // has come forward, look again at what was under the finger.
  if (wasDimmed && !tapped.value && event) {
    const { clientX, clientY } = event
    nextTick(() => {
      if (selected.value !== id) return
      tapped.value = describe(document.elementFromPoint(clientX, clientY), id)
    })
  }
}

const leave = () => {
  selected.value = ''
  tapped.value = null
}

// A tap on the page outside every part — the footer, the margin — is a tap on
// nothing, and lets go of whatever was chosen.
const onPageClick = (event) => {
  if (editing.value || event.target.closest('[data-lab-id]')) return
  leave()
}

/* -------------------------------------------------- typing into the page */

const editing = ref(null)

const onEditKey = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    cancelText()
  } else if (event.key === 'Enter' && !editing.value?.multiline) {
    // A line is a line: Enter is "done", the way a phone keyboard's return
    // suggests. Paragraphs keep Enter for a new line and finish with Done.
    event.preventDefault()
    commitText()
  }
}

// Leaving the words — tapping elsewhere, the keyboard going away — keeps them.
// Cancel is the way to throw them away, and Done and Cancel are pressed without
// taking focus (see the template), so pressing either is not also a blur.
const onEditBlur = () => commitText()

const stopEditing = (el) => {
  el.removeEventListener('keydown', onEditKey)
  el.removeEventListener('blur', onEditBlur)
  el.removeAttribute('contenteditable')
  editing.value = null
  tapped.value = null
  pageKey.value += 1
}

const editText = () => {
  const target = tapped.value
  const owner = ownerOf(selected.value)
  if (target?.kind !== 'text' || !owner) return
  const { el } = target
  // Plain text only: a pasted paragraph from a word processor must not arrive
  // with its fonts and colours. Where plaintext-only is not understood, the
  // attribute reads back as something else and ordinary editing stands in.
  el.setAttribute('contenteditable', 'plaintext-only')
  if (el.contentEditable !== 'plaintext-only') el.setAttribute('contenteditable', 'true')
  el.addEventListener('keydown', onEditKey)
  el.addEventListener('blur', onEditBlur)
  editing.value = { el, owner, path: target.path, multiline: target.multiline }
  el.focus()
  // All of it selected, so typing replaces it — the common case is a heading
  // rewritten, not a word corrected, and a tap on the words moves the caret.
  const range = document.createRange()
  range.selectNodeContents(el)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
}

const commitText = () => {
  const live = editing.value
  if (!live) return
  let value = live.el.innerText.replace(/\n+$/, '')
  if (!live.multiline) value = value.replace(/\s*\n\s*/g, ' ').trim()
  setPath(live.owner, live.path, value)
  stopEditing(live.el)
}

const cancelText = () => {
  const live = editing.value
  if (!live) return
  // Nothing was written to the model while typing, so drawing the page again
  // is all it takes to put the old words back.
  stopEditing(live.el)
}

/* ---------------------------------------------------- the rest of the bar */

// Which sheet is up: '', 'part', 'look' or 'photo'.
const sheet = ref('')

const sheetTitle = computed(() => {
  if (sheet.value === 'look') return 'Look'
  if (sheet.value === 'photo') return 'Photo'
  return partLabel.value
})

const partEl = (id) => page.value?.querySelector(`[data-lab-id="${CSS.escape(id)}"]:not(header)`)

// The part goes to the top of the screen before its sheet comes up, so the
// sheet rises under it rather than over it and every change is seen as it is
// made. At once rather than smoothly: the sheet holds the page still as it
// opens (useFocusTrap), which would stop a smooth scroll partway.
const openPartSheet = () => {
  const el = partEl(selected.value)
  if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8, behavior: 'instant' })
  sheet.value = 'part'
}

const photoTarget = ref(null)

const openPhotoSheet = () => {
  const owner = ownerOf(selected.value)
  if (tapped.value?.kind !== 'photo' || !owner) return
  photoTarget.value = { owner, path: tapped.value.path }
  sheet.value = 'photo'
}

const currentPhoto = computed(() =>
  photoTarget.value ? getPath(photoTarget.value.owner, photoTarget.value.path) : ''
)

const pickPhoto = (id) => {
  if (photoTarget.value) setPath(photoTarget.value.owner, photoTarget.value.path, id)
  sheet.value = ''
}

const churchHost = ref(null)
// From a form inside a sheet, the sheet goes first: two sheets stacked on a
// phone is a sheet nobody can see the bottom of.
const editChurch = (step) => {
  sheet.value = ''
  churchHost.value?.open(step)
}

const move = (by) => {
  const index = model.sections.findIndex((one) => one.id === selected.value)
  if (index < 0) return
  moveSection(index, by)
  tapped.value = null
  // Followed to where it went, so it is not moved out from under the eye.
  nextTick(() => partEl(selected.value)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
}

const isFirst = computed(() => model.sections[0]?.id === selected.value)
const isLast = computed(() => model.sections[model.sections.length - 1]?.id === selected.value)

// Hiding takes the part off the page, so there is nothing left to tap to get it
// back. A moment of Undo stands in; after that it is in the builder's list.
const hidden = ref(null)
let hiddenTimer = null

const hide = () => {
  const one = selectedSection.value
  if (!one) return
  one.on = false
  hidden.value = { id: one.id, label: partLabel.value }
  leave()
  clearTimeout(hiddenTimer)
  hiddenTimer = setTimeout(() => {
    hidden.value = null
  }, 6000)
}

const undoHide = () => {
  const one = model.sections.find((s) => s.id === hidden.value?.id)
  if (one) {
    one.on = true
    selected.value = one.id
  }
  hidden.value = null
  clearTimeout(hiddenTimer)
}

/* ------------------------------------------------- the morph, both ways */

// The builder's floating window grows into this screen and shrinks back out of
// it (src/router/viewTransitions.js). This screen's half of that is one named
// element: the part the window was showing, or the whole page when it was
// showing the top. Whatever was last chosen here becomes that part, so going
// back lands the builder on it and the window shows it.
const twinId = computed(() => selected.value || part)
const backLink = computed(() => ({ path: '/public-page', query: twinId.value ? { part: twinId.value } : {} }))

let named = null
const nameTwin = () => {
  if (named) named.style.viewTransitionName = ''
  const root = page.value
  if (!root) return
  // Not the masthead, which carries the header's id but is sticky and always on
  // top. A part that is hidden is not drawn, so the whole page stands in.
  named = (twinId.value && partEl(twinId.value)) || root
  named.style.viewTransitionName = 'public-page'
}

watch([twinId, pageKey, wide], () => nextTick(nameTwin))

const onKey = (event) => {
  if (event.key === 'Escape' && !editing.value && !sheet.value) leave()
}

onMounted(() => {
  nameTwin()
  // Opened on the builder's part: that part at the top of the screen, as the
  // window was showing it.
  if (named && named !== page.value) {
    window.scrollTo({ top: named.getBoundingClientRect().top + window.scrollY, behavior: 'instant' })
  }
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(hiddenTimer)
  if (editing.value) commitText()
})

const barBtn =
  'inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-30 dark:text-gray-200 dark:hover:bg-gray-700'
const barBtnMain =
  'inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-white hover:bg-primary-hover'
</script>

<template>
  <div class="min-h-dvh bg-gray-100 dark:bg-gray-900">
    <!-- Typing: Cancel and Done, at the top — the bottom of a phone's screen is
         under its keyboard. Pressed without taking focus (pointerdown.prevent),
         so pressing one is not also the blur that would keep the words. -->
    <div
      v-if="editing"
      class="pp-top fixed inset-x-0 top-0 z-40 flex justify-center p-3"
    >
      <div
        class="flex w-full max-w-md items-center gap-2 rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95"
      >
        <button :class="barBtn" @pointerdown.prevent @click="cancelText">Cancel</button>
        <p class="min-w-0 flex-1 truncate text-center text-xs text-gray-500 dark:text-gray-400">
          {{ editing.multiline ? 'Editing · Done when finished' : 'Editing · Return when finished' }}
        </p>
        <button :class="barBtnMain" @pointerdown.prevent @click="commitText">
          <Check class="h-4 w-4" />
          Done
        </button>
      </div>
    </div>

    <!-- The bar along the bottom: what can be done with the part chosen, or,
         with none chosen, the way back and the look of the whole page. -->
    <div
      v-if="!editing"
      class="pp-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center p-3"
    >
      <!-- A part is chosen -->
      <div
        v-if="selected"
        class="pointer-events-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white/95 p-1.5 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-gray-800/95"
      >
        <div class="flex items-center gap-2 pb-1 pl-2.5">
          <p class="min-w-0 flex-1 truncate text-xs font-bold text-gray-900 dark:text-white">{{ partLabel }}</p>
          <!-- Leaving it be: a tap that was only ever meant to scroll. -->
          <button
            class="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Leave it as it is"
            @click="leave"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <button v-if="tapped?.kind === 'text'" :class="barBtnMain" @click="editText">
            <TextT class="h-4 w-4" />
            Edit text
          </button>
          <button v-else-if="tapped?.kind === 'photo'" :class="barBtnMain" @click="openPhotoSheet">
            <ImageSquare class="h-4 w-4" />
            Change photo
          </button>
          <button v-else-if="tapped?.kind === 'church'" :class="barBtnMain" @click="editChurch(tapped.step)">
            <Building2 class="h-4 w-4" />
            Edit church details
          </button>
          <button :class="barBtn" @click="openPartSheet">
            <SlidersHorizontal class="h-4 w-4" />
            {{ selected === 'hero' ? 'Edit header' : 'Edit section' }}
          </button>
          <template v-if="selectedSection">
            <span class="flex-1"></span>
            <button :class="barBtn" :disabled="isFirst" aria-label="Move up" @click="move(-1)">
              <ArrowUp class="h-4 w-4" />
            </button>
            <button :class="barBtn" :disabled="isLast" aria-label="Move down" @click="move(1)">
              <ArrowDown class="h-4 w-4" />
            </button>
            <button :class="barBtn" aria-label="Hide this section" @click="hide">
              <EyeOff class="h-4 w-4" />
            </button>
          </template>
        </div>
      </div>

      <!-- Nothing chosen -->
      <div v-else class="pointer-events-auto flex flex-col items-center gap-2">
        <div
          v-if="hidden"
          class="flex items-center gap-3 rounded-full bg-gray-900 py-1.5 pl-4 pr-1.5 text-xs text-white shadow-lg dark:bg-gray-700"
        >
          {{ hidden.label }} hidden
          <button class="rounded-full bg-white/15 px-3 py-1.5 font-bold hover:bg-white/25" @click="undoHide">
            Undo
          </button>
        </div>
        <div
          class="flex items-center gap-1 rounded-full border border-gray-200 bg-white/95 p-1 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95"
        >
          <RouterLink
            :to="backLink"
            class="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <ArrowLeft class="h-4 w-4" />
            Builder
          </RouterLink>
          <button
            class="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            @click="sheet = 'look'"
          >
            <Palette class="h-4 w-4" />
            Look
          </button>
          <span class="hidden h-5 w-px bg-gray-200 lg:block dark:bg-gray-600"></span>
          <button
            :class="[
              'hidden rounded-full p-2 transition-colors lg:block',
              !wide ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light' : 'text-gray-400',
            ]"
            aria-label="Phone width"
            @click="wide = false"
          >
            <DeviceMobile class="h-4 w-4" />
          </button>
          <button
            :class="[
              'hidden rounded-full p-2 transition-colors lg:block',
              wide ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light' : 'text-gray-400',
            ]"
            aria-label="Full width"
            @click="wide = true"
          >
            <Monitor class="h-4 w-4" />
          </button>
        </div>
        <p class="rounded-full bg-white/90 px-3 py-1 text-[11px] text-gray-500 shadow-sm dark:bg-gray-800/90 dark:text-gray-400">
          Tap any part of the page to change it
        </p>
      </div>
    </div>

    <!-- Wide, or any phone: the page takes the window, the way it will in a
         browser. Phone width on a desktop: framed, so the edges of the layout
         are visible. The frame is only drawn from lg up, so on a real phone the
         same markup is the page edge to edge. The bottom padding keeps the last
         of the page clear of the bar. -->
    <div v-if="wide" ref="page" class="pb-44 lg:pb-32" @click="onPageClick">
      <LabPreview
        :key="pageKey"
        :model="model"
        :church="church"
        :logo="logoUrl"
        selectable
        :active-id="selected"
        @pick="onPick"
      />
    </div>
    <div v-else class="pb-44 lg:px-3 lg:pb-32 lg:pt-6" @click="onPageClick">
      <div
        ref="page"
        class="lg:mx-auto lg:max-w-sm lg:overflow-hidden lg:rounded-3xl lg:border lg:border-gray-300 lg:shadow-xl lg:dark:border-gray-600"
      >
        <LabPreview
          :key="pageKey"
          :model="model"
          :church="church"
          :logo="logoUrl"
          selectable
          :active-id="selected"
          @pick="onPick"
        />
      </div>
    </div>

    <LabSheet :show="sheet === 'part' || sheet === 'look'" :title="sheetTitle" @close="sheet = ''">
      <PartFields :part="sheet === 'look' ? 'look' : selected" @edit-church="editChurch" />
    </LabSheet>

    <LabSheet :show="sheet === 'photo'" title="Photo" @close="sheet = ''">
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="photo in STOCK"
          :key="photo.id"
          :class="[
            'aspect-square overflow-hidden rounded-xl border-2',
            currentPhoto === photo.id ? 'border-primary' : 'border-transparent',
          ]"
          :aria-label="photo.label"
          :aria-pressed="currentPhoto === photo.id"
          @click="pickPhoto(photo.id)"
        >
          <img :src="photo.src" alt="" class="h-full w-full object-cover" />
        </button>
      </div>
    </LabSheet>

    <ChurchSheetHost ref="churchHost" />
  </div>
</template>

<style scoped>
/* Clear of the home indicator below and the notch above. */
.pp-bottom {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
}

.pp-top {
  padding-top: max(0.75rem, env(safe-area-inset-top));
}
</style>
