<script setup>
import { computed, ref } from 'vue'
import { CheckCircle, Download, Image, MoreVertical, Share2, Trash2, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import { ALBUMS, SUNDAY } from './photos'

// Scene: every photo, the whole screen. A photo from Sunday fills the
// screen; it is swiped on to the next, and the next, the count at the top
// keeping up; then the menu is opened and the photo is made the album's
// cover, as PhotoLightbox lets whoever looks after the gallery do.

const album = ALBUMS[0]
const index = ref(2)
const tapMore = ref(false)
const menu = ref(false)
const tapCover = ref(false)
const cover = ref(false)
const { at } = useSceneTimeline()

at(1200, () => (index.value = 3))
at(2100, () => (index.value = 4))
at(2800, () => (tapMore.value = true))
at(3000, () => (menu.value = true))
at(3500, () => (tapCover.value = true))
at(3800, () => {
  menu.value = false
  tapMore.value = false
  cover.value = true
})

const photo = computed(() => SUNDAY[index.value])
</script>

<template>
  <div class="relative flex h-full flex-col rounded-[28px] bg-black text-white">
    <div class="st-rise flex shrink-0 items-center gap-1 px-2 pb-2 pt-4">
      <span class="flex size-10 items-center justify-center text-white/80"><X class="size-5" /></span>
      <span class="ml-1 text-sm font-medium tabular-nums text-white/70">{{ index + 1 }} / {{ SUNDAY.length }}</span>
      <span class="ml-auto flex items-center gap-1">
        <span class="flex size-10 items-center justify-center text-white/80"><Share2 class="size-5" /></span>
        <span class="flex size-10 items-center justify-center text-white/80"><Download class="size-5" /></span>
        <span :class="['relative flex size-10 items-center justify-center rounded-full text-white/80', tapMore ? 'st-tap bg-white/10' : '']">
          <MoreVertical class="size-5" />
        </span>
      </span>
    </div>

    <div class="relative flex min-h-0 flex-1 items-center justify-center">
      <Transition name="lightbox-photo">
        <img :key="index" :src="photo" alt="" class="absolute aspect-4/3 w-full object-cover" />
      </Transition>
    </div>

    <div class="shrink-0 px-4 pb-6 pt-2">
      <p class="truncate text-sm font-semibold">{{ album.title }}</p>
      <p class="truncate text-xs text-white/60">{{ album.long }} · {{ album.place }}</p>
    </div>

    <!-- The menu, under the button that opened it. -->
    <div
      v-if="menu"
      class="st-pop absolute right-2 top-[60px] w-48 rounded-xl border border-gray-200 bg-white py-1 text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
    >
      <span :class="['relative flex items-center gap-2.5 px-3 py-2.5 text-sm', tapCover ? 'st-tap bg-gray-100 text-primary dark:bg-gray-700 dark:text-primary-light' : '']">
        <Image class="size-4 shrink-0 text-gray-400" />
        Use as cover
      </span>
      <span class="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 dark:text-red-400">
        <Trash2 class="size-4 shrink-0" />
        Delete photo
      </span>
    </div>

    <!-- What the app says once it is done. -->
    <span
      v-if="cover"
      class="st-pop absolute inset-x-4 bottom-20 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm font-medium text-gray-900 dark:bg-gray-800 dark:text-white"
    >
      <CheckCircle class="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      Cover updated
    </span>
  </div>
</template>

<style scoped>
/* One photo gives way to the next in place, never sliding past the screen's
   edge as a real swipe would. */
.lightbox-photo-enter-active {
  animation: lightbox-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.lightbox-photo-leave-active {
  animation: lightbox-out 0.3s ease both;
}

@keyframes lightbox-in {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
}
@keyframes lightbox-out {
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lightbox-photo-enter-active,
  .lightbox-photo-leave-active {
    animation: none;
  }
}
</style>
