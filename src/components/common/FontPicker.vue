<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { Check } from '../../icons'
import {
  BRAND_FONTS,
  CUSTOM_FONT,
  brandFont,
  fontsUrl,
  isCustomFamily,
} from '../../../lib/platformDefaults.js'

// Picking the face the whole app is set in: five that somebody vetted, and then
// whatever else the church is already set in.
//
// The five are here because every one of them holds up at row-title size on a
// phone. The sixth card gives that up on purpose — a church whose letterhead has
// been Libre Baskerville for thirty years should not have to be talked out of
// it — and asks for the name of a Google Fonts family instead. The sample below
// the box is the argument either way: it is drawn in the real face, at the size
// the app uses, as soon as the name resolves.
//
// Used by the platform console (every church's starting face) and church
// Settings (one church's own). `fallback` is the key an unchosen face falls back
// to, so the ticked card is always the one that saving would give you.

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** The family name, when the chosen face is a custom one. */
  family: { type: String, default: '' },
  fallback: { type: String, default: 'system' },
  /** The family behind the fallback, where that is a custom face too — so a
      church inheriting the platform's own face sees its name rather than an
      empty box with a tick beside it. */
  fallbackFamily: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:family'])

const chosen = computed(() => {
  const key = props.modelValue || props.fallback
  return key === CUSTOM_FONT ? CUSTOM_FONT : brandFont(key).key
})

// What is in the box, which is not yet what is chosen: a name is only a face
// once it could be one.
const typed = ref(props.family || props.fallbackFamily)
watch(
  () => props.family,
  (value) => {
    if (value !== typed.value.trim()) typed.value = value
  }
)

const usable = computed(() => isCustomFamily(typed.value))
const customFace = computed(() => brandFont(CUSTOM_FONT, typed.value))
const customStack = computed(() => (usable.value ? customFace.value.stack : ''))

/* ----------------------------------------------------------------- previews */

// Every vetted face is downloaded when the picker appears, so each sample is set
// in the real thing instead of in a guess at it. One request for the lot, and
// only on the page where somebody is choosing.
const PREVIEW_STYLESHEET_ID = 'brand-font-preview'
const CUSTOM_STYLESHEET_ID = 'brand-font-custom-preview'

const stylesheet = (id, href) => {
  if (typeof document === 'undefined' || !href) return
  let link = document.getElementById(id)
  if (!link) {
    link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

onMounted(() => {
  if (typeof document === 'undefined' || document.getElementById(PREVIEW_STYLESHEET_ID)) return
  stylesheet(PREVIEW_STYLESHEET_ID, fontsUrl(BRAND_FONTS.map((font) => font.key)))
})

// A typed name is fetched once it has settled, not on every keystroke: "Fraunces"
// would otherwise be eight requests, seven of them for families that do not
// exist. Nothing is stored until it resolves either, so a half-typed name never
// becomes the app's face.
let settle = null
watch(typed, () => {
  clearTimeout(settle)
  settle = setTimeout(() => {
    if (!usable.value) return
    stylesheet(CUSTOM_STYLESHEET_ID, fontsUrl([customFace.value]))
  }, 400)
})

const chooseCustom = () => {
  if (!usable.value) return
  emit('update:family', typed.value.trim())
  emit('update:modelValue', CUSTOM_FONT)
}

// Committed when the box is left or Enter is pressed, so the app does not change
// face under somebody mid-word.
const commit = () => {
  if (usable.value) chooseCustom()
}
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

    <!-- A face of the church's own. Not a button: the card is a box to type in,
         and what commits it is the name working. -->
    <div
      :class="[
        'rounded-xl border p-3 transition-colors',
        chosen === CUSTOM_FONT
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-gray-200 dark:border-gray-700',
      ]"
    >
      <div class="flex items-start justify-between gap-2">
        <label for="brand-font-custom" class="text-base font-semibold text-gray-900 dark:text-white">
          Your own
        </label>
        <Check v-if="chosen === CUSTOM_FONT" class="mt-1 h-4 w-4 shrink-0 text-primary" />
      </div>

      <input
        id="brand-font-custom"
        v-model="typed"
        type="text"
        placeholder="Libre Baskerville"
        autocapitalize="words"
        spellcheck="false"
        enterkeyhint="done"
        @blur="commit"
        @keydown.enter.prevent="commit"
        class="mt-1.5 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />

      <p
        v-if="usable"
        class="mt-2 text-sm text-gray-700 dark:text-gray-200"
        :style="{ fontFamily: customStack }"
      >
        Sunday service · 9:00 am · 128 in
      </p>
      <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        Any family on Google Fonts, by name. Nothing here is vetted for legibility —
        the sample is.
      </p>
    </div>
  </div>
</template>
