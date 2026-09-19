<script setup>
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight } from '../icons'
import { computed, ref, watch } from 'vue'
import { usePermissions } from '../composables/usePermissions'
import { allowedGroups } from '../data/navigation'
import { useAppSettings } from '../composables/useAppSettings'
import AppArt from './common/AppArt.vue'

const route = useRoute()
const router = useRouter()
const { can, isAdmin } = usePermissions()
const { church, logoUrl } = useAppSettings()
const isMinimized = ref(false)
const isHovered = ref(false)

const navGroups = computed(() =>
  allowedGroups(can, isAdmin.value).filter(
    (group) => group.items.length > 0
  )
)

// AppArt replays whenever this changes, so the icon of the page being opened
// animates and the other fifteen sit still. It starts at 0, which AppArt reads
// as "show finished": arriving on a page should not set the whole sidebar off,
// only moving between them should.
const playTick = ref(0)
watch(
  () => route.path,
  () => {
    playTick.value += 1
  }
)

// Plenty of churches fill both names in with the same thing, and a second line
// repeating the first is a line of the header spent saying nothing.
const showFullName = computed(() => {
  const full = (church.value.fullName || '').trim()
  return Boolean(full) && full.toLowerCase() !== (church.value.shortName || '').trim().toLowerCase()
})


const isActive = (path) => {
  if (path === '/') {
    return route.path === '/' || route.path === ''
  }
  return route.path.startsWith(path)
}

const navigate = (path) => {
  router.push(path)
}
</script>

<template>
  <aside 
    :class="[
      'group hidden lg:flex lg:flex-col relative bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 shadow-xl dark:shadow-2xl z-50 no-print',
      isMinimized ? 'lg:w-24' : 'lg:w-72'
    ]"
    style="overflow: visible;"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- Minimize Button.
         top-20 is deliberate: the button's right half sits over the main
         column, where the sticky Topbar (h-16 = 64px, z-70) paints. This aside
         is `relative z-50`, so it opens its own stacking context — the button's
         z-index is sealed inside and can never outrank the Topbar. Anything
         above 64px stays clear of it; top-8 put the button at 32-64px, fully
         inside the Topbar's band, which is what hid it. -->
    <button
      @click="isMinimized = !isMinimized"
      class="absolute right-0 top-20 z-50 w-8 h-8 rounded-full bg-white dark:bg-slate-800 text-primary dark:text-slate-300 shadow-md hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center justify-center border border-gray-200 dark:border-slate-700"
      :class="isHovered ? 'opacity-100' : 'opacity-0'"
      :style="`transform: translateX(50%); transition: opacity ${isHovered ? '0.3s' : '2s'} ease-in-out;`"
      aria-label="Toggle sidebar"
    >
      <ChevronLeft v-if="!isMinimized" class="h-4 w-4" />
      <ChevronRight v-else class="h-4 w-4" />
    </button>

    <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto no-scrollbar">
      <!-- Logo/Branding. Also the way back to the catalogue, which is not in
           the nav list below because it would then have to list itself. -->
      <button
        type="button"
        @click="navigate('/home')"
        aria-label="Home"
        class="flex items-center justify-center shrink-0 px-2 mb-8 overflow-hidden w-full"
      >
        <!-- No plate behind it: a church's logo is already a finished piece of
             artwork and framing it makes it look like a favicon. max-w and
             object-contain only stop a wide wordmark from stretching the
             header out of shape. -->
        <img :src="logoUrl" :alt="church.shortName" class="h-9 w-auto max-w-11 shrink-0 object-contain" />
        <!-- The wordmark collapses by max-width instead of v-if, so it narrows
             and fades over the same 300ms the aside spends resizing.
             Deliberately not flex-1: filling the row made the mark and the name
             read as two things at opposite ends of the header rather than one
             lockup, because the empty space landed between them. Sized to its
             own text instead, the pair sits together and the parent's
             justify-center centres them as one. Both lines truncate, so a long
             name shortens rather than shoving the mark against the edge. -->
        <div
          class="min-w-0 overflow-hidden transition-all duration-300 ease-in-out"
          :class="isMinimized ? 'max-w-0 opacity-0 ml-0' : 'max-w-[168px] opacity-100 ml-2.5'"
          :aria-hidden="isMinimized"
        >
          <h2 class="truncate text-base font-black leading-tight tracking-tight text-gray-900 dark:text-white">{{ church.shortName }}</h2>
          <p v-if="showFullName" class="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">{{ church.fullName }}</p>
        </div>
      </button>

      <!-- Navigation -->
      <nav class="flex-1 px-3 space-y-4">
        <div v-for="group in navGroups" :key="group.key" class="space-y-1">
          <!-- Minimized: a hairline stands in for the heading, so the groups
               stay legible when the labels are gone. The two share one slot and
               cross-fade rather than swapping via v-if/v-else, so collapsing
               never reflows the group spacing mid-animation: the <p> holds the
               natural height in both states and the hairline is an overlay. -->
          <div v-if="group.label" class="relative px-2.5 pb-0.5">
            <p
              class="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600 whitespace-nowrap overflow-hidden transition-opacity duration-300 ease-in-out"
              :class="isMinimized ? 'opacity-0' : 'opacity-100'"
            >
              {{ group.label }}
            </p>
            <div
              class="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-in-out"
              :class="isMinimized ? 'opacity-100' : 'opacity-0'"
              aria-hidden="true"
            >
              <div class="w-6 border-t border-gray-200 dark:border-slate-800"></div>
            </div>
          </div>
          <!-- No left accent edge on either state. On the highlighted row it
               was the accent drawn on the accent, so it never showed; on a
               hovered row it was a 4px grey tab, which is the one thing here
               that looked bolted on. The fill and the tile carry the state. -->
          <button
            v-for="item in group.items"
            :key="item.name"
            @click="navigate(item.path)"
            :class="[
              'group flex items-center justify-center p-2.5 text-sm font-semibold rounded-xl w-full transition-all relative',
              isActive(item.path)
                ? 'active text-white shadow-lg shadow-primary/20'
                : 'text-gray-500 dark:text-slate-400 hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
            ]"
            :title="isMinimized ? item.name : ''"
            :aria-label="item.name"
            :aria-current="isActive(item.path) ? 'page' : undefined"
          >
            <!-- The artwork is fixed multicolour: each app icon carries its own
                 gradients, in hues that owe nothing to the church's accent. Sat
                 straight on a highlighted row it fought whatever colour that
                 church chose — a blue-gradient icon on a red fill. So the tile
                 under it is always neutral, never the accent, which is the same
                 bargain a phone home screen strikes: every icon keeps its own
                 plate and they sit happily on any wallpaper.

                 Selected, the plate goes white and grows. White reads on any
                 accent at all, so no church can pick a colour this breaks. -->
            <span
              :class="[
                'app-tile grid shrink-0 place-items-center rounded-xl transition-all duration-300 ease-out',
                isActive(item.path)
                  ? 'app-tile-on h-11 w-11 bg-white shadow-sm'
                  : 'h-9 w-9 bg-gray-100 dark:bg-white/10',
                isMinimized ? 'mr-0' : 'mr-3',
              ]"
            >
              <!-- AppArt, not an <img>: the artwork's moving parts are inside
                   the SVG, and an <img> seals them off from CSS. Inlined, the
                   chosen page's icon plays the same little animation it plays
                   on the front door — the check drawing itself, the coins
                   stacking — once, as the page opens. -->
              <AppArt
                v-if="item.art"
                :app-key="item.art"
                :play="isActive(item.path) ? playTick : 0"
                :class="[
                  'shrink-0 transition-all duration-300 ease-out',
                  isActive(item.path) ? 'h-7 w-7' : 'h-5 w-5',
                ]"
              />
              <!-- A line icon inherits the row's colour, and the row's colour
                   is white when selected — which on a white plate would be
                   nothing at all. It gets its own, from the accent token. -->
              <component
                v-else
                :is="item.icon"
                :class="[
                  'shrink-0 transition-all duration-300 ease-out',
                  isActive(item.path) ? 'h-6 w-6 text-primary' : 'h-5 w-5 text-gray-500',
                ]"
              />
            </span>
            <!-- text-left because a <button> centres its text by default, and
                 flex-1 hands this span the whole remaining row. -->
            <span
              class="flex-1 min-w-0 text-left truncate whitespace-nowrap transition-all duration-300 ease-in-out"
              :class="isMinimized ? 'max-w-0 opacity-0' : 'max-w-[240px] opacity-100'"
            >{{ item.name }}</span>
          </button>
        </div>
      </nav>
    </div>
  </aside>
</template>

<style scoped>
nav button {
  background-color: transparent !important;
}

/* The accent tokens, not their values: a church's own colours (useBrandTheme)
   have to reach the highlighted page in the sidebar like everywhere else. */
nav button.active {
  background-color: var(--color-primary) !important;
}

nav button.active:hover {
  background-color: var(--color-primary-hover) !important;
}

nav button:hover:not(.active) {
  background-color: color-mix(in srgb, var(--color-primary) 5%, transparent) !important;
}

.dark nav button:hover:not(.active) {
  background-color: rgba(255, 255, 255, 0.05) !important;
}

/* The tile lifts once, as the page becomes the current one — the icon
   answering the tap. It rises into place and settles, rather than springing
   past and coming back: a thing with weight decelerates, and an overshoot on
   something this small reads as decoration. The growth itself is the class
   transition; this is only the kick that starts it. */
@keyframes app-tile-pop {
  from {
    transform: scale(0.88);
  }
  to {
    transform: scale(1);
  }
}

.app-tile-on {
  /* ease-out-quint: most of the movement is over early, so it lands rather
     than drifts. */
  animation: app-tile-pop 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

/* A row is hovered far more often than it is chosen, so the lift there is
   slight — enough to say the row is live, not enough to be a performance. */
nav button:hover:not(.active) .app-tile {
  transform: scale(1.06);
}

/* The same bargain the rest of the app strikes: anyone who has asked their
   system to stop animating gets the states without the movement. */
@media (prefers-reduced-motion: reduce) {
  .app-tile,
  .app-tile-on {
    animation: none;
    transform: none;
    transition: none;
  }
}
</style>