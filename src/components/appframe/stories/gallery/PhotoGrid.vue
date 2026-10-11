<script setup>
// Photos edge to edge, three across, in a block with rounded corners, the way
// an album's grid and Recent photos lay them out. The app rounds the block by
// clipping it; here the four corner photos are rounded themselves, so nothing
// needs clipping. Each photo pops in as it lands.

const props = defineProps({
  photos: { type: Array, required: true },
  // How many places the block has, filled or not, so its corners stay where
  // the finished block's corners will be while photos are still arriving.
  places: { type: Number, default: 0 },
  delay: { type: Number, default: 0 },
  step: { type: Number, default: 70 },
})

const COLUMNS = 3

const cornerOf = (i) => {
  const total = Math.max(props.places, props.photos.length)
  const rows = Math.ceil(total / COLUMNS)
  const row = Math.floor(i / COLUMNS)
  const col = i % COLUMNS
  return [
    row === 0 && col === 0 ? 'rounded-tl-2xl' : '',
    row === 0 && col === COLUMNS - 1 ? 'rounded-tr-2xl' : '',
    row === rows - 1 && col === 0 ? 'rounded-bl-2xl' : '',
    row === rows - 1 && (col === COLUMNS - 1 || i === total - 1) ? 'rounded-br-2xl' : '',
  ]
}
</script>

<template>
  <div class="grid grid-cols-3 gap-1">
    <img
      v-for="(src, i) in props.photos"
      :key="i"
      :src="src"
      alt=""
      :class="['st-pop aspect-square w-full bg-gray-100 object-cover dark:bg-gray-800', cornerOf(i)]"
      :style="{ '--d': `${props.delay + i * props.step}ms` }"
    />
  </div>
</template>
