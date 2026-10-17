<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Check } from '../../icons'
import { useQuickActions } from '../../composables/useQuickActions'

// The back of the desktop's day card: its quick actions, the card turned
// over to show them (Apps.vue) rather than a menu hanging off it. White on
// the church's colour, as the front is: each action a pill opening its place,
// two across; "Edit" turns them into the whole list of what this person may
// do, ticked on or off, saved to their account as they go (useQuickActions),
// scrolling inside the card if it is longer than the card.
//
// Clear of the card's top right corner, where the button that turns it back
// stands. Labels run to two lines rather than being cut off.

const { actions, available, chosen, isDefault, setMine, toggle, max } = useQuickActions()
const editing = ref(false)
const full = (key) => !chosen.value.includes(key) && chosen.value.length >= max
</script>

<template>
  <div class="flex h-full min-h-0 flex-col text-white">
    <div class="flex shrink-0 items-center justify-between gap-2 pr-10">
      <p class="text-[13px] font-semibold">{{ editing ? `Choose up to ${max}` : 'Start something' }}</p>
      <div class="flex items-center gap-1">
        <button
          v-if="editing && !isDefault"
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white/80 hover:bg-white/15 hover:text-white"
          @click="setMine(null)"
        >
          Defaults
        </button>
        <button
          v-if="available.length"
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-semibold text-white/90 hover:bg-white/15 hover:text-white"
          :aria-pressed="editing"
          @click="editing = !editing"
        >
          {{ editing ? 'Done' : 'Edit' }}
        </button>
      </div>
    </div>

    <ul v-if="!editing" class="mt-2.5 grid min-h-0 grid-cols-2 content-start gap-1.5">
      <li v-for="action in actions" :key="action.key" class="min-w-0">
        <RouterLink
          :to="action.to"
          class="flex h-full min-w-0 items-center gap-2 rounded-xl bg-white/15 px-2.5 py-1.5 text-[12.5px] leading-tight font-semibold ring-1 ring-white/20 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white"
        >
          <component :is="action.icon" class="size-4 shrink-0" />
          <span class="line-clamp-2">{{ action.label }}</span>
        </RouterLink>
      </li>
      <li v-if="!actions.length" class="col-span-2 text-sm text-white/80">None chosen yet. Edit to choose some.</li>
    </ul>

    <ul v-else role="group" aria-label="Choose quick actions" class="mt-2 max-h-28 min-h-0 overflow-y-auto [scrollbar-width:thin]">
      <li v-for="action in available" :key="action.key">
        <button
          type="button"
          role="checkbox"
          :aria-checked="chosen.includes(action.key)"
          :disabled="full(action.key)"
          class="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-[13px] font-semibold transition-colors hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
          @click="toggle(action.key)"
        >
          <component :is="action.icon" class="size-4 shrink-0 text-white/80" />
          <span class="min-w-0 flex-1 truncate">{{ action.label }}</span>
          <span
            :class="[
              'flex size-4.5 shrink-0 items-center justify-center rounded-md ring-1 transition-colors',
              chosen.includes(action.key) ? 'bg-white text-gray-900 ring-white' : 'ring-white/50',
            ]"
          >
            <Check v-if="chosen.includes(action.key)" class="size-3.5" />
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
