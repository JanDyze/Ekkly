<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { DownloadSimple, FileArrowUp, Plus, X } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import BirthdayInput from '../../components/members/BirthdayInput.vue'
import { useMembers } from '../../composables/useMembers'
import { useToast } from '../../composables/useToast'
import { addMembers } from '../../api/membersService'
import { CIVIL_STATUS_OPTIONS, OCCUPATION_OPTIONS, calculateAgeFromDate } from '../../utils/memberUtils'
import { SHEET_COLUMNS, cellsFromFile, cellsFromPaste, downloadTemplate, rowsFromCells } from '../../utils/memberImport'

// Adding a whole roll at once: a sheet with a row for each person, filled in
// by hand, pasted from Excel or Google Sheets, or read from a file.
//
// The add sheet (MemberEditSheet) asks about one person in four steps, which
// is right for the newcomer at the door and wrong for a church moving its
// two hundred names out of a spreadsheet. So this is a spreadsheet: one line a
// person, the same columns the sheet they already have probably has, and a
// paste of many rows lands across many rows. A file is read into the sheet
// first, never straight onto the roll, so what is about to be added is seen
// and can be put right — a birthday that could not be read shows blank.
//
// Only a first and last name are needed, as with one person. Someone already
// on the roll under the same name is marked and left out, so importing the
// same file twice does not add everyone twice. Everything goes in one write
// (membersService.addMembers).

const router = useRouter()
const toast = useToast()
const { members } = useMembers()

let nextKey = 0
const blank = () => ({
  key: nextKey++,
  firstName: '',
  lastName: '',
  nickname: '',
  sex: '',
  dateOfBirth: '',
  civilStatus: '',
  occupation: '',
  contactNumber: '',
  address: '',
  // Most people entered in bulk are the church's existing roll, so a row is
  // a member unless it says otherwise.
  isMember: true,
})

const rows = ref(Array.from({ length: 5 }, blank))

const filled = (row) =>
  ['firstName', 'lastName', 'nickname', 'sex', 'dateOfBirth', 'civilStatus', 'occupation', 'contactNumber', 'address'].some(
    (field) => String(row[field] || '').trim()
  )

// There is always an empty row at the foot to type into next.
watch(
  rows,
  (list) => {
    if (!list.length || filled(list[list.length - 1])) list.push(blank())
  },
  { deep: true, immediate: true }
)

/* ------------------------------------------------------------ checking */

const nameKey = (first, last) => `${String(first).trim()} ${String(last).trim()}`.toLowerCase().replace(/\s+/g, ' ')
const onRoll = computed(() => new Set(members.value.map((m) => nameKey(m.firstName, m.lastName))))

/** What is wrong with a row, if anything: 'name' (missing one), 'roll' (already there), or ''. */
const problemOf = (row) => {
  if (!filled(row)) return ''
  if (!String(row.firstName).trim() || !String(row.lastName).trim()) return 'name'
  if (onRoll.value.has(nameKey(row.firstName, row.lastName))) return 'roll'
  return ''
}

const ready = computed(() => rows.value.filter((row) => filled(row) && !problemOf(row)))
const needName = computed(() => rows.value.filter((row) => problemOf(row) === 'name').length)
const already = computed(() => rows.value.filter((row) => problemOf(row) === 'roll').length)

const summary = computed(() =>
  [
    `${ready.value.length} ready`,
    needName.value && `${needName.value} need a first and last name`,
    already.value && `${already.value} already on the roll`,
  ]
    .filter(Boolean)
    .join(' · ')
)

/* ------------------------------------------------------- filling it in */

/** Lays parsed rows over the sheet from `at` down, only the cells they carry. */
const fillFrom = (at, parsed) => {
  parsed.forEach((values, i) => {
    while (rows.value.length <= at + i) rows.value.push(blank())
    const row = rows.value[at + i]
    Object.entries(values).forEach(([field, value]) => {
      if (field === 'isMember') {
        if (value !== null) row.isMember = value
      } else if (field in row && value !== '') {
        row[field] = value
      }
    })
  })
}

// A paste of more than one cell — rows and columns from Excel or Sheets —
// spreads out from the cell it landed in. One plain value is just typed.
const onPaste = (event) => {
  const cell = event.target.closest('[data-cell]')
  if (!cell) return
  const pasted = event.clipboardData?.getData('text/plain') || ''
  if (!/[\t\n]/.test(pasted.trim())) return
  event.preventDefault()
  const parsed = rowsFromCells(cellsFromPaste(pasted), SHEET_COLUMNS.indexOf(cell.dataset.cell))
  fillFrom(Number(cell.dataset.row), parsed)
  toast.success(`Pasted ${parsed.length} ${parsed.length === 1 ? 'row' : 'rows'}`)
}

const fileInput = ref(null)
const reading = ref(false)

const onFile = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  reading.value = true
  try {
    const parsed = rowsFromCells(await cellsFromFile(file))
    if (!parsed.length) {
      toast.error('Could not find anyone in that file. Check it has a row of column names, like First name and Last name.')
      return
    }
    // After whatever is already filled in, never over it.
    const at = rows.value.reduce((last, row, i) => (filled(row) ? i + 1 : last), 0)
    fillFrom(at, parsed)
    toast.success(`Read ${parsed.length} ${parsed.length === 1 ? 'person' : 'people'} from ${file.name}. Check them over, then add.`)
  } catch (error) {
    console.error('Error reading import file:', error)
    toast.error('Could not read that file. Save it as Excel (.xlsx) or CSV and try again.')
  } finally {
    reading.value = false
  }
}

const removeRow = (index) => {
  rows.value.splice(index, 1)
}

const addRows = () => {
  for (let i = 0; i < 5; i += 1) rows.value.push(blank())
}

/* ------------------------------------------------------------- saving */

const saving = ref(false)

const recordOf = (row) => {
  const t = (value) => String(value || '').trim()
  const record = {
    firstName: t(row.firstName),
    lastName: t(row.lastName),
    nickname: t(row.nickname) || t(row.firstName),
    sex: row.sex,
    dateOfBirth: row.dateOfBirth,
    age: row.dateOfBirth ? calculateAgeFromDate(row.dateOfBirth) ?? null : null,
    civilStatus: row.civilStatus,
    occupation: t(row.occupation),
    contactNumber: t(row.contactNumber),
    address: t(row.address),
    relatives: {},
    ministries: [],
    instruments: [],
    tags: [],
    isMember: row.isMember !== false,
    image: null,
  }
  // Blank answers are left off, as a single add leaves them: the record then
  // says the detail is missing rather than holding an empty one.
  Object.keys(record).forEach((key) => {
    if (record[key] === '' || record[key] === undefined) delete record[key]
  })
  return record
}

const save = async () => {
  if (!ready.value.length || saving.value) return
  saving.value = true
  try {
    const firstId = Math.max(0, ...members.value.map((m) => (typeof m.id === 'number' ? m.id : parseInt(m.id) || 0))) + 1
    const count = await addMembers(ready.value.map(recordOf), firstId)
    toast.success(`${count} ${count === 1 ? 'person' : 'people'} added`)
    // What was left out stays, to be fixed and added next.
    const left = rows.value.filter((row) => filled(row) && problemOf(row) === 'name')
    if (left.length) rows.value = left
    else router.push({ name: 'Members' })
  } catch (error) {
    console.error('Error adding people:', error)
    toast.error('Could not add those people. Please try again.')
  } finally {
    saving.value = false
  }
}

/* -------------------------------------------------------------- looks */

const cell =
  'w-full min-w-0 rounded-lg border-0 bg-transparent px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder:text-gray-500 dark:focus:bg-gray-700 dark:scheme-dark'

const COLUMNS = [
  { key: 'firstName', label: 'First name', width: 'w-40' },
  { key: 'lastName', label: 'Last name', width: 'w-36' },
  { key: 'nickname', label: 'Nickname', width: 'w-28' },
  { key: 'sex', label: 'Sex', width: 'w-24' },
  { key: 'dateOfBirth', label: 'Birthday', width: 'w-64' },
  { key: 'civilStatus', label: 'Civil status', width: 'w-28' },
  { key: 'occupation', label: 'Occupation', width: 'w-40' },
  { key: 'contactNumber', label: 'Phone', width: 'w-36' },
  { key: 'address', label: 'Address', width: 'w-56' },
  { key: 'isMember', label: 'Standing', width: 'w-28' },
]
</script>

<template>
  <AppScreen title="Add people" :subtitle="summary" :back="{ name: 'PeopleHome' }" root="/members" wide>
    <div class="flex flex-col gap-4 pb-24">
      <!-- Three ways in: type, paste, or bring a file. -->
      <section class="rounded-2xl bg-white p-4 ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          A row for each person. Only the first and last name are needed. Paste rows from Excel or Google Sheets into any
          cell, or bring a whole file.
        </p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="reading"
            class="flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            @click="fileInput?.click()"
          >
            <FileArrowUp class="size-4" />
            {{ reading ? 'Reading…' : 'Import a file' }}
          </button>
          <button
            type="button"
            class="flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:ring-gray-600 dark:hover:bg-gray-700"
            @click="downloadTemplate"
          >
            <DownloadSimple class="size-4" />
            Get the template
          </button>
          <input ref="fileInput" type="file" accept=".xlsx,.xls,.csv" class="hidden" @change="onFile" />
        </div>
      </section>

      <!-- The sheet. It scrolls sideways on a phone; the first name stays put
           so a row is always somebody. -->
      <div class="overflow-x-auto rounded-2xl bg-white ring-1 ring-gray-200/80 dark:bg-gray-800 dark:ring-gray-700/80" @paste="onPaste">
        <table class="w-max min-w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr class="text-xs font-semibold text-gray-500 dark:text-gray-400">
              <th
                v-for="(col, c) in COLUMNS"
                :key="col.key"
                scope="col"
                :class="[
                  col.width,
                  'border-b border-gray-200 px-3 py-2.5 font-semibold dark:border-gray-700',
                  c === 0 ? 'sticky left-0 z-10 bg-white dark:bg-gray-800' : '',
                ]"
              >
                {{ col.label }}<span v-if="c < 2" class="text-primary dark:text-primary-light"> *</span>
              </th>
              <th class="w-10 border-b border-gray-200 dark:border-gray-700"><span class="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, r) in rows"
              :key="row.key"
              :class="[
                problemOf(row) === 'name' ? 'bg-red-50/60 dark:bg-red-500/5' : problemOf(row) === 'roll' ? 'bg-amber-50/70 dark:bg-amber-500/5' : '',
              ]"
            >
              <!-- First name, with the row's number and anything wrong with it. -->
              <td class="sticky left-0 z-10 border-b border-gray-100 bg-inherit px-1 py-1 dark:border-gray-700/60">
                <div class="flex items-center gap-1 bg-white dark:bg-gray-800">
                  <span class="w-6 shrink-0 text-right text-[11px] tabular-nums text-gray-400">{{ r + 1 }}</span>
                  <div class="min-w-0 flex-1">
                    <input
                      v-model="row.firstName"
                      data-cell="firstName"
                      :data-row="r"
                      autocomplete="off"
                      placeholder="Juan"
                      :aria-label="`Row ${r + 1}, first name`"
                      :class="[cell, problemOf(row) === 'name' && !row.firstName.trim() ? 'ring-1 ring-red-400' : '']"
                    />
                    <p v-if="problemOf(row) === 'roll'" class="truncate px-2 text-[11px] text-amber-700 dark:text-amber-400">Already on the roll</p>
                  </div>
                </div>
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <input
                  v-model="row.lastName"
                  data-cell="lastName"
                  :data-row="r"
                  autocomplete="off"
                  placeholder="Bautista"
                  :aria-label="`Row ${r + 1}, last name`"
                  :class="[cell, problemOf(row) === 'name' && !row.lastName.trim() ? 'ring-1 ring-red-400' : '']"
                />
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <input v-model="row.nickname" data-cell="nickname" :data-row="r" autocomplete="off" placeholder="Jun" :aria-label="`Row ${r + 1}, nickname`" :class="cell" />
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <select v-model="row.sex" data-cell="sex" :data-row="r" :aria-label="`Row ${r + 1}, sex`" :class="cell">
                  <option value="">—</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60" data-cell="dateOfBirth" :data-row="r">
                <BirthdayInput v-model="row.dateOfBirth" compact :field-class="cell" />
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <select v-model="row.civilStatus" data-cell="civilStatus" :data-row="r" :aria-label="`Row ${r + 1}, civil status`" :class="cell">
                  <option value="">—</option>
                  <option v-for="opt in CIVIL_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <input
                  v-model="row.occupation"
                  data-cell="occupation"
                  :data-row="r"
                  list="people-add-occupations"
                  autocomplete="off"
                  placeholder="Teacher"
                  :aria-label="`Row ${r + 1}, occupation`"
                  :class="cell"
                />
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <input
                  v-model="row.contactNumber"
                  data-cell="contactNumber"
                  :data-row="r"
                  type="tel"
                  inputmode="tel"
                  autocomplete="off"
                  placeholder="0917 123 4567"
                  :aria-label="`Row ${r + 1}, phone`"
                  :class="cell"
                />
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <input v-model="row.address" data-cell="address" :data-row="r" autocomplete="off" placeholder="Antipolo, Rizal" :aria-label="`Row ${r + 1}, address`" :class="cell" />
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <select v-model="row.isMember" data-cell="isMember" :data-row="r" :aria-label="`Row ${r + 1}, standing`" :class="cell">
                  <option :value="true">Member</option>
                  <option :value="false">Attendee</option>
                </select>
              </td>
              <td class="border-b border-gray-100 px-1 py-1 dark:border-gray-700/60">
                <button
                  v-if="filled(row)"
                  type="button"
                  class="flex size-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                  :aria-label="`Remove row ${r + 1}`"
                  @click="removeRow(r)"
                >
                  <X class="size-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <datalist id="people-add-occupations">
          <option v-for="opt in OCCUPATION_OPTIONS" :key="opt" :value="opt" />
        </datalist>
      </div>

      <button
        type="button"
        class="flex items-center gap-1.5 self-start rounded-xl px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/10"
        @click="addRows"
      >
        <Plus class="size-4" />
        Five more rows
      </button>
    </div>

    <!-- What will happen, and the one button that does it. -->
    <div class="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95">
      <div class="mx-auto flex max-w-5xl items-center gap-3">
        <p class="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-300">{{ summary }}</p>
        <button
          type="button"
          :disabled="!ready.length || saving"
          class="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
          @click="save"
        >
          {{ saving ? 'Adding…' : ready.length ? `Add ${ready.length} ${ready.length === 1 ? 'person' : 'people'}` : 'Add people' }}
        </button>
      </div>
    </div>
  </AppScreen>
</template>
