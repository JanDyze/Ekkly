<script setup>
import { ref } from 'vue'
import { CheckCircle, Copy, ExternalLink, Pencil, Trash2 } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import LinksBar from './LinksBar.vue'
import LinksRow from './LinksRow.vue'
import { CATEGORY_STYLE, LINKS, grouped } from './links'

// Scene: a link handed on in a tap. The livestream's actions are opened from
// its row; the sheet names it and where it goes, Copy link is pressed, and
// the row's button shows a tick while the page says it is copied, ready to
// paste into the church's group chat.

const live = LINKS[0]
// As many links as the screen holds, never more.
const groups = grouped(LINKS.slice(0, 3))

const tapMore = ref(false)
const open = ref(false)
const tapCopy = ref(false)
const copied = ref(false)
const { at } = useSceneTimeline()

at(1100, () => (tapMore.value = true))
at(1350, () => (open.value = true))
at(2400, () => (tapCopy.value = true))
at(2700, () => {
  open.value = false
  tapMore.value = false
  copied.value = true
})
</script>

<template>
  <div class="relative h-full px-2 pt-5">
    <LinksBar class="st-rise" />
    <div class="mt-2">
      <section v-for="(g, i) in groups" :key="g.category" class="st-rise" :style="{ '--d': `${120 + i * 150}ms` }">
        <div class="flex items-center gap-2 py-2">
          <span :class="['rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', CATEGORY_STYLE[g.category]]">{{ g.category }}</span>
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ g.items.length }}</span>
        </div>
        <LinksRow v-for="link in g.items" :key="link.id" :link="link" :tap-more="tapMore && link.id === live.id" :copied="copied && link.id === live.id" />
      </section>
    </div>

    <Transition name="links-actions">
      <div v-if="open" class="absolute inset-0 z-10 flex flex-col justify-end">
        <div class="absolute inset-0 rounded-[28px] bg-black/50" />
        <div class="links-actions-panel relative rounded-b-[28px] rounded-t-2xl border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-700">
            <span class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900">
              <component :is="live.icon" class="size-5" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold">{{ live.title }}</span>
              <span class="block truncate text-xs text-gray-500 dark:text-gray-400">youtube.com</span>
            </span>
          </div>
          <div class="p-2 pb-4">
            <span class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              <ExternalLink class="size-4 shrink-0 text-gray-400" /> Open link
            </span>
            <span
              :class="[
                'relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-200',
                tapCopy ? 'st-tap bg-gray-100 dark:bg-gray-700/60' : '',
              ]"
            >
              <Copy class="size-4 shrink-0 text-gray-400" /> Copy link
            </span>
            <div class="my-1 h-px bg-gray-100 dark:bg-gray-700" />
            <span class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Pencil class="size-4 shrink-0 text-gray-400" /> Edit
            </span>
            <span class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-600 dark:text-red-400">
              <Trash2 class="size-4 shrink-0" /> Delete
            </span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- What the page says once it is copied. -->
    <span
      v-if="copied"
      class="st-pop absolute inset-x-4 bottom-5 flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
    >
      <CheckCircle class="size-5 shrink-0 text-emerald-400 dark:text-emerald-600" />
      Link copied
    </span>
  </div>
</template>

<style scoped>
.links-actions-enter-active {
  animation: links-actions-fade 0.25s ease both;
}
.links-actions-leave-active {
  animation: links-actions-fade 0.2s ease reverse both;
}
.links-actions-enter-active .links-actions-panel {
  animation: links-actions-grow 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.links-actions-leave-active .links-actions-panel {
  animation: links-actions-grow 0.2s ease reverse both;
}
.links-actions-panel {
  transform-origin: bottom center;
}

@keyframes links-actions-fade {
  from {
    opacity: 0;
  }
}
@keyframes links-actions-grow {
  from {
    transform: scale(0.94);
  }
}

@media (prefers-reduced-motion: reduce) {
  .links-actions-enter-active,
  .links-actions-leave-active,
  .links-actions-enter-active .links-actions-panel,
  .links-actions-leave-active .links-actions-panel {
    animation: none;
  }
}
</style>
