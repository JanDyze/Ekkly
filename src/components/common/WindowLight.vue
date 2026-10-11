<script setup>
import { useId } from 'vue'

// Ekkly's window with the light coming through it, as the front door's
// picture has it (src/assets/hero-bg-*.webp): the mark's arch, its four panes
// round a curved cross, a beam falling away from it, and the panes laid out
// again where the beam lands. One drawing, in one colour, for whatever stands
// behind a page or a card: the day card's corner (CardPanes), the home's sky
// (HomeScene) and the hold preview (AppPeek).
//
// It is drawn in a single colour, never the mark's four, because it sits on
// a church's own colour or on the sky and has to take theirs. Set the colour
// and how strongly each part shows on the element or a wrapper:
//
//   --window-glass          the colour (white unless set)
//   --window-glass-opacity  the panes
//   --window-beam-opacity   the light falling from them
//   --window-cast-opacity   the panes where the light lands
//
// The window stands top right and its light falls down to the left; `mirror`
// turns it round, for a window in the top left.
//
// The panes follow the mark (public/ekkly-mark.svg) drawn taller, the way a
// church window is: the top panes' lower edges sweep up to meet the upright,
// the bottom panes rise in a gentle arch, so the crossbar is a seam at the
// sides that opens wide in the middle. Ids come from useId(), so two of these
// on one page never borrow each other's light.

defineProps({
  mirror: { type: Boolean, default: false },
})

const uid = useId()
const id = (name) => `window-${name}-${uid}`

// The window is 100 wide and 180 tall; the drawing places it at (270, 20)
// and lays its light out from there.
const PANES = [
  'M0 61V50A50 50 0 0 1 46 0.16V44C46 50 30 56 0 61Z',
  'M100 61V50A50 50 0 0 0 54 0.16V44C54 50 70 56 100 61Z',
  'M0 65C16 60.5 32 58.5 39 59.5Q46 60.5 46 67V180H0Z',
  'M100 65C84 60.5 68 58.5 61 59.5Q54 60.5 54 67V180H100Z',
]
</script>

<template>
  <svg viewBox="0 0 400 360" aria-hidden="true">
    <defs>
      <linearGradient :id="id('beam')" gradientUnits="userSpaceOnUse" x1="320" y1="80" x2="90" y2="330">
        <stop offset="0" class="window-beam-stop" />
        <stop offset="1" class="window-stop-clear" />
      </linearGradient>
      <linearGradient :id="id('cast')" gradientUnits="userSpaceOnUse" x1="330" y1="215" x2="80" y2="320">
        <stop offset="0" class="window-cast-stop" />
        <stop offset="1" class="window-stop-clear" />
      </linearGradient>
      <!-- Light has no hard edge: the beam is softened, the window is not. -->
      <filter :id="id('soft')" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="7" />
      </filter>
    </defs>

    <g :transform="mirror ? 'translate(400 0) scale(-1 1)' : undefined">
      <path d="M318 26L370 120L370 205L245 290L95 330L40 300L272 66Z" :fill="`url(#${id('beam')})`" :filter="`url(#${id('soft')})`" />
      <!-- The panes again where the light lands: the window laid down flat,
           its foot at the window's foot and its arch furthest away. -->
      <g transform="matrix(1 0.1 1.1 -0.5 62 305)" :fill="`url(#${id('cast')})`">
        <path v-for="d in PANES" :key="d" :d="d" />
      </g>
      <g transform="translate(270 20)" class="window-glass">
        <path v-for="d in PANES" :key="d" :d="d" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.window-glass {
  fill: var(--window-glass, white);
  fill-opacity: var(--window-glass-opacity, 0.16);
}
.window-beam-stop {
  stop-color: var(--window-glass, white);
  stop-opacity: var(--window-beam-opacity, 0.14);
}
.window-cast-stop {
  stop-color: var(--window-glass, white);
  stop-opacity: var(--window-cast-opacity, 0.12);
}
.window-stop-clear {
  stop-color: var(--window-glass, white);
  stop-opacity: 0;
}
</style>
