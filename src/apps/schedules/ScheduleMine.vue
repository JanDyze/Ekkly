<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, ChevronRight, UserCheck } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import { useScheduleOverview } from '../../composables/useScheduleOverview'
import { formatServiceDate, formatShortDate, todayIso } from '../../utils/lineupUtils'

// Every service this account is on, across every month on file.
//
// "When am I on?" is the question most visits to Schedules are, and it used to
// be answered by searching your own name. It is a section now: the turns still
// to come, soonest first, each saying what you are doing, with the ones
// already served folded away underneath.

const { loading, myMember, myTurns, myUpcoming, myRolesOn } = useScheduleOverview()

const today = todayIso()

// Most recent first, and only the last few: what you did last month is worth a
// glance, what you did last year is not what this section is for.
const past = computed(() =>
  myTurns.value
    .filter((s) => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)
)

const showPast = ref(false)

const subtitle = computed(() => {
  if (!myMember.value) return 'Not linked to anyone on the roll'
  const n = myUpcoming.value.length
  return n ? `${n} coming up` : 'None coming up'
})
</script>

<template>
  <AppScreen title="My turns" :subtitle="subtitle" :back="{ name: 'SchedulesHome' }" root="/schedules">
    <div v-if="loading" class="flex flex-col gap-2">
      <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <!-- An account not tied to anybody on the roll has no turns to find. -->
    <div v-else-if="!myMember" class="p-8 text-center text-gray-500 dark:text-gray-400">
      <UserCheck class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Your account is not linked to anyone on the roll</p>
      <p class="mx-auto mt-1 max-w-xs text-xs">
        Once it is, every Sunday you are on shows here. Link it from your account in Ekkly.
      </p>
    </div>

    <template v-else>
      <div v-if="!myUpcoming.length" class="p-8 text-center text-gray-500 dark:text-gray-400">
        <UserCheck class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">You are not on any schedule coming up</p>
        <p class="mx-auto mt-1 max-w-xs text-xs">When you are put on a Sunday, it shows here.</p>
      </div>

      <div v-else class="flex flex-col gap-2">
        <RouterLink
          v-for="(turn, index) in myUpcoming"
          :key="turn.date"
          :to="{ name: 'SchedulesSunday', params: { date: turn.date } }"
          :style="{ animationDelay: `${Math.min(index, 8) * 35}ms` }"
          :class="[
            'animate-rise group flex items-center gap-3 rounded-2xl border p-3 transition-[transform,border-color] duration-200 ease-out pressed:scale-[0.99]',
            index === 0
              ? 'border-primary/30 bg-primary/5 dark:border-primary-light/30 dark:bg-primary-light/10'
              : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700/80 dark:bg-gray-800',
          ]"
        >
          <span
            class="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light"
          >
            <span class="text-[10px] font-bold uppercase leading-none">{{ formatShortDate(turn.date).split(' ')[0] }}</span>
            <span class="text-lg font-bold leading-tight">{{ formatShortDate(turn.date).split(' ')[1] }}</span>
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-base font-semibold leading-tight text-gray-900 dark:text-white">
              {{ myRolesOn(turn).map((r) => r.name).join(' · ') }}
            </span>
            <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
              {{ formatServiceDate(turn.date) }}{{ turn.theme ? ` · ${turn.theme}` : '' }}
            </span>
          </span>
          <span
            v-if="turn.draft"
            class="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"
          >
            Draft
          </span>
          <ChevronRight
            class="size-4 shrink-0 text-gray-300 transition-transform duration-300 group-engaged:translate-x-1 dark:text-gray-600"
          />
        </RouterLink>
      </div>

      <!-- Already served, folded away -->
      <div v-if="past.length" class="pt-5">
        <button
          type="button"
          class="flex w-full items-center gap-1 rounded-lg px-0.5 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-primary dark:text-gray-400"
          @click="showPast = !showPast"
        >
          <ChevronDown :class="['size-4 transition-transform', showPast ? 'rotate-180' : '-rotate-90']" />
          Served lately · {{ past.length }}
        </button>
        <div v-if="showPast" class="mt-1 flex flex-col gap-1">
          <RouterLink
            v-for="turn in past"
            :key="turn.date"
            :to="{ name: 'SchedulesSunday', params: { date: turn.date } }"
            class="flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span class="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {{ formatShortDate(turn.date) }}
            </span>
            <span class="min-w-0 flex-1 truncate text-sm font-medium text-gray-600 dark:text-gray-300">
              {{ myRolesOn(turn).map((r) => r.name).join(' · ') }}
            </span>
            <ChevronRight class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </RouterLink>
        </div>
      </div>
    </template>
  </AppScreen>
</template>
