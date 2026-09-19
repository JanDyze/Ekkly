<script setup>
import { computed, onMounted } from 'vue'
import { Check } from '../../icons'
import { BRAND_FONTS, brandFont, fontsUrl } from '../../../lib/platformDefaults.js'

// Picking the face the whole app is set in, from a short list rather than a
// free text box — see BRAND_FONTS in lib/platformDefaults.js for why.
//
// Used by the platform console (every church's starting face) and church
// Settings (one church's own). `fallback` is the key an unchosen face falls
// back to, so the ticked card is always the one that saving would give you.

const props = defineProps({
  modelValue: { type: String, default: '' },
  fallback: { type: String, default: 'system' },
})

const emit = defineEmits(['update:modelValue'])

const chosen = computed(() => brandFont(props.modelValue || props.fallback).key)

// Every face is downloaded when the picker appears, so each sample is set in
// the real thing instead of in a guess at it. One request for the lot, and
// only on the page where somebody is choosing.
const PREVIEW_STYLESHEET_ID = 'brand-font-preview'

onMounted(() => {
  if (typeof document === 'undefined' || document.getElementById(PREVIEW_STYLESHEET_ID)) return
  const link = document.createElement('link')
  link.id = PREVIEW_STYLESHEET_ID
  link.rel = 'stylesheet'
  link.href = fontsUrl(BRAND_FONTS.map((font) => font.key))
  document.head.appendChild(link)
})
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
    <button
      v-for="font in BRAND_FONTS"
      :key="font.key"
      type="button"
      @click="emit('update:modelValue', font.key)"
      :aria-pressed="chosen === font.key"
      :class="[
        'rounded-xl border p-3 text-left transition-colors',
        chosen === font.key
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-gray-600 dark:hover:bg-gray-700/50',
      ]"
    >
      <div class="flex items-start justify-between gap-2">
        <!-- The sample is drawn in the face itself, at the sizes the app uses
             for a row title and its second line, so the choice is judged on
             what it will actually look like. -->
        <span class="text-base font-semibold text-gray-900 dark:text-white" :style="{ fontFamily: font.stack }">
          {{ font.label }}
        </span>
        <Check v-if="chosen === font.key" class="mt-1 h-4 w-4 shrink-0 text-primary" />
      </div>
      <p class="text-sm text-gray-700 dark:text-gray-200" :style="{ fontFamily: font.stack }">
        Sunday service · 9:00 am · 128 in
      </p>
      <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{{ font.note }}</p>
    </button>
  </div>
</template>
