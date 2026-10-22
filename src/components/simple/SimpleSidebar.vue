<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { House, X } from '../../icons'
import AppArt from '../common/AppArt.vue'
import { allowedGroups } from '../../data/navigation'
import { usePermissions } from '../../composables/usePermissions'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { simpleNavOpen } from '../../composables/useSimpleView'
import { useAppSettings } from '../../composables/useAppSettings'

// Simple view's way round Ekkly (useSimpleView): a sidebar, as most systems
// people already know have one. Home, then every app this person may open,
// under the same headings and in the same order as everywhere else
// (navigation.js, the one source of the apps), and under the app open now its
// sections, read off its routes the way the app's rail reads them (AppRail).
//
// Down the left of every page on a desktop; on a phone, a drawer the top
// bar's menu button opens (simpleNavOpen).

const route = useRoute()
// The church whose Ekkly this is, at the head of the list, as a system
// names itself at the top of its sidebar.
const { church, logoUrl } = useAppSettings()
const { can, isAdmin } = usePermissions()

const groups = computed(() => allowedGroups(can, isAdmin.value))

// The app open now, and its sections (any screen one step in with a title).
const app = computed(() => route.matched.find((record) => record.meta?.frame === 'app') || null)
const appPath = computed(() => (app.value ? `/${String(app.value.path).replace(/^\//, '')}` : ''))
const sections = computed(() =>
  (app.value?.children || [])
    .filter((child) => child.name && child.meta?.depth === 1 && child.meta?.title)
    .filter((child) => !child.meta.capability || can(child.meta.capability))
    .map((child) => ({ key: child.name, name: child.meta.title, to: { name: child.name }, art: child.meta.art || '' }))
)

const isOpenApp = (item) => item.path === appPath.value || route.path === item.path || route.path.startsWith(`${item.path}/`)

// The section open now: this screen, or the one whose drawing it borrows.
const currentSection = computed(() => {
  if (sections.value.some((section) => section.key === route.name)) return route.name
  return sections.value.find((section) => section.art && section.art === route.meta?.art)?.key || null
})

/* ------------------------------------------------------- the phone's drawer */

const panel = ref(null)
const close = () => (simpleNavOpen.value = false)
useFocusTrap(panel, simpleNavOpen, close)
watch(() => route.fullPath, close)

const ITEM = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors'
const IDLE = 'text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/5 dark:hover:text-white'
const ACTIVE = 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light'
</script>

<template>
  <!-- The list itself, drawn in both places. -->
  <template v-for="place in ['desk', 'drawer']" :key="place">
    <div
      v-if="place === 'desk' || simpleNavOpen"
      :class="place === 'desk' ? 'hidden w-64 shrink-0 lg:flex' : 'fixed inset-0 z-[120] flex lg:hidden'"
    >
      <!-- The phone's backdrop. -->
      <div v-if="place === 'drawer'" class="absolute inset-0 bg-black/40" aria-hidden="true" @click="close" />

      <nav
        :ref="place === 'drawer' ? (el) => (panel = el) : undefined"
        aria-label="Apps"
        :class="[
          'relative flex h-full w-64 flex-col overflow-y-auto overscroll-contain border-r border-gray-200 bg-white px-3 py-4 [scrollbar-width:thin] dark:border-gray-800 dark:bg-gray-900',
          place === 'drawer' ? 'max-w-[85vw] pt-[max(1rem,env(safe-area-inset-top))]' : '',
        ]"
      >
        <button
          v-if="place === 'drawer'"
          type="button"
          class="mb-2 ml-auto flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
          aria-label="Close menu"
          @click="close"
        >
          <X class="size-5" />
        </button>

        <!-- Whose this is: the church's mark and name, leading home. -->
        <RouterLink to="/home" class="mb-4 flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
          <img v-if="logoUrl" :src="logoUrl" alt="" class="h-9 w-9 shrink-0 object-contain" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-bold text-gray-900 dark:text-white">{{ church.shortName }}</span>
            <span v-if="church.name && church.name !== church.shortName" class="block truncate text-xs text-gray-500 dark:text-gray-400">{{ church.name }}</span>
          </span>
        </RouterLink>

        <RouterLink to="/home" :class="[ITEM, route.path === '/home' ? ACTIVE : IDLE]">
          <House class="size-5 shrink-0" />
          Home
        </RouterLink>

        <div v-for="group in groups" :key="group.key" class="mt-4">
          <p v-if="group.label" class="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ group.label }}
          </p>
          <template v-for="item in group.items" :key="item.path">
            <RouterLink :to="item.path" :class="[ITEM, isOpenApp(item) && !currentSection ? ACTIVE : isOpenApp(item) ? 'text-gray-900 dark:text-white' : IDLE]">
              <!-- Ekkly's own drawing of the app, flat in one colour (AppArt's
                   flat), so the list reads as one set; its icon where it has none. -->
              <AppArt v-if="item.art" :app-key="item.art" flat class="size-5 shrink-0" />
              <component :is="item.icon" v-else class="size-5 shrink-0" />
              <span class="truncate">{{ item.name }}</span>
            </RouterLink>
            <!-- The open app's sections, under it, unfolding as the app opens
                 and folding away as you leave it (sub-*, below): a grid row
                 eased from nothing to its full height, so it opens to exactly
                 as tall as its sections with nothing measured. -->
            <Transition name="sub">
              <div v-if="isOpenApp(item) && sections.length" class="grid grid-rows-[1fr]">
                <div class="min-h-0 overflow-hidden">
                  <div class="mb-1 ml-5 mt-0.5 flex flex-col gap-0.5 border-l border-gray-200 pl-3 dark:border-gray-800">
                    <RouterLink
                      v-for="section in sections"
                      :key="section.key"
                      :to="section.to"
                      :class="['rounded-lg px-3 py-1.5 text-sm transition-colors', currentSection === section.key ? ACTIVE + ' font-semibold' : IDLE]"
                    >
                      {{ section.name }}
                    </RouterLink>
                  </div>
                </div>
              </div>
            </Transition>
          </template>
        </div>
      </nav>
    </div>
  </template>
</template>

<style scoped>
/* An app's sections unfolding under it: the row grows from nothing to its
   own height, fading in as it goes, and folds back the same way. */
.sub-enter-active,
.sub-leave-active {
  transition:
    grid-template-rows 0.28s cubic-bezier(0.2, 0, 0, 1),
    opacity 0.22s ease;
}

.sub-enter-from,
.sub-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sub-enter-active,
  .sub-leave-active {
    transition: none;
  }
}
</style>
