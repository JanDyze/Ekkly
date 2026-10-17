<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuth } from '../../composables/useAuth'

// Where the lost pages come from (views/NotFound.vue), behind a small "?" in
// the corner: the parable of the lost sheep, and the passage itself — in the
// church's own Bible for someone signed in to one, and online for anyone
// else, who has no Bible app to open it in. Both scenes have it, the lamb's
// (LostSheep) and YUNIT's (LostYunit). A tap elsewhere, or Escape, closes it.

const route = useRoute()
const { isAuthenticated } = useAuth()

const open = ref(false)
const box = ref(null)
const parable = computed(() =>
  route.meta.flock === 'church' && isAuthenticated.value ? { name: 'Bible', params: { slug: 'Luke', chapter: '15' }, query: { v: '3-7' } } : null
)
const PARABLE_ONLINE = 'https://www.biblegateway.com/passage/?search=Luke%2015%3A3-7&version=KJV'

const onOutside = (event) => {
  if (!box.value?.contains(event.target)) open.value = false
}
const onKey = (event) => {
  if (event.key === 'Escape') open.value = false
}
onMounted(() => {
  document.addEventListener('pointerdown', onOutside, true)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onOutside, true)
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div ref="box" class="absolute top-4 right-4 z-20">
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-full bg-white/55 text-base font-black text-(--scene-ink) ring-1 ring-white/70 backdrop-blur-md transition-colors hover:bg-white/80 dark:bg-gray-900/50 dark:ring-white/15 dark:hover:bg-gray-900/70"
      :aria-expanded="open"
      aria-label="Where this page comes from"
      title="Where this page comes from"
      @click="open = !open"
    >
      ?
    </button>
    <Transition enter-active-class="about-pop-in" leave-active-class="about-pop-out">
      <div
        v-if="open"
        class="absolute top-11 right-0 w-64 origin-top-right rounded-2xl bg-white p-4 text-left text-sm leading-relaxed text-gray-700 ring-1 ring-black/5 dark:bg-gray-800 dark:text-gray-200 dark:ring-white/10"
      >
        <p>Inspired by the parable of the lost sheep: the shepherd who leaves the ninety-nine to go after the one.</p>
        <RouterLink v-if="parable" :to="parable" class="mt-2 inline-block font-semibold text-primary hover:underline dark:text-primary-light">See Luke 15:3–7</RouterLink>
        <a v-else :href="PARABLE_ONLINE" target="_blank" rel="noopener" class="mt-2 inline-block font-semibold text-primary hover:underline dark:text-primary-light">See Luke 15:3–7</a>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.about-pop-in {
  animation: about-pop 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.about-pop-out {
  animation: about-pop 160ms ease-in reverse;
}
@keyframes about-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .about-pop-in,
  .about-pop-out {
    animation: none;
  }
}
</style>
