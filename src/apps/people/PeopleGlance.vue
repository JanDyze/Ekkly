<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import { usePeopleOverview } from '../../composables/usePeopleOverview'
import { usePeopleGroups } from '../../composables/usePeopleGroups'
import { AGE_BANDS, UNKNOWN_BAND, bandOf } from '../../utils/ageBands'
import { CIVIL_STATUS_OPTIONS, isBlankDetail } from '../../utils/memberUtils'
import { facetRoute } from '../../utils/peopleFacets'

// The roll at a glance: the figures a church is asked for — by a district,
// at an annual meeting, by whoever plans the youth camp — worked out from the
// roll rather than by sorting it and counting headings.
//
//   - the headline figures: everyone, members, attendees, how many serve in
//     a ministry, and how many members are in a small group;
//   - the ages, a bar a group, each split into women and men, so "how many
//     youth girls" reads off the bar;
//   - civil status;
//   - and what the figures cannot count yet: the records with no birthday,
//     sex or civil status, each a line leading to where it is filled in.
//
// Every figure, bar and line opens the people behind it (PeopleFacet, read
// by utils/peopleFacets.js, the same reading these are counted by), so
// seeing "Youth 24" is one tap from who they are. On a phone the same pieces
// stand one under another.

const { loading, members, counts, unplaced, canEdit } = usePeopleOverview()
const { canSee: seesGroups, ungrouped, eligible, loading: groupsLoading } = usePeopleGroups()

const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0)
const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

/* ------------------------------------------------------- headline figures */

const serving = computed(() => counts.value.total - unplaced.value.length)
const grouped = computed(() => eligible.value.length - ungrouped.value.length)

const figures = computed(() => [
  { key: 'everyone', label: 'Everyone', value: counts.value.total.toLocaleString(), note: 'on the roll', to: { name: 'Members' } },
  { key: 'members', label: 'Members', value: counts.value.members.toLocaleString(), note: `${pct(counts.value.members, counts.value.total)}% of the roll`, to: facetRoute({ standing: 'members' }) },
  { key: 'attendees', label: 'Attendees', value: counts.value.attendees.toLocaleString(), note: `${pct(counts.value.attendees, counts.value.total)}% of the roll`, to: facetRoute({ standing: 'attendees' }) },
  { key: 'serving', label: 'Serving', value: `${pct(serving.value, counts.value.total)}%`, note: `${serving.value.toLocaleString()} in a ministry`, to: facetRoute({ serving: 'yes' }) },
  ...(seesGroups.value
    ? [
        {
          key: 'grouped',
          label: 'In a small group',
          value: groupsLoading.value ? '–' : `${pct(grouped.value, eligible.value.length)}%`,
          note: `${grouped.value.toLocaleString()} of ${plural(eligible.value.length, 'member', 'members')}`,
          to: facetRoute({ grouped: 'yes' }),
        },
      ]
    : []),
])

/* -------------------------------------------------------------- the ages */

// Each age group with its women, its men, and those whose sex is not on file.
const SEXES = [
  { key: 'Female', label: 'Women and girls', short: 'Women', barClass: 'bg-pink-500 dark:bg-pink-400' },
  { key: 'Male', label: 'Men and boys', short: 'Men', barClass: 'bg-blue-500 dark:bg-blue-400' },
  { key: 'unknown', label: 'Sex not on file', short: 'Not on file', barClass: 'bg-gray-300 dark:bg-gray-600' },
]
const sexOf = (member) => (member.sex === 'Male' || member.sex === 'Female' ? member.sex : 'unknown')

const ages = computed(() => {
  const rows = [...AGE_BANDS, UNKNOWN_BAND].map((band) => ({
    key: band.key,
    label: band.key === 'unknown' ? 'Age not on file' : band.label,
    dotClass: band.dotClass,
    total: 0,
    bySex: { Female: 0, Male: 0, unknown: 0 },
  }))
  members.value.forEach((member) => {
    const row = rows.find((r) => r.key === (bandOf(member)?.key || 'unknown'))
    row.total += 1
    row.bySex[sexOf(member)] += 1
  })
  const most = Math.max(1, ...rows.map((row) => row.total))
  return rows
    .filter((row) => row.total || row.key !== 'unknown')
    .map((row) => ({
      ...row,
      share: pct(row.total, counts.value.total),
      // Each part of the bar, as wide as its count against the biggest group,
      // so the groups compare by length as well as by number.
      segments: SEXES.filter((sex) => row.bySex[sex.key]).map((sex) => ({
        ...sex,
        count: row.bySex[sex.key],
        width: `${(row.bySex[sex.key] / most) * 100}%`,
        // A count fits inside a part only when the part is wide enough to hold it.
        roomy: row.bySex[sex.key] / most >= 0.07,
        to: facetRoute({ band: row.key, sex: sex.key }),
      })),
      to: facetRoute({ band: row.key }),
    }))
})

/* --------------------------------------------------------- civil status */

const civil = computed(() => {
  const rows = [...CIVIL_STATUS_OPTIONS.map((o) => ({ key: o.value, label: o.label })), { key: 'unknown', label: 'Not on file' }].map(
    (row) => ({ ...row, count: 0 })
  )
  members.value.forEach((member) => {
    const key = isBlankDetail(member.civilStatus) ? 'unknown' : member.civilStatus
    const row = rows.find((r) => r.key === key)
    if (row) row.count += 1
  })
  const most = Math.max(1, ...rows.map((row) => row.count))
  return rows
    .filter((row) => row.count || row.key !== 'unknown')
    .map((row) => ({ ...row, width: `${(row.count / most) * 100}%`, to: facetRoute({ civil: row.key }) }))
})

/* ----------------------------------------------------------- the gaps */

// What the figures cannot count yet, each with where it is filled in: the
// birthdays and sexes Missing info lists, for whoever may fill them in; and
// otherwise, the people themselves.
const gaps = computed(() => {
  const noBirthday = members.value.filter((m) => isBlankDetail(m.dateOfBirth)).length
  const noSex = members.value.filter((m) => sexOf(m) === 'unknown').length
  const noCivil = members.value.filter((m) => isBlankDetail(m.civilStatus)).length
  return [
    noBirthday && { key: 'birthday', text: `${plural(noBirthday, 'person has', 'people have')} no birthday on file`, to: canEdit.value ? { name: 'PeopleMissing' } : facetRoute({ band: 'unknown' }) },
    noSex && { key: 'sex', text: `${plural(noSex, 'person has', 'people have')} no sex on file`, to: canEdit.value ? { name: 'PeopleMissing' } : facetRoute({ sex: 'unknown' }) },
    noCivil && { key: 'civil', text: `${plural(noCivil, 'person has', 'people have')} no civil status on file`, to: facetRoute({ civil: 'unknown' }) },
  ].filter(Boolean)
})

const subtitle = computed(() => (loading.value ? '' : plural(counts.value.total, 'person', 'people')))

const CARD = 'rounded-2xl bg-white p-5 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80'
const HEADING = 'text-sm font-semibold text-gray-900 dark:text-white'
</script>

<template>
  <AppScreen title="Overview" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/people" desk>
    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <span v-for="n in 5" :key="n" class="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
      </div>
      <span class="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
    </div>

    <!-- Room round each card for its focus ring, which the scrolling area
         would otherwise clip. -->
    <div v-else class="flex flex-col gap-5 p-0.5">
      <!-- The headline figures, each opening its people. -->
      <section aria-label="Headline figures" :class="['grid grid-cols-2 gap-3', figures.length > 4 ? 'sm:grid-cols-3 lg:grid-cols-5' : 'lg:grid-cols-4']">
        <RouterLink
          v-for="figure in figures"
          :key="figure.key"
          :to="figure.to"
          class="group flex flex-col rounded-2xl bg-white p-4 ring-1 ring-gray-200/80 transition-colors hover:ring-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
        >
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ figure.label }}</span>
          <span class="mt-1 text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">{{ figure.value }}</span>
          <span class="mt-0.5 flex items-center justify-between gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span class="truncate">{{ figure.note }}</span>
            <ChevronRight class="size-4 shrink-0 text-gray-300 transition-colors group-hover:text-primary dark:text-gray-600 dark:group-hover:text-primary-light" />
          </span>
        </RouterLink>
      </section>

      <div class="grid gap-5 lg:grid-cols-3 lg:items-start">
        <!-- The ages, a bar a group, split into women and men. -->
        <section aria-labelledby="glance-ages" :class="[CARD, 'lg:col-span-2']">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 id="glance-ages" :class="HEADING">Ages</h2>
            <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400" aria-label="What the colours mean">
              <li v-for="sex in SEXES" :key="sex.key" class="flex items-center gap-1.5">
                <span :class="['size-2.5 rounded-full', sex.barClass]" aria-hidden="true" />
                {{ sex.short }}
              </li>
            </ul>
          </div>

          <ul class="mt-4 flex flex-col gap-3.5">
            <li v-for="row in ages" :key="row.key" class="grid grid-cols-[7rem_minmax(0,1fr)_4.5rem] items-center gap-3 sm:grid-cols-[8.5rem_minmax(0,1fr)_5rem]">
              <RouterLink :to="row.to" class="flex min-w-0 items-center gap-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-200 dark:hover:text-primary-light">
                <span :class="['size-2.5 shrink-0 rounded-full', row.dotClass]" aria-hidden="true" />
                <span class="truncate">{{ row.label }}</span>
              </RouterLink>
              <!-- The bar: its parts are the women, the men and the rest, each
                   opening those people. -->
              <div class="flex h-7 min-w-0 gap-0.5">
                <RouterLink
                  v-for="segment in row.segments"
                  :key="segment.key"
                  :to="segment.to"
                  :style="{ width: segment.width }"
                  :aria-label="`${row.label}, ${segment.label}: ${segment.count}`"
                  :title="`${segment.label}: ${segment.count}`"
                  :class="[
                    'flex min-w-1.5 items-center justify-center rounded-md text-xs font-bold tabular-nums text-white transition-opacity first:rounded-l-lg last:rounded-r-lg hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800',
                    segment.barClass,
                  ]"
                >
                  <span v-if="segment.roomy">{{ segment.count }}</span>
                </RouterLink>
              </div>
              <span class="text-right text-sm tabular-nums">
                <span class="font-semibold text-gray-900 dark:text-white">{{ row.total.toLocaleString() }}</span>
                <span class="ml-1.5 text-xs text-gray-500 dark:text-gray-400">{{ row.share }}%</span>
              </span>
            </li>
          </ul>
        </section>

        <div class="flex flex-col gap-5">
          <!-- Civil status. -->
          <section aria-labelledby="glance-civil" :class="CARD">
            <h2 id="glance-civil" :class="HEADING">Civil status</h2>
            <ul class="mt-3 flex flex-col gap-1">
              <li v-for="row in civil" :key="row.key">
                <RouterLink :to="row.to" class="-mx-2 block rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-700/40">
                  <span class="flex items-baseline justify-between gap-3 text-sm">
                    <span :class="row.key === 'unknown' ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'">{{ row.label }}</span>
                    <span class="font-semibold tabular-nums text-gray-900 dark:text-white">{{ row.count.toLocaleString() }}</span>
                  </span>
                  <span class="mt-1 block h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <span :class="['block h-full rounded-full', row.key === 'unknown' ? 'bg-gray-300 dark:bg-gray-600' : 'bg-primary dark:bg-primary-light']" :style="{ width: row.width }" />
                  </span>
                </RouterLink>
              </li>
            </ul>
          </section>

          <!-- What the figures cannot count yet. -->
          <section v-if="gaps.length" aria-labelledby="glance-gaps" :class="CARD">
            <h2 id="glance-gaps" :class="HEADING">Not on file yet</h2>
            <ul class="mt-2 flex flex-col">
              <li v-for="gap in gaps" :key="gap.key">
                <RouterLink :to="gap.to" class="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm text-amber-800 transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-amber-300 dark:hover:bg-amber-500/10">
                  {{ gap.text }}
                  <ChevronRight class="size-4 shrink-0" />
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </AppScreen>
</template>
