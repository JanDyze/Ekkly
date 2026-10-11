<script setup>
/**
 * The passages of a message or a lesson, added by reference.
 *
 * Each is looked up as it is added, the way the preaching sheet does it, so a
 * mistyped reference is caught here rather than in front of the class, and its
 * verses are kept with it: a lesson's Scripture should still be there when the
 * classroom has no signal.
 */
import { ref } from 'vue'
import { BookOpen, Loader2, Plus, Trash2 } from '../../icons'
import { useBibleVersion } from '../../composables/useBibleVersion'
import { lookupReference } from '../../api/bibleService'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: { type: String, default: 'Passages' },
  placeholder: { type: String, default: 'Luke 19:1-10' },
  hint: { type: String, default: '' },
  inputId: { type: String, default: 'passage-reference' },
})

const emit = defineEmits(['update:modelValue'])

const { version: bibleVersion } = useBibleVersion()
const typed = ref('')
const lookingUp = ref(false)
const error = ref('')

const add = async () => {
  const reference = typed.value.trim()
  if (!reference || lookingUp.value) return
  lookingUp.value = true
  error.value = ''
  const result = await lookupReference(reference, bibleVersion.value)
  lookingUp.value = false
  if (result.error || !result.verses?.length) {
    error.value = result.error || 'That passage has no verses in it.'
    return
  }
  emit('update:modelValue', [
    ...props.modelValue,
    { reference: result.reference, version: result.version || bibleVersion.value, verses: result.verses },
  ])
  typed.value = ''
}

const remove = (index) => emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div>
    <label :for="inputId" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</label>
    <ul v-if="modelValue.length" class="mb-2 space-y-1.5">
      <li
        v-for="(passage, index) in modelValue"
        :key="`${passage.reference}-${index}`"
        class="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-700/50"
      >
        <BookOpen class="h-4 w-4 shrink-0 text-primary dark:text-primary-light" />
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-semibold text-gray-900 dark:text-white">{{ passage.reference }}</span>
          <span class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ passage.verses[0]?.text }}</span>
        </span>
        <button
          type="button"
          class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
          :aria-label="`Remove ${passage.reference}`"
          @click="remove(index)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>
    <div class="flex gap-2">
      <input :id="inputId" v-model="typed" :class="inputClass" :placeholder="placeholder" @keydown.enter.prevent="add" />
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary disabled:opacity-50 dark:bg-primary-light/15 dark:text-primary-light"
        :disabled="!typed.trim() || lookingUp"
        @click="add"
      >
        <Loader2 v-if="lookingUp" class="h-4 w-4 animate-spin" />
        <Plus v-else class="h-4 w-4" />
        Add
      </button>
    </div>
    <p v-if="error" class="mt-1 text-xs text-red-600 dark:text-red-400">{{ error }}</p>
    <p v-else-if="hint" class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ hint }}</p>
  </div>
</template>
