<script setup>
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import { useCrumbs } from '../../composables/useCrumbs'

// The way here, over a screen's title on a desktop: "People › Ministries",
// each part a link back (useCrumbs says which, and when). AppScreen's header
// draws it, and so do the screens that keep a header of their own (a person's
// record, a song, a meeting's minutes). Nothing on a phone, where the back
// arrow is the way and there is no line to spare.

const props = defineProps({
  // See useCrumbs: the way, for a screen whose place is not its section's.
  trail: { type: Array, default: null },
})

const crumbs = useCrumbs(() => props.trail)
</script>

<template>
  <nav v-if="crumbs.length" aria-label="Breadcrumb" class="hidden min-w-0 items-center gap-1 text-xs font-medium text-gray-500 lg:flex dark:text-gray-400">
    <template v-for="(crumb, i) in crumbs" :key="crumb.key">
      <ChevronRight v-if="i" class="size-3 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
      <RouterLink :to="crumb.to" class="min-w-0 truncate rounded transition-colors hover:text-gray-900 hover:underline dark:hover:text-white">
        {{ crumb.label }}
      </RouterLink>
    </template>
  </nav>
</template>
