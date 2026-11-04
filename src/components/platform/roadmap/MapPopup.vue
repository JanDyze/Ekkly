<script setup>
import { computed } from 'vue'

// A popup on a roadmap's map: a raised card that pops open beside the piece
// it is about, with a tail pointing at it, the way a game shows a level
// before you play it. It is placed in the map's own coordinates, so it
// scrolls with the map, and above the piece unless there is no room there.
//
// The map decides what is in it (the slot) and when it shows; this only
// places and draws it.

const props = defineProps({
  show: { type: Boolean, default: false },
  // The piece: its centre across, its centre up from the map's foot, and how
  // far it reaches from that centre.
  x: { type: Number, default: 0 },
  yb: { type: Number, default: 0 },
  reach: { type: Number, default: 30 },
  // The map's size.
  width: { type: Number, default: 360 },
  height: { type: Number, default: 600 },
  // The colour its words and buttons take; the map's own when left out.
  hue: { type: String, default: '' },
  // Which piece it is about: moving to another one fades this popup and
  // pops a new one from there, rather than changing the words in place.
  anchor: { type: String, default: '' },
})

const W_MAX = 290
const GAP = 14
// About how tall a popup is, to know whether it fits above.
const ROOM = 250

const place = computed(() => {
  const w = Math.min(W_MAX, props.width - 24)
  const left = Math.min(Math.max(props.x - w / 2, 12), props.width - w - 12)
  const tail = Math.min(Math.max(props.x - left, 24), w - 24)
  const above = props.height - (props.yb + props.reach) > ROOM
  return {
    above,
    tail,
    style: {
      left: `${left}px`,
      width: `${w}px`,
      transformOrigin: `${tail}px ${above ? '100%' : '0%'}`,
      ...(props.hue ? { '--hue': props.hue } : {}),
      ...(above
        ? { bottom: `${props.yb + props.reach + GAP}px` }
        : { top: `${props.height - props.yb + props.reach + GAP}px` }),
    },
  }
})
</script>

<template>
  <Transition name="rm-pop">
    <div v-if="show" :key="anchor" class="absolute z-30" :style="place.style" role="dialog" @click.stop>
      <div class="rm-popup-card relative rounded-2xl p-4">
        <slot />
        <!-- The tail, a turned square half hidden under the card's edge. -->
        <span
          :class="[
            'absolute size-4 rotate-45 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
            place.above ? '-bottom-[9px] border-r-2 border-b-2' : '-top-[9px] border-t-2 border-l-2',
          ]"
          :style="{ left: `${place.tail - 8}px` }"
          aria-hidden="true"
        ></span>
      </div>
    </div>
  </Transition>
</template>
