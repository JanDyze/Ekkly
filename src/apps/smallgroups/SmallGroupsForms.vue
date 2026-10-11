<script setup>
import { nextTick, ref } from 'vue'
import { Printer } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import SessionFormPrintable from '../../components/smallGroups/SessionFormPrintable.vue'
import { useSmallGroups } from '../../composables/useSmallGroups'
import { useMembers } from '../../composables/useMembers'
import { useSgLanguage } from '../../composables/useSgLanguage'

// A blank session form to print, for the leaders who keep the meeting on
// paper and type it in after. Each is printed with its group's name and
// roster, so a group is picked first: a row a group, and a tap prints it.
//
// It was a Print button over the groups' cards that opened a picker sheet;
// a form is something a leader comes for on its own, so it is a section with
// its own door now.

const { groups, loading } = useSmallGroups()
const { members } = useMembers()
const { t } = useSgLanguage()

const printGroup = ref(null)

const printFor = async (group) => {
  printGroup.value = group
  // The sheet is mounted only for the duration of the print, so it never
  // flashes on screen.
  await nextTick()
  window.print()
  printGroup.value = null
}
</script>

<template>
  <div class="relative h-full">
    <AppScreen title="Forms" subtitle="A blank session form to print" :back="{ name: 'SmallGroupsHome' }" root="/small-groups" class="no-print">
      <div v-if="loading" class="flex flex-col gap-2">
        <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>

      <ListGroup v-else-if="!groups.length">
        <ListRow :title="t('noGroups')" muted />
      </ListGroup>

      <ListGroup v-else note="Printed with the group’s name and the names of everyone in it.">
        <ListRow
          v-for="group in groups"
          :key="group.firestoreId"
          :title="group.name"
          :subtitle="`${group.memberIds.length} ${t('members')}`"
          no-chevron
          @click="printFor(group)"
        >
          <template #trailing>
            <Printer class="size-5 shrink-0 text-gray-400 dark:text-gray-500" />
          </template>
        </ListRow>
      </ListGroup>
    </AppScreen>

    <!-- Mounted only while printing -->
    <div v-if="printGroup" class="print-area print-only">
      <SessionFormPrintable :group="printGroup" :members="members" />
    </div>
  </div>
</template>
