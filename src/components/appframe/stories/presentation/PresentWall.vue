<script setup>
// What the congregation sees: the wall, drawn as the booth's preview draws it
// — black, sixteen by nine, the words centred and bold in white, and the
// faint word Blank when nothing is up. A new slide fades in over the last.

defineProps({
  // The lines on the wall, or empty for a blank screen.
  lines: { type: Array, default: () => [] },
  // Under a reading, where it is from.
  reference: { type: String, default: '' },
})
</script>

<template>
  <div class="relative flex aspect-video w-full items-center justify-center rounded-xl bg-black p-4 text-center">
    <Transition name="wall" mode="out-in">
      <div v-if="lines.length" :key="lines.join('|')" class="w-full font-bold leading-tight text-white">
        <p v-for="line in lines" :key="line" class="text-[13px]">{{ line }}</p>
        <p v-if="reference" class="mt-1.5 text-[10px] font-semibold text-white/60">{{ reference }}</p>
      </div>
      <p v-else key="blank" class="text-[10px] font-bold uppercase tracking-widest text-white/20">Blank</p>
    </Transition>
  </div>
</template>

<style scoped>
.wall-enter-active,
.wall-leave-active {
  transition: opacity 0.25s ease;
}
.wall-enter-from,
.wall-leave-to {
  opacity: 0;
}
</style>
