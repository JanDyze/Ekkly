<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ChevronRight,
  DeviceMobile,
  DotsSixVertical,
  ExternalLink,
  Eye,
  EyeOff,
  Monitor,
  Minus,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
} from '../icons'
import LabPreview from '../components/landinglab/LabPreview.vue'
import PartFields from '../components/landinglab/PartFields.vue'
import ChurchSheetHost from '../components/landinglab/ChurchSheetHost.vue'
import { useAppSettings } from '../composables/useAppSettings'
import { HERO_STYLES } from '../data/landingLabMock'
import { SECTION_TYPES } from '../data/landingSchema'
import { addSection, model, moveSection, removeSection, resetModel } from '../composables/useLandingLab'

// PROTOTYPE — /public-page. The page builder.
//
// Two levels, the way Settings works: a list of the parts of the page, and you
// go into one. Not an accordion — a page with nine sections in an accordion is
// still nine headings and a scrollbar, and the part you are working on ends up
// halfway down a rail. Entering one gives the pane to it: the fields for that
// part and nothing else, with a way back.
//
// The pane and the page are always saying the same thing. Enter a part and the
// page dims everything but it; click something in the page and you go into it.
//
// Desktop first, which is the one place in this app that is true: DESIGN.md
// says phone first because that is where a church actually uses Ekkly, but
// building a website is a sit-down job done once, on whatever screen the office
// has. On a phone the pane takes the screen and the page is a tap away at
// /public-page/preview.
//
// Nothing is saved to a church. Mock content, sessionStorage, and a Publish
// button that does not work.

// Which part is open: null for the list, 'look' for the whole-page settings,
// 'hero' for the header, or a section's id. One at a time, always.
//
// The full preview hands the open part back in ?part= on the way back, so the
// builder opens where it was left rather than on the list — and the floating
// window it shrinks into is showing the same part it grew out of.
const route = useRoute()
const router = useRouter()
const partFrom = (id) =>
  id === 'look' || id === 'hero' || model.sections.some((one) => one.id === id) ? id : null
const entered = ref(partFrom(route.query.part))
if (route.query.part) router.replace({ query: {} })

// Where the preview opens, and on which part, from either way into it.
const previewLink = computed(() => ({
  path: '/public-page/preview',
  query: entered.value ? { part: entered.value } : {},
}))

/* ------------------------------------------------------ the church itself */

// The church's name, branch, logo and how to find it are not the page's to
// keep: they are the church's record, read from Church details and changed
// through its own sheet (ChurchSheetHost.vue). Unlike the rest of the builder,
// that sheet really saves.
const { church, logoUrl } = useAppSettings()
const churchHost = ref(null)
const openChurch = (step = 0) => churchHost.value?.open(step)

const previewWide = ref(true)
const previewPane = ref(null)
const addOpen = ref(false)

const section = computed(() =>
  model.sections.find((one) => one.id === entered.value) || null
)

const title = computed(() => {
  if (entered.value === 'look') return 'Look'
  if (entered.value === 'hero') return 'Header'
  return section.value ? SECTION_TYPES[section.value.type].label : ''
})

// Look changes the whole page, so nothing in particular is highlighted for it.
const highlighted = computed(() => (entered.value === 'look' ? '' : entered.value || ''))

// What the preview pane's strip says. Naming the open part there as well as on
// the part itself covers what the badge cannot: a section hidden, and so not
// drawn at all.
const openLabel = computed(() => {
  if (!entered.value) return ''
  if (section.value && !section.value.on) return `${title.value} — hidden, so it is not on the page`
  return title.value
})

/**
 * Goes into a part and puts the page on it.
 *
 * `fromPreview` skips the scroll: the thing was just clicked, so it is already
 * under the pointer, and moving the page out from under a click is its own
 * confusion.
 */
const enter = async (id, { fromPreview = false } = {}) => {
  entered.value = id
  addOpen.value = false
  if (fromPreview || id === 'look') return
  await nextTick()
  previewPane.value
    ?.querySelector(`[data-lab-id="${id}"]`)
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

const leave = () => {
  entered.value = null
}

/* ------------------------------------------------- the phone's small window */

// On a phone the pane is the whole screen, so the page being built is out of
// sight — every change was typed blind, and checking it meant leaving for the
// full preview and walking back. So a small window floats in the corner: the
// part being edited when one is open, the top of the page when none is.
//
// It is the real page at a phone's width, scaled down, rather than a
// thumbnail drawn separately — a separate drawing would be one more thing that
// could disagree with the page. It is moved so the open part sits at its top:
// offsetTop is measured on the unscaled page, which a transform does not
// affect, and the translate is applied before the scale, in the page's own
// pixels.
const MINI_PAGE_WIDTH = 360
const MINI_WIDTH = 132
const MINI_SCALE = MINI_WIDTH / MINI_PAGE_WIDTH

const MINI_KEY = 'public-page.miniHidden'
const readMiniHidden = () => {
  try {
    return localStorage.getItem(MINI_KEY) === '1'
  } catch {
    return false
  }
}
// Put away by somebody who would rather have the room, and kept put away.
const miniHidden = ref(readMiniHidden())
const setMiniHidden = (value) => {
  miniHidden.value = value
  try {
    localStorage.setItem(MINI_KEY, value ? '1' : '0')
  } catch {
    // Private window: it stays put away for this visit only.
  }
}

const miniPage = ref(null)
const miniTop = ref(0)

// Off until the window has been drawn once in its place. Measuring on mount
// moves it there, and with its transitions on that move would play as a
// glide — across the screen, and through the page — every time the builder
// opens.
const miniSettled = ref(false)

// Look is the whole page, so it shows the top like the list does. A hidden
// section is not drawn at all, so there is nothing of it to find.
const miniTarget = computed(() =>
  entered.value && entered.value !== 'look' && (!section.value || section.value.on) ? entered.value : ''
)

const miniLabel = computed(() => {
  if (!entered.value || entered.value === 'look') return 'Whole page'
  if (section.value && !section.value.on) return `${title.value} · hidden`
  return title.value
})

const measureMini = () => {
  const page = miniPage.value
  if (!page || !miniTarget.value) {
    miniTop.value = 0
    return
  }
  const part = page.querySelector(`[data-lab-id="${miniTarget.value}"]:not(header)`)
  miniTop.value = part ? part.offsetTop : 0
}

const miniStyle = computed(() => ({
  width: `${MINI_PAGE_WIDTH}px`,
  transform: `scale(${MINI_SCALE}) translateY(${-miniTop.value}px)`,
}))

// Measured again whenever the open part changes, and whenever the page changes
// height under it — a photo loading, a paragraph growing as it is typed —
// because either moves where the part starts.
watch(miniTarget, () => nextTick(measureMini))
let miniObserver = null
onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return
  miniObserver = new ResizeObserver(measureMini)
  watch(
    miniPage,
    (el, old) => {
      if (old) miniObserver.unobserve(old)
      if (el) miniObserver.observe(el)
      measureMini()
    },
    { immediate: true }
  )
})
onBeforeUnmount(() => miniObserver?.disconnect())

/* Moving it. It sits on whatever is underneath, so wherever it starts is the
   wrong place for somebody — it can be dragged anywhere, and on letting go it
   settles against the nearer side, at the height it was dropped. A window
   left floating mid-screen would sit on the very fields it is there to
   preview.

   Placed by left/top and a translate in screen pixels rather than by
   bottom/right: switching an anchor from right to left cannot be animated, so
   the snap would jump instead of glide. Where it rests is kept as a side and a
   lift from the bottom, not as pixels, so it lands in the same place after the
   phone is turned. */
const PLACE_KEY = 'public-page.miniPlace'
// Clear of the builder's own bar at the top.
const TOP_CLEAR = 56

const readPlace = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PLACE_KEY) || 'null')
    if (saved && ['left', 'right'].includes(saved.side) && Number.isFinite(saved.lift)) return saved
  } catch {
    // Unreadable or blocked: the corner it always started in.
  }
  return { side: 'right', lift: 0 }
}

const miniPlace = ref(readPlace())
const miniDock = ref(null)
const dockSize = ref({ w: 0, h: 0 })
const viewport = ref({ w: 0, h: 0 })
// { dx, dy } from where it was picked up, while a drag is live.
const miniDrag = ref(null)

const restingXY = () => {
  const { w, h } = viewport.value
  const size = dockSize.value
  const x = miniPlace.value.side === 'left' ? 0 : w - size.w
  const lowest = h - size.h
  const y = Math.min(Math.max(lowest - miniPlace.value.lift, TOP_CLEAR), lowest)
  return { x, y }
}

const dockStyle = computed(() => {
  const { x, y } = restingXY()
  const live = miniDrag.value
  return {
    transform: `translate3d(${x + (live?.dx || 0)}px, ${y + (live?.dy || 0)}px, 0)`,
    // Hidden until it has been measured once, so it does not glide in from
    // off the edge of the screen on the first frame.
    visibility: dockSize.value.w ? 'visible' : 'hidden',
  }
})

let pickUp = null
// Whether the pointer travelled far enough to be a drag rather than a tap.
// Read by the click that follows a drag, so letting go does not also open the
// full preview.
let moved = false

const onMiniMove = (event) => {
  const dx = event.clientX - pickUp.x
  const dy = event.clientY - pickUp.y
  if (!moved && Math.hypot(dx, dy) < 6) return
  moved = true
  miniDrag.value = { dx, dy }
}

const endMiniDrag = () => {
  window.removeEventListener('pointermove', onMiniMove)
  window.removeEventListener('pointerup', endMiniDrag)
  window.removeEventListener('pointercancel', endMiniDrag)
  const live = miniDrag.value
  miniDrag.value = null
  if (!live) return

  const { x, y } = restingXY()
  const size = dockSize.value
  const { w, h } = viewport.value
  const side = x + live.dx + size.w / 2 < w / 2 ? 'left' : 'right'
  const lift = Math.min(Math.max(h - size.h - (y + live.dy), 0), Math.max(h - size.h - TOP_CLEAR, 0))
  miniPlace.value = { side, lift }
  try {
    localStorage.setItem(PLACE_KEY, JSON.stringify(miniPlace.value))
  } catch {
    // Kept for this visit only.
  }
}

const startMiniDrag = (event) => {
  // Left button only, and never from its own buttons: the "put away" button
  // and the Show preview pill are taps.
  if (event.button || event.target.closest('button')) return
  pickUp = { x: event.clientX, y: event.clientY }
  moved = false
  window.addEventListener('pointermove', onMiniMove)
  window.addEventListener('pointerup', endMiniDrag)
  window.addEventListener('pointercancel', endMiniDrag)
}

// Caught on the way down, before the link's own handler: vue-router does not
// navigate for a click that has already been prevented.
const swallowDragClick = (event) => {
  if (!moved) return
  event.preventDefault()
  moved = false
}

const measureViewport = () => {
  viewport.value = { w: window.innerWidth, h: window.innerHeight }
}

let dockObserver = null
onMounted(() => {
  measureViewport()
  window.addEventListener('resize', measureViewport)
  // Measured now rather than when the observer first reports, which is after a
  // frame: coming back from the full preview, the window has to be in place for
  // the snapshot it shrinks into.
  const box = miniDock.value?.getBoundingClientRect()
  if (box?.width) dockSize.value = { w: box.width, h: box.height }
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      miniSettled.value = true
    })
  )
  if (typeof ResizeObserver === 'undefined') return
  // The window and the pill are different sizes, and putting one away swaps
  // them, so the size is watched rather than read once.
  dockObserver = new ResizeObserver(([entry]) => {
    const box = entry.target.getBoundingClientRect()
    dockSize.value = { w: box.width, h: box.height }
  })
  watch(
    miniDock,
    (el, old) => {
      if (old) dockObserver.unobserve(old)
      if (el) dockObserver.observe(el)
    },
    { immediate: true }
  )
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureViewport)
  dockObserver?.disconnect()
  endMiniDrag()
})

const onAdd = (type) => enter(addSection(type))

const onRemove = (index) => {
  const id = model.sections[index].id
  removeSection(index)
  if (entered.value === id) leave()
}

/* ---------------------------------------------------- dragging to reorder */

// Pointer Events rather than HTML5 drag-and-drop: one code path for a mouse and
// for a finger. HTML5 dnd does not fire on touch at all, and on a phone this
// list is the whole interface.
//
// Nothing in the model moves until the drop. The first version of this spliced
// the array every time the pointer crossed a midpoint, which is where the
// jerkiness came from: reordering rebuilds the rows, so the one under the hand
// kept being replaced instead of following it, and because the rows are
// different heights the midpoint it had just crossed moved too — so it crossed
// back, and thrashed.
//
// So the drag is pure CSS transform over a list that is standing still. The
// lifted row tracks the pointer one-to-one with no transition; the rows it
// displaces slide by exactly its height, with one. The model is spliced once,
// on release, and by then the layout already matches what the transforms were
// showing — so there is nothing to animate and nothing jumps.
const listEl = ref(null)

// { index, dy, target } while a drag is live, else null.
const drag = ref(null)

// Transitions off for the frame the model is spliced in. Without it, every
// displaced row would animate its transform back to zero at the same moment
// its layout position changed — a double move, seen as a flinch.
const settling = ref(false)

// Measured once at pick-up. Fixed positions are what make the target stable:
// comparing against centres that never move cannot oscillate.
let rows = []
let gap = 0
let startY = 0

const measure = () => {
  const items = [...(listEl.value?.children || [])]
  rows = items.map((item) => {
    const box = item.getBoundingClientRect()
    return { height: box.height, center: box.top + box.height / 2 }
  })
  // space-y-2 between the rows; a displaced row has to clear the gap as well
  // as the row itself.
  gap = rows.length > 1 ? 8 : 0
}

/** Where the lifted row would land, from how far its centre has travelled. */
const targetFor = (index, dy) => {
  const centre = rows[index].center + dy
  let target = index
  while (target > 0 && centre < rows[target - 1].center) target -= 1
  while (target < rows.length - 1 && centre > rows[target + 1].center) target += 1
  return target
}

/** The transform a row wears right now. */
const offsetFor = (index) => {
  const live = drag.value
  if (!live) return ''
  if (index === live.index) return `translate3d(0, ${live.dy}px, 0)`
  const step = rows[live.index].height + gap
  const movingUp = live.target < live.index
  if (movingUp && index >= live.target && index < live.index) return `translate3d(0, ${step}px, 0)`
  if (!movingUp && index > live.index && index <= live.target) return `translate3d(0, ${-step}px, 0)`
  return 'translate3d(0, 0, 0)'
}

const onDragMove = (event) => {
  const live = drag.value
  if (!live) return
  const dy = event.clientY - startY
  drag.value = { index: live.index, dy, target: targetFor(live.index, dy) }
}

const endDrag = () => {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)

  const live = drag.value
  drag.value = null
  if (!live || live.target === live.index) return

  settling.value = true
  moveSection(live.index, live.target - live.index)
  // Two frames: one for the new order to paint with transitions off, one before
  // turning them back on for the next drag.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      settling.value = false
    })
  )
}

const startDrag = (event, index) => {
  // Left button only; a right-click on a handle is not a drag.
  if (event.button) return
  measure()
  startY = event.clientY
  drag.value = { index, dy: 0, target: index }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
}

const row =
  'flex w-full items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition-colors hover:border-primary dark:border-gray-700 dark:bg-gray-800'
const iconBtn = 'rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700'
</script>

<template>
  <div class="flex h-dvh flex-col bg-gray-50 dark:bg-gray-900">
    <!-- Bar. Says what this is, so it is never mistaken for the real editor. -->
    <header
      class="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-800"
      style="padding-top: max(0.625rem, env(safe-area-inset-top))"
    >
      <RouterLink to="/settings" :class="iconBtn" aria-label="Back to settings">
        <ArrowLeft class="h-4 w-4" />
      </RouterLink>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-gray-900 dark:text-white">Page builder</p>
        <p class="truncate text-xs text-gray-500 dark:text-gray-400">
          Prototype · mock content · nothing is saved
        </p>
      </div>
      <button :class="iconBtn" aria-label="Start over" title="Start over" @click="resetModel">
        <RotateCcw class="h-4 w-4" />
      </button>
      <RouterLink
        :to="previewLink"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-bold text-white hover:bg-primary-hover"
      >
        <ExternalLink class="hidden h-4 w-4 lg:block" />
        <Eye class="h-4 w-4 lg:hidden" />
        <span class="hidden lg:inline">Full page</span>
        <span class="lg:hidden">Preview</span>
      </RouterLink>
    </header>

    <div class="flex min-h-0 flex-1">
      <!-- The pane: the list, or the one part you went into. -->
      <div
        class="flex w-full flex-col overflow-hidden lg:w-[27rem] lg:shrink-0 lg:border-r lg:border-gray-200 lg:dark:border-gray-700"
      >
        <!-- ─────────────────────────── the list ─────────────────────────── -->
        <div v-if="!entered" :class="['min-h-0 flex-1 overflow-y-auto p-4', miniHidden ? '' : 'pb-64 lg:pb-4']">
          <button :class="row" @click="enter('look')">
            <span class="rounded-lg bg-primary/10 p-2 dark:bg-primary-light/15">
              <Palette class="h-4 w-4 text-primary dark:text-primary-light" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-gray-900 dark:text-white">Look</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                Colour, background and lettering
              </span>
            </span>
            <span
              class="h-4 w-4 shrink-0 rounded-full"
              :style="{ backgroundColor: model.theme.accent }"
            ></span>
            <ChevronRight class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </button>

          <button :class="[row, 'mt-2']" @click="enter('hero')">
            <span class="min-w-0 flex-1">
              <span class="block text-sm font-semibold text-gray-900 dark:text-white">Header</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                {{ HERO_STYLES.find((s) => s.id === model.hero.style)?.name }} ·
                {{ model.hero.headline || 'No headline' }}
              </span>
            </span>
            <ChevronRight class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </button>

          <p class="px-1 pb-2 pt-5 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Sections
          </p>

          <ul ref="listEl" :class="['space-y-2', drag ? 'select-none' : '']">
            <li
              v-for="(one, index) in model.sections"
              :key="one.id"
              :style="{ transform: offsetFor(index) }"
              :class="[
                'relative flex items-center gap-0.5 rounded-xl border bg-white pr-1 dark:bg-gray-800',
                drag?.index === index
                  ? 'lab-lifted z-20 border-primary ring-2 ring-primary'
                  : 'border-gray-200 hover:border-primary dark:border-gray-700',
                drag?.index === index || settling ? '' : 'lab-sliding',
              ]"
            >
              <!-- The handle. A button, so it takes focus and the arrow keys do
                   what dragging does — reordering must not be mouse-only. -->
              <button
                class="shrink-0 cursor-grab touch-none rounded-lg p-2 text-gray-300 hover:bg-gray-100 hover:text-gray-500 active:cursor-grabbing dark:text-gray-600 dark:hover:bg-gray-700"
                :aria-label="`Reorder ${SECTION_TYPES[one.type].label}. Drag it, or use the up and down arrow keys.`"
                @pointerdown="startDrag($event, index)"
                @keydown.up.prevent="moveSection(index, -1)"
                @keydown.down.prevent="moveSection(index, 1)"
                @click.prevent
              >
                <DotsSixVertical class="h-4 w-4" />
              </button>
              <button class="min-w-0 flex-1 py-3 pr-1 text-left" @click="enter(one.id)">
                <span
                  :class="[
                    'block truncate text-sm font-semibold',
                    one.on ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
                  ]"
                >
                  {{ SECTION_TYPES[one.type].label }}
                  <span v-if="!one.on" class="text-xs font-normal">· hidden</span>
                </span>
                <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
                  {{ SECTION_TYPES[one.type].blurb }}
                </span>
              </button>
              <button
                :class="iconBtn"
                :aria-label="one.on ? 'Hide this section' : 'Show this section'"
                @click="one.on = !one.on"
              >
                <Eye v-if="one.on" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
              <ChevronRight class="ml-1 h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
            </li>
          </ul>

          <button
            class="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-300 text-sm font-semibold text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"
            @click="addOpen = !addOpen"
          >
            <Plus class="h-4 w-4" />
            Add a section
          </button>
          <div v-if="addOpen" class="mt-2 space-y-2">
            <button
              v-for="(def, type) in SECTION_TYPES"
              :key="type"
              :class="row"
              @click="onAdd(type)"
            >
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ def.label }}</span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">{{ def.blurb }}</span>
              </span>
              <Plus class="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
            </button>
          </div>

          <button
            class="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-400 dark:bg-gray-700 dark:text-gray-500"
            disabled
            title="Prototype — nothing is saved"
          >
            Publish
          </button>
          <p class="pb-4 pt-3 text-center text-xs text-gray-400 dark:text-gray-500">
            A prototype. Reload keeps your arrangement; nothing reaches your church.
          </p>
        </div>

        <!-- ──────────────────── one part, on its own ──────────────────── -->
        <template v-else>
          <div
            class="flex shrink-0 items-center gap-1 border-b border-gray-200 px-3 py-2 dark:border-gray-700"
          >
            <button
              class="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="leave"
            >
              <ArrowLeft class="h-4 w-4" />
              All parts
            </button>
            <p class="min-w-0 flex-1 truncate px-1 text-sm font-bold text-gray-900 dark:text-white">
              {{ title }}
            </p>
            <!-- A section's own two switches, where the section is. -->
            <template v-if="section">
              <button
                :class="iconBtn"
                :aria-label="section.on ? 'Hide this section' : 'Show this section'"
                @click="section.on = !section.on"
              >
                <Eye v-if="section.on" class="h-4 w-4" />
                <EyeOff v-else class="h-4 w-4" />
              </button>
              <button
                class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                :aria-label="`Remove ${title}`"
                @click="onRemove(model.sections.indexOf(section))"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </template>
          </div>

          <div :class="['min-h-0 flex-1 overflow-y-auto p-4', miniHidden ? '' : 'pb-64 lg:pb-4']">
            <p
              v-if="section && !section.on"
              class="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
            >
              Hidden, so none of this is on the page yet.
            </p>

            <PartFields :part="entered" @edit-church="openChurch" />
          </div>
        </template>
      </div>

      <!-- The page, redrawing as the pane changes. Desktop only: on a phone
           there is no room for both, and the full-page preview is one tap. -->
      <div class="hidden min-h-0 flex-1 flex-col bg-gray-100 lg:flex dark:bg-gray-950">
        <div
          class="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-2 dark:border-gray-800"
        >
          <p
            v-if="openLabel"
            class="min-w-0 flex-1 truncate text-xs font-semibold text-primary dark:text-primary-light"
          >
            Editing · {{ openLabel }}
          </p>
          <p v-else class="min-w-0 flex-1 truncate text-xs text-gray-500 dark:text-gray-400">
            Click any part of the page to go into it
          </p>
          <div class="flex shrink-0 items-center rounded-lg bg-white p-0.5 dark:bg-gray-800">
            <button
              :class="[
                'rounded-md p-1.5 transition-colors',
                !previewWide
                  ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                  : 'text-gray-400',
              ]"
              aria-label="Phone width"
              @click="previewWide = false"
            >
              <DeviceMobile class="h-4 w-4" />
            </button>
            <button
              :class="[
                'rounded-md p-1.5 transition-colors',
                previewWide
                  ? 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
                  : 'text-gray-400',
              ]"
              aria-label="Desktop width"
              @click="previewWide = true"
            >
              <Monitor class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div ref="previewPane" class="min-h-0 flex-1 overflow-y-auto p-6">
          <div
            :class="[
              'mx-auto overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-lg transition-all dark:border-gray-700',
              previewWide ? 'max-w-3xl' : 'max-w-sm',
            ]"
          >
            <LabPreview
              :model="model"
              :church="church"
              :logo="logoUrl"
              selectable
              :active-id="highlighted"
              @pick="enter($event, { fromPreview: true })"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- The phone's small window onto the page. Phone only: from lg up the
         page is already beside the pane. Tapping it opens the full preview. -->
    <div
      ref="miniDock"
      :class="[
        'pp-mini-dock pointer-events-none fixed left-0 top-0 z-30 p-3 lg:hidden',
        miniDrag ? 'pp-mini-dragging' : '',
        miniSettled ? '' : 'pp-mini-instant',
      ]"
      :style="dockStyle"
      @pointerdown="startMiniDrag"
      @click.capture="swallowDragClick"
    >
      <div v-if="!miniHidden" class="pointer-events-auto relative touch-none select-none">
        <RouterLink
          :to="previewLink"
          class="block overflow-hidden rounded-xl border border-gray-300 bg-white shadow-xl ring-1 ring-black/5 dark:border-gray-600 dark:bg-gray-800"
          :style="{ width: `${MINI_WIDTH}px`, viewTransitionName: 'public-page' }"
          :aria-label="`Preview: ${miniLabel}. Opens the full page.`"
        >
          <div class="relative h-48 overflow-hidden">
            <div ref="miniPage" class="pp-mini-page pointer-events-none origin-top-left" :style="miniStyle" aria-hidden="true">
              <LabPreview :model="model" :church="church" :logo="logoUrl" />
            </div>
          </div>
          <p
            class="truncate border-t border-gray-200 px-2 py-1 text-[10px] font-semibold text-gray-600 dark:border-gray-700 dark:text-gray-300"
          >
            {{ miniLabel }}
          </p>
        </RouterLink>
        <button
          class="absolute -left-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
          aria-label="Put the preview away"
          @click="setMiniHidden(true)"
        >
          <Minus class="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        v-else
        class="pointer-events-auto flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-bold text-white shadow-lg hover:bg-primary-hover"
        @click="setMiniHidden(false)"
      >
        <Eye class="h-4 w-4" />
        Show preview
      </button>
    </div>

    <ChurchSheetHost ref="churchHost" />
  </div>
</template>

<style scoped>
/* The rows a drag displaces. They slide; the lifted one does not, because it
   has to sit exactly under the pointer — a transition on that is lag. */
.lab-sliding {
  transition:
    transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1),
    border-color 0.12s ease;
}

/* Picked up: off the page, and no transition between it and the pointer. */
.lab-lifted {
  transition: none;
  box-shadow:
    0 12px 28px -8px rgb(0 0 0 / 0.28),
    0 2px 6px rgb(0 0 0 / 0.08);
  cursor: grabbing;
}

/* Promoted to its own layer for the life of the drag, so moving it does not
   repaint the rows underneath. */
.lab-lifted,
.lab-sliding {
  will-change: transform;
}

/* Clear of the home indicator. Settles against its side with a glide when let
   go; follows the finger exactly while held, because any easing then is lag. */
.pp-mini-dock {
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}

.pp-mini-dock.pp-mini-dragging {
  transition: none;
  cursor: grabbing;
}

.pp-mini-instant,
.pp-mini-instant .pp-mini-page {
  transition: none;
}

/* Glides to the part that was just opened, rather than jumping. */
.pp-mini-page {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
}

@media (prefers-reduced-motion: reduce) {
  .lab-sliding,
  .pp-mini-page,
  .pp-mini-dock {
    transition: none;
  }
}
</style>
