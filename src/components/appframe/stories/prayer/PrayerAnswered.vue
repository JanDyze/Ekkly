<script setup>
import { computed, ref } from 'vue'
import { Check } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PrayerField from './PrayerField.vue'
import PrayerGroup from './PrayerGroup.vue'
import PrayerRow from './PrayerRow.vue'
import PrayerScreen from './PrayerScreen.vue'
import PrayerSheet from './PrayerSheet.vue'
import { CONCERNS } from './cast'

// Scene: an answered prayer, kept. The concern for Ella's baby is opened,
// its status is changed to Answered, a note says how, and Update is pressed:
// back in the list it says when it was answered and carries a tick, so the
// church can give thanks for it as it once prayed for it.

const STATUSES = ['Praying now', 'Ongoing', 'Answered']
const NOTE = 'Baby Gabriel arrived healthy!'

const tapRow = ref(false)
const open = ref(false)
const tapStatus = ref(false)
const choosing = ref(false)
const status = ref('Ongoing')
const note = ref('')
const saving = ref(false)
const answered = ref(false)
const { at, type, still } = useSceneTimeline()

at(900, () => (tapRow.value = true))
at(1150, () => (open.value = true))
at(1700, () => (tapStatus.value = true))
at(1900, () => (choosing.value = true))
at(2400, () => (status.value = 'Answered'))
at(2650, () => {
  choosing.value = false
  tapStatus.value = false
})
const typed = type(note, NOTE, 2750, 24)
at(typed + 200, () => (saving.value = true))
at(typed + 500, () => {
  open.value = false
  tapRow.value = false
  answered.value = true
})

const baby = computed(() => (answered.value ? { ...CONCERNS.baby, status: 'answered', when: 'Today' } : CONCERNS.baby))
const focus = computed(() => (saving.value ? '' : status.value === 'Answered' ? 'note' : tapStatus.value ? 'status' : ''))
</script>

<template>
  <PrayerScreen title="All concerns" subtitle="12 concerns" art="prayer-all">
    <PrayerGroup class="st-rise" style="--d: 120ms" title="September 2026" :count="2">
      <PrayerRow :concern="baby" show-status :tapped="tapRow" :selected="tapRow" />
      <PrayerRow :concern="CONCERNS.flood" show-status />
    </PrayerGroup>

    <template #over>
      <PrayerSheet :open="open" edit :saving="saving">
        <PrayerField label="What to pray for" required :value="CONCERNS.baby.title" />
        <PrayerField label="Status" kind="select" :value="status" :focused="focus === 'status'" :tapped="tapStatus" />
        <PrayerField label="Notes" kind="area" :value="note" placeholder="How they are doing, what has changed..." :focused="focus === 'note'" :caret="!still && focus === 'note'" />

        <!-- The status's choices, as the phone lists a select's options. -->
        <div v-if="choosing" class="st-pop absolute inset-x-4 top-[124px] z-10 rounded-lg border border-gray-300 bg-white py-1 dark:border-gray-600 dark:bg-gray-800">
          <span
            v-for="s in STATUSES"
            :key="s"
            :class="[
              'relative flex items-center justify-between px-4 py-2 text-sm',
              status === s ? 'font-semibold text-primary dark:text-primary-light' : 'text-gray-700 dark:text-gray-200',
              status === 'Answered' && s === 'Answered' ? 'st-tap bg-primary/10 dark:bg-primary-light/10' : '',
            ]"
          >
            {{ s }}
            <Check v-if="status === s" class="size-4" />
          </span>
        </div>
      </PrayerSheet>
    </template>
  </PrayerScreen>
</template>
