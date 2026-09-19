<script setup>
import { computed, nextTick, ref } from 'vue'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  DeviceMobile,
  DotsSixVertical,
  ExternalLink,
  Eye,
  EyeOff,
  Monitor,
  Palette,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from '../icons'
import LabPreview from '../components/landinglab/LabPreview.vue'
import { FONTS, HERO_STYLES, PALETTE, PAPERS, SECTION_TYPES, STOCK } from '../data/landingLabMock'
import { addSection, model, moveSection, removeSection, resetModel } from '../composables/useLandingLab'

// PROTOTYPE — /landing-lab. The page builder.
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
// /landing-lab/preview.
//
// Nothing is saved to a church. Mock content, sessionStorage, and a Publish
// button that does not work.

// Which part is open: null for the list, 'look' for the whole-page settings,
// 'hero' for the header, or a section's id. One at a time, always.
const entered = ref(null)

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

const addRow = (owner, field) => {
  const row = {}
  for (const sub of field.item) row[sub.key] = sub.type === 'image' ? STOCK[0].id : ''
  owner[field.key] = [...owner[field.key], row]
}

const removeRow = (owner, field, index) => {
  owner[field.key] = owner[field.key].filter((_, i) => i !== index)
}

const togglePick = (owner, id) => {
  owner.picks = owner.picks.includes(id)
    ? owner.picks.filter((p) => p !== id)
    : [...owner.picks, id]
}

const label = 'mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400'
const field =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const chip = 'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors'
const chipOn = 'bg-primary text-white'
const chipOff =
  'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
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
        to="/landing-lab/preview"
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
        <div v-if="!entered" class="min-h-0 flex-1 overflow-y-auto p-4">
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

          <div class="min-h-0 flex-1 overflow-y-auto p-4">
            <p
              v-if="section && !section.on"
              class="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
            >
              Hidden, so none of this is on the page yet.
            </p>

            <!-- Look: the three things that change the whole page. -->
            <div v-if="entered === 'look'" class="space-y-4">
              <div>
                <p :class="label">Colour</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="colour in PALETTE"
                    :key="colour.hex"
                    :title="colour.name"
                    :aria-label="colour.name"
                    :aria-pressed="model.theme.accent === colour.hex"
                    :class="[
                      'h-10 w-10 rounded-full border transition-transform hover:scale-110',
                      model.theme.accent === colour.hex
                        ? 'border-transparent ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900'
                        : 'border-black/10 dark:border-white/20',
                    ]"
                    :style="{ backgroundColor: colour.hex }"
                    @click="model.theme.accent = colour.hex"
                  >
                    <Check
                      v-if="model.theme.accent === colour.hex"
                      class="mx-auto h-4 w-4 text-white drop-shadow"
                    />
                  </button>
                </div>
              </div>
              <div>
                <p :class="label">Background</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="p in PAPERS"
                    :key="p.id"
                    :class="[chip, model.theme.paper === p.id ? chipOn : chipOff]"
                    @click="model.theme.paper = p.id"
                  >
                    {{ p.name }}
                  </button>
                </div>
              </div>
              <div>
                <p :class="label">Lettering</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="f in FONTS"
                    :key="f.id"
                    :class="[chip, model.theme.font === f.id ? chipOn : chipOff]"
                    :style="{ fontFamily: f.stack }"
                    @click="model.theme.font = f.id"
                  >
                    {{ f.name }}
                  </button>
                </div>
              </div>
            </div>

            <!-- The header -->
            <div v-else-if="entered === 'hero'" class="space-y-3">
              <div>
                <p :class="label">Style</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="style in HERO_STYLES"
                    :key="style.id"
                    :class="[chip, model.hero.style === style.id ? chipOn : chipOff]"
                    @click="model.hero.style = style.id"
                  >
                    {{ style.name }}
                  </button>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label :class="label">Church name</label>
                  <input v-model="model.name" type="text" :class="field" />
                </div>
                <div>
                  <label :class="label">Branch</label>
                  <input v-model="model.branch" type="text" :class="field" />
                </div>
                <div>
                  <label :class="label">Greeting</label>
                  <input v-model="model.hero.greeting" type="text" :class="field" />
                </div>
                <div>
                  <label :class="label">Headline</label>
                  <input v-model="model.hero.headline" type="text" :class="field" />
                </div>
              </div>
              <div>
                <label :class="label">Under it</label>
                <textarea v-model="model.hero.sub" rows="2" :class="field"></textarea>
              </div>
              <div>
                <label :class="label">Button</label>
                <input v-model="model.hero.cta" type="text" :class="field" />
              </div>
              <div v-if="model.hero.style !== 'plain'">
                <p :class="label">Photo</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="photo in STOCK"
                    :key="photo.id"
                    :class="[
                      'h-14 w-14 overflow-hidden rounded-lg border-2',
                      model.hero.image === photo.id ? 'border-primary' : 'border-transparent opacity-60',
                    ]"
                    :aria-label="photo.label"
                    @click="model.hero.image = photo.id"
                  >
                    <img :src="photo.src" alt="" class="h-full w-full object-cover" />
                  </button>
                </div>
              </div>
            </div>

            <!-- A section, built from its type's own field list. -->
            <div v-else-if="section" class="space-y-3">
              <div v-for="f in SECTION_TYPES[section.type].fields" :key="f.key">
                <template v-if="f.type === 'text'">
                  <label :class="label">{{ f.label }}</label>
                  <input v-model="section[f.key]" type="text" :class="field" />
                </template>

                <template v-else-if="f.type === 'textarea'">
                  <label :class="label">{{ f.label }}</label>
                  <textarea v-model="section[f.key]" rows="4" :class="field"></textarea>
                </template>

                <template v-else-if="f.type === 'choice'">
                  <p :class="label">{{ f.label }}</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="option in f.options"
                      :key="option"
                      :class="[chip, section[f.key] === option ? chipOn : chipOff]"
                      @click="section[f.key] = option"
                    >
                      {{ option }}
                    </button>
                  </div>
                </template>

                <template v-else-if="f.type === 'image'">
                  <p :class="label">{{ f.label }}</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="photo in STOCK"
                      :key="photo.id"
                      :class="[
                        'h-14 w-14 overflow-hidden rounded-lg border-2',
                        section[f.key] === photo.id ? 'border-primary' : 'border-transparent opacity-60',
                      ]"
                      :aria-label="photo.label"
                      @click="section[f.key] = photo.id"
                    >
                      <img :src="photo.src" alt="" class="h-full w-full object-cover" />
                    </button>
                  </div>
                </template>

                <template v-else-if="f.type === 'gallery'">
                  <p :class="label">{{ f.label }}</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="photo in STOCK"
                      :key="photo.id"
                      :class="[
                        'h-14 w-14 overflow-hidden rounded-lg border-2',
                        section.picks.includes(photo.id)
                          ? 'border-primary'
                          : 'border-transparent opacity-40',
                      ]"
                      :aria-label="photo.label"
                      :aria-pressed="section.picks.includes(photo.id)"
                      @click="togglePick(section, photo.id)"
                    >
                      <img :src="photo.src" alt="" class="h-full w-full object-cover" />
                    </button>
                  </div>
                </template>

                <template v-else-if="f.type === 'list'">
                  <p :class="label">{{ f.label }}</p>
                  <div class="space-y-2">
                    <div
                      v-for="(line, lineIndex) in section[f.key]"
                      :key="lineIndex"
                      class="flex items-start gap-2 rounded-lg bg-gray-50 p-2 dark:bg-gray-700/50"
                    >
                      <div class="min-w-0 flex-1 space-y-2">
                        <template v-for="sub in f.item" :key="sub.key">
                          <input
                            v-if="sub.type === 'text'"
                            v-model="line[sub.key]"
                            type="text"
                            :placeholder="sub.label"
                            :aria-label="sub.label"
                            :class="field"
                          />
                          <div v-else-if="sub.type === 'image'" class="flex flex-wrap gap-1.5">
                            <button
                              v-for="photo in STOCK"
                              :key="photo.id"
                              :class="[
                                'h-9 w-9 overflow-hidden rounded border-2',
                                line[sub.key] === photo.id
                                  ? 'border-primary'
                                  : 'border-transparent opacity-50',
                              ]"
                              :aria-label="photo.label"
                              @click="line[sub.key] = photo.id"
                            >
                              <img :src="photo.src" alt="" class="h-full w-full object-cover" />
                            </button>
                          </div>
                        </template>
                      </div>
                      <button
                        class="rounded-lg p-2 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                        :aria-label="`Remove ${f.label} ${lineIndex + 1}`"
                        @click="removeRow(section, f, lineIndex)"
                      >
                        <X class="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    class="mt-2 inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
                    @click="addRow(section, f)"
                  >
                    <Plus class="h-3.5 w-3.5" />
                    {{ f.addLabel || 'Add' }}
                  </button>
                </template>
              </div>
            </div>
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
              selectable
              :active-id="highlighted"
              @pick="enter($event, { fromPreview: true })"
            />
          </div>
        </div>
      </div>
    </div>
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

@media (prefers-reduced-motion: reduce) {
  .lab-sliding {
    transition: none;
  }
}
</style>
