<script setup>
// One of the church's own vocabularies — album categories, link groups, song
// categories, event types — as a box to add to and pills to take from, colour
// and put in order.
//
// Only ever shown inside the lists sheet (ListsEditSheet.vue), one list to a
// step, which is why there is no Edit here and no reading state: the page behind
// the sheet is the reading state.
//
// Two things this learned from being used:
//
//   - The box is a box. It used to be the last pill in the row — tap +, type in
//     a 36px slot, press Enter — which was right when four lists shared a
//     read-mostly card and an input had to be asked for. In a step whose only
//     job is this list, it cost a tap and gave a phone the worst text target on
//     the screen.
//   - The whole pill is the way to its colour, not the dot on it. The dot is
//     3.5mm of unlabelled circle; nobody found it, which is a fair verdict on
//     hiding the only way to colour an event type behind it.
//
// The order is not decoration either. It is the order the pickers offer these
// in — the Links page, the Song list, the event form — so a pill can be held and
// dragged where the church wants it.
import { computed, nextTick, ref, watch } from 'vue'
import { Loader2, Plus, RotateCcw, X } from '../../icons'
import { useDragReorder } from '../../composables/useDragReorder'

const props = defineProps({
  /** Used for the placeholder and for what a screen reader reads. */
  label: { type: String, required: true },
  values: { type: Array, default: () => [] },
  /** The built-in list, for the "restore" link. */
  defaults: { type: Array, default: () => [] },
  /** How a stored value is shown — event types are stored lowercase. */
  format: { type: Function, default: (value) => value },
  /** The colour one entry wears, as a background class. Null for a list whose
      entries carry none. */
  dot: { type: Function, default: null },
  /** The colours an entry can be given, as [{ hue, dot }]. */
  palette: { type: Array, default: () => [] },
  /** Which hue one entry wears now, so the picker can mark it. */
  hueOf: { type: Function, default: null },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['add', 'remove', 'restore', 'reorder', 'hue'])

const draft = ref('')
const inputRef = ref(null)

const submit = async () => {
  const value = draft.value.trim()
  if (!value) return
  emit('add', value)
  draft.value = ''
  // Focus kept: these are usually added a few at a time.
  await nextTick()
  inputRef.value?.focus()
}

/* ----------------------------------------------------------------- colouring */

const colourable = computed(() => Boolean(props.dot && props.palette.length))

// Which entry's colour is being chosen, if any. One at a time: the swatches are
// a second row of taps, and under every pill at once they would be a wall.
const colouring = ref('')

const pickColour = (value) => {
  if (!colourable.value) return
  colouring.value = colouring.value === value ? '' : value
}

const chooseColour = (value, hue) => {
  emit('hue', value, hue)
  colouring.value = ''
}

/* ------------------------------------------------------------------ the order */

// Held rather than grabbed: a tap on a pill is how its colour is chosen, and a
// tap on its × is how it goes. The hold is what tells all three apart — the same
// bargain a phone's home screen strikes with its icons. A hold that is released
// early never becomes a drag, so the tap it was still arrives as a click.
//
// The drag rearranges a copy and the order is handed up once, on release.
const order = ref([...props.values])

const { draggingIndex, dragItem } = useDragReorder(
  () => order.value,
  (next) => {
    order.value = next
  },
  { holdDelay: 220 }
)

watch(
  () => props.values,
  (values) => {
    if (draggingIndex.value === null) order.value = [...values]
  },
  { immediate: true }
)

watch(draggingIndex, (now, before) => {
  if (before === null || now !== null) return
  // A hold that moved nothing is not a change.
  if (order.value.join('\u0000') !== props.values.join('\u0000')) emit('reorder', [...order.value])
})

// Only worth offering where something is actually missing: a church that has
// added to the list should not be invited to undo it.
const missingDefaults = computed(() => {
  const present = new Set(props.values.map((value) => String(value).toLowerCase()))
  return props.defaults.filter((value) => !present.has(String(value).toLowerCase()))
})
</script>

<template>
  <div>
    <!-- The box, and it stays open: the step is here to add to this list. -->
    <div class="flex items-center gap-2">
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        :placeholder="`New ${label.toLowerCase()}`"
        :aria-label="`Add to ${label}`"
        enterkeyhint="done"
        @keydown.enter.prevent="submit"
        class="h-11 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      <button
        type="button"
        @click="submit"
        :disabled="busy || !draft.trim()"
        class="inline-flex h-11 shrink-0 items-center gap-1 rounded-lg bg-primary pl-3 pr-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
      >
        <Loader2 v-if="busy" class="h-4 w-4 animate-spin" />
        <Plus v-else class="h-4 w-4" />
        Add
      </button>
    </div>

    <div v-if="order.length" class="mt-3 flex flex-wrap items-center gap-1.5">
      <span
        v-for="(value, index) in order"
        :key="value"
        v-bind="dragItem(index)"
        :class="[
          'inline-flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-1 text-sm font-medium transition-shadow',
          colourable ? 'cursor-pointer' : '',
          draggingIndex === index
            ? 'bg-primary/15 text-primary shadow-sm dark:text-primary-light'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
          colouring === value ? 'ring-2 ring-primary dark:ring-primary-light' : '',
        ]"
        @click="pickColour(value)"
      >
        <!-- The colour this one wears everywhere else. A mark, not a control:
             the pill it sits on is the control. -->
        <span v-if="dot" :class="['h-2.5 w-2.5 shrink-0 rounded-full', dot(value)]"></span>

        {{ format(value) }}

        <button
          type="button"
          @click.stop="emit('remove', value)"
          :disabled="busy"
          class="rounded-full p-1 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
          :aria-label="`Remove ${format(value)}`"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </span>
    </div>
    <p v-else class="mt-3 text-sm italic text-gray-400 dark:text-gray-500">Nothing on this list yet.</p>

    <!-- The palette, for the pill that was tapped. -->
    <div
      v-if="colouring"
      class="mt-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/40"
    >
      <p class="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        Colour for {{ format(colouring) }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="swatch in palette"
          :key="swatch.hue"
          type="button"
          @click="chooseColour(colouring, swatch.hue)"
          :aria-label="swatch.hue"
          :aria-pressed="hueOf && hueOf(colouring) === swatch.hue"
          :class="[
            'h-8 w-8 rounded-full ring-offset-2 transition-transform hover:scale-110 dark:ring-offset-gray-800',
            swatch.dot,
            hueOf && hueOf(colouring) === swatch.hue ? 'ring-2 ring-primary dark:ring-primary-light' : '',
          ]"
        ></button>
      </div>
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      <!-- Neither a tap for colour nor a hold for order is a gesture anybody
           guesses at, and both are worth knowing about. -->
      <p v-if="order.length" class="text-xs text-gray-400 dark:text-gray-500">
        <template v-if="colourable">Tap a pill for its colour</template>
        <template v-if="colourable && order.length > 1"> · </template>
        <template v-if="order.length > 1">Hold to reorder</template>
      </p>
      <button
        v-if="missingDefaults.length"
        type="button"
        @click="emit('restore')"
        class="ml-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        :title="`Puts back: ${missingDefaults.map(format).join(', ')}`"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        Restore {{ missingDefaults.length }}
      </button>
    </div>
  </div>
</template>
