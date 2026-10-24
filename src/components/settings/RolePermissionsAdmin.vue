<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Eye, KeyRound, Info, Users } from '../../icons'
import { seeAs, usePermissions } from '../../composables/usePermissions'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { setRolePermissions } from '../../api/rolePermissionsService'
import { useMinistries } from '../../composables/useMinistries'
import { AREAS, viewCap, manageCap, BASELINE_CAPABILITIES } from '../../data/capabilities'

// What each ministry may do, one ministry at a time.
//
// This was a grid of every area against every ministry, a box to tick for
// seeing and another for changing: forty-odd boxes across eleven columns,
// which on the width Settings has showed four ministries and scrolled
// sideways for the rest, and asked whoever set it up to read "Treasurer ×
// finances.manage" off two axes at once. Now a ministry is picked, and each
// area is one choice of three — Nothing, See, Change — with a sentence over
// them saying what the ministry adds up to. The stored grants are the same
// (rolePermissions, a list of capabilities per ministry), and the database
// rules hold everyone to them (lib/caps.js).

const toast = useToast()
const router = useRouter()
const { user } = useAuth()
const { isAdmin, roleMap, members } = usePermissions()
const { ministryNames } = useMinistries()

// Only ministries can be granted anything. This deliberately does not merge in
// values found on member documents the way it used to with tags: back then a
// free-text label typed onto a member became grantable, so a label that
// happened to match a role handed out that role's access.
const ministries = computed(() => [...ministryNames.value].sort((a, b) => a.localeCompare(b)))

const picked = ref('')
watch(
  ministries,
  (list) => {
    if (!list.includes(picked.value)) picked.value = list[0] || ''
  },
  { immediate: true }
)

const serving = (name) => members.value.filter((m) => (m.ministries || []).includes(name))
const linked = (name) => serving(name).filter((m) => m.uid).length

// What seeing and changing each area means, in the words of the screens it
// opens. An area missing here falls back to its label.
const MEANS = {
  events: ['The calendar', 'Add and change events'],
  songs: ['The song list', 'Add songs, lyrics and keys'],
  lineups: ['Every Sunday’s line-up', 'Plan every team’s part of a Sunday'],
  worship: ['', 'Plan the songs and who sings and plays'],
  preaching: ['', 'Plan each Sunday’s message'],
  ushers: ['', 'Plan who is on the door'],
  consolidation: ['Newcomers and their follow-up notes', 'Follow newcomers up and plan the welcome'],
  links: ['The church’s links', 'Add and change links'],
  gallery: ['The photo albums', 'Add albums and photos'],
  members: ['People, with phone numbers and addresses', 'Add and change people (not their ministries)'],
  smallgroups: ['Small groups and their meetings', 'Run groups and log their meetings'],
  attendance: ['Who came, gathering by gathering', 'Count and record attendance'],
  minutes: ['Meeting minutes', 'Write minutes and decisions'],
  finances: ['The books', 'Enter giving and spending'],
  tasks: ['Everyone’s tasks', 'Give tasks to people'],
  inventory: ['The church’s equipment', 'Add things and lend them out'],
  prayer: ['Prayer concerns', 'Add and update prayer concerns'],
  teaching: ['Sermon notes, classes and lessons', 'Write sermons and plan lessons'],
}

// The areas a ministry can be given. The dashboard is everyone's and has
// nothing to change, so it has no row.
const rows = computed(() =>
  AREAS.filter((area) => area.manageable !== false || area.viewable !== false)
    .filter((area) => area.key !== 'dashboard')
    .map((area) => {
      const baseline = BASELINE_CAPABILITIES.includes(viewCap(area.key))
      const [see, change] = MEANS[area.key] || [area.label, `Change ${area.label.toLowerCase()}`]
      // A Schedules team has no seeing of its own: seeing Schedules is seeing
      // it. So its choice is between nothing and planning its part.
      const options =
        area.viewable === false
          ? [
              { level: 'none', label: 'Nothing' },
              { level: 'manage', label: 'Plan' },
            ]
          : [
              ...(baseline ? [] : [{ level: 'none', label: 'Nothing' }]),
              { level: 'view', label: baseline ? 'See (everyone)' : 'See' },
              ...(area.manageable === false ? [] : [{ level: 'manage', label: 'Change' }]),
            ]
      return { area, baseline, see, change, options }
    })
)

const grants = computed(() => new Set(roleMap.value[picked.value] || []))

const levelOf = (row) => {
  if (grants.value.has(manageCap(row.area.key))) return 'manage'
  if (row.baseline || grants.value.has(viewCap(row.area.key))) return 'view'
  return 'none'
}

const saving = ref('')

const setLevel = async (row, level) => {
  if (levelOf(row) === level || saving.value) return
  const name = picked.value
  const next = new Set(roleMap.value[name] || [])
  next.delete(viewCap(row.area.key))
  next.delete(manageCap(row.area.key))
  // Managing implies seeing; both are stored so the grant reads on its own.
  if (level === 'manage') {
    next.add(manageCap(row.area.key))
    if (row.area.viewable !== false && !row.baseline) next.add(viewCap(row.area.key))
  }
  if (level === 'view' && !row.baseline) next.add(viewCap(row.area.key))

  saving.value = row.area.key
  try {
    await setRolePermissions(name, [...next], user.value)
  } catch (e) {
    console.error('Error saving role permissions:', e)
    toast.error('Could not save that change. Please try again.')
  } finally {
    saving.value = ''
  }
}

// Shown the app as this ministry's people are shown it, from its home, until
// the bar over every screen stops it (SeeAsBar).
const seeAsPicked = () => {
  seeAs(picked.value)
  router.push('/home')
}

// "change the books and give tasks; see the church's equipment."
const lower = (text) => text.charAt(0).toLowerCase() + text.slice(1)
const listOf = (items) =>
  items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
const summary = computed(() => {
  const changes = rows.value.filter((row) => levelOf(row) === 'manage').map((row) => lower(row.change))
  const sees = rows.value
    .filter((row) => levelOf(row) === 'view' && !row.baseline)
    .map((row) => lower(row.see))
  if (!changes.length && !sees.length) return 'Nothing beyond what everyone in the church can see.'
  const parts = [
    changes.length ? `Can ${listOf(changes)}` : '',
    sees.length ? `${changes.length ? 'see' : 'Can see'} ${listOf(sees)}` : '',
  ].filter(Boolean)
  return `${parts.join(', and ')}.`
})
</script>

<template>
  <section
    class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden"
  >
    <div class="section-head flex items-start gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-700">
      <div class="p-2 rounded-lg bg-primary/10 shrink-0">
        <KeyRound class="h-5 w-5 text-primary dark:text-primary-light" />
      </div>
      <div class="min-w-0">
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Roles</h2>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          What each ministry lets the people in it see and change
        </p>
      </div>
    </div>

    <p v-if="!isAdmin" class="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
      Only administrators can change roles.
    </p>

    <p v-else-if="!ministries.length" class="px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
      No ministries yet. Add them under Ministries, then give each what it needs here.
    </p>

    <div v-else class="p-4 lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
      <!-- The ministries: chips that wrap on a phone, a list down the side on
           a desktop. -->
      <div role="tablist" aria-label="Ministries" class="flex flex-wrap gap-2 p-0.5 lg:flex-col lg:flex-nowrap lg:gap-1">
        <button
          v-for="name in ministries"
          :key="name"
          type="button"
          role="tab"
          :aria-selected="picked === name"
          @click="picked = name"
          :class="[
            'rounded-lg px-3 py-2 text-left text-sm transition-colors',
            picked === name
              ? 'bg-primary/10 font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100 lg:bg-transparent dark:bg-gray-900/40 dark:text-gray-300 dark:hover:bg-gray-700/50 lg:dark:bg-transparent',
          ]"
        >
          <span class="block">{{ name }}</span>
          <span class="hidden text-xs font-normal text-gray-500 lg:block dark:text-gray-400">{{ serving(name).length }} serving</span>
        </button>
      </div>

      <div class="mt-4 min-w-0 lg:mt-0" role="tabpanel" :aria-label="picked">
        <div class="rounded-lg bg-gray-50 p-3 dark:bg-gray-900/40">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ picked }}</p>
          <p class="mt-1 text-sm text-gray-700 dark:text-gray-300">{{ summary }}</p>
          <p class="mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Users class="h-3.5 w-3.5 shrink-0" />
            {{ serving(picked).length }} serving, {{ linked(picked) }} with an account linked. Only a linked account
            gets what a ministry gives.
          </p>
          <button
            type="button"
            class="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
            @click="seeAsPicked"
          >
            <Eye class="h-4 w-4" />
            See the app as a {{ picked }}
          </button>
        </div>

        <ul class="mt-3 divide-y divide-gray-100 dark:divide-gray-700/60">
          <li v-for="row in rows" :key="row.area.key" class="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ row.area.label }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ levelOf(row) === 'manage' ? row.change : row.see || row.change }}
              </p>
            </div>
            <div
              role="radiogroup"
              :aria-label="`${picked}: ${row.area.label}`"
              class="flex shrink-0 items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900/60"
            >
              <button
                v-for="option in row.options"
                :key="option.level"
                type="button"
                role="radio"
                :aria-checked="levelOf(row) === option.level"
                :disabled="Boolean(saving)"
                @click="setLevel(row, option.level)"
                :class="[
                  'inline-flex h-8 items-center gap-1 rounded-md px-3 text-xs font-semibold transition-colors',
                  levelOf(row) === option.level
                    ? option.level === 'manage'
                      ? 'bg-amber-500 text-white'
                      : option.level === 'view'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-900 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-600 hover:bg-white/70 dark:text-gray-300 dark:hover:bg-gray-700/60',
                ]"
              >
                {{ option.label }}
              </button>
            </div>
          </li>
        </ul>

        <div class="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
          <Info class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <p>
            Administrators can see and change everything, whatever their ministry. Tags never give anything.
            Areas marked “everyone” are seen by all who have been let in.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>
