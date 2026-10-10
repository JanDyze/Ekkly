<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppScreen from '../../components/appframe/AppScreen.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { usePeopleGroups } from '../../composables/usePeopleGroups'

// Who serves where: every ministry the church keeps, with its people.
//
// The roll could already be sorted by ministry, but that answered "who is in
// the choir" by scrolling past every other ministry to find it. Here each
// ministry is a card with its size and its faces, the biggest first, and opens
// to its people. Above them, how much of the church serves at all; after them,
// the people who serve nowhere yet, as a card of their own, because they are
// the ones somebody should be asking. Which ministries exist, and what each
// may do, stay in Settings.
//
// It was a list of rows with a few faces at the start of each, and the faces
// spilled over the names once a ministry had more than two people in it.
//
// Beside the ministries, the same question asked of small groups, for whoever
// may see them: how many members are in one, each group with its faces, and
// the members in none. A tab of this screen rather than a tile of its own on
// the People home, because it is the same question of where somebody belongs
// — and the place house fellowships will join when they are kept. Two tabs
// rather than one long scroll, so neither list is under the other; which one
// is open is in the address (?tab=groups), so back and a refresh keep it.

const { loading, ministries, unplaced, counts, isAdmin } = usePeopleOverview()

const FACES = 4

const sizeOf = (n) => `${n.toLocaleString()} ${n === 1 ? 'person' : 'people'}`

// Biggest first, so the ministries most of the church is in are at the top;
// the empty ones last, in the order the church keeps them.
const sorted = computed(() =>
  ministries.value
    .map((ministry, order) => ({ ...ministry, order }))
    .sort((a, b) => b.people.length - a.people.length || a.order - b.order)
)

const serving = computed(() => counts.value.total - unplaced.value.length)
const share = computed(() => (counts.value.total ? serving.value / counts.value.total : 0))

const subtitle = computed(() => {
  const n = ministries.value.length
  const g = groups.value.length
  const parts = [`${n} ${n === 1 ? 'ministry' : 'ministries'}`]
  if (seesGroups.value && g) parts.push(`${g} small ${g === 1 ? 'group' : 'groups'}`)
  return parts.join(' · ')
})

const keyOf = (member) => member.firestoreId || member.id

const { canSee: seesGroups, groups, ungrouped, eligible } = usePeopleGroups()
const grouped = computed(() => eligible.value.length - ungrouped.value.length)
const groupShare = computed(() => (eligible.value.length ? grouped.value / eligible.value.length : 0))
const memberCount = (n) => `${n.toLocaleString()} ${n === 1 ? 'member' : 'members'}`

const route = useRoute()
const router = useRouter()
const tab = computed(() => (seesGroups.value && route.query.tab === 'groups' ? 'groups' : 'ministries'))
const setTab = (key) => {
  const { tab: _drop, ...rest } = route.query
  router.replace({ query: key === 'groups' ? { ...rest, tab: 'groups' } : rest })
}
const TABS = [
  { key: 'ministries', label: 'Ministries' },
  { key: 'groups', label: 'Small groups' },
]
</script>

<template>
  <AppScreen title="Ministries" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/members">
    <!-- Ministries or small groups: two tabs rather than one long scroll. -->
    <div
      v-if="seesGroups"
      role="tablist"
      aria-label="Ministries or small groups"
      class="mb-4 grid grid-cols-2 gap-1 rounded-full bg-gray-200/70 p-1 dark:bg-gray-800"
    >
      <button
        v-for="t in TABS"
        :key="t.key"
        type="button"
        role="tab"
        :aria-selected="tab === t.key"
        :class="[
          'rounded-full py-2 text-sm font-semibold transition-colors',
          tab === t.key
            ? 'bg-white text-gray-900 dark:bg-gray-700 dark:text-white ring-1 ring-gray-200 dark:ring-gray-700'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
        ]"
        @click="setTab(t.key)"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="loading" class="flex flex-col gap-2.5">
      <div class="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <div class="grid grid-cols-2 gap-2.5">
        <div v-for="n in 6" :key="n" class="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>

    <template v-else-if="tab === 'ministries'">
    <div v-if="!ministries.length" class="rounded-2xl bg-white p-6 text-center ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80">
      <p class="font-semibold text-gray-900 dark:text-white">No ministries yet</p>
      <p v-if="isAdmin" class="mt-1 text-sm text-gray-500 dark:text-gray-400">Add them in Settings, under Ministries.</p>
    </div>

    <div v-else class="flex flex-col gap-2.5">
      <!-- How much of the church serves somewhere. -->
      <section
        v-if="counts.total"
        class="animate-rise rounded-2xl bg-white p-4 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          <span class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ serving.toLocaleString() }}</span>
          of {{ sizeOf(counts.total) }} serve in a ministry
        </p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden="true">
          <div class="h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${Math.round(share * 100)}%` }" />
        </div>
      </section>

      <!-- One card per ministry. -->
      <div class="grid grid-cols-2 gap-2.5">
        <RouterLink
          v-for="(ministry, index) in sorted"
          :key="ministry.name"
          :to="{ name: 'PeopleMinistry', params: { name: ministry.name } }"
          :style="{ animationDelay: `${60 + index * 25}ms` }"
          :class="[
            'animate-rise flex min-h-32 min-w-0 flex-col gap-3 rounded-2xl p-3.5 transition duration-200 ease-out',
            ministry.people.length
              ? 'bg-white ring-1 ring-gray-200/80 hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600'
              : 'border border-dashed border-gray-300 dark:border-gray-700',
          ]"
        >
          <div class="min-w-0">
            <p class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ ministry.name }}</p>
            <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {{ ministry.people.length ? sizeOf(ministry.people.length) : 'Nobody yet' }}
            </p>
          </div>

          <div v-if="ministry.people.length" class="mt-auto flex items-center">
            <div class="flex -space-x-2">
              <MemberAvatar
                v-for="member in ministry.people.slice(0, FACES)"
                :key="keyOf(member)"
                :member="member"
                alt=""
                size="h-8 w-8"
                plain-class="ring-2 ring-white dark:ring-gray-800"
              />
            </div>
            <span
              v-if="ministry.people.length > FACES"
              class="ml-1.5 text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400"
            >
              +{{ ministry.people.length - FACES }}
            </span>
          </div>
        </RouterLink>
      </div>

      <!-- The people who serve nowhere yet. -->
      <RouterLink
        v-if="counts.total && unplaced.length"
        :to="{ name: 'PeopleUnplaced' }"
        class="animate-rise flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/80 transition duration-200 ease-out hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
      >
        <div class="min-w-0 flex-1">
          <p class="text-[15px] font-semibold text-gray-900 dark:text-white">Not in a ministry</p>
          <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ sizeOf(unplaced.length) }}</p>
        </div>
        <div class="flex -space-x-2">
          <MemberAvatar
            v-for="member in unplaced.slice(0, FACES)"
            :key="keyOf(member)"
            :member="member"
            alt=""
            size="h-8 w-8"
            plain-class="ring-2 ring-white dark:ring-gray-800"
          />
        </div>
        <span v-if="unplaced.length > FACES" class="text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
          +{{ unplaced.length - FACES }}
        </span>
      </RouterLink>
    </div>

    </template>

    <!-- Small groups: the same question, asked of the groups. -->
    <section v-else class="flex flex-col gap-2.5" aria-label="Small groups">
      <div
        v-if="!groups.length"
        class="rounded-2xl bg-white p-6 text-center ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80"
      >
        <p class="font-semibold text-gray-900 dark:text-white">No small groups yet</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Start one in the Small Groups app.</p>
      </div>

      <section
        v-if="eligible.length"
        class="animate-rise rounded-2xl bg-white p-4 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80"
      >
        <p class="text-sm text-gray-500 dark:text-gray-400">
          <span class="text-2xl font-bold tabular-nums text-gray-900 dark:text-white">{{ grouped.toLocaleString() }}</span>
          of {{ memberCount(eligible.length) }} are in a small group
        </p>
        <div class="mt-3 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700" aria-hidden="true">
          <div class="h-full rounded-full bg-primary dark:bg-primary-light" :style="{ width: `${Math.round(groupShare * 100)}%` }" />
        </div>
      </section>

      <div v-if="groups.length" class="grid grid-cols-2 gap-2.5">
        <RouterLink
          v-for="(group, index) in groups"
          :key="group.id"
          :to="{ name: 'SmallGroupDetails', params: { id: group.id } }"
          :style="{ animationDelay: `${60 + index * 25}ms` }"
          :class="[
            'animate-rise flex min-h-32 min-w-0 flex-col gap-3 rounded-2xl p-3.5 transition duration-200 ease-out',
            group.people.length
              ? 'bg-white ring-1 ring-gray-200/80 hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600'
              : 'border border-dashed border-gray-300 dark:border-gray-700',
          ]"
        >
          <div class="min-w-0">
            <p class="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ group.name }}</p>
            <p class="mt-0.5 truncate text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {{ group.people.length ? sizeOf(group.people.length) : 'Nobody yet' }}<template v-if="group.leader"> · led by {{ group.leader.nickname || group.leader.firstName }}</template>
            </p>
          </div>
          <div v-if="group.people.length" class="mt-auto flex items-center">
            <div class="flex -space-x-2">
              <MemberAvatar
                v-for="member in group.people.slice(0, FACES)"
                :key="keyOf(member)"
                :member="member"
                alt=""
                size="h-8 w-8"
                plain-class="ring-2 ring-white dark:ring-gray-800"
              />
            </div>
            <span v-if="group.people.length > FACES" class="ml-1.5 text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
              +{{ group.people.length - FACES }}
            </span>
          </div>
        </RouterLink>
      </div>

      <!-- The members in no small group. -->
      <RouterLink
        v-if="ungrouped.length"
        :to="{ name: 'PeopleUngrouped' }"
        class="animate-rise flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/80 transition duration-200 ease-out hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
      >
        <div class="min-w-0 flex-1">
          <p class="text-[15px] font-semibold text-gray-900 dark:text-white">Not in a small group</p>
          <p class="mt-0.5 text-xs tabular-nums text-gray-500 dark:text-gray-400">{{ memberCount(ungrouped.length) }}, not counting kids</p>
        </div>
        <div class="flex -space-x-2">
          <MemberAvatar
            v-for="member in ungrouped.slice(0, FACES)"
            :key="keyOf(member)"
            :member="member"
            alt=""
            size="h-8 w-8"
            plain-class="ring-2 ring-white dark:ring-gray-800"
          />
        </div>
        <span v-if="ungrouped.length > FACES" class="text-xs font-semibold tabular-nums text-gray-500 dark:text-gray-400">
          +{{ ungrouped.length - FACES }}
        </span>
      </RouterLink>
    </section>
  </AppScreen>
</template>
