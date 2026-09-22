<script setup>
// One of the church's own vocabularies — album categories, link groups, song
// categories, event types — as pills you can add to and take from.
//
// Reading, until the section says otherwise. Four of these lists sit on one
// screen; with an × on every pill and an Add box under each of them, Settings
// read as a form to fill in rather than four short lists to glance at. While
// the section is being edited the crosses and the Add pill appear, and the
// box itself is the last pill: tap +, type, press Enter, and it stays open
// for the next one.
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Loader2, Plus, RotateCcw, X } from '../../icons'
import InfoHint from '../common/InfoHint.vue'

const props = defineProps({
  label: { type: String, required: true },
  /** Shown behind an (i) rather than as a line under the name. */
  hint: { type: String, default: '' },
  values: { type: Array, default: () => [] },
  /** The built-in list, for the "restore" link. */
  defaults: { type: Array, default: () => [] },
  /** How a stored value is shown — event types are stored lowercase. */
  format: { type: Function, default: (value) => value },
  busy: { type: Boolean, default: false },
  /** The section's Edit session, held by the page above. */
  editing: { type: Boolean, default: false },
})

const emit = defineEmits(['add', 'remove', 'restore'])

const adding = ref(false)
const draft = ref('')
const inputRef = ref(null)

watch(
  () => props.editing,
  (on) => {
    if (!on) stopAdding()
  }
)

const startAdding = async () => {
  adding.value = true
  await nextTick()
  inputRef.value?.focus()
}

const stopAdding = () => {
  adding.value = false
  draft.value = ''
}

const submit = async () => {
  const value = draft.value.trim()
  if (!value) {
    stopAdding()
    return
  }
  emit('add', value)
  draft.value = ''
  // Left open on purpose: these are usually added a few at a time.
  await nextTick()
  inputRef.value?.focus()
}

// Only worth offering where something is actually missing: a church that has
// added to the list, or reordered nothing, should not be invited to undo it.
const missingDefaults = computed(() => {
  const present = new Set(props.values.map((value) => String(value).toLowerCase()))
  return props.defaults.filter((value) => !present.has(String(value).toLowerCase()))
})
</script>

<template>
  <div>
    <div class="flex items-baseline gap-2">
      <p class="flex items-center gap-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
        {{ label }}
        <InfoHint v-if="hint" :label="label.toLowerCase()" :text="hint" />
      </p>
      <span class="text-[11px] tabular-nums text-gray-400 dark:text-gray-500">{{ values.length }}</span>
      <button
        v-if="editing && missingDefaults.length"
        type="button"
        @click="emit('restore')"
        :disabled="busy"
        class="ml-auto inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
        :title="`Puts back: ${missingDefaults.map(format).join(', ')}`"
      >
        <RotateCcw class="h-3 w-3" />
        Restore {{ missingDefaults.length }}
      </button>
    </div>
    <div class="mt-2 flex flex-wrap items-center gap-1.5">
      <span
        v-for="value in values"
        :key="value"
        :class="[
          'inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200',
          editing ? 'pl-2.5 pr-1' : 'px-2.5',
        ]"
      >
        {{ format(value) }}
        <button
          v-if="editing"
          type="button"
          @click="emit('remove', value)"
          :disabled="busy"
          class="rounded-full p-0.5 text-gray-400 transition-colors hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
          :aria-label="`Remove ${format(value)}`"
        >
          <X class="h-3 w-3" />
        </button>
      </span>

      <!-- The add box, once asked for. It sits where the + pill was, so the
           row does not jump. -->
      <span
        v-if="adding && editing"
        class="inline-flex items-center gap-1 rounded-full border border-primary bg-white py-0.5 pl-2.5 pr-0.5 dark:bg-gray-900"
      >
        <input
          ref="inputRef"
          v-model="draft"
          type="text"
          :placeholder="`New ${label.toLowerCase()}`"
          :aria-label="`Add to ${label}`"
          enterkeyhint="done"
          @keydown.enter.prevent="submit"
          @keydown.esc.prevent="stopAdding"
          class="w-32 border-0 bg-transparent p-0 text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0 dark:text-white"
        />
        <button
          type="button"
          @click="submit"
          :disabled="busy || !draft.trim()"
          class="rounded-full bg-primary p-1 text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
          aria-label="Add"
        >
          <Loader2 v-if="busy" class="h-3 w-3 animate-spin" />
          <Check v-else class="h-3 w-3" />
        </button>
        <button
          type="button"
          @click="stopAdding"
          class="rounded-full p-1 text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Cancel"
        >
          <X class="h-3 w-3" />
        </button>
      </span>

      <span v-else-if="!editing && !values.length" class="text-xs italic text-gray-400 dark:text-gray-500">
        None yet
      </span>

      <button
        v-else-if="editing"
        type="button"
        @click="startAdding"
        :disabled="busy"
        class="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 py-1 pl-2 pr-2.5 text-xs font-medium text-gray-500 transition-colors hover:border-primary hover:text-primary disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:border-primary-light dark:hover:text-primary-light"
      >
        <Loader2 v-if="busy" class="h-3 w-3 animate-spin" />
        <Plus v-else class="h-3 w-3" />
        Add
      </button>
    </div>
  </div>
</template>
