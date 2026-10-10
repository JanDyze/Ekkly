<script setup>
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { House, SquaresFour } from '../icons'
import AppArt from './common/AppArt.vue'
import AppsDrawer from './appframe/AppsDrawer.vue'
import { allowedGroups } from '../data/navigation'
import { usePermissions } from '../composables/usePermissions'
import { useAppOrder } from '../composables/useAppOrder'

// The bottom bar, for whoever turned it on in Preferences (useBottomBar): the
// home, the first three apps they keep on it, and every app behind More. A
// quicker way between the apps someone uses all day than going back through
// the home each time.
//
// It holds the same apps as the home, in the same order (useAppOrder), so
// rearranging the home rearranges the bar: there is one arrangement, not two
// to keep in step. Each app wears its own artwork, small, as it does on the
// home; the one you are in is marked by a pill behind it and its name in the
// church's colour.

const SLOTS = 3

const route = useRoute()
const { can, isAdmin } = usePermissions()

const allApps = computed(() => allowedGroups(can, isAdmin.value).flatMap((group) => group.items))
const { ordered } = useAppOrder(allApps)
const apps = computed(() => ordered.value.slice(0, SLOTS))

const showDrawer = ref(false)

const onHome = computed(() => route.path === '/home')
const isIn = (item) => route.path === item.path || route.path.startsWith(`${item.path}/`)
// More is lit when you are in an app that is not on the bar.
const inOther = computed(() => !onHome.value && !apps.value.some(isIn) && allApps.value.some(isIn))

const slot = 'flex min-w-0 flex-col items-center justify-center gap-0.5 py-1.5'
const pill = (active) => [
  'flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200',
  active ? 'bg-primary/12 dark:bg-primary-light/18' : '',
]
const label = (active) => [
  'max-w-full truncate px-1 text-[10px] font-semibold',
  active ? 'text-primary dark:text-primary-light' : 'text-gray-500 dark:text-gray-400',
]
</script>

<template>
  <nav
    class="grid shrink-0 grid-cols-5 border-t border-gray-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden dark:border-gray-800 dark:bg-gray-900/95 no-print"
    aria-label="Quick apps"
  >
    <RouterLink to="/home" :class="slot" :aria-current="onHome ? 'page' : undefined">
      <span :class="pill(onHome)">
        <House class="size-6 text-gray-600 dark:text-gray-300" :class="onHome ? 'text-primary! dark:text-primary-light!' : ''" />
      </span>
      <span :class="label(onHome)">Home</span>
    </RouterLink>

    <RouterLink
      v-for="item in apps"
      :key="item.path"
      :to="item.path"
      :class="slot"
      :aria-current="isIn(item) ? 'page' : undefined"
    >
      <span :class="pill(isIn(item))">
        <AppArt :app-key="item.art" class="size-6" />
      </span>
      <span :class="label(isIn(item))">{{ item.short || item.name }}</span>
    </RouterLink>

    <button type="button" :class="slot" aria-label="More apps" @click="showDrawer = true">
      <span :class="pill(inOther)">
        <SquaresFour class="size-6 text-gray-600 dark:text-gray-300" :class="inOther ? 'text-primary! dark:text-primary-light!' : ''" />
      </span>
      <span :class="label(inOther)">More</span>
    </button>
  </nav>

  <AppsDrawer :show="showDrawer" :apps="allApps" @close="showDrawer = false" />
</template>
