<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Heart, MagnifyingGlass, Plus, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import PrayerConcernListItem from '../../components/prayerConcerns/PrayerConcernListItem.vue'
import PrayerConcernDrawer from '../../components/prayerConcerns/PrayerConcernDrawer.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import { usePermissions } from '../../composables/usePermissions'
import { useToast } from '../../composables/useToast'
import {
  usePrayerOverview,
  comparePressing,
  isPressing,
  lastNewsOn,
  matchesPrayerQuery,
  monthLabel,
  raisedOn,
} from '../../composables/usePrayerOverview'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import { todayKey } from '../../utils/taskUtils'

// Every list in the Prayer app is this screen, told by its route which
// concerns it is about: the ones being prayed for now (PrayerNow), the long
// needs (PrayerOngoing), the answered ones (PrayerAnswered), and every one of
// them (PrayerConcerns). It began as the Prayer Concerns page, and the rows
// and the drawer are the ones that page had, brought into line.
//
// Each list is grouped by month, newest first, the way the page always was —
// an answered prayer under the month it was answered in. Praying now puts the
// requests marked urgent or high above the months, because whoever marked
// them asked for that. The search reaches everything on a concern, and the
// words a row only shows: "urgent", "ongoing", "no news".
//
// A card on the home can narrow every concern to what it was about
// (?show=new, ?show=quiet), with a way back to the whole list, and can open
// one concern straight away (?open=<id>).

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { myMember } = usePermissions()
const {
  concerns,
  loading,
  canEdit,
  today,
  personOf,
  praying,
  ongoing,
  answered,
  newThisWeek,
  quiet,
  addConcern,
  updateConcern,
  removeConcern,
} = usePrayerOverview()

/* ----------------------------------------------------- which list this is */

const mode = computed(
  () => ({ PrayerNow: 'now', PrayerOngoing: 'ongoing', PrayerAnswered: 'answered' })[route.name] || 'all'
)

const SHOWS = {
  new: { label: 'New this week', list: newThisWeek },
  quiet: { label: 'No news in a while', list: quiet },
}
const show = computed(() => (mode.value === 'all' ? SHOWS[route.query.show] || null : null))

const title = computed(
  () => ({ now: 'Praying now', ongoing: 'Ongoing', answered: 'Answered', all: 'All concerns' })[mode.value]
)

const inScope = computed(() => {
  if (show.value) return show.value.list.value
  switch (mode.value) {
    case 'now':
      return praying.value
    case 'ongoing':
      return ongoing.value
    case 'answered':
      return answered.value
    default:
      return [...concerns.value].sort((a, b) => raisedOn(b).localeCompare(raisedOn(a)))
  }
})

const subtitle = computed(() => {
  if (loading.value) return ''
  const n = inScope.value.length
  if (show.value) return `${n} of ${concerns.value.length.toLocaleString()}`
  if (mode.value === 'now') return n ? `${n} being prayed for` : ''
  if (mode.value === 'ongoing') return n ? `${n} ongoing` : ''
  if (mode.value === 'answered') return n ? `${n} answered` : ''
  return `${n.toLocaleString()} ${n === 1 ? 'concern' : 'concerns'}`
})

const clearShow = () => {
  const { show: _drop, ...rest } = route.query
  router.replace({ query: rest })
}

/* ----------------------------------------------------------------- search */

const searchQuery = ref(String(route.query.q || ''))
watch(
  () => route.query.q,
  (q) => {
    searchQuery.value = String(q || '')
  }
)

const matching = computed(() => inScope.value.filter((c) => matchesPrayerQuery(c, searchQuery.value, today)))

/** Concerns by month, newest first, each month keeping the list's own order. */
const byMonth = (list, dayOf) => {
  const groups = new Map()
  for (const concern of list) {
    const key = (dayOf(concern) || '').slice(0, 7) || 'none'
    if (!groups.has(key)) groups.set(key, { key, label: monthLabel(dayOf(concern)), concerns: [] })
    groups.get(key).concerns.push(concern)
  }
  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}

const groups = computed(() => {
  const list = matching.value
  // A card's few, as one block in the order the card meant them.
  if (show.value) return list.length ? [{ key: 'show', label: show.value.label, concerns: list }] : []
  if (mode.value === 'answered') return byMonth(list, lastNewsOn)
  if (mode.value === 'now') {
    const first = list.filter(isPressing).sort(comparePressing)
    const rest = list.filter((c) => !isPressing(c))
    return [
      ...(first.length ? [{ key: 'first', label: 'Pray for these first', concerns: first }] : []),
      ...byMonth(rest, raisedOn),
    ]
  }
  return byMonth(list, raisedOn)
})

const emptyLine = computed(() => {
  if (searchQuery.value.trim()) {
    return { title: `Nothing matches “${searchQuery.value.trim()}”`, detail: 'Try a name, or a word from the request.' }
  }
  if (show.value) return { title: 'Nothing here now', detail: 'Everything it was about has moved on.' }
  const add = canEdit.value ? 'Add one with the + button.' : 'Requests show here once someone adds them.'
  switch (mode.value) {
    case 'now':
      return { title: 'Nothing on the prayer list', detail: add }
    case 'ongoing':
      return { title: 'Nothing ongoing', detail: 'Long needs — an illness, a family far away — are kept here.' }
    case 'answered':
      return { title: 'No answered prayers yet', detail: 'Mark a concern answered and it is kept here, to give thanks for.' }
    default:
      return { title: 'No prayer concerns yet', detail: add }
  }
})

/* --------------------------------------------------------------- the drawer */

const blankConcern = () => ({
  title: '',
  // Most concerns are raised by whoever is filling the form, so a new one
  // starts pointed at their own record when their account has been linked.
  memberId: myMember.value ? memberKey(myMember.value) : '',
  memberName: myMember.value ? getFullName(myMember.value) : '',
  description: '',
  // One added from Ongoing is a long need from the start.
  status: mode.value === 'ongoing' ? 'ongoing' : 'active',
  priority: 'normal',
  date: todayKey(),
  notes: '',
})

const showAdd = ref(false)
const showEdit = ref(false)
const editing = ref(null)
const form = ref(blankConcern())

const selectedId = computed(() => (editing.value ? editing.value.firestoreId || editing.value.id : null))

const closeDrawer = () => {
  showAdd.value = false
  showEdit.value = false
  editing.value = null
  form.value = blankConcern()
}

const newConcern = () => {
  if (showAdd.value) return closeDrawer()
  editing.value = null
  showEdit.value = false
  form.value = blankConcern()
  showAdd.value = true
}

// Everyone who may see a concern can open it and read the whole of it; only
// whoever looks after the list gets the form.
const openConcern = (concern) => {
  const { firestoreId, id, createdAt, updatedAt, ...fields } = concern
  form.value = { ...blankConcern(), ...fields }
  editing.value = concern
  showAdd.value = false
  showEdit.value = true
}

// A card on the home that is about one concern opens it here. The query is
// dropped once it has, so closing the drawer does not open it again.
watch(
  [() => route.query.open, concerns],
  ([id]) => {
    if (!id) return
    const concern = concerns.value.find((c) => String(c.firestoreId || c.id) === String(id))
    if (!concern) return
    openConcern(concern)
    const { open: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

// The home's quick actions open a new concern here (`?add=1`). The query is
// dropped once it has, so closing the drawer does not open it again.
watch(
  () => route.query.add,
  (add) => {
    if (!add) return
    if (canEdit.value) newConcern()
    const { add: _drop, ...rest } = route.query
    router.replace({ query: rest })
  },
  { immediate: true }
)

const saveConcern = async () => {
  try {
    if (showEdit.value && editing.value) {
      await updateConcern(editing.value, form.value)
    } else {
      await addConcern(form.value)
    }
    closeDrawer()
  } catch (error) {
    console.error('Error saving prayer concern:', error)
    toast.error('Could not save that prayer concern. Please try again.')
  }
}

/* -------------------------------------------------------------- deleting */

const showConfirmation = ref(false)
const pendingDelete = ref(null)
const deleteMessage = computed(
  () => `Delete "${pendingDelete.value?.title || 'this prayer concern'}"? This cannot be undone.`
)

const askToDelete = (concern) => {
  if (!concern) return
  pendingDelete.value = concern
  showConfirmation.value = true
}

const confirmDelete = async () => {
  const concern = pendingDelete.value
  showConfirmation.value = false
  if (!concern) return
  try {
    await removeConcern(concern)
    if (editing.value && (editing.value.firestoreId || editing.value.id) === (concern.firestoreId || concern.id)) closeDrawer()
  } catch (error) {
    console.error('Error deleting prayer concern:', error)
    toast.error('Could not delete that prayer concern. Please try again.')
  } finally {
    pendingDelete.value = null
  }
}
</script>

<template>
  <AppScreen :title="title" :subtitle="subtitle" :back="{ name: 'PrayerHome' }" root="/prayer-concerns" fill wide desk>
    <template #action>
      <button
        v-if="canEdit && mode !== 'answered'"
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-colors hover:bg-primary-hover"
        :aria-label="showAdd ? 'Close new prayer concern' : 'New prayer concern'"
        @click="newConcern"
      >
        <X v-if="showAdd" class="size-5" />
        <Plus v-else class="size-5" />
      </button>
    </template>

    <div class="flex min-h-0 flex-1">
      <div class="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pb-6">
        <!-- On a desktop the concerns are cards across the width (ListGroup on
             a desk screen), the one opened beside them. -->
        <div class="mx-auto flex max-w-2xl flex-col gap-4 lg:max-w-none">
          <!-- Search: above the list, never scrolled away from. -->
          <label class="relative block lg:max-w-xl">
            <MagnifyingGlass class="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-gray-400" />
            <input
              v-model="searchQuery"
              type="search"
              autocomplete="off"
              enterkeyhint="search"
              placeholder="Search — a name, a word, “urgent”"
              aria-label="Search prayer concerns"
              class="h-11 w-full rounded-xl border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </label>

          <!-- What a card on the home narrowed this to, and the way back to all. -->
          <div
            v-if="show"
            class="flex items-center justify-between gap-3 rounded-xl bg-primary/10 py-1.5 pl-3.5 pr-1.5 text-sm text-primary dark:bg-primary-light/15 dark:text-primary-light"
          >
            <span class="min-w-0 truncate font-semibold">{{ show.label }}</span>
            <button
              type="button"
              class="h-8 shrink-0 rounded-lg px-3 font-medium transition-colors hover:bg-primary/10 dark:hover:bg-primary-light/15"
              @click="clearShow"
            >
              Show all
            </button>
          </div>

          <div v-if="loading" class="flex flex-col gap-2">
            <div v-for="n in 6" :key="n" class="flex items-center gap-3 rounded-2xl bg-white p-3 dark:bg-gray-800">
              <div class="size-10 shrink-0 animate-pulse rounded-full bg-gray-200 dark:bg-gray-600" />
              <div class="flex-1 space-y-2">
                <div class="h-3.5 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
                <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
              </div>
            </div>
          </div>

          <div v-else-if="!groups.length" class="flex flex-col items-center justify-center px-8 py-16 text-center text-gray-500 dark:text-gray-400">
            <Heart class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p class="mb-1 text-lg">{{ emptyLine.title }}</p>
            <p class="text-sm">{{ emptyLine.detail }}</p>
          </div>

          <template v-else>
            <ListGroup v-for="group in groups" :key="group.key" :title="group.label" :count="group.concerns.length">
              <PrayerConcernListItem
                v-for="concern in group.concerns"
                :key="concern.firestoreId || concern.id"
                :concern="concern"
                :person="personOf(concern)"
                :today="today"
                :selected="selectedId === (concern.firestoreId || concern.id)"
                :show-status="mode === 'all'"
                @open="openConcern"
              />
            </ListGroup>
          </template>
        </div>
      </div>

      <!-- Beside the list on a computer, a sheet on a phone. -->
      <PrayerConcernDrawer
        :show="showAdd || showEdit"
        :is-edit="showEdit"
        :read-only="!canEdit"
        :can-delete="canEdit"
        :concern-data="form"
        @update:show="(open) => { if (!open) closeDrawer() }"
        @update:concern-data="form = $event"
        @save="saveConcern"
        @cancel="closeDrawer"
        @delete="askToDelete(editing)"
      />
    </div>

    <ConfirmationModal
      :show="showConfirmation"
      title="Delete prayer concern"
      :message="deleteMessage"
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="showConfirmation = $event"
      @confirm="confirmDelete"
      @cancel="showConfirmation = false"
    />
  </AppScreen>
</template>
