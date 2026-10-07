<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'

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
  return `${n} ${n === 1 ? 'ministry' : 'ministries'}`
})

const keyOf = (member) => member.firestoreId || member.id
</script>

<template>
  <AppScreen title="Ministries" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/members">
    <div v-if="loading" class="flex flex-col gap-2.5">
      <div class="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      <div class="grid grid-cols-2 gap-2.5">
        <div v-for="n in 6" :key="n" class="h-32 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>

    <div v-else-if="!ministries.length" class="rounded-2xl bg-white p-6 text-center ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80">
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
            'animate-rise flex min-h-32 min-w-0 flex-col gap-3 rounded-2xl p-3.5 transition duration-200 ease-out pressed:scale-[0.97]',
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
        class="animate-rise flex items-center gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/80 transition duration-200 ease-out hover:ring-gray-300 pressed:scale-[0.98] dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
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
  </AppScreen>
</template>
