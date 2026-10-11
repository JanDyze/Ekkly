<script setup>
import { computed } from 'vue'
import { ImageSquare } from '../../icons'

// An item's picture, small or large. A cut-out (its background removed) sits
// whole on a soft square, the way a shop shows what it sells, so the thing is
// never cropped; a photo kept as taken fills its square instead. Without a
// picture it is an empty square with a picture's outline, quiet, never a
// stock image standing in for the church's own keyboard.

const props = defineProps({
  item: { type: Object, required: true },
  // Size and rounding, as classes: 'size-11 rounded-xl' for a row.
  size: { type: String, default: 'size-11 rounded-xl' },
  // The large picture, for an item's own page; the small copy otherwise.
  large: { type: Boolean, default: false },
})

const src = computed(() => (props.large ? props.item.photo || props.item.thumb : props.item.thumb || props.item.photo))
</script>

<template>
  <span
    :class="[
      'flex shrink-0 items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-700/70',
      size,
    ]"
  >
    <img
      v-if="src"
      :src="src"
      alt=""
      loading="lazy"
      decoding="async"
      draggable="false"
      :class="item.photoCut ? 'size-full object-contain p-[8%]' : 'size-full object-cover'"
    />
    <ImageSquare v-else class="size-1/2 text-gray-300 dark:text-gray-500" aria-hidden="true" />
  </span>
</template>
