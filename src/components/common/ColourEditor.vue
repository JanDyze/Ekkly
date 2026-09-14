<script setup>
import { computed } from 'vue'
import { Check, WarningCircle } from '../../icons'
import { contrastRatio, isHexColor } from '../../../lib/platformDefaults.js'

// Picking the two accent colours — the one on a light page and the one on a
// dark page — with a preview of both, drawn in the chosen colours rather than
// the ones in use, so a choice can be judged before anybody else sees it.
//
// Used by the platform console (every church's starting colours) and church
// Settings (one church's own). `fallback` is what an empty colour becomes, so
// the preview shows exactly what saving would.

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  fallback: { type: Object, required: true },
})

const emit = defineEmits(['update:modelValue'])

const resolved = computed(() => ({
  primary: isHexColor(props.modelValue.primary) ? props.modelValue.primary : props.fallback.primary,
  primaryDark: isHexColor(props.modelValue.primaryDark) ? props.modelValue.primaryDark : props.fallback.primaryDark,
}))

const set = (key, value) => emit('update:modelValue', { ...props.modelValue, [key]: value })

// White text sits on the light accent (every primary button), and the dark
// accent is text on gray-900. 4.5:1 is the WCAG line for normal-size text.
const lightContrast = computed(() => contrastRatio(resolved.value.primary, '#ffffff'))
const darkContrast = computed(() => contrastRatio(resolved.value.primaryDark, '#111827'))

const FIELDS = computed(() => [
  {
    key: 'primary',
    label: 'Accent on light pages',
    hint: 'Buttons, links and highlights in light mode',
    contrast: lightContrast.value,
    warning: 'White text on this is hard to read. A darker shade works better.',
  },
  {
    key: 'primaryDark',
    label: 'Accent on dark pages',
    hint: 'The same, in dark mode — usually a lighter shade',
    contrast: darkContrast.value,
    warning: 'This is hard to read on a dark page. A lighter shade works better.',
  },
])

const hexInput =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm uppercase text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="space-y-5">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div v-for="field in FIELDS" :key="field.key">
        <label :for="`colour-${field.key}`" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{{ field.label }}</label>
        <div class="flex items-center gap-2">
          <input
            type="color"
            :value="resolved[field.key]"
            @input="set(field.key, $event.target.value)"
            :aria-label="`${field.label}, colour picker`"
            class="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-gray-300 bg-white p-1 dark:border-gray-600 dark:bg-gray-700"
          />
          <input
            :id="`colour-${field.key}`"
            :value="modelValue[field.key] || ''"
            @input="set(field.key, $event.target.value.trim())"
            type="text"
            maxlength="7"
            spellcheck="false"
            :placeholder="fallback[field.key]"
            :class="[hexInput, modelValue[field.key] && !isHexColor(modelValue[field.key]) ? 'border-red-400 dark:border-red-500' : '']"
          />
        </div>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ field.hint }}</p>
        <p v-if="field.contrast < 4.5" class="mt-1 flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
          <WarningCircle class="mt-px h-3.5 w-3.5 shrink-0" />
          {{ field.warning }} ({{ field.contrast.toFixed(1) }}:1)
        </p>
      </div>
    </div>

    <!-- The preview paints its own colours inline: the app's tokens are still
         the saved ones until this is saved. -->
    <div class="grid grid-cols-1 overflow-hidden rounded-xl border border-gray-200 sm:grid-cols-2 dark:border-gray-700" aria-label="Preview">
      <div
        v-for="mode in ['light', 'dark']"
        :key="mode"
        :class="['space-y-3 p-4', mode === 'light' ? 'bg-white' : 'bg-gray-900']"
        :style="{ '--accent': mode === 'light' ? resolved.primary : resolved.primaryDark }"
      >
        <p :class="['text-xs font-bold uppercase tracking-wide', mode === 'light' ? 'text-gray-500' : 'text-gray-400']">
          {{ mode === 'light' ? 'Light' : 'Dark' }}
        </p>
        <button
          type="button"
          tabindex="-1"
          class="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-white"
          :style="{ background: 'var(--accent)' }"
        >
          <Check class="h-4 w-4" /> Save
        </button>
        <div
          class="rounded-lg p-3"
          :style="{ background: 'color-mix(in srgb, var(--accent) 12%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent)' }"
        >
          <p :class="['text-sm font-medium', mode === 'light' ? 'text-gray-900' : 'text-white']">Ana Reyes</p>
          <p :class="['text-xs', mode === 'light' ? 'text-gray-500' : 'text-gray-400']">A selected row</p>
        </div>
        <p class="text-sm font-medium" :style="{ color: 'var(--accent)' }">A link, or a count</p>
      </div>
    </div>
  </div>
</template>
