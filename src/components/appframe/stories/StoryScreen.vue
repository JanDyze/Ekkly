<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

// The app's screen in a story, drawn at one size — 300 by 460, a phone's
// screen — and shrunk to whatever room the story leaves it, so a scene reads
// like the real page on any phone instead of reflowing into one nobody has.
// The same idea as the front door's ScaledScreen, which scales by width alone;
// here the height is the tighter fit, under the caption and over the button.

const WIDTH = 300
const HEIGHT = 460

const box = ref(null)
const scale = ref(1)
let observer = null

onMounted(() => {
  const fit = () => {
    const { clientWidth, clientHeight } = box.value
    scale.value = Math.min(clientWidth / WIDTH, clientHeight / HEIGHT, 1.2)
  }
  fit()
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(fit)
    observer.observe(box.value)
  }
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div ref="box" class="relative flex min-h-0 w-full flex-1 items-start justify-center">
    <div :style="{ width: `${WIDTH * scale}px`, height: `${HEIGHT * scale}px` }">
      <div
        class="relative origin-top-left rounded-[28px] bg-gray-50 text-gray-900 ring-1 ring-black/10 dark:bg-gray-900 dark:text-white dark:ring-white/10"
        :style="{ width: `${WIDTH}px`, height: `${HEIGHT}px`, transform: `scale(${scale})` }"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<!-- Shared by the scenes, which are components of their own and cannot see
     each other's scoped styles. Prefixed so nothing else matches. A scene
     sets --d on an element to delay its entrance; each plays once. -->
<style>
.st-rise {
  animation: st-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms) both;
}
.st-pop {
  animation: st-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) var(--d, 0ms) both;
}
.st-grow {
  transform-origin: left;
  animation: st-grow 0.8s cubic-bezier(0.22, 1, 0.36, 1) var(--d, 0ms) both;
}
/* A finger landing: a ring that spreads once from where it tapped. */
.st-tap::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: currentColor;
  opacity: 0;
  animation: st-tap 0.6s ease-out var(--t, 0ms) both;
  pointer-events: none;
}
.st-caret::after {
  content: '';
  display: inline-block;
  width: 1.5px;
  height: 1em;
  margin-left: 1px;
  vertical-align: -0.15em;
  background: currentColor;
  animation: st-blink 1s steps(1) infinite;
}

/* Something filled with the church's colour and lettered in white. On a dark
   page the accent token is its lighter shade, made for text, and white on it
   all but disappears, so it goes deeper instead, as DeckCard's filled cards
   do. Unlayered, so it wins over bg-primary and bg-primary-hover alike. */
.dark .st-filled {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

@keyframes st-rise {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
}
@keyframes st-pop {
  from {
    opacity: 0;
    transform: scale(0.6);
  }
}
@keyframes st-grow {
  from {
    transform: scaleX(0);
  }
}
@keyframes st-tap {
  0% {
    opacity: 0.22;
    transform: scale(0.9);
  }
  100% {
    opacity: 0;
    transform: scale(1.06);
  }
}
@keyframes st-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .st-rise,
  .st-pop,
  .st-grow,
  .st-tap::after,
  .st-caret::after {
    animation: none;
  }
}
</style>
