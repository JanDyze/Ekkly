<script setup>
import { computed, ref } from 'vue'
import { User } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import PrayerField from './PrayerField.vue'
import PrayerGroup from './PrayerGroup.vue'
import PrayerRow from './PrayerRow.vue'
import PrayerScreen from './PrayerScreen.vue'
import PrayerSheet from './PrayerSheet.vue'
import { CONCERNS, nameOf, person } from './cast'

// Scene: a request written down in seconds. + is tapped and the form comes
// up; what to pray for is typed, "Ne" finds Nena on the roll, a line says
// what she asked, it is marked High, and Save is pressed: who it is for, what
// for, and how much it matters, in the one list the church prays from.

const TITLE = CONCERNS.surgery.title
const ASKED = CONCERNS.surgery.asked
const MATCHES = [person('nena'), person('nestor')]

const tapAdd = ref(false)
const open = ref(false)
const title = ref('')
const finding = ref('')
const picking = ref(false)
const tapPick = ref(false)
const member = ref('')
const asked = ref('')
const tapPriority = ref(false)
const priority = ref('Normal')
const saving = ref(false)
const { at, type, still } = useSceneTimeline()

at(300, () => (tapAdd.value = true))
at(550, () => (open.value = true))
const typedTitle = type(title, TITLE, 900, 40)
const typedFind = type(finding, 'Ne', typedTitle + 200, 110)
at(typedFind + 50, () => (picking.value = true))
at(typedFind + 450, () => (tapPick.value = true))
at(typedFind + 650, () => {
  picking.value = false
  member.value = nameOf(person('nena'))
})
const typedAsked = type(asked, ASKED, typedFind + 750, 24)
at(typedAsked + 200, () => (tapPriority.value = true))
at(typedAsked + 400, () => (priority.value = 'High'))
at(typedAsked + 700, () => (saving.value = true))

// Which field has the focus: the one being filled in now.
const focus = computed(() => {
  if (saving.value) return ''
  if (tapPriority.value) return 'priority'
  if (member.value) return 'asked'
  if (finding.value) return 'member'
  return 'title'
})
</script>

<template>
  <PrayerScreen title="Praying now" subtitle="3 being prayed for" art="prayer-now" :tap-add="tapAdd">
    <PrayerGroup class="st-rise" style="--d: 120ms" title="October 2026" :count="2">
      <PrayerRow :concern="CONCERNS.travel" />
      <PrayerRow :concern="CONCERNS.work" />
    </PrayerGroup>

    <template #over>
      <PrayerSheet :open="open" :ready="!!title" :saving="saving">
        <PrayerField label="What to pray for" required :value="title" placeholder="Healing after surgery" :focused="focus === 'title'" :caret="!still && focus === 'title'" />
        <PrayerField v-if="member" label="Who it is for" kind="member" :value="member" />
        <PrayerField
          v-else
          label="Who it is for"
          kind="find"
          :value="finding"
          placeholder="Search people..."
          :focused="focus === 'member'"
          :caret="!still && focus === 'member'"
        />
        <PrayerField
          label="What they asked"
          kind="area"
          :value="asked"
          placeholder="What the person shared..."
          :focused="focus === 'asked'"
          :caret="!still && focus === 'asked'"
        />
        <PrayerField label="Priority" kind="select" :value="priority" :focused="focus === 'priority'" :tapped="tapPriority" />

        <!-- The roll, offered under the name being typed. -->
        <div
          v-if="picking"
          class="st-pop absolute inset-x-4 top-[148px] z-10 rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
        >
          <span
            v-for="(p, i) in MATCHES"
            :key="p.id"
            :class="[
              'relative flex items-center gap-2 px-4 py-2 text-sm text-gray-900 dark:text-white',
              i === 0 && tapPick ? 'st-tap rounded-t-lg bg-gray-100 dark:bg-gray-700' : '',
            ]"
          >
            <User class="size-4 text-gray-400" />
            {{ nameOf(p) }}
          </span>
        </div>
      </PrayerSheet>
    </template>
  </PrayerScreen>
</template>
