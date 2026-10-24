<script>
// How many rails are on the page, across every screen: the one arriving and
// the one leaving overlap for a moment, so the width is held while any is.
let rails = 0
const railCount = (by) => {
  rails = Math.max(0, rails + by)
  document.documentElement.style.setProperty('--app-rail', rails ? '18rem' : '0px')
}
</script>

<script setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import CardPanes from './CardPanes.vue'
import HomeCard from '../home/HomeCard.vue'
import { usePermissions } from '../../composables/usePermissions'
import { NAV_ITEMS } from '../../data/navigation'
import { sectionHue } from '../../data/appHues'

// Down the left of an app's section on a desktop: the way home to the app,
// in the church's colour as its home's main card is, and every section of the
// app under it as the same cards its home shows them as, the one open now
// marked. The home of all apps keeps its apps down its sidebar the same way
// (Apps.vue), so on a screen with the room for it, going from one section to
// the next is one click rather than back to the app's home and in again.
//
// It reads the sections off the app's own routes — every screen one step in
// that has a title (meta.title, meta.art) and that this person may open —
// so a new section shows here by being routed, with nothing to keep in step.
// A screen further in (a record, a Sunday) marks the section it belongs to,
// the one whose drawing it borrows. An app with fewer than two sections has
// nowhere to go between, and draws no rail.
//
// Its cards never carry the morph keys a home's tiles do: a section's name
// flies into its header from the tile that opened it (router/viewTransitions.js),
// and a second card with the same key would catch it on the way.

const route = useRoute()
const { can } = usePermissions()

const app = computed(() => route.matched.find((record) => record.meta?.frame === 'app') || null)
const appPath = computed(() => (app.value ? `/${String(app.value.path).replace(/^\//, '')}` : ''))
const appItem = computed(() => NAV_ITEMS.find((item) => item.path === appPath.value) || null)
const home = computed(() => app.value?.children?.find((child) => child.meta?.depth === 0) || null)

const sections = computed(() =>
  (app.value?.children || [])
    .filter((child) => child.name && child.meta?.depth === 1 && child.meta?.title)
    .filter((child) => !child.meta.capability || can(child.meta.capability))
    // Someone let into one screen of an app only (meta.mine, "My tasks")
    // is not shown the sections the app's own capability keeps from them.
    .filter((child) => child.meta.mine || !app.value.meta?.capability || can(app.value.meta.capability))
    .map((child, index) => ({
      key: child.name,
      to: { name: child.name },
      hue: sectionHue(index),
      card: { path: `rail:${child.name}`, name: child.meta.title, art: child.meta.art || '' },
      art: child.meta.art || '',
    }))
)

// The section open now: this screen, or the one whose drawing it borrows.
const current = computed(() => {
  const here = sections.value.find((section) => section.key === route.name)
  if (here) return here.key
  return sections.value.find((section) => section.art && section.art === route.meta?.art)?.key || null
})

const shown = computed(() => Boolean(app.value && home.value && sections.value.length >= 2))

// What floats over a section rather than scrolling in it (People's search
// dock, the bar under Add people) is placed against the whole window, not the
// screen beside the rail, and would sit off to the left of the column it
// belongs to. So the rail's width is said on the page, as --app-rail, for
// them to step aside by on a desktop (`lg:left-(--app-rail)`). Counted, not
// set and cleared: the next screen's rail arrives before the last one leaves.
watch(shown, (on, was) => railCount(Number(Boolean(on)) - Number(Boolean(was))), { immediate: true })
onBeforeUnmount(() => shown.value && railCount(-1))
</script>

<template>
  <aside v-if="shown" class="no-print hidden h-full w-72 shrink-0 flex-col gap-4 py-5 pl-5 lg:flex" :aria-label="appItem?.name || 'Sections'">
    <!-- The way home to the app: its drawing on white, its name, in the
         church's colour over Ekkly's panes of light, as its home's card. -->
    <RouterLink
      :to="{ name: home.name }"
      class="rail-hero relative isolate flex shrink-0 items-center gap-3 overflow-hidden rounded-[24px] border border-black/15 p-3.5 text-white transition-colors hover:border-black/35 dark:border-black/40"
    >
      <span class="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden="true">
        <CardPanes />
      </span>
      <span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-black/10">
        <AppArt :app-key="app.meta.art" class="size-8" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block truncate text-base font-bold tracking-tight">{{ appItem?.name || 'Home' }}</span>
        <span class="block truncate text-xs text-white/80">Back to its home</span>
      </span>
    </RouterLink>

    <nav
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-white ring-1 ring-black/5 dark:bg-gray-800/70 dark:ring-white/10"
      aria-label="Sections"
    >
      <h2 class="shrink-0 border-b border-gray-100 px-5 pt-2.5 pb-2 text-sm font-semibold text-gray-900 dark:border-white/10 dark:text-white">Sections</h2>
      <div class="flex min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain p-3 [scrollbar-width:thin]">
        <HomeCard
          v-for="section in sections"
          :key="section.key"
          :as="RouterLink"
          :to="section.to"
          variant="compact"
          section
          :card="section.card"
          :aria-current="section.key === current ? 'page' : undefined"
          :class="section.key === current ? 'rail-current' : ''"
          :style="{ '--hue': section.hue }"
        />
      </div>
    </nav>
  </aside>
</template>

<style scoped>
.rail-hero {
  background-color: var(--color-primary);
}
.dark .rail-hero {
  background-color: color-mix(in oklab, var(--color-primary) 55%, black);
}

/* The section open now: ringed in its own colour, a ring the card's own
   hairline cannot hide (that is a shadow; this is an outline). */
.rail-current {
  outline: 2px solid var(--hue);
  outline-offset: 1px;
}
</style>
