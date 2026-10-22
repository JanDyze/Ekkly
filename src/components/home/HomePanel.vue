<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PanelRest from './PanelRest.vue'
import { useRowsThatFit } from '../../composables/useRowsThatFit'

// The shell every panel from an app wears on the desktop home (HomeSunday,
// HomePrayer, HomePhotos, HomeGroups, HomeBirthdays, HomeLinks): a white
// panel the height its column gives it (the home keeps to one screen), its
// header the board's other panels have (HomeWeek's) — a title, a count, and
// the way into the app on the right — and under it the rows that fit, whole
// (useRowsThatFit), rather than a list scrolling inside it or a row cut off
// part way. The rows are what the panel marks `data-rows`, or the children of
// what it holds. Given its `total`, a line at its foot says how many more
// there are and leads into the app. With nothing in it, the room says so
// kindly (PanelRest), as the others do.

const props = defineProps({
  title: { type: String, required: true },
  // For the header and the screen reader: id of the title.
  id: { type: String, required: true },
  count: { type: Number, default: 0 },
  // Where the whole of it is: { to, label }.
  link: { type: Object, default: null },
  // How many it has in all, its rows among them: those that do not fit are
  // said at its foot, leading to `link`.
  total: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  // { doodle, title, line } when there is nothing to show.
  empty: { type: Object, default: null },
})

const body = ref(null)
const { shown } = useRowsThatFit(body, { list: (el) => el.querySelector('[data-rows]') || el.firstElementChild })
const more = computed(() => (props.total ? props.total - shown.value : 0))
</script>

<template>
  <section
    :aria-labelledby="id"
    class="@container flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10"
  >
    <header class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 pt-2.5 pb-2 dark:border-white/10">
      <h2 :id="id" class="flex min-w-0 items-center gap-2.5 text-sm font-semibold whitespace-nowrap text-gray-900 dark:text-white">
        <span class="truncate">{{ title }}</span>
        <span v-if="count" class="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-bold tabular-nums text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {{ count }}
        </span>
      </h2>
      <RouterLink v-if="link" :to="link.to" class="shrink-0 text-xs font-semibold whitespace-nowrap text-primary hover:underline dark:text-primary-light">
        {{ link.label }}
      </RouterLink>
    </header>

    <div v-if="loading" class="space-y-2 p-4">
      <div v-for="n in 3" :key="n" class="h-9 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    </div>
    <PanelRest v-else-if="empty" :doodle="empty.doodle" :title="empty.title" :line="empty.line || ''" />
    <div v-else ref="body" class="min-h-0 flex-1 overflow-hidden">
      <slot />
    </div>
    <RouterLink
      v-if="more > 0 && link && !loading && !empty"
      :to="link.to"
      class="shrink-0 border-t border-gray-100 px-5 py-2 text-xs font-semibold text-primary hover:underline dark:border-white/10 dark:text-primary-light"
    >
      {{ more }} more
    </RouterLink>
  </section>
</template>
