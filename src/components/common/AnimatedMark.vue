<script setup>
import { useId } from 'vue'

// Ekkly's mark, alive: the four panes of the window light up one after
// another, like a room catching the morning sun, and a glint of light runs
// across the glass.
//
//   mode="loop"  the whole thing on repeat — for anything that is waiting
//   mode="once"  the panes arrive once, then only the glint returns now and
//                then — for a hero that should settle down and be looked at
//
// The same drawing as public/ekkly-mark.svg (keep the two in step), inlined
// so each pane can move on its own. Ids come from useId(): two marks on one
// page must not share a clip path, or the second borrows the first one's.

defineProps({
  mode: { type: String, default: 'loop' },
  label: { type: String, default: '' },
})

// The four panes, traced from brand/ekkly-logo.png — the same outlines as
// public/ekkly-mark.svg. The curved cross is the gap between them.
const PANES = {
  tl: 'M18.6 53Q18 52.6 18 51V46A34 34 0 0 1 48.5 12.2Q52 12 52 15.5V41C52 46.5 41 49.5 20 52.8Z',
  tr: 'M92.4 53Q93 52.6 93 51V46A34 34 0 0 0 62.5 12.2Q59 12 59 15.5V41C59 46.5 70 49.5 91 52.8Z',
  bl: 'M18 62Q18 57.5 22 56.3C30 53.5 40 53 45 54.5Q51 56 51 61V93Q51 96 48 96H24Q18 96 18 90Z',
  br: 'M59.5 61Q59.5 56 65 54.8C70 53.5 80 53.8 88 56Q92.5 57.5 92.5 62V89Q92.5 96 86 96H63Q59.5 96 59.5 92.5Z',
}

const uid = useId()
const id = (name) => `${uid}-${name}`
const url = (name) => `url(#${id(name)})`
</script>

<template>
  <svg
    viewBox="10.5 9 90 90"
    :class="['am', `am-${mode}`]"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
  >
    <defs>
      <clipPath :id="id('tl')"><path :d="PANES.tl" /></clipPath>
      <clipPath :id="id('tr')"><path :d="PANES.tr" /></clipPath>
      <clipPath :id="id('bl')"><path :d="PANES.bl" /></clipPath>
      <clipPath :id="id('br')"><path :d="PANES.br" /></clipPath>
      <!-- All four at once, for the glint: light falls only on glass. -->
      <clipPath :id="id('glass')">
        <path v-for="(d, key) in PANES" :key="key" :d="d" />
      </clipPath>
      <linearGradient :id="id('glint')" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#fff" stop-opacity="0" />
        <stop offset=".5" stop-color="#fff" stop-opacity=".7" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
    </defs>

    <!-- Order of arrival: top left, top right, bottom right, bottom left —
         round the window, the way the sun would cross it. -->
    <g class="pane pane-1">
      <g :clip-path="url('tl')">
        <rect x="10" y="8" width="45" height="50" fill="#fdc24b" />
        <path d="M10 31H36L35 46L31 56H10Z" fill="#fdcf5c" />
        <path d="M50 10H56V48L33 54L35 46L36 31Z" fill="#f7b63b" />
      </g>
    </g>
    <g class="pane pane-2">
      <g :clip-path="url('tr')">
        <rect x="56" y="8" width="45" height="50" fill="#f19140" />
        <path d="M82 17L96 34.5H73Z" fill="#dc5a31" />
        <path d="M72 34.5H96V58L57 48Z" fill="#cc6d3d" />
      </g>
    </g>
    <g class="pane pane-3">
      <g :clip-path="url('br')">
        <rect x="56" y="50" width="45" height="50" fill="#09a4c6" />
        <path d="M73 50H101V71L84 73L77 74L73 62Z" fill="#027595" />
        <path d="M101 69L86 73L60 99H101Z" fill="#14aaae" />
      </g>
    </g>
    <g class="pane pane-4">
      <g :clip-path="url('bl')">
        <rect x="10" y="50" width="45" height="50" fill="#0270dc" />
        <path d="M35 50H56V100H46L35 75Z" fill="#0b6fe3" />
        <path d="M10 50H35V75L10 76Z" fill="#48bcf0" />
      </g>
    </g>

    <!-- The glint: a soft band of light that crosses the glass. -->
    <g :clip-path="url('glass')">
      <g transform="rotate(18 55 54)">
        <rect class="glint" x="-35" y="-20" width="30" height="150" :fill="url('glint')" />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.am {
  display: block;
  overflow: visible;
}

.pane {
  transform-box: fill-box;
  transform-origin: center;
}

.glint {
  transform: translateX(0);
}

/* ------------------------------------------------------------ loop */

.am-loop .pane {
  animation: am-pane-loop 2.4s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
}

.am-loop .pane-2 { animation-delay: 0.12s; }
.am-loop .pane-3 { animation-delay: 0.24s; }
.am-loop .pane-4 { animation-delay: 0.36s; }

@keyframes am-pane-loop {
  0% { opacity: 0.15; transform: scale(0.55); }
  22% { opacity: 1; transform: scale(1.06); }
  32%, 78% { opacity: 1; transform: scale(1); }
  100% { opacity: 0.15; transform: scale(0.55); }
}

.am-loop .glint {
  animation: am-glint 2.4s ease-in-out 0.55s infinite;
}

/* ------------------------------------------------------------ once */

.am-once .pane {
  opacity: 0;
  animation: am-pane-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.am-once .pane-1 { animation-delay: 0.1s; }
.am-once .pane-2 { animation-delay: 0.25s; }
.am-once .pane-3 { animation-delay: 0.4s; }
.am-once .pane-4 { animation-delay: 0.55s; }

@keyframes am-pane-in {
  from { opacity: 0; transform: scale(0.4) rotate(-8deg); }
  to { opacity: 1; transform: none; }
}

.am-once .glint {
  animation: am-glint-idle 6s ease-in-out 1.3s infinite;
}

@keyframes am-glint {
  0%, 20% { transform: translateX(0); }
  60%, 100% { transform: translateX(160px); }
}

/* One pass, then a long rest: something to catch the eye, not a strobe. */
@keyframes am-glint-idle {
  0% { transform: translateX(0); }
  22%, 100% { transform: translateX(160px); }
}

/* Asked for stillness: the finished window, no light show. */
@media (prefers-reduced-motion: reduce) {
  .am .pane,
  .am .glint {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .am .glint {
    display: none;
  }
}
</style>
