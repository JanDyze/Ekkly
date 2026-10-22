<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { Check, ChevronDown } from '../../icons'

// A dropdown drawn the way the rest of Ekkly is drawn, in place of the
// browser's own <select>, whose list is the system's: grey, small, and
// different on every device. Use this wherever a choice is picked from a
// list (DESIGN.md).
//
// It behaves as a select does: v-model is the chosen value; the list opens
// under the box (above it when there is no room below) and scrolls when
// long; arrow keys move through it, Enter or Space picks, Escape closes, and
// typing a letter jumps to the first choice starting with it. Read out as a
// listbox, with the chosen one marked.
//
// options: [{ value, label, disabled? }] or plain strings.

// Whatever else is set on it (data-cell, a title) belongs on the box, not on
// the list that opens on the page's top layer.
defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [String, Number, Boolean], default: '' },
  options: { type: Array, default: () => [] },
  // Shown when nothing is chosen.
  placeholder: { type: String, default: 'Choose…' },
  // The box's look, to match the fields beside it (as a select's class did).
  fieldClass: { type: [String, Array, Object], default: '' },
  disabled: { type: Boolean, default: false },
  id: { type: String, default: '' },
  ariaLabel: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'change'])

const uid = useId()
const listId = `select-${uid}`

const items = computed(() =>
  props.options.map((option) => (typeof option === 'object' && option !== null ? option : { value: option, label: String(option) }))
)
const chosen = computed(() => items.value.find((item) => item.value === props.modelValue) || null)

const open = ref(false)
const active = ref(-1)
const button = ref(null)
const list = ref(null)
const place = ref({})

// Under the box, as wide as it, or above it when the screen has no room
// below; on the page's top layer, so no card or scroll clips it.
const measure = () => {
  const box = button.value?.getBoundingClientRect()
  if (!box) return
  const room = window.innerHeight - box.bottom
  const up = room < 240 && box.top > room
  const height = Math.min(320, (up ? box.top : room) - 16)
  place.value = {
    left: `${Math.max(8, Math.min(box.left, window.innerWidth - Math.max(box.width, 180) - 8))}px`,
    minWidth: `${Math.max(box.width, 180)}px`,
    maxWidth: 'calc(100vw - 16px)',
    maxHeight: `${Math.max(120, height)}px`,
    ...(up ? { bottom: `${window.innerHeight - box.top + 6}px` } : { top: `${box.bottom + 6}px` }),
  }
}

const show = async () => {
  if (props.disabled || open.value) return
  measure()
  open.value = true
  active.value = Math.max(0, items.value.findIndex((item) => item.value === props.modelValue))
  await nextTick()
  scrollToActive()
}

const hide = (refocus = true) => {
  if (!open.value) return
  open.value = false
  if (refocus) button.value?.focus()
}

const pick = (item) => {
  if (!item || item.disabled) return
  if (item.value !== props.modelValue) {
    emit('update:modelValue', item.value)
    emit('change', item.value)
  }
  hide()
}

const scrollToActive = () => {
  list.value?.querySelector(`[data-index="${active.value}"]`)?.scrollIntoView({ block: 'nearest' })
}

const move = (by) => {
  const count = items.value.length
  if (!count) return
  let next = active.value
  for (let i = 0; i < count; i++) {
    next = (next + by + count) % count
    if (!items.value[next].disabled) break
  }
  active.value = next
  nextTick(scrollToActive)
}

const onKey = (event) => {
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault()
    if (!open.value) show()
    else move(event.key === 'ArrowDown' ? 1 : -1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (open.value) pick(items.value[active.value])
    else show()
  } else if (event.key === 'Escape' && open.value) {
    event.preventDefault()
    hide()
  } else if (event.key === 'Tab') {
    hide(false)
  } else if (event.key.length === 1 && /\S/.test(event.key)) {
    // A letter jumps to the first choice starting with it.
    const letter = event.key.toLowerCase()
    const at = items.value.findIndex((item) => !item.disabled && String(item.label).toLowerCase().startsWith(letter))
    if (at === -1) return
    if (open.value) {
      active.value = at
      nextTick(scrollToActive)
    } else pick(items.value[at])
  }
}

// A press anywhere else, or the page scrolling or resizing, closes it.
const onOutside = (event) => {
  if (button.value?.contains(event.target) || list.value?.contains(event.target)) return
  hide(false)
}
const onMove = (event) => {
  if (list.value?.contains(event.target)) return
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
  <button
    v-bind="$attrs"
    :id="id || undefined"
    ref="button"
    type="button"
    role="combobox"
    :aria-label="ariaLabel || undefined"
    :aria-expanded="open"
    :aria-controls="listId"
    aria-haspopup="listbox"
    :disabled="disabled"
    :class="[
      'flex w-full min-w-0 items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60',
      fieldClass,
    ]"
    @click="open ? hide() : show()"
    @keydown="onKey"
  >
    <span :class="['min-w-0 truncate', chosen ? '' : 'text-gray-400 dark:text-gray-500']">{{ chosen ? chosen.label : placeholder }}</span>
    <ChevronDown :class="['size-4 shrink-0 text-gray-400 transition-transform', open ? 'rotate-180' : '']" aria-hidden="true" />
  </button>

  <Teleport to="body">
    <ul
      v-if="open"
      :id="listId"
      ref="list"
      role="listbox"
      :aria-label="ariaLabel || undefined"
      :style="place"
      class="fixed z-[400] overflow-y-auto overscroll-contain rounded-xl bg-white py-1.5 text-sm text-gray-900 ring-1 ring-black/10 [scrollbar-width:thin] dark:bg-gray-800 dark:text-white dark:ring-white/10"
    >
      <li
        v-for="(item, index) in items"
        :key="String(item.value)"
        :data-index="index"
        role="option"
        :aria-selected="item.value === modelValue"
        :aria-disabled="item.disabled || undefined"
        :class="[
          'flex cursor-pointer items-center justify-between gap-3 px-3 py-2',
          item.disabled ? 'cursor-not-allowed opacity-40' : '',
          index === active ? 'bg-gray-100 dark:bg-white/10' : '',
          item.value === modelValue ? 'font-semibold text-primary dark:text-primary-light' : '',
        ]"
        @mouseenter="active = index"
        @mousedown.prevent
        @click="pick(item)"
      >
        <span class="min-w-0 truncate">{{ item.label }}</span>
        <Check v-if="item.value === modelValue" class="size-4 shrink-0" aria-hidden="true" />
      </li>
    </ul>
  </Teleport>
</template>
