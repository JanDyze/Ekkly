<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleGroups } from '../../composables/usePeopleGroups'
import { getFullName } from '../../utils/memberUtils'
import { groupByBand } from '../../utils/ageBands'

// The members in no small group, under their age bands, so whoever is
// placing people can see at once who would fit the youth group and who the
// couples' one. Counted the way People counts them (usePeopleGroups): members
// past the Kids band, a group's leader counted as in it. Each opens their
// record, in People.
//
// People asks the same question from its side (PeopleMinistry, "Not in a
// small group"); this is it asked from the groups', where the inviting is
// done.

const { loading, ungrouped, eligible } = usePeopleGroups()

const bands = computed(() => groupByBand(ungrouped.value))

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = ungrouped.value.length
  return n ? `${n} of ${eligible.value.length} members, not counting kids` : ''
})

const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
</script>

<template>
  <AppScreen title="Not in a group" :subtitle="subtitle" :back="{ name: 'SmallGroupsHome' }" root="/small-groups">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 5" :key="n" class="h-14 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <ListGroup v-else-if="!ungrouped.length">
      <ListRow title="Every member is in a small group" muted />
    </ListGroup>

    <div v-else class="flex flex-col gap-5">
      <ListGroup v-for="band in bands" :key="band.band.key" :title="band.band.label" :count="band.members.length">
        <ListRow
          v-for="member in band.members"
          :key="member.firestoreId || member.id"
          :to="recordOf(member)"
          :title="getFullName(member)"
          :subtitle="member.nickname ? `“${member.nickname}”` : ''"
        >
          <template #leading>
            <MemberAvatar :member="member" alt="" size="h-10 w-10" class="shrink-0" />
          </template>
        </ListRow>
      </ListGroup>
    </div>
  </AppScreen>
</template>
