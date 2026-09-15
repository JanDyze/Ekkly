<script setup>
import { Home, MagnifyingGlass, ProjectorScreen } from '../../icons'
import { appIcon } from './appIcons'
import ChurchMark from './ChurchMark.vue'
import ScaledScreen from './ScaledScreen.vue'

// Ekkly as it looks on a computer, for the hero's computer scenes: the sidebar
// down the left, a bar across the top, and the page in the rest. A scene fills
// the page through the default slot, in a 472 by 280 space.

const props = defineProps({
  // The page in the top bar.
  page: { type: String, required: true },
  // The line under it; the church's name, usually.
  subtitle: { type: String, default: 'Grace Fellowship' },
  // The sidebar's highlighted page, one of NAV's keys.
  active: { type: String, default: 'home' },
  // The church's logo at the top of the sidebar (ChurchMark's keys), or ''
  // for a church without one, which shows its first letter instead.
  logo: { type: String, default: 'grace' },
  initial: { type: String, default: 'G' },
  // The church the visitor named in the welcome, if they did. It has no logo,
  // so its first letter stands in, the way it would in the app.
  church: { type: String, default: '' },
})

const NAV = [
  { key: 'home', icon: Home },
  { key: 'members', icon: appIcon('members') },
  { key: 'attendance', icon: appIcon('attendance') },
  { key: 'lineups', icon: appIcon('lineups') },
  { key: 'present', icon: ProjectorScreen },
  { key: 'minutes', icon: appIcon('minutes') },
  { key: 'apps', icon: appIcon('links') },
]
</script>

<template>
  <ScaledScreen>
    <div class="flex h-full">
      <nav class="flex w-13 shrink-0 flex-col items-center gap-1.5 border-r border-gray-100 bg-gray-50 py-2.5 dark:border-gray-800 dark:bg-gray-950">
        <span class="mb-1.5 h-8 w-8 text-[13px]">
          <ChurchMark :church="props.church.trim() ? '' : logo" :initial="props.church.trim() ? props.church.trim()[0] : initial" />
        </span>
        <span
          v-for="item in NAV"
          :key="item.key"
          :class="[
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300',
            item.key === active ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light' : 'text-gray-400',
          ]"
        >
          <component :is="item.icon" class="h-4 w-4" />
        </span>
      </nav>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex h-10 shrink-0 items-center gap-2 border-b border-gray-100 px-3 dark:border-gray-800">
          <div class="min-w-0">
            <p class="text-[12px] font-bold leading-tight text-gray-900 dark:text-white">{{ page }}</p>
            <Transition name="app-swap" mode="out-in">
              <p :key="subtitle" class="truncate text-[9px] leading-tight text-gray-400">{{ subtitle }}</p>
            </Transition>
          </div>
          <span class="ml-auto flex h-6 w-28 items-center gap-1.5 rounded-md bg-gray-100 px-2 text-[10px] text-gray-400 dark:bg-gray-800">
            <MagnifyingGlass class="h-3 w-3" /> Search
          </span>
          <span class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-[9px] font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">AR</span>
        </header>
        <div class="relative min-h-0 flex-1 overflow-hidden bg-gray-50/60 p-3 dark:bg-gray-900">
          <slot />
        </div>
      </div>
    </div>
  </ScaledScreen>
</template>

<style scoped>
.app-swap-enter-active,
.app-swap-leave-active {
  transition: opacity 0.2s ease, filter 0.2s ease;
}

.app-swap-enter-from,
.app-swap-leave-to {
  opacity: 0;
  filter: blur(4px);
}
</style>
