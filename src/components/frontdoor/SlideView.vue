<script setup>
import { computed } from 'vue'

// One slide as the congregation would see it on the projector: a song's lines,
// a Bible passage with its reference, or a slide from a PowerPoint deck. The
// Present scene shows the same slide in several places at several sizes.

const props = defineProps({
  slide: { type: Object, default: null },
  // sm: the operator's preview · lg: a preview on the phone's screen ·
  // wall: the projector beside the device, small on a phone-width page where
  // it overlaps the device and full size from sm up
  size: { type: String, default: 'sm' },
})

const SIZES = {
  sm: { lyrics: 'text-[15px]', verse: 'text-[13px]', ref: 'text-[9px]', title: 'text-[22px]', line: 'text-[11px]', inset: 'px-4', deck: 'p-4' },
  lg: {
    lyrics: 'text-xs sm:text-base',
    verse: 'text-[10px] sm:text-sm',
    ref: 'text-[9px] sm:text-[10px]',
    title: 'text-lg sm:text-2xl',
    line: 'text-[10px] sm:text-xs',
    inset: 'px-4 sm:px-6',
    deck: 'p-3 sm:p-5',
  },
  wall: {
    lyrics: 'text-[9px] sm:text-base',
    verse: 'text-[8px] sm:text-sm',
    ref: 'text-[7px] sm:text-[10px]',
    title: 'text-sm sm:text-2xl',
    line: 'text-[8px] sm:text-xs',
    inset: 'px-2 sm:px-6',
    deck: 'p-2 sm:p-5',
  },
}

const t = computed(() => SIZES[props.size] || SIZES.sm)
</script>

<template>
  <div class="absolute inset-0 bg-gray-950">
    <Transition name="slide" mode="out-in">
      <div :key="slide ? slide.id : 'blank'" class="absolute inset-0">
        <div v-if="!slide" class="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-widest text-white/25">Welcome</div>
        <div v-else-if="slide.kind === 'lyrics'" :class="['flex h-full flex-col items-center justify-center text-center font-bold leading-snug text-white', t.lyrics, t.inset]">
          <span v-for="line in slide.lines" :key="line">{{ line }}</span>
        </div>
        <div v-else-if="slide.kind === 'verse'" :class="['flex h-full flex-col items-center justify-center text-center', t.inset]">
          <span v-for="line in slide.lines" :key="line" :class="['font-serif leading-snug text-white', t.verse]">{{ line }}</span>
          <span :class="['mt-2 font-bold uppercase tracking-widest text-amber-300', t.ref]">{{ slide.reference }}</span>
        </div>
        <div v-else :class="['flex h-full flex-col justify-end bg-linear-to-br from-orange-500 via-rose-500 to-violet-600 text-white', t.deck]">
          <span :class="['font-black leading-none', t.title]">{{ slide.title }}</span>
          <span v-for="line in slide.lines" :key="line" :class="['mt-1 font-medium text-white/85', t.line]">{{ line }}</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}
</style>
