<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { Cake, CheckCircle, ChevronRight, ClipboardText, HandHeart, Hourglass, KeyRound, Plus, UserCircleCheck } from '../../icons'
import SimpleRows from '../../components/simple/SimpleRows.vue'
import { usePeopleOverview, whenOfBirthday } from '../../composables/usePeopleOverview'
import { getFullName } from '../../utils/memberUtils'

// The People app's home in simple view (useSimpleView): a dashboard, as most
// systems open a module on one. Its figures, each opening its section; what
// needs you, a line each; and the birthdays coming. Its sections are down
// the sidebar (SimpleSidebar), so they are not repeated here.
//
// Handed the same cards the full home is built from (PeopleHome), and its
// figures read the same overview (usePeopleOverview), so the two never
// disagree.

const props = defineProps({
  // The deck, as PeopleHome builds it.
  cards: { type: Array, required: true },
  canAdd: { type: Boolean, default: false },
})

const emit = defineEmits(['claim'])

const { loading, counts, birthdays } = usePeopleOverview()

const stats = computed(() => [
  { key: 'total', label: 'Everyone', value: counts.value.total, to: { name: 'Members' } },
  { key: 'members', label: 'Members', value: counts.value.members, to: { name: 'Members' } },
  { key: 'attendees', label: 'Attendees', value: counts.value.attendees, to: { name: 'Members' } },
  { key: 'birthdays', label: 'Birthdays next 30 days', value: birthdays.value.length, to: { name: 'PeopleBirthdays' } },
])

// Each card that asks for something, as a line. The roll is the figures.
const ICONS = {
  claims: KeyRound,
  self: UserCircleCheck,
  'self-asked': Hourglass,
  birthday: Cake,
  upcoming: Cake,
  missing: ClipboardText,
  unplaced: HandHeart,
}
const needs = computed(() =>
  props.cards
    .filter((card) => !['roll', 'upcoming'].includes(card.kind))
    .filter((card) => !(card.remember && !card.level))
    .map((card) => ({
      key: card.key,
      title: card.title,
      detail: card.detail,
      icon: card.icon || ICONS[card.kind] || Cake,
      warn: card.tone === 'warn',
      to: card.to || null,
      action: card.kind === 'self' ? 'claim' : null,
    }))
)

// The next few birthdays, from tomorrow (today's are among what needs you).
const coming = computed(() =>
  birthdays.value
    .filter((row) => row.days >= 1)
    .slice(0, 6)
    .map((row) => ({
      key: String(row.member.firestoreId || row.member.id),
      member: row.member,
      title: getFullName(row.member),
      detail: [whenOfBirthday(row.days), row.turning ? `turns ${row.turning}` : ''].filter(Boolean).join(' · '),
      to: { name: 'MemberDetails', params: { id: row.member.id || row.member.firestoreId } },
    }))
)
</script>

<template>
  <!-- The page never scrolls. Its title stays; on a desktop the figures stay
       too and each list scrolls in its own box, and on a phone everything
       under the title scrolls as one. -->
  <div class="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-gray-900">
    <div class="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-[max(1rem,env(safe-area-inset-bottom),calc(var(--bottom-bar-space)+0.75rem))] lg:px-8 lg:pt-8">
      <header class="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 lg:text-3xl dark:text-white">People</h1>
        <RouterLink
          v-if="canAdd"
          :to="{ name: 'Members', query: { add: 'true' } }"
          class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <Plus class="size-4" />
          Add person
        </RouterLink>
      </header>

      <div class="-mx-4 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 lg:mx-0 lg:overflow-hidden lg:px-0">
      <!-- The figures, each opening its section. -->
      <section aria-label="At a glance" class="grid shrink-0 grid-cols-2 gap-4 lg:grid-cols-4">
        <RouterLink
          v-for="stat in stats"
          :key="stat.key"
          :to="stat.to"
          class="flex min-w-0 flex-col rounded-xl bg-white p-5 ring-1 ring-gray-200 transition-colors hover:ring-gray-300 dark:bg-gray-800 dark:ring-gray-700 dark:hover:ring-gray-600"
        >
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</span>
          <span class="mt-2 truncate text-2xl font-bold tabular-nums sm:text-3xl text-gray-900 dark:text-white">{{ loading ? '–' : stat.value.toLocaleString() }}</span>
          <span class="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-primary dark:text-primary-light">
            View
            <ChevronRight class="size-4" />
          </span>
        </RouterLink>
      </section>

      <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)]">
        <section aria-labelledby="people-simple-needs" class="flex min-h-0 flex-col">
          <h2 id="people-simple-needs" class="mb-3 text-base font-semibold text-gray-900 dark:text-white">Needs your attention</h2>
          <SimpleRows :rows="needs" class="min-h-0 lg:overflow-y-auto" @act="emit('claim')">
            <template #empty>
              <p v-if="!needs.length" class="flex items-center gap-3 px-4 py-4 text-base text-gray-600 dark:text-gray-300">
                <CheckCircle class="size-5 text-primary dark:text-primary-light" />
                Nothing needs you right now.
              </p>
            </template>
          </SimpleRows>
        </section>

        <section aria-labelledby="people-simple-birthdays" class="flex min-h-0 flex-col">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 id="people-simple-birthdays" class="text-base font-semibold text-gray-900 dark:text-white">Upcoming birthdays</h2>
            <RouterLink :to="{ name: 'PeopleBirthdays' }" class="text-sm font-semibold text-primary hover:underline dark:text-primary-light">See all</RouterLink>
          </div>
          <SimpleRows :rows="coming" class="min-h-0 lg:overflow-y-auto">
            <template #empty>
              <p v-if="!coming.length" class="px-4 py-4 text-base text-gray-600 dark:text-gray-300">No birthdays in the coming month.</p>
            </template>
          </SimpleRows>
        </section>
      </div>
      </div>
    </div>
  </div>
</template>
