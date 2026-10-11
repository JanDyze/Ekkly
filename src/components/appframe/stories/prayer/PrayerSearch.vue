<script setup>
import { computed, ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PrayerGroup from './PrayerGroup.vue'
import PrayerRow from './PrayerRow.vue'
import PrayerScreen from './PrayerScreen.vue'
import { CONCERNS, lineOf } from './cast'

// Scene: a request found again. In every concern, "ongoing" is typed into the
// search, and the list narrows, month by month, to the long needs: the search
// reaches the words a row only shows (ongoing, urgent, a name) as well as
// what was asked.

const ALL = [
  { month: 'October 2026', concerns: [CONCERNS.surgery, CONCERNS.travel, CONCERNS.work] },
  { month: 'September 2026', concerns: [CONCERNS.baby, CONCERNS.flood] },
]

// As many concerns as the screen holds before the search narrows them; the
// rest wait below the screen's foot, as they would on a phone.
const FITS = 3

const query = ref('')
const { type, still } = useSceneTimeline()
type(query, 'ongoing', 1300, 150)

const groups = computed(() => {
  const q = query.value.trim().toLowerCase()
  let room = FITS
  return ALL.map((g) => {
    const found = g.concerns.filter((c) => !q || `${c.title} ${lineOf(c, { showStatus: true })}`.toLowerCase().includes(q))
    const shown = found.slice(0, room)
    room -= shown.length
    return { ...g, concerns: shown }
  }).filter((g) => g.concerns.length)
})
</script>

<template>
  <PrayerScreen title="All concerns" subtitle="12 concerns" art="prayer-all" :query="query" :searching="!!query" :caret="!still && !!query">
    <TransitionGroup tag="div" name="prayer-found" class="relative flex flex-col gap-4">
      <PrayerGroup v-for="(g, i) in groups" :key="g.month" class="st-rise" :style="{ '--d': `${120 + i * 120}ms` }" :title="g.month" :count="g.concerns.length">
        <PrayerRow v-for="c in g.concerns" :key="c.id" :concern="c" show-status />
      </PrayerGroup>
    </TransitionGroup>
  </PrayerScreen>
</template>

<style scoped>
.prayer-found-leave-active {
  position: absolute;
  inset-inline: 0;
  transition: opacity 0.2s ease;
}
.prayer-found-leave-to {
  opacity: 0;
}
.prayer-found-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
</style>
