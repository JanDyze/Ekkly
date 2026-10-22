<script setup>
import { computed } from 'vue'
import { Check, Eye } from '../../icons'
import { OPTIONAL_PANELS, useHomeLayout } from '../../composables/useHomeLayout'
import { usePermissions } from '../../composables/usePermissions'
import { isAppEnabled } from '../../composables/useChurchApps'
import { useHomeChurch } from '../../composables/useHomeChurch'

// "Show on my home": the panels of the desktop home someone may have or not
// (useHomeLayout's OPTIONAL_PANELS), as a row of switches under Home layout,
// in the account menu (Topbar) and the people drawer's preferences
// (RightSidebar). A chip each rather than a row each, so ten choices take a
// few lines of a menu that is already long.
//
// Only the panels this person may open (a panel's capability, or YUNIT's
// app), and no more than the board holds: three a column, YUNIT among them
// (HomeBoard's CARDS), in the middle and on the right, and on the left only
// the day and the apps (useHomeLayout's arrangeHome) — eight. The page grows
// to hold them (each panel as tall as its rows), so the eight is how many
// stay tidy, not how many fit a screen. The day, the apps and what needs
// attention are always three of them; once the rest are taken, the chips
// that are off say so rather than turn on a panel with nowhere to stand.
//
// Only on a desktop, where the panels are: the phone's home is a deck.

const BOARD = 8
const ALWAYS = 3

const { isShown, setShown } = useHomeLayout()
const { can } = usePermissions()

// The church on its hill is a picture, not a panel (useHomeChurch, the same
// switch as Preferences' "Church picture"), but it is the first thing someone
// would take off a busy home, so it is offered here with the panels. It takes
// no card's room, so the board being full never stops it coming back.
const { homeChurch, setHomeChurch } = useHomeChurch()

const offered = computed(() =>
  OPTIONAL_PANELS.filter((panel) => (panel.capability ? can(panel.capability) : panel.app ? isAppEnabled(panel.app) : true))
)

const taken = computed(() => ALWAYS + offered.value.filter((panel) => isShown(panel.key)).length)
const full = computed(() => taken.value >= BOARD)
const blocked = (panel) => full.value && !isShown(panel.key)
</script>

<template>
  <div class="hidden px-2.5 pt-1 pb-2 lg:block">
    <p class="mb-1.5 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
      <Eye class="size-4 shrink-0 text-primary dark:text-primary-light" />
      Show on my home
    </p>
    <div class="flex flex-wrap gap-1.5 pl-6.5">
      <button
        v-for="panel in offered"
        :key="panel.key"
        type="button"
        role="switch"
        :aria-checked="isShown(panel.key)"
        :disabled="blocked(panel)"
        :class="[
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40',
          isShown(panel.key)
            ? 'bg-primary/10 text-primary ring-primary/25 dark:bg-primary-light/15 dark:text-primary-light dark:ring-primary-light/30'
            : 'bg-transparent text-gray-400 ring-gray-200 hover:text-gray-600 dark:text-gray-500 dark:ring-gray-700 dark:hover:text-gray-300',
        ]"
        @click="setShown(panel.key, !isShown(panel.key))"
      >
        <Check v-if="isShown(panel.key)" class="size-3" />
        {{ panel.label }}
      </button>
      <button
        type="button"
        role="switch"
        :aria-checked="homeChurch"
        :class="[
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors',
          homeChurch
            ? 'bg-primary/10 text-primary ring-primary/25 dark:bg-primary-light/15 dark:text-primary-light dark:ring-primary-light/30'
            : 'bg-transparent text-gray-400 ring-gray-200 hover:text-gray-600 dark:text-gray-500 dark:ring-gray-700 dark:hover:text-gray-300',
        ]"
        @click="setHomeChurch(!homeChurch)"
      >
        <Check v-if="homeChurch" class="size-3" />
        Church picture
      </button>
    </div>
    <p v-if="full" class="mt-1.5 pl-6.5 text-[11px] text-gray-400 dark:text-gray-500">
      Your home is full. Turn one off to add another.
    </p>
  </div>
</template>
