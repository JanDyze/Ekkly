<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

// A device's screen in the hero. What is on it is drawn at one fixed size —
// 272 by 544 for a phone, 524 by 320 for a monitor — and shrunk to fit whatever
// the device is, so a scene reads like the real page at any width instead of
// reflowing into something no phone or computer would ever show. The device's
// frame is 10px, so this sits inset by that.

const props = defineProps({
  width: { type: Number, default: 524 },
  height: { type: Number, default: 320 },
  // The screen's corners, which follow the frame's.
  round: { type: String, default: 'rounded-md' },
  // What the screen is lit with. A phone scene leaves this empty and lets the
  // device's own ground show through.
  ground: { type: String, default: 'bg-white dark:bg-gray-900' },
})

const screen = ref(null)
const scale = ref(1)
// The width decides the scale. The height then follows the screen itself
// rather than the design's, because the device's frame takes 10px off both
// sides and so leaves a box a little taller in proportion than the drawing;
// without this, anything anchored to the bottom — a phone's bar — would stop
// short of it.
const drawnHeight = ref(props.height)
let observer = null

onMounted(() => {
  if (!screen.value) return
  const fit = () => {
    scale.value = screen.value.clientWidth / props.width
    drawnHeight.value = screen.value.clientHeight / scale.value
  }
  fit()
  // The device changes size while it changes shape, and with the window; the
  // page on it follows the whole way.
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(fit)
    observer.observe(screen.value)
  }
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div ref="screen" :class="['absolute inset-2.5 overflow-hidden', round, ground]">
    <div class="relative origin-top-left" :style="{ width: `${width}px`, height: `${drawnHeight}px`, transform: `scale(${scale})` }">
      <slot />
    </div>
  </div>
</template>
