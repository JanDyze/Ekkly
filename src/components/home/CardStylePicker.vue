<script setup>
import { Check } from '../../icons'
import { HOME_CARD_STYLES } from '../../data/homeCards'

// A choice of how the home draws its apps, each style with a small sketch of
// its own layout, so it is chosen by looking rather than by reading a name.
// Shared by Settings > Home (the church's style) and Preferences (a person's
// own), which adds "Church's choice" at the top through `followLabel`.

const props = defineProps({
  // The chosen key, or null for "Church's choice" where that is offered.
  modelValue: { type: String, default: null },
  followLabel: { type: String, default: '' },
  followNote: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

// Four of the apps' colours, for the sketches (data/appHues.js).
const HUES = ['#1467e8', '#ec4319', '#ffb21e', '#0b93ab', '#ff7417', '#64748b']

const choose = (key) => {
  if (key !== props.modelValue) emit('update:modelValue', key)
}
</script>

<template>
  <div role="radiogroup" aria-label="How the home draws its apps" class="flex flex-col gap-2">
    <button
      v-if="followLabel"
      type="button"
      role="radio"
      :aria-checked="modelValue === null"
      :class="[
        'flex items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition-colors',
        modelValue === null
          ? 'bg-primary/5 ring-primary dark:bg-primary-light/10 dark:ring-primary-light'
          : 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-white/5',
      ]"
      @click="choose(null)"
    >
      <span class="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:bg-gray-700 dark:text-gray-300">
        Church
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ followLabel }}</span>
        <span v-if="followNote" class="block text-xs text-gray-500 dark:text-gray-400">{{ followNote }}</span>
      </span>
      <Check v-if="modelValue === null" class="size-4 shrink-0 text-primary dark:text-primary-light" />
    </button>

    <button
      v-for="style in HOME_CARD_STYLES"
      :key="style.key"
      type="button"
      role="radio"
      :aria-checked="modelValue === style.key"
      :class="[
        'flex items-center gap-3 rounded-xl p-2.5 text-left ring-1 transition-colors',
        modelValue === style.key
          ? 'bg-primary/5 ring-primary dark:bg-primary-light/10 dark:ring-primary-light'
          : 'ring-gray-200 hover:bg-gray-50 dark:ring-gray-700 dark:hover:bg-white/5',
      ]"
      @click="choose(style.key)"
    >
      <!-- The sketch: the style's layout in miniature. -->
      <span class="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 p-1 dark:bg-gray-700" aria-hidden="true">
        <span v-if="style.key === 'accent'" class="grid h-full grid-cols-2 gap-0.5">
          <span v-for="hue in HUES" :key="hue" class="rounded-[3px] bg-white dark:bg-gray-500" :style="{ boxShadow: `inset 2px 0 0 ${hue}` }" />
        </span>
        <span v-else-if="style.key === 'illustrated'" class="grid h-full grid-cols-2 gap-0.5">
          <span v-for="hue in HUES" :key="hue" class="rounded-[3px]" :style="{ background: `color-mix(in srgb, ${hue} 45%, white)` }" />
        </span>
        <span v-else-if="style.key === 'compact'" class="grid h-full grid-cols-2 gap-0.5">
          <span v-for="hue in HUES" :key="hue" class="flex items-center gap-0.5 rounded-[3px] bg-white px-0.5 dark:bg-gray-500">
            <span class="size-1.5 rounded-full" :style="{ background: hue }" />
          </span>
        </span>
        <span v-else-if="style.key === 'orbit'" class="relative block h-full">
          <span class="absolute inset-y-0.5 left-1/2 aspect-square -translate-x-1/2 rounded-full border border-gray-300 dark:border-gray-400" />
          <span
            v-for="(hue, i) in HUES.slice(0, 5)"
            :key="hue"
            class="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            :style="{ background: hue, left: `${50 + 26 * Math.cos((-90 + i * 72) * Math.PI / 180)}%`, top: `${50 + 36 * Math.sin((-90 + i * 72) * Math.PI / 180)}%` }"
          />
        </span>
        <span v-else-if="style.key === 'list'" class="flex h-full flex-col gap-0.5">
          <span v-for="hue in HUES.slice(0, 4)" :key="hue" class="flex flex-1 items-center gap-0.5 rounded-[3px] bg-white px-0.5 dark:bg-gray-500">
            <span class="size-1.5 rounded-full" :style="{ background: hue }" />
          </span>
        </span>
        <span v-else class="grid h-full grid-cols-5 gap-0.5">
          <span
            v-for="(hue, i) in HUES"
            :key="hue"
            :class="['rounded-[3px]', [0, 3, 4].includes(i) ? 'col-span-3' : 'col-span-2']"
            :style="{ background: `color-mix(in srgb, ${hue} 45%, white)` }"
          />
        </span>
      </span>

      <span class="min-w-0 flex-1">
        <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ style.name }}</span>
        <span class="block text-xs text-gray-500 dark:text-gray-400">{{ style.note }}</span>
      </span>
      <Check v-if="modelValue === style.key" class="size-4 shrink-0 text-primary dark:text-primary-light" />
    </button>
  </div>
</template>
