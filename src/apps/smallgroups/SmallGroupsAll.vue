<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, UsersRound, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import { useSmallGroups } from '../../composables/useSmallGroups'
import { useMembers } from '../../composables/useMembers'
import { useSgLanguage } from '../../composables/useSgLanguage'
import { useToast } from '../../composables/useToast'
import { usePermissions } from '../../composables/usePermissions'
import { memberNameById } from '../../utils/sgUtils'
import SmallGroupCard from '../../components/smallGroups/SmallGroupCard.vue'
import AddEditGroupDrawer from '../../components/smallGroups/AddEditGroupDrawer.vue'

// Every group, as the cover cards it always had: a group is a set of faces
// and a photo of them together, and a card says that where a row could not.
// This was the Small groups page before Small groups was an app. Printing a
// blank form has a section of its own now (SmallGroupsForms), so the toolbar
// is search, and New group for whoever runs the groups.

const router = useRouter()
const toast = useToast()
const { t } = useSgLanguage()
const { canManage } = usePermissions()
const { groups, loading, createGroup } = useSmallGroups()
const { members } = useMembers()

const canEdit = computed(() => canManage('smallgroups'))
const searchQuery = ref('')
const showGroupDrawer = ref(false)
const saving = ref(false)

const filteredGroups = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return groups.value
  return groups.value.filter((group) => {
    const leader = memberNameById(members.value, group.leaderId)
    return `${group.name} ${group.location} ${leader}`.toLowerCase().includes(query)
  })
})

// A handful of groups is read at a glance; a search box only earns its row
// once there are more than fit on a screen or two.
const searchable = computed(() => groups.value.length > 6)

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = groups.value.length
  return `${n} ${n === 1 ? 'group' : 'groups'}`
})

const openGroup = (group) => {
  router.push({ name: 'SmallGroupDetails', params: { id: group.firestoreId || group.id } })
}

const handleSave = async (groupData) => {
  saving.value = true
  try {
    const id = await createGroup(groupData)
    showGroupDrawer.value = false
    toast.success('Small group created')
    router.push({ name: 'SmallGroupDetails', params: { id } })
  } catch (error) {
    console.error('Error creating small group:', error)
    toast.error('Could not create the group. Please try again.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="relative h-full">
    <AppScreen title="Groups" :subtitle="subtitle" :back="{ name: 'SmallGroupsHome' }" root="/small-groups">
      <template #action>
        <button
          v-if="canEdit"
          type="button"
          class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover"
          :aria-label="t('newGroup')"
          @click="showGroupDrawer = true"
        >
          <Plus class="size-5" />
        </button>
      </template>

      <div v-if="searchable" class="relative mb-4">
        <Search class="pointer-events-none absolute left-3 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
        <input
          v-model="searchQuery"
          type="text"
          inputmode="search"
          enterkeyhint="search"
          autocomplete="off"
          :aria-label="t('search')"
          :placeholder="t('search')"
          class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-9.5 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          v-if="searchQuery"
          type="button"
          class="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Clear search"
          @click="searchQuery = ''"
        >
          <X class="size-4" />
        </button>
      </div>

      <div v-if="loading" class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div
          v-for="i in 4"
          :key="`skeleton-${i}`"
          class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="aspect-[16/9] animate-pulse bg-gray-200 dark:bg-gray-700" />
          <div class="space-y-3 p-4">
            <div class="flex items-center gap-2">
              <div class="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div class="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div class="flex gap-1.5">
              <div class="h-6 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div class="h-6 w-28 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="filteredGroups.length === 0" class="p-8 text-center text-gray-500 dark:text-gray-400">
        <UsersRound class="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
        <p class="mb-4">
          {{ searchQuery ? 'No group matches that.' : t('noGroups') }}
        </p>
        <button
          v-if="!searchQuery && canEdit"
          @click="showGroupDrawer = true"
          class="rounded-lg bg-primary px-4 py-2 text-white transition-colors hover:bg-primary-hover"
        >
          {{ t('newGroup') }}
        </button>
      </div>

      <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SmallGroupCard
          v-for="group in filteredGroups"
          :key="group.firestoreId"
          :group="group"
          :members="members"
          @click="openGroup(group)"
        />
      </div>
    </AppScreen>

    <AddEditGroupDrawer
      v-model:show="showGroupDrawer"
      :members="members"
      :saving="saving"
      @save="handleSave"
    />
  </div>
</template>
