<script>
// Shared by every row on the page: only one stands open at a time, as in any
// list that does this, so opening one closes whichever was open before.
const openRows = new Set()
</script>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useSounds } from '../../composables/useSounds'

// A row of a ListGroup with one action hidden behind it, the way a phone's
// mail app keeps delete: swipe the row left and the action shows at its end;
// tap it, or keep swiping all the way, and it is done. Tap anywhere else and
// the row slides back.
//
// For an action that is occasional and a little final — leaving a gathering
// out of the count — and so should not sit on every row as a button, where it
// is the loudest thing on the screen and the reason nobody reads the list. On
// a screen with a mouse and no swipe, the same action shows as a small icon
// at the row's end while the pointer is over it.
//
// The default slot is the row itself (a link, usually); the `icon` slot is
// the action's picture, for the button behind the row and the hover icon.

const props = defineProps({
  // What the action is called, under its picture and to a screen reader.
  label: { type: String, required: true },
  // While the action is being carried out.
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])

const { prime, swipe } = useSounds()

// The width the action takes once revealed, and how far past it a swipe has
// to travel to carry the action out without a second tap.
const REVEAL = 88
const COMMIT = 0.55

const row = ref(null)
const dx = ref(0)
const dragging = ref(false)
const open = ref(false)
let start = null
let swallowClick = false

const close = () => {
  open.value = false
  dx.value = 0
}

const width = () => row.value?.clientWidth || 320

const onPointerDown = (event) => {
  prime()
  if (event.button > 0) return
  start = { x: event.clientX, y: event.clientY, from: open.value ? -REVEAL : 0 }
  swallowClick = false
}

const onPointerMove = (event) => {
  if (!start) return
  const mx = event.clientX - start.x
  const my = event.clientY - start.y
  if (!dragging.value) {
    // Sideways is ours; up or down is the list scrolling, left alone.
    if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
    if (Math.abs(my) >= Math.abs(mx)) {
      start = null
      return
    }
    dragging.value = true
    swallowClick = true
    row.value?.setPointerCapture?.(event.pointerId)
  }
  // Left only, and reluctant past fully open, so it is felt where the
  // action is waiting.
  const raw = Math.min(0, start.from + mx)
  dx.value = raw < -REVEAL ? -REVEAL + (raw + REVEAL) * 0.6 : raw
}

const onPointerUp = () => {
  if (dragging.value) {
    if (dx.value < -width() * COMMIT) {
      act()
    } else if (dx.value < -REVEAL / 2) {
      open.value = true
      dx.value = -REVEAL
    } else {
      close()
    }
  }
  dragging.value = false
  start = null
}

// A swipe ends in a click on the row it started on; that click must not open
// the row. A tap on an open row closes it rather than following the link.
const onClickCapture = (event) => {
  if (swallowClick || open.value) {
    event.preventDefault()
    event.stopPropagation()
    if (!swallowClick) close()
    swallowClick = false
  }
}

const act = () => {
  if (props.busy) return
  swipe(-1)
  close()
  emit('action')
}

// Opening this row closes any other; closing it, or leaving, takes it off.
const self = { close }
watch(open, (now) => {
  if (now) {
    openRows.forEach((other) => other !== self && other.close())
    openRows.add(self)
  } else {
    openRows.delete(self)
  }
})
onBeforeUnmount(() => openRows.delete(self))

const style = computed(() => ({
  transform: `translateX(${dx.value}px)`,
  transition: dragging.value ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
}))
</script>

<template>
  <div class="group/swipe relative overflow-hidden">
    <!-- The action, waiting behind the row's end. -->
    <button
      type="button"
      :tabindex="open ? 0 : -1"
      :aria-hidden="!open"
      class="absolute inset-y-0 right-0 flex flex-col items-center justify-center gap-0.5 bg-amber-500 text-[11px] font-semibold text-white"
      :style="{ width: `${REVEAL}px` }"
      @click="act"
    >
      <slot name="icon" />
      {{ busy ? 'Working…' : label }}
    </button>

    <div
      ref="row"
      class="relative touch-pan-y bg-white dark:bg-gray-800"
      :style="style"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
      @dragstart.prevent
    >
      <slot />

      <!-- With a mouse there is no swipe: the action is a small icon that
           shows at the row's end while the pointer is over it. -->
      <button
        type="button"
        :title="label"
        :aria-label="label"
        class="absolute right-11 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 opacity-0 transition hover:bg-gray-100 hover:text-amber-600 focus-visible:opacity-100 group-hover/swipe:opacity-100 pointer-fine:flex dark:hover:bg-gray-700 dark:hover:text-amber-400"
        @click.stop.prevent="act"
      >
        <slot name="icon" />
      </button>
    </div>
  </div>
</template>
