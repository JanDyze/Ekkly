<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { CalendarBlank, CaretLeft, CaretRight, X } from '../../icons'

// A date picked from a calendar drawn the way the rest of Ekkly is, in place
// of the browser's own date picker, which is the system's: different on every
// device, and on some a spinner that overshoots (DESIGN.md, Forms). The box
// says the date in words; it opens a month under it (above when there is no
// room below), with the quick choices most dates are (today, tomorrow, a week
// from now) and a way to clear it.
//
// v-model is the stored string, a local "YYYY-MM-DD", or "" for none: read as
// a day on the calendar, never through Date's UTC parsing.
//
// Keys, as a calendar takes them: the arrows move a day or a week, Page Up
// and Page Down a month, Enter or Space picks, Escape closes.

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'No date' },
  // The box's look, to match the fields beside it.
  fieldClass: { type: [String, Array, Object], default: '' },
  id: { type: String, default: '' },
  clearable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue'])

const uid = useId()
const gridId = `date-${uid}`

/* ----------------------------------------------------------------- days */

const pad = (n) => String(n).padStart(2, '0')
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const dateOf = (key) => {
  const match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}
const addDays = (date, n) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
const today = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const chosen = computed(() => dateOf(props.modelValue))
const label = computed(() =>
  chosen.value ? chosen.value.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''
)

/* ---------------------------------------------------------------- month */

const open = ref(false)
// The day the keyboard is on, and so the month shown.
const focus = ref(today())
const monthLabel = computed(() => focus.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))

// Weeks start where the reader's calendar starts them.
const WEEK_START = (() => {
  try {
    return new Intl.Locale(navigator.language).weekInfo?.firstDay % 7 || 0
  } catch {
    return 0
  }
})()
const weekdays = computed(() =>
  Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 7 + ((WEEK_START + i) % 7)).toLocaleDateString(undefined, { weekday: 'narrow' }))
)

const days = computed(() => {
  const first = new Date(focus.value.getFullYear(), focus.value.getMonth(), 1)
  const lead = (first.getDay() - WEEK_START + 7) % 7
  const start = addDays(first, -lead)
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i)
    return {
      key: keyOf(date),
      day: date.getDate(),
      inMonth: date.getMonth() === focus.value.getMonth(),
      isToday: keyOf(date) === keyOf(today()),
      isChosen: keyOf(date) === props.modelValue,
      isFocus: keyOf(date) === keyOf(focus.value),
      label: date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    }
  })
})

const shiftMonth = (by) => {
  const next = new Date(focus.value.getFullYear(), focus.value.getMonth() + by, 1)
  const last = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  focus.value = new Date(next.getFullYear(), next.getMonth(), Math.min(focus.value.getDate(), last))
}

/* ---------------------------------------------------------------- place */

const button = ref(null)
const panel = ref(null)
const place = ref({})

// Under the box, or above it when the screen has no room below; on the
// page's top layer, so no card or scroll clips it.
const measure = () => {
  const box = button.value?.getBoundingClientRect()
  if (!box) return
  const height = 380
  const up = window.innerHeight - box.bottom < height && box.top > window.innerHeight - box.bottom
  const width = 296
  place.value = {
    left: `${Math.max(8, Math.min(box.left, window.innerWidth - width - 8))}px`,
    width: `${width}px`,
    ...(up ? { bottom: `${window.innerHeight - box.top + 6}px` } : { top: `${box.bottom + 6}px` }),
  }
}

const show = async () => {
  if (open.value) return
  focus.value = chosen.value || today()
  measure()
  open.value = true
  await nextTick()
  focusDay()
}

const hide = (refocus = true) => {
  if (!open.value) return
  open.value = false
  if (refocus) button.value?.focus()
}

const pick = (key) => {
  if (key !== props.modelValue) emit('update:modelValue', key)
  hide()
}

const focusDay = () => panel.value?.querySelector(`[data-day="${keyOf(focus.value)}"]`)?.focus()

const onGridKey = (event) => {
  const moves = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
  if (moves[event.key]) {
    event.preventDefault()
    focus.value = addDays(focus.value, moves[event.key])
    nextTick(focusDay)
  } else if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault()
    shiftMonth(event.key === 'PageUp' ? -1 : 1)
    nextTick(focusDay)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    pick(keyOf(focus.value))
  }
}

const onPanelKey = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    hide()
  }
}

// The quick choices most dates are.
const QUICK = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'Next week', days: 7 },
]

// A press anywhere else, or the page scrolling or resizing, closes it.
const onOutside = (event) => {
  if (button.value?.contains(event.target) || panel.value?.contains(event.target)) return
  hide(false)
}
const onMove = (event) => {
  if (panel.value?.contains(event.target)) return
  hide(false)
}
watch(open, (now) => {
  const method = now ? 'addEventListener' : 'removeEventListener'
  document[method]('pointerdown', onOutside, true)
  window[method]('scroll', onMove, true)
  window[method]('resize', onMove)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  window.removeEventListener('scroll', onMove, true)
  window.removeEventListener('resize', onMove)
})
</script>

<template>
  <div class="relative">
    <button
      v-bind="$attrs"
      :id="id || undefined"
      ref="button"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-controls="gridId"
      :class="['flex w-full min-w-0 items-center gap-2 text-left', clearable && modelValue ? 'pr-9' : '', fieldClass]"
      @click="open ? hide() : show()"
    >
      <CalendarBlank class="size-4 shrink-0 text-gray-400" aria-hidden="true" />
      <span :class="['min-w-0 truncate', label ? '' : 'text-gray-400 dark:text-gray-500']">{{ label || placeholder }}</span>
    </button>
    <button
      v-if="clearable && modelValue"
      type="button"
      class="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200"
      aria-label="Clear the date"
      @click="emit('update:modelValue', '')"
    >
      <X class="size-3.5" />
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="open"
      :id="gridId"
      ref="panel"
      role="dialog"
      aria-label="Choose a date"
      :style="place"
      class="fixed z-[400] rounded-2xl bg-white p-3 text-sm text-gray-900 ring-1 ring-black/10 dark:bg-gray-800 dark:text-white dark:ring-white/10"
      @keydown="onPanelKey"
    >
      <!-- The quick choices. -->
      <div class="mb-3 flex flex-wrap gap-1.5">
        <button
          v-for="quick in QUICK"
          :key="quick.label"
          type="button"
          class="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-primary/10 hover:text-primary dark:bg-white/10 dark:text-gray-200 dark:hover:bg-primary-light/15 dark:hover:text-primary-light"
          @click="pick(keyOf(addDays(today(), quick.days)))"
        >
          {{ quick.label }}
        </button>
        <button
          v-if="clearable && modelValue"
          type="button"
          class="rounded-full px-3 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
          @click="pick('')"
        >
          No date
        </button>
      </div>

      <!-- The month. -->
      <div class="mb-2 flex items-center justify-between">
        <button type="button" class="flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10" aria-label="Previous month" @click="shiftMonth(-1)">
          <CaretLeft class="size-4" />
        </button>
        <span class="font-semibold" aria-live="polite">{{ monthLabel }}</span>
        <button type="button" class="flex size-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10" aria-label="Next month" @click="shiftMonth(1)">
          <CaretRight class="size-4" />
        </button>
      </div>

      <div class="grid grid-cols-7 text-center text-[11px] font-semibold text-gray-400 dark:text-gray-500" aria-hidden="true">
        <span v-for="(day, i) in weekdays" :key="i" class="py-1">{{ day }}</span>
      </div>
      <div role="grid" class="grid grid-cols-7 gap-0.5" @keydown="onGridKey">
        <button
          v-for="day in days"
          :key="day.key"
          :data-day="day.key"
          type="button"
          role="gridcell"
          :tabindex="day.isFocus ? 0 : -1"
          :aria-label="day.label"
          :aria-selected="day.isChosen"
          :class="[
            'flex aspect-square items-center justify-center rounded-lg text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
            day.isChosen
              ? 'bg-primary font-bold text-white'
              : day.isToday
                ? 'font-bold text-primary ring-1 ring-inset ring-primary/40 hover:bg-primary/10 dark:text-primary-light'
                : day.inMonth
                  ? 'text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-white/10'
                  : 'text-gray-300 hover:bg-gray-100 dark:text-gray-600 dark:hover:bg-white/10',
          ]"
          @click="pick(day.key)"
          @focus="focus = dateOf(day.key)"
        >
          {{ day.day }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
