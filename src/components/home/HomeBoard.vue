<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

// The desktop home's panels in their columns, any of them dragged by itself
// to another place: up or down its column, or across into another. While it
// is in hand the board is already laid out as it would be if it were let go
// there: its place an empty dashed outline its own size, moving to wherever
// it would land, and the other panels making room for it. Let go, the panel
// in hand settles into the outline. Every change to the arrangement — the
// outline moving, a panel dropped, the layout changed from elsewhere — is
// seen: each panel slides from where it was to where it is now (FLIP),
// never jumping, unless less motion is asked for.
//
// The drag is the board's own rather than the browser's: the browser draws a
// dragged thing see-through, however solid it was, so the panel in hand read
// as a ghost. Here a copy of the panel, whole and solid and lifted a little
// on a shadow, follows the pointer. A press only becomes a drag once it has
// moved a few pixels, so a click on a link or a row is still a click (and
// the click a drag ends on is swallowed); a press on a button, a menu or a
// scrollbar is left to what it is. Escape puts the panel back. The text on
// the board is not selectable, so a press that wanders moves the panel
// rather than highlighting words.
//
// What each panel is, is the caller's (the `panel` slot); where the panels
// are, and saving it, is the caller's too (useHomeLayout, through `move`).
// The board's foot (the `foot` slot: the church on its hill) stands at the
// foot of the column the caller names, and is moved only from column to
// column, always to its foot, taken by the church itself and landing as
// `place`. A panel may also be carried by something other than the board
// (YUNIT carries himself, being drawn over his place): `hold`, `aimAt` and
// `drop` let the board show where it would land as it does for its own. A
// column with nothing in it gives its width to the others, and comes back,
// as a place to drop, while anything is in hand. No column takes more than
// three cards (fits, below).

const props = defineProps({
  // [{ id, weight, panels: [key] }], in order across.
  columns: { type: Array, required: true },
  // The column whose foot holds the `foot` slot.
  foot: { type: String, default: null },
  // How a panel shares its column: { [key]: classes }.
  fit: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['move', 'place'])

const held = ref(null)
const target = ref(null)
const columnEls = {}
const root = ref(null)
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// The arrangement as it would be if the panel in hand were let go where it
// is aimed: the panel taken out of its column and put in at the aimed place
// (`index` counted without it). Kept after the drop until the caller's own
// arrangement has caught up, so nothing jumps back in between.
const preview = ref(null)
let previewTimer = null
const arrange = (key, id, index) =>
  props.columns.map((column) => {
    const panels = column.panels.filter((each) => each !== key)
    if (column.id === id) panels.splice(Math.max(0, Math.min(index, panels.length)), 0, key)
    return { ...column, panels }
  })
const columns = computed(() => preview.value || props.columns)
const sameAs = (a, b) => a.every((column, i) => column.id === b[i]?.id && column.panels.join() === b[i].panels.join())
// The caller's arrangement changed: the preview has done its work.
watch(
  () => props.columns,
  () => {
    if (!held.value) preview.value = null
  },
  { deep: true }
)
const letPreviewGo = () => {
  clearTimeout(previewTimer)
  if (!preview.value || sameAs(preview.value, props.columns)) preview.value = null
  // Should the caller not take it up (a save refused), the board goes back.
  else previewTimer = setTimeout(() => (preview.value = null), 1500)
}

// A column is there if it holds a panel or something stands at its foot, and
// every column is while something is in hand, as a place to put it.
const shown = computed(() => columns.value.filter((column) => held.value || column.panels.length || column.id === props.foot))
const footHeld = computed(() => held.value === 'church')
const template = computed(() => shown.value.map((column) => `minmax(0,${column.weight}fr)`).join(' '))

const panelsIn = (id) => [...(columnEls[id]?.querySelectorAll(':scope > [data-panel]') || [])]

/* ------------------------------------------------------ seen to move */

// Where every panel is on the screen, by key. Mid-slide, where it is seen.
const measure = () => {
  const boxes = new Map()
  root.value?.querySelectorAll('[data-panel]').forEach((el) => boxes.set(el.dataset.panel, el.getBoundingClientRect()))
  return boxes
}
// Each panel slides from where it was (`before`) to where it is now. One
// that changed columns is a new element, and still comes from where its key
// was.
const slide = (before) => {
  root.value?.querySelectorAll('[data-panel]').forEach((el) => {
    const was = before.get(el.dataset.panel)
    if (!was) return
    el.getAnimations().forEach((running) => running.cancel())
    const now = el.getBoundingClientRect()
    const dx = was.left - now.left
    const dy = was.top - now.top
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' })
  })
}
// Measured before the board is drawn again (flush: 'pre'), slid after.
watch(
  () => shown.value.map((column) => `${column.id}:${column.panels.join()}`).join('|'),
  () => {
    if (reduced) return
    const before = measure()
    nextTick(() => slide(before))
  },
  { flush: 'pre' }
)

// The column under a pointer at x, or the nearest.
const columnAt = (x) => {
  const ids = shown.value.map((column) => column.id).filter((id) => columnEls[id])
  if (!ids.length) return null
  const under = ids.find((each) => {
    const box = columnEls[each].getBoundingClientRect()
    return x >= box.left && x <= box.right
  })
  if (under) return under
  return ids.reduce((best, each) => {
    const box = columnEls[each].getBoundingClientRect()
    const gap = Math.min(Math.abs(x - box.left), Math.abs(x - box.right))
    return !best || gap < best.gap ? { id: each, gap } : best
  }, null).id
}

/* ------------------------------------------------------- room for it */

// A column holds three cards at most (CARDS). YUNIT is not a card, and the
// church is not one either (the land under the board, it goes to any column).
// Something carried to a column that has its three already is refused there
// ("This column is full") rather than piled in, where the panels ran over
// one another and over the church. Up and down its own column it always
// fits.
const CARDS = 3
const NOT_CARDS = ['yunit', 'church']
let origin = null
const cardsIn = (id, without) => (props.columns.find((column) => column.id === id)?.panels || []).filter((key) => key !== without && !NOT_CARDS.includes(key)).length
const takeUp = (key) => {
  origin = key === 'church' ? props.foot : props.columns.find((column) => column.panels.includes(key))?.id || null
}
const fits = (id, key) => {
  if (id === origin || NOT_CARDS.includes(key)) return true
  return cardsIn(id, key) < CARDS
}

// Where a pointer at (x, y) would put the panel: the column under it (or the
// nearest), and the place among that column's other panels. Measured from
// where the panels are laid out (offsetTop), not where they are seen, so a
// panel mid-slide does not move the aim under the pointer. Over the outline
// itself, the aim stays where it is, so it does not flick back and forth.
// Something that stands at a column's foot (`foot`) has only a column to
// choose.
const aim = (x, y, foot = false) => {
  const id = columnAt(x)
  if (!id) return null
  if (foot) return { id, foot: true }
  const at = y - columnEls[id].getBoundingClientRect().top
  const panels = panelsIn(id)
  const outline = panels.find((el) => el.dataset.panel === held.value)
  if (outline && target.value?.id === id && at >= outline.offsetTop && at <= outline.offsetTop + outline.offsetHeight) return target.value
  const others = panels.filter((el) => el !== outline)
  let index = others.findIndex((el) => at < el.offsetTop + el.offsetHeight / 2)
  if (index < 0) index = others.length
  return fits(id, held.value) ? { id, index } : { id, index, full: true }
}
// Shows the board as it would be with the panel in hand let go at `to`; over
// a column it does not fit in, the board as it was.
const aimTo = (to) => {
  target.value = to
  // See-through over a column it would not fit in, so what it says shows.
  if (ghost) ghost.style.opacity = to?.full ? '0.45' : '1'
  if (to?.full) preview.value = null
  else if (to && !to.foot && held.value) preview.value = arrange(held.value, to.id, to.index)
}
// The aimed place as the caller's `move` counts it: before the panel is
// taken out of its own column.
const forMove = (key, to) => {
  const from = props.columns.find((column) => column.panels.includes(key))
  const at = from ? from.panels.indexOf(key) : -1
  return { id: to.id, index: from?.id === to.id && to.index >= at ? to.index + 1 : to.index }
}

/* ------------------------------------------------------------- the drag */

const THRESHOLD = 6
let press = null
let ghost = null

const lift = (el, key) => {
  const box = el.getBoundingClientRect()
  ghost = el.cloneNode(true)
  ghost.removeAttribute('data-panel')
  ghost.setAttribute('aria-hidden', 'true')
  ghost.setAttribute('inert', '')
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    margin: '0',
    zIndex: '9999',
    pointerEvents: 'none',
    borderRadius: '24px',
    boxShadow: '0 24px 48px -12px rgb(15 23 42 / 0.45), 0 0 0 1px rgb(15 23 42 / 0.06)',
    transform: 'scale(1.02) rotate(-0.6deg)',
    transition: 'transform 120ms ease-out, box-shadow 120ms ease-out',
    cursor: 'grabbing',
    opacity: '1',
  })
  document.body.appendChild(ghost)
  takeUp(key)
  document.body.style.cursor = 'grabbing'
  held.value = key
}

const follow = (x, y) => {
  if (!ghost) return
  ghost.style.translate = `${x - press.x}px ${y - press.y}px`
}

const unlisten = () => {
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', cancel)
  window.removeEventListener('keydown', onKey)
}
const settle = () => {
  clearTimeout(landTimer)
  ghost?.remove()
  ghost = null
  document.body.style.cursor = ''
  held.value = null
  target.value = null
  press = null
  unlisten()
  letPreviewGo()
}

// Let go: the panel in hand glides down into its outline, and only then is
// the panel itself there. Put back (Escape), the board is as it was.
let landTimer = null
const land = () => {
  unlisten()
  const outline = held.value && root.value?.querySelector(`[data-panel="${held.value}"]`)
  if (!ghost || !outline || reduced) return settle()
  const to = outline.getBoundingClientRect()
  const left = parseFloat(ghost.style.left)
  const top = parseFloat(ghost.style.top)
  Object.assign(ghost.style, {
    transition: 'translate 200ms cubic-bezier(0.2, 0.8, 0.2, 1), transform 200ms ease-out, box-shadow 200ms ease-out, height 200ms ease-out',
    translate: `${to.left - left}px ${to.top - top}px`,
    transform: 'none',
    boxShadow: 'none',
    height: `${to.height}px`,
  })
  landTimer = setTimeout(settle, 210)
}

// The click the drag ends on would follow a link under the pointer.
const swallowClick = () => {
  const stop = (event) => {
    event.preventDefault()
    event.stopPropagation()
  }
  window.addEventListener('click', stop, { capture: true, once: true })
  setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 0)
}

const onMove = (event) => {
  if (!press) return
  if (!held.value) {
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < THRESHOLD) return
    lift(press.el, press.key)
  }
  event.preventDefault()
  follow(event.clientX, event.clientY)
  aimTo(aim(event.clientX, event.clientY, press.foot))
}

const onUp = (event) => {
  if (!held.value) return settle()
  const at = aim(event.clientX, event.clientY, press.foot) || target.value
  aimTo(at)
  // Let go over a column it does not fit in, it goes back where it was.
  if (at?.full) {
    // Nothing moves.
  } else if (at && press.foot) emit('place', { key: held.value, column: at.id })
  else if (at) {
    const to = forMove(held.value, at)
    emit('move', { key: held.value, column: to.id, index: to.index })
  }
  swallowClick()
  nextTick(land)
}

const cancel = () => {
  preview.value = null
  settle()
}
const onKey = (event) => {
  if (event.key === 'Escape') cancel()
}

const onScrollbar = (event) => {
  const el = event.target
  return el instanceof Element && (event.offsetX > el.clientWidth || event.offsetY > el.clientHeight)
}

const listen = () => {
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('keydown', onKey)
}

const onDown = (event, key) => {
  if (event.button !== 0 || event.pointerType === 'touch') return
  if (event.target.closest('button, input, textarea, select, [role="menu"], [role="dialog"]')) return
  if (onScrollbar(event)) return
  press = { key, el: event.currentTarget, x: event.clientX, y: event.clientY }
  listen()
}

// The church at a column's foot is taken by the church itself (the part of
// the foot marked `data-foot-grab`), not the sky over it, which lets a press
// through to the apps behind; what is lifted is the whole of what stands
// there (`data-foot-body`).
const onFootDown = (event) => {
  if (event.button !== 0 || event.pointerType === 'touch') return
  if (!event.target.closest('[data-foot-grab]')) return
  const el = event.currentTarget.querySelector('[data-foot-body]')
  if (!el) return
  press = { key: 'church', el, x: event.clientX, y: event.clientY, foot: true }
  listen()
}

// A panel carried by something other than the board (YUNIT, by himself,
// HomeYunit): while it is in hand the board is laid out as it would be, as
// it is for its own, its place an outline that moves to where it would land
// and every column offered; let go, `drop` says where — { id, index }, the
// index counted before it is taken out, as `move` wants it — or null.
const hold = (key) => {
  takeUp(key)
  held.value = key
}
const aimAt = (x, y) => {
  aimTo(aim(x, y))
  return target.value
}
const drop = () => {
  const at = target.value && !target.value.full && held.value ? forMove(held.value, target.value) : null
  if (target.value?.full) preview.value = null
  held.value = null
  target.value = null
  letPreviewGo()
  return at
}
// A column already holding more than three cards (put there before columns
// had a limit): the board says which panel to move,
// and where, for the caller to move it — the last panel in it that fits in
// another column, YUNIT never (he is not a card); into the column with the
// fewest, at its end (above YUNIT, if he is last there). Null when every column fits, or nothing
// would fit anywhere else.
const overfull = (id) => cardsIn(id) > CARDS
const tidy = () => {
  if (held.value) return null
  for (const column of props.columns) {
    if (!overfull(column.id)) continue
    const order = [...column.panels].reverse().filter((key) => !NOT_CARDS.includes(key))
    for (const key of order) {
      takeUp(key)
      const into = props.columns
        .filter((each) => each.id !== column.id && fits(each.id, key))
        .sort((a, b) => cardsIn(a.id) - cardsIn(b.id))[0]
      if (into) {
        const index = into.panels.at(-1) === 'yunit' ? into.panels.length - 1 : into.panels.length
        origin = null
        return { key, column: into.id, index }
      }
    }
    origin = null
  }
  return null
}
defineExpose({ hold, aimAt, drop, tidy })

onBeforeUnmount(() => {
  settle()
  clearTimeout(previewTimer)
})
</script>

<template>
  <!-- The browser's own drag (of a link or a picture) is turned off: the
       board's drag is the only one. -->
  <div ref="root" class="grid h-full min-h-0 gap-5 select-none" :style="{ gridTemplateColumns: template }" @dragstart.prevent>
    <div
      v-for="column in shown"
      :key="column.id"
      :ref="(el) => (columnEls[column.id] = el)"
      :data-column="column.id"
      class="relative flex min-h-0 min-w-0 flex-col gap-4"
    >
      <div
        v-for="key in column.panels"
        :key="key"
        :data-panel="key"
        :class="[
          'flex min-h-0 cursor-grab flex-col',
          fit[key] || 'shrink-0',
          held === key ? 'rounded-[24px] outline-2 -outline-offset-2 outline-dashed outline-white/60 *:invisible dark:outline-white/30' : '',
        ]"
        @pointerdown="onDown($event, key)"
      >
        <slot name="panel" :panel="key" />
      </div>

      <!-- An empty column, while a panel is in hand: somewhere to put it. -->
      <div
        v-if="held && !footHeld && !column.panels.length"
        class="flex min-h-32 flex-1 items-center justify-center rounded-[24px] border-2 border-dashed border-white/50 text-sm font-semibold text-white/80 dark:border-white/25"
      >
        Drop a panel here
      </div>

      <!-- Where the church in hand would stand: the foot of the
           column under the pointer. -->
      <!-- A column what is in hand would not fit in: refused, the board as
           it was, and said so. -->
      <div
        v-if="target?.full && target.id === column.id"
        class="pointer-events-none absolute inset-0 z-[10000] flex items-center justify-center rounded-[24px] border-2 border-dashed border-white/80 bg-gray-950/45 p-6 backdrop-blur-[2px] dark:border-white/40"
        aria-hidden="true"
      >
        <!-- Large, in the middle of the column, and over everything in it
             (YUNIT's place stands above the panels, z-30) and the panel in
             hand too, which goes see-through over it (aimTo). -->
        <span class="text-center text-2xl leading-tight font-black text-white text-balance drop-shadow">This column is full</span>
      </div>

      <span
        v-if="target?.foot && !target.full && target.id === column.id"
        class="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-28 rounded-[24px] border-2 border-dashed border-white/80 bg-white/15 dark:border-white/40"
        aria-hidden="true"
      />

      <div v-if="column.id === foot" class="contents" @pointerdown="onFootDown">
        <slot name="foot" />
      </div>
    </div>
  </div>
</template>
