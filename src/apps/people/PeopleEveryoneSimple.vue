<script setup>
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowDown, ArrowUp, Download, Eye, MagnifyingGlass, PencilSimple, Plus, Trash2 } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import SelectMenu from '../../components/common/SelectMenu.vue'
import MemberAvatar from '../../components/members/MemberAvatar.vue'
import { ageOf } from '../../utils/ageBands'
import { getFullName, nicknameOf } from '../../utils/memberUtils'
import { useMediaQuery } from '../../composables/useMediaQuery'

// Everyone in simple view (useSimpleView): the roll as most record systems
// show one. A toolbar (search, a filter by standing, how many are showing),
// a table with headings that sort it, View, Edit and Delete on every row, and
// pages of 25. On a phone the same rows stack as a list, so nothing scrolls
// sideways.
//
// The search is Everyone's own (PeopleEveryone hands it in with the people it
// found), so arriving already searched (?q=) works the same either way, and
// Edit, Delete, Add and Export are Everyone's own too, handed back to it.

const props = defineProps({
  // The people the search found.
  members: { type: Array, required: true },
  total: { type: Number, default: 0 },
  query: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  // May add, change and delete people.
  canEdit: { type: Boolean, default: false },
})

const emit = defineEmits(['update:query', 'add', 'edit', 'delete', 'export'])

/* ---------------------------------------------------------------- filter */

const STANDINGS = [
  { value: 'all', label: 'Everyone' },
  { value: 'members', label: 'Members' },
  { value: 'attendees', label: 'Attendees' },
]
const standing = ref('all')

/* ------------------------------------------------------------------ sort */

// A heading sorts by its column; again turns it round.
const sortKey = ref('name')
const sortAsc = ref(true)
const sortBy = (key) => {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}
const COMPARE = {
  name: (a, b) => getFullName(a).localeCompare(getFullName(b)),
  status: (a, b) => Number(a.isMember === false) - Number(b.isMember === false),
  // People with no age on file go last either way round.
  age: (a, b) => (ageOf(a) ?? Infinity) - (ageOf(b) ?? Infinity),
}
const COLUMNS = [
  // A name needs a quarter of the table, not a third: the room goes to the
  // number, which is read whole or not at all.
  { key: 'name', label: 'Name', width: 'w-[24%]' },
  { key: 'status', label: 'Status', width: 'w-28' },
  { key: 'age', label: 'Age', width: 'w-16' },
]

const rows = computed(() => {
  const list = props.members.filter((m) =>
    standing.value === 'members' ? m.isMember !== false : standing.value === 'attendees' ? m.isMember === false : true
  )
  const compare = COMPARE[sortKey.value]
  const sorted = [...list].sort((a, b) => compare(a, b) || COMPARE.name(a, b))
  return sortAsc.value ? sorted : sorted.reverse()
})

/* ----------------------------------------------------------------- pages */

const PAGE = 25
const page = ref(1)
const pages = computed(() => Math.max(1, Math.ceil(rows.value.length / PAGE)))
const shown = computed(() => rows.value.slice((page.value - 1) * PAGE, page.value * PAGE))
// Back to the first page whenever what is listed changes.
watch([() => props.query, standing, sortKey, sortAsc], () => (page.value = 1))
watch(pages, (n) => {
  if (page.value > n) page.value = n
})

const range = computed(() => {
  if (!rows.value.length) return 'Nobody to show'
  const from = (page.value - 1) * PAGE + 1
  const to = Math.min(page.value * PAGE, rows.value.length)
  return `Showing ${from}–${to} of ${rows.value.length.toLocaleString()}`
})

/* ---------------------------------------------------------------- a row */

// On a desktop the page holds still and the table scrolls its own rows.
const wide = useMediaQuery('(min-width: 1024px)')

const keyOf = (member) => String(member.firestoreId || member.id)
const recordOf = (member) => ({ name: 'MemberDetails', params: { id: member.id || member.firestoreId } })
const ministriesOf = (member) => (member.ministries || []).join(', ')

const subtitle = computed(() => (props.loading ? '' : `${props.total.toLocaleString()} ${props.total === 1 ? 'person' : 'people'}`))

const HEAD = 'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'
const BUTTON =
  'inline-flex h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold ring-1 ring-gray-300 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700'
const ACTION =
  'inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
</script>

<template>
  <AppScreen title="Everyone" :subtitle="subtitle" :back="{ name: 'PeopleHome' }" root="/people" desk :fill="wide">
    <template #action>
      <button type="button" :class="['hidden sm:inline-flex', BUTTON]" @click="emit('export')">
        <Download class="size-4" />
        Export
      </button>
      <button
        v-if="canEdit"
        type="button"
        class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        @click="emit('add')"
      >
        <Plus class="size-4" />
        Add person
      </button>
    </template>

    <!-- The toolbar: search, filter, and how many are showing. -->
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <label class="relative min-w-60 flex-1 sm:max-w-sm">
        <span class="sr-only">Search people</span>
        <MagnifyingGlass class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
        <input
          :value="query"
          type="search"
          placeholder="Search by name, tag, ministry…"
          data-page-search
          class="h-10 w-full rounded-lg border-0 bg-white pl-9 pr-3 text-sm text-gray-900 ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white dark:ring-gray-600"
          @input="emit('update:query', $event.target.value)"
        />
      </label>
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        <span id="everyone-show">Show</span>
        <SelectMenu
          v-model="standing"
          :options="STANDINGS"
          aria-labelledby="everyone-show"
          class="w-36"
          field-class="h-10 rounded-lg bg-white px-3 text-sm text-gray-900 ring-1 ring-gray-300 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white dark:ring-gray-600"
        />
      </div>
      <span class="ml-auto text-sm tabular-nums text-gray-500 dark:text-gray-400">{{ range }}</span>
    </div>

    <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
      <span v-for="n in 8" :key="n" class="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    </div>

    <template v-else>
      <!-- A desk: the table. -->
      <div class="hidden min-h-0 flex-1 overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 lg:flex lg:flex-col dark:bg-gray-800 dark:ring-gray-700">
        <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        <table class="w-full table-fixed text-sm">
          <thead class="sticky top-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <tr>
              <th
                v-for="column in COLUMNS"
                :key="column.key"
                :class="[HEAD, column.width]"
                scope="col"
                :aria-sort="sortKey === column.key ? (sortAsc ? 'ascending' : 'descending') : 'none'"
              >
                <button type="button" class="inline-flex items-center gap-1 uppercase hover:text-gray-900 dark:hover:text-white" @click="sortBy(column.key)">
                  {{ column.label }}
                  <component :is="sortAsc ? ArrowUp : ArrowDown" v-if="sortKey === column.key" class="size-3.5" />
                </button>
              </th>
              <th :class="[HEAD, 'w-44']" scope="col">Phone</th>
              <th :class="HEAD" scope="col">Ministries</th>
              <th :class="[HEAD, 'w-28 text-right']" scope="col">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
            <tr v-for="member in shown" :key="keyOf(member)" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <td class="px-4 py-2.5">
                <RouterLink :to="recordOf(member)" class="flex min-w-0 items-center gap-3 font-semibold text-gray-900 hover:text-primary dark:text-white dark:hover:text-primary-light">
                  <MemberAvatar :member="member" alt="" size="h-9 w-9" class="shrink-0" />
                  <span class="min-w-0">
                    <span class="block truncate">{{ getFullName(member) }}</span>
                    <span v-if="nicknameOf(member)" class="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">“{{ nicknameOf(member) }}”</span>
                  </span>
                </RouterLink>
              </td>
              <td class="px-4 py-2.5">
                <span
                  :class="[
                    'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                    member.isMember === false ? 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' : 'bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light',
                  ]"
                >
                  {{ member.isMember === false ? 'Attendee' : 'Member' }}
                </span>
              </td>
              <td class="px-4 py-2.5 tabular-nums text-gray-700 dark:text-gray-300">{{ ageOf(member) ?? '—' }}</td>
              <td class="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-700 dark:text-gray-300">{{ member.contactNumber || '—' }}</td>
              <td class="truncate px-4 py-2.5 text-gray-700 dark:text-gray-300">{{ ministriesOf(member) || '—' }}</td>
              <td class="px-4 py-2.5">
                <span class="flex justify-end gap-1">
                  <RouterLink :to="recordOf(member)" :class="ACTION" title="View" :aria-label="`View ${getFullName(member)}`"><Eye class="size-4" /></RouterLink>
                  <button v-if="canEdit" type="button" :class="ACTION" title="Edit" :aria-label="`Edit ${getFullName(member)}`" @click="emit('edit', member)">
                    <PencilSimple class="size-4" />
                  </button>
                  <button
                    v-if="canEdit"
                    type="button"
                    :class="[ACTION, 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400']"
                    title="Delete"
                    :aria-label="`Delete ${getFullName(member)}`"
                    @click="emit('delete', member)"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      <!-- A phone: the same rows, stacked. -->
      <ul class="rows-round divide-y divide-gray-100 overflow-hidden rounded-xl bg-white ring-1 ring-gray-200 lg:hidden dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700">
        <li v-for="member in shown" :key="keyOf(member)" class="flex items-center gap-3 px-4 py-3">
          <RouterLink :to="recordOf(member)" class="flex min-w-0 flex-1 items-center gap-3">
            <MemberAvatar :member="member" alt="" size="h-10 w-10" class="shrink-0" />
            <span class="min-w-0">
              <span class="block truncate font-semibold text-gray-900 dark:text-white">{{ getFullName(member) }}</span>
              <span class="block truncate text-sm text-gray-500 dark:text-gray-400">
                {{ member.isMember === false ? 'Attendee' : 'Member' }}<template v-if="member.contactNumber"> · {{ member.contactNumber }}</template>
              </span>
            </span>
          </RouterLink>
          <button v-if="canEdit" type="button" :class="ACTION" :aria-label="`Edit ${getFullName(member)}`" @click="emit('edit', member)">
            <PencilSimple class="size-4" />
          </button>
        </li>
      </ul>

      <p v-if="!shown.length" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {{ total ? 'Nobody matches that.' : 'Nobody on the roll yet.' }}
      </p>

      <!-- Pages. -->
      <div v-if="pages > 1" class="mt-4 flex shrink-0 items-center justify-between gap-3">
        <button type="button" :class="BUTTON" :disabled="page === 1" @click="page -= 1">Previous</button>
        <span class="text-sm tabular-nums text-gray-500 dark:text-gray-400">Page {{ page }} of {{ pages }}</span>
        <button type="button" :class="BUTTON" :disabled="page === pages" @click="page += 1">Next</button>
      </div>
    </template>
  </AppScreen>
</template>
