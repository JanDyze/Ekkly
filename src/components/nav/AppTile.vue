<script setup>
import AppArt from '../common/AppArt.vue'

// One app in the drawer's grid. Extracted because the drawer draws it in three
// places now — the dock, everything below it, and the search results — and
// three copies of a tile is how the two navs drifted apart in the first place.
defineProps({
  item: { type: Object, required: true },
  active: { type: Boolean, default: false },
  // The app chosen in the drawer, waiting for its Open button. A tap chooses
  // rather than goes, so the tile has to show which one is chosen.
  selected: { type: Boolean, default: false },
  // Change it to play the artwork's animation again, as AppArt does.
  play: { type: Number, default: 0 },
})
</script>

<template>
  <button
    type="button"
    :aria-current="active ? 'page' : undefined"
    :aria-pressed="selected"
    class="app-tile-button flex w-full flex-col items-center gap-1.5 rounded-xl px-0.5 py-0.5 transition-colors active:bg-gray-100 dark:active:bg-gray-700/50"
  >
    <span
      :class="[
        'app-tile-plate grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[1.15rem]',
        active ? 'app-tile-active' : 'app-tile',
        selected && 'app-tile-selected',
      ]"
    >
      <!-- AppArt, not an <img>, for the same reason as the sidebar: the
           artwork's moving parts are inside the SVG, and an <img> seals them
           off from CSS. -->
      <AppArt v-if="item.art" :app-key="item.art" :play="play" class="h-10 w-10" />
      <component v-else :is="item.icon" class="h-7 w-7" />
    </span>
    <span
      :class="[
        'line-clamp-2 w-full text-center text-[11px] leading-tight',
        active || selected
          ? 'font-semibold text-primary dark:text-primary-light'
          : 'font-medium text-gray-700 dark:text-gray-300',
      ]"
    >
      {{ item.name }}
    </span>
  </button>
</template>

<style scoped>
/* The tinted squircle behind an icon, and the deeper one for the page you are
   on. Scoped here now that the tile is its own component. */
.app-tile {
  background-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
}

.app-tile-active {
  background-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
  color: var(--color-primary);
  box-shadow:
    inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent),
    0 8px 18px -10px var(--color-primary);
}

/* The chosen app: a solid ring in the accent round the plate, and lifted a
   touch. Heavier than the page-you-are-on tint, because it is the thing the
   Open button below is about to act on. Declared after the two above so the
   ring wins over the current page's fainter one when both apply. */
.app-tile-selected {
  box-shadow: 0 0 0 2px var(--color-primary);
  transform: scale(1.04);
}

/* A phone has no hover, so the sidebar's hover lift becomes a press: the
   plate gives under the finger and comes back when it lifts. */
.app-tile-plate {
  transition:
    background-color 0.15s ease,
    transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.app-tile-button:active .app-tile-plate {
  transform: scale(0.92);
}

@media (prefers-reduced-motion: reduce) {
  .app-tile-plate {
    transition: none;
  }

  .app-tile-button:active .app-tile-plate {
    transform: none;
  }
}
</style>
