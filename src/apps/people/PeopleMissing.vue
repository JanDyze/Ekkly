<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { getFullName, listPhrase } from '../../utils/memberUtils'

// The records still missing a detail the rest of Ekkly counts on — a birthday
// for the birthday list and the age headings, a sex for the attendance
// recorder's split.
//
// The roll marks a thin record with an amber count on its row, which says
// there is a gap but leaves finding them all to scrolling. This is the list of
// them, each opening straight into its editor, so filling in a dozen is a
// dozen taps and saves rather than a search.

const { loading, incomplete, counts } = usePeopleOverview()

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = incomplete.value.length
  return n ? `${n} of ${counts.value.total.toLocaleString()} ${n === 1 ? 'record' : 'records'}` : 'Every record is complete'
})

const editorOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId }, query: { edit: '1' } })
</script>

<template>
  <AppScreen title="Missing info" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/members">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup
      v-else-if="incomplete.length"
      :count="incomplete.length"
      title="To complete"
      note="A birthday puts someone on the birthday list and in the right age group. Sex is how attendance splits its counts."
    >
      <ListRow
        v-for="row in incomplete"
        :key="row.member.firestoreId || row.member.id"
        :to="editorOf(row.member)"
        :title="getFullName(row.member)"
        :subtitle="`Add their ${listPhrase(row.missing)}`"
      >
        <template #leading>
          <MemberAvatar :member="row.member" alt="" size="h-10 w-10" class="shrink-0" />
        </template>
      </ListRow>
    </ListGroup>

    <ListGroup v-else>
      <ListRow title="Every record is complete" muted />
    </ListGroup>
  </AppScreen>
</template>
