<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

// The desktop home's panels in their columns, any of them dragged by itself
// to another place: up or down its column, or across into another. Where it
// will land shows as a line in the church's colour, and the place it came
// from as an empty outline.
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
// foot of the column the caller names, the leftmost with anything in it. A
// column with nothing in it gives its width to the others, and comes back,
// as a place to drop, while a panel is in hand.

const props = defineProps({
  // [{ id, weight, panels: [key] }], in order across.
  columns: { type: Array, required: true },
  // The column whose foot holds the `foot` slot.
  foot: { type: String, default: null },
  // How a panel shares its column: { [key]: classes }.
  fit: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['move'])

const held = ref(null)
const target = ref(null)
const columnEls = {}

const shown = computed(() => props.columns.filter((column) => held.value || column.panels.length))
const template = computed(() => shown.value.map((column) => `minmax(0,${column.weight}fr)`).join(' '))

const panelsIn = (id) => [...(columnEls[id]?.querySelectorAll(':scope > [data-panel]') || [])]

// Where a pointer at (x, y) would put the panel: the column under it (or the
// nearest), the place among that column's panels, and where to draw the line.
const aim = (x, y) => {
  const ids = shown.value.map((column) => column.id).filter((id) => columnEls[id])
  if (!ids.length) return null
  let id = ids.find((each) => {
    const box = columnEls[each].getBoundingClientRect()
    return x >= box.left && x <= box.right
  })
  if (!id) {
    id = ids.reduce((best, each) => {
      const box = columnEls[each].getBoundingClientRect()
      const gap = Math.min(Math.abs(x - box.left), Math.abs(x - box.right))
      return !best || gap < best.gap ? { id: each, gap } : best
    }, null).id
  }
  const top = columnEls[id].getBoundingClientRect().top
  const panels = panelsIn(id)
  let index = panels.findIndex((el) => {
    const box = el.getBoundingClientRect()
    return y < box.top + box.height / 2
  })
  if (index < 0) index = panels.length
  let line = 0
  if (!panels.length) line = 0
  else if (index === 0) line = panels[0].getBoundingClientRect().top - top - 8
  else if (index === panels.length) line = panels[index - 1].getBoundingClientRect().bottom - top + 6
  else line = (panels[index - 1].getBoundingClientRect().bottom + panels[index].getBoundingClientRect().top) / 2 - top - 2
  return { id, index, y: Math.max(0, line) }
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
  document.body.style.cursor = 'grabbing'
  held.value = key
}

const follow = (x, y) => {
  if (!ghost) return
  ghost.style.translate = `${x - press.x}px ${y - press.y}px`
}

const settle = () => {
  ghost?.remove()
  ghost = null
  document.body.style.cursor = ''
  held.value = null
  target.value = null
  press = null
  window.removeEventListener('pointermove', onMove)
  window.removeEventListener('pointerup', onUp)
  window.removeEventListener('pointercancel', cancel)
  window.removeEventListener('keydown', onKey)
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
  target.value = aim(event.clientX, event.clientY)
}

const onUp = (event) => {
  if (held.value) {
    const at = aim(event.clientX, event.clientY) || target.value
    if (at) emit('move', { key: held.value, column: at.id, index: at.index })
    swallowClick()
  }
  settle()
}

const cancel = () => settle()
const onKey = (event) => {
  if (event.key === 'Escape') cancel()
}

const onScrollbar = (event) => {
  const el = event.target
  return el instanceof Element && (event.offsetX > el.clientWidth || event.offsetY > el.clientHeight)
}

const onDown = (event, key) => {
  if (event.button !== 0 || event.pointerType === 'touch') return
  if (event.target.closest('button, input, textarea, select, [role="menu"], [role="dialog"]')) return
  if (onScrollbar(event)) return
  press = { key, el: event.currentTarget, x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', cancel)
  window.addEventListener('keydown', onKey)
}

onBeforeUnmount(settle)
</script>

<template>
  <!-- The browser's own drag (of a link or a picture) is turned off: the
       board's drag is the only one. -->
  <div class="grid h-full min-h-0 gap-5 select-none" :style="{ gridTemplateColumns: template }" @dragstart.prevent>
    <div
      v-for="column in shown"
      :key="column.id"
      :ref="(el) => (columnEls[column.id] = el)"
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
        v-if="held && !column.panels.length"
        class="flex min-h-32 flex-1 items-center justify-center rounded-[24px] border-2 border-dashed border-white/50 text-sm font-semibold text-white/80 dark:border-white/25"
      >
        Drop a panel here
      </div>

      <span
        v-if="target?.id === column.id && column.panels.length"
        class="pointer-events-none absolute inset-x-3 z-20 h-1 rounded-full bg-primary shadow-[0_0_0_3px_rgb(255_255_255/0.6)] dark:bg-primary-light"
        :style="{ top: `${target.y}px` }"
        aria-hidden="true"
      />

      <slot v-if="column.id === foot" name="foot" />
    </div>
  </div>
</template>
