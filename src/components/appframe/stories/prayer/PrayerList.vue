<script setup>
import { ref } from 'vue'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PrayerGroup from './PrayerGroup.vue'
import PrayerRow from './PrayerRow.vue'
import PrayerScreen from './PrayerScreen.vue'
import { CONCERNS } from './cast'

// Scene: praying for each other by name. Praying now holds the month's
// requests, each with the face of who it is for; the one just saved, marked
// High, arrives above them under "Pray for these first", because whoever
// raised it asked for that, and the whole church sees it at once.

const arrived = ref(false)
const fresh = ref(false)
const { at } = useSceneTimeline()

at(1200, () => {
  arrived.value = true
  fresh.value = true
})
at(3200, () => (fresh.value = false))
</script>

<template>
  <PrayerScreen title="Praying now" :subtitle="arrived ? '3 being prayed for' : '2 being prayed for'" art="prayer-now">
    <Transition name="prayer-first">
      <PrayerGroup v-if="arrived" title="Pray for these first" :count="1">
        <PrayerRow :concern="CONCERNS.surgery" :selected="fresh" />
      </PrayerGroup>
    </Transition>
    <PrayerGroup class="st-rise" style="--d: 150ms" title="October 2026" :count="2">
      <PrayerRow :concern="CONCERNS.travel" />
      <PrayerRow :concern="CONCERNS.work" />
    </PrayerGroup>
  </PrayerScreen>
</template>

<style scoped>
/* The new request pops in where it belongs; the month under it is simply
   moved down by it, as a list makes room. */
.prayer-first-enter-active {
  animation: st-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .prayer-first-enter-active {
    animation: none;
  }
}
</style>
