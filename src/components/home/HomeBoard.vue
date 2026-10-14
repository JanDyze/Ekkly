<script setup>
import { computed, nextTick, ref } from 'vue'

// The desktop home's panels in their columns, any of them dragged by itself
// to another place: up or down its column, or across into another. Where it
// will land shows as a line in the church's colour while it is held, and the
// panel it came from fades so the eye follows the one in hand. A column with
// nothing in it gives its width to the others, and comes back, as a place to
// drop, while a panel is being moved.
//
// Native drag and drop: a panel starts moving from anywhere on it, a link or
// a picture in it included (the drag carries the panel, not the link), and a
// click is still a click. The text on the board is not selectable, so a
// press that wanders a little moves the panel rather than highlighting words.
//
// What each panel is, is the caller's (the `panel` slot); where the panels
// are, and saving it, is the caller's too (useHomeLayout, through `move`).
// A column's foot (the `foot-<id>` slot) stays at its foot whatever moves.

const props = defineProps({
  // [{ id, weight, panels: [key] }], in order across.
  columns: { type: Array, required: true },
  // How a panel shares its column: { [key]: classes }.
  fit: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['move'])

const held = ref(null)
const target = ref(null)
const columnEls = {}

// Empty columns stand aside unless a panel is in hand.
const shown = computed(() => props.columns.filter((column) => held.value || column.panels.length || column.keep))
const template = computed(() => shown.value.map((column) => `minmax(0,${column.weight}fr)`).join(' '))

const panelsIn = (id) => [...(columnEls[id]?.querySelectorAll(':scope > [data-panel]') || [])]

const start = (event, key) => {
  const el = event.currentTarget
  const box = el.getBoundingClientRect()
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', key)
  event.dataTransfer.setDragImage(el, event.clientX - box.left, event.clientY - box.top)
  // After the browser has taken its picture of the panel as it is.
  nextTick(() => (held.value = key))
}

const over = (event, id) => {
  if (!held.value) return
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  const column = columnEls[id]
  if (!column) return
  const top = column.getBoundingClientRect().top
  const panels = panelsIn(id)
  let index = panels.findIndex((el) => {
    const box = el.getBoundingClientRect()
    return event.clientY < box.top + box.height / 2
  })
  if (index < 0) index = panels.length
  // The line sits in the gap the panel would drop into.
  let y = 0
  if (!panels.length) y = 0
  else if (index === 0) y = panels[0].getBoundingClientRect().top - top - 8
  else if (index === panels.length) y = panels[index - 1].getBoundingClientRect().bottom - top + 6
  else y = (panels[index - 1].getBoundingClientRect().bottom + panels[index].getBoundingClientRect().top) / 2 - top - 2
  target.value = { id, index, y: Math.max(0, y) }
}

const end = () => {
  held.value = null
  target.value = null
}

const drop = (event, id) => {
  if (!held.value) return
  event.preventDefault()
  const index = target.value?.id === id ? target.value.index : panelsIn(id).length
  emit('move', { key: held.value, column: id, index })
  end()
}
</script>

<template>
  <div class="grid h-full min-h-0 gap-5 select-none" :style="{ gridTemplateColumns: template }">
    <div
      v-for="column in shown"
      :key="column.id"
      :ref="(el) => (columnEls[column.id] = el)"
      class="relative flex min-h-0 min-w-0 flex-col gap-4"
      @dragover="over($event, column.id)"
      @drop="drop($event, column.id)"
    >
      <div
        v-for="key in column.panels"
        :key="key"
        :data-panel="key"
        draggable="true"
        :class="['flex min-h-0 cursor-grab flex-col transition-opacity duration-150 active:cursor-grabbing', fit[key] || 'shrink-0', held === key ? 'opacity-40' : '']"
        @dragstart="start($event, key)"
        @dragend="end"
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

      <slot :name="`foot-${column.id}`" />
    </div>
  </div>
</template>
