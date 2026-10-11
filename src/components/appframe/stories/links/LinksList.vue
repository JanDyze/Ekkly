<script setup>
import { computed, ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import LinksBar from './LinksBar.vue'
import LinksRow from './LinksRow.vue'
import { CATEGORIES, CATEGORY_STYLE, LINKS, grouped } from './links'

// Scene: every link the church hands out, in one place. The links arrive
// grouped by category; the filter is opened, Resource is chosen, and the list
// comes down to the giving details and the song sheets, the two things people
// ask for on a Sunday.

// As many links as the screen holds before the filter narrows them.
const FITS = 4

const tapFilter = ref(false)
const open = ref(false)
const picked = ref(null)
const filter = ref('All')
const { at } = useSceneTimeline()

at(1700, () => (tapFilter.value = true))
at(1900, () => (open.value = true))
at(2700, () => (picked.value = 'Resource'))
at(3000, () => {
  open.value = false
  tapFilter.value = false
  filter.value = 'Resource'
})

const groups = computed(() => grouped(filter.value === 'All' ? LINKS.slice(0, FITS) : LINKS.filter((l) => l.category === filter.value)))
</script>

<template>
  <div class="relative h-full px-2 pt-5">
    <LinksBar class="st-rise" :filter="filter" :tap-filter="tapFilter" />

    <TransitionGroup tag="div" name="links-list" class="relative mt-2">
      <section v-for="(g, i) in groups" :key="g.category" class="st-rise" :style="{ '--d': `${150 + i * 150}ms` }">
        <div class="flex items-center gap-2 py-2">
          <span :class="['rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', CATEGORY_STYLE[g.category]]">{{ g.category }}</span>
          <span class="text-xs font-medium text-gray-400 dark:text-gray-500">{{ g.items.length }}</span>
        </div>
        <LinksRow v-for="link in g.items" :key="link.id" :link="link" />
      </section>
    </TransitionGroup>

    <!-- The categories, under the filter that opened them. -->
    <div
      v-if="open"
      class="st-pop absolute right-14 top-[72px] z-10 w-44 rounded-xl border border-gray-100 bg-white py-1.5 dark:border-gray-700 dark:bg-gray-800"
    >
      <span
        v-for="cat in CATEGORIES.slice(0, 5)"
        :key="cat"
        :class="[
          'relative block px-4 py-2 text-sm font-semibold',
          picked === cat ? 'st-tap bg-primary/5 text-primary dark:text-primary-light' : cat === filter ? 'bg-primary/5 text-primary dark:text-primary-light' : 'text-gray-600 dark:text-gray-300',
        ]"
      >
        {{ cat }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.links-list-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.2s ease;
}
.links-list-leave-to {
  opacity: 0;
}
.links-list-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
