<script setup>
import { computed } from 'vue'

// One card of the announcement video, drawn the way the studio's canvas draws
// a "feature" card (utils/video/render.js): the look's ground, the card's
// photo under the look's own colour so the words read on any picture, the
// rings in the top corner, and the eyebrow as a chip over the title, when and
// where. Wide, sixteen by nine, as the projector and Facebook take it.
//
// Every colour is mixed from the church's accent token, so the card follows
// whatever colour the church has chosen, as the real video does.

const props = defineProps({
  card: { type: Object, required: true },
  // bold | light | night | dawn
  look: { type: String, default: 'bold' },
})

const P = 'var(--color-primary)'
const LOOKS = {
  bold: {
    ground: `linear-gradient(135deg, color-mix(in oklab, ${P} 96%, black), color-mix(in oklab, ${P} 62%, black))`,
    veil: 0.7,
    text: 'text-white',
    muted: 'text-white/75',
    chip: 'bg-white text-primary',
    ring: 'border-white/15',
  },
  light: {
    ground: `linear-gradient(135deg, color-mix(in oklab, white 97%, ${P}), color-mix(in oklab, white 86%, ${P}))`,
    veil: 0.82,
    text: 'text-gray-900',
    muted: 'text-gray-600',
    chip: 'st-filled bg-primary text-white',
    ring: 'border-primary/20',
  },
  night: {
    ground: `linear-gradient(135deg, color-mix(in oklab, var(--color-gray-950) 94%, ${P}), color-mix(in oklab, var(--color-gray-950) 66%, ${P}))`,
    veil: 0.76,
    text: 'text-white',
    muted: 'text-white/70',
    chip: 'bg-primary-light text-gray-950',
    ring: 'border-primary-light/25',
  },
  dawn: {
    ground: `radial-gradient(120% 110% at 8% 102%, color-mix(in oklab, var(--color-amber-200) 75%, transparent), transparent 60%), linear-gradient(135deg, color-mix(in oklab, ${P} 80%, black), color-mix(in oklab, ${P} 50%, black))`,
    veil: 0.66,
    text: 'text-white',
    muted: 'text-white/80',
    chip: 'bg-white text-primary',
    ring: 'border-white/20',
  },
}

const look = computed(() => LOOKS[props.look] || LOOKS.bold)
</script>

<template>
  <div class="relative aspect-video w-full rounded-xl" :style="{ background: look.ground }">
    <!-- The photo, then the look's colour over it. Both rounded with the
         card, so nothing of either shows past its corners. -->
    <img v-if="card.photo" :src="card.photo" alt="" class="absolute inset-0 size-full rounded-xl object-cover" />
    <span v-if="card.photo" class="absolute inset-0 rounded-xl" :style="{ background: look.ground, opacity: look.veil }" />
    <span :class="['absolute right-3 top-2 size-14 rounded-full border', look.ring]" />
    <span :class="['absolute right-0 top-0 size-24 rounded-tr-xl rounded-bl-full border-b border-l', look.ring]" />

    <Transition name="card" mode="out-in">
      <div :key="card.id" class="absolute inset-x-3.5 bottom-3">
        <span v-if="card.eyebrow" :class="['inline-block rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest', look.chip]">
          {{ card.eyebrow }}
        </span>
        <p :class="['mt-1 text-lg font-black leading-tight', look.text]">{{ card.title }}</p>
        <p v-if="card.when" :class="['mt-0.5 text-[10px] font-semibold', look.text]">{{ card.when }}</p>
        <p v-if="card.where" :class="['text-[10px]', look.muted]">{{ card.where }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.card-enter-active {
  transition:
    opacity 0.35s ease,
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.card-leave-active {
  transition: opacity 0.2s ease;
}
.card-enter-from {
  opacity: 0;
  transform: translateX(10px);
}
.card-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .card-enter-active,
  .card-leave-active {
    transition: none;
  }
}
</style>
