<script setup>
// The public page as a record, read the way the church's own record is read.
//
// It used to be the whole page as a form: six blocks of live inputs under one
// Save, with a link to the setup guide at the top for anyone who would rather
// be asked one thing at a time. That link was the tell — a screen that needs an
// escape hatch to a gentler version of itself is too much screen. The guide is
// for a church's first hour and the router already sends a new administrator
// there; it is not a row in Settings.
//
// So: what the page says, in plain type, grouped the way the page itself
// reads. One Edit per group, opening the stepped sheet at that group — the
// shape ChurchSettings.vue already uses for the church.
//
// Neither this nor the sheet lists the fields. Both read them from
// src/data/landingSchema.js, so what is shown here and what can be edited
// there cannot fall out of step, and the vocabulary they are written in is the
// one the /landing-lab prototype describes its section types in.
//
// What stays out here rather than in the sheet: the hero photo, the three
// switches and the album picker. Each is one tap with nothing to type
// alongside it, so each saves where it stands, the way the logo does.
import { computed, onUnmounted, ref } from 'vue'
import {
  Check,
  ExternalLink,
  EyeOff,
  Globe,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Loader2,
  Pencil,
  RotateCcw,
  ShieldAlert,
} from '../../icons'
import { usePermissions } from '../../composables/usePermissions'
import { useAppSettings } from '../../composables/useAppSettings'
import { useToast } from '../../composables/useToast'
import { subscribeToAlbums } from '../../api/galleryService'
import { compressImageToBase64, HERO_OPTIONS } from '../../utils/imageUtils'
import { uploadImage } from '../../api/blobService'
import { SETTINGS_STEPS } from '../../data/landingSchema'
import bundledHero from '../../assets/hero-cover.webp'
import LandingEditSheet from './LandingEditSheet.vue'
import SectionCard from '../common/SectionCard.vue'

const toast = useToast()
const { isAdmin } = usePermissions()
const { landing, saveLanding } = useAppSettings()

/**
 * What the card shows: every step of the editor, read rather than filled in.
 *
 * Derived from the same descriptors the sheet edits (src/data/landingSchema.js)
 * so the two cannot drift — a field added there appears here without anyone
 * remembering to add it. `step` is which step of the editor a group belongs to,
 * so tapping a group's Edit opens the sheet where that group is rather than at
 * the beginning.
 *
 * The order is the schema's, which is the order the page itself reads: the rail
 * of stages before "Who we are", the service times before the closing words.
 */
const GROUPS = computed(() =>
  SETTINGS_STEPS.map((step, index) => ({
    key: step.key,
    label: step.label,
    step: index,
    fields: step.fields.map((field) => {
      const value = landing.value[field.key]
      if (field.type === 'list') {
        // A row whose first line is blank draws nothing on the page, so it is
        // not worth a line here either.
        const first = field.item[0].key
        return {
          ...field,
          items: (Array.isArray(value) ? value : []).filter((row) =>
            String(row?.[first] || '').trim()
          ),
        }
      }
      return {
        ...field,
        display: field.type === 'words' ? (value || []).join(', ') : value,
        wrap: field.type === 'textarea',
      }
    }),
  }))
)

/* ------------------------------------------------------------------ editing */

const sheet = ref(null)
const showEditor = ref(false)
const editorStep = ref(0)
const saving = ref(false)

const openEditor = (step = 0) => {
  if (!isAdmin.value) return
  editorStep.value = step
  // Seeded before it is shown, and told which step it is opening on: the prop
  // set on the line above has not reached the sheet yet.
  sheet.value?.reset(step)
  showEditor.value = true
}

const saveEdit = async (changes) => {
  saving.value = true
  try {
    await saveLanding(changes)
    showEditor.value = false
    toast.success('Public page saved')
  } catch (error) {
    console.error('Error saving landing settings:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

/* ------------------------------------------------- what saves on the spot */

/** The hero, the switches and the albums: one tap each, so one write each. */
const persist = async (partial, message) => {
  try {
    await saveLanding(partial)
    if (message) toast.success(message)
  } catch (error) {
    console.error('Error saving landing settings:', error)
    toast.error('Could not save. Please try again.')
  }
}

const uploading = ref(false)
const heroInput = ref(null)
const heroPreview = computed(() => landing.value.heroImage || bundledHero)

const handleHeroFile = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const heroImage = await uploadImage(
      await compressImageToBase64(file, HERO_OPTIONS),
      'branding'
    )
    await persist({ heroImage }, 'Hero photo updated')
  } catch (error) {
    console.error('Error saving the hero photo:', error)
    toast.error('Could not save that image. Try a smaller JPG.')
  } finally {
    uploading.value = false
  }
}

const resetHero = () => persist({ heroImage: '' }, 'Hero photo reset to the built-in one')

const toggleEvents = () => {
  const showEvents = landing.value.showEvents === false
  persist(
    { showEvents },
    showEvents ? 'Upcoming gatherings are shown' : 'Upcoming gatherings are hidden'
  )
}

// Opted into rather than out of, unlike every other switch here: this one
// publishes something about other people.
const toggleBirthdays = () => {
  const showBirthdays = landing.value.showBirthdays !== true
  persist(
    { showBirthdays },
    showBirthdays
      ? 'Birthdays now appear on the public page'
      : 'Birthdays are no longer published'
  )
}

const togglePhotos = () => {
  const showPhotos = landing.value.showPhotos === false
  persist(
    { showPhotos },
    showPhotos ? 'Gallery photos are shown' : 'No gallery photo is public now'
  )
}

/* ------------------------------------------------------------------ gallery */
// Which albums a visitor may see. Opted into one at a time on purpose: the
// people in the photographs did not put them on the internet, and "the whole
// gallery" is not a decision anyone should be able to make with one switch.
//
// Loaded only once the picker is opened. An album document carries its cover
// photo as base64, so listing them all is megabytes — not something to spend
// on everyone who opens Settings to change the church's name.
const albums = ref([])
const picking = ref(false)
const loadingAlbums = ref(false)
let unsubscribeAlbums = null

const openPicker = () => {
  picking.value = true
  if (unsubscribeAlbums) return
  loadingAlbums.value = true
  unsubscribeAlbums = subscribeToAlbums((list) => {
    albums.value = list
    loadingAlbums.value = false
  })
}

onUnmounted(() => unsubscribeAlbums?.())

// Stored as the exception: what is held back, not what is shared. An album
// added next month is on the page the moment it exists, which is the point —
// nobody has to come back here to keep the public page alive.
const hiddenAlbums = computed(() =>
  Array.isArray(landing.value.hiddenAlbums) ? landing.value.hiddenAlbums : []
)
const isShared = (albumId) => !hiddenAlbums.value.includes(albumId)
const sharedCount = computed(() => albums.value.filter((album) => isShared(album.id)).length)

// Written as it is tapped rather than gathered up for a Save at the bottom:
// holding an unsaved list of who is visible to the open internet is the one
// thing on this card worth never getting wrong.
const toggleAlbum = (albumId) =>
  persist({
    hiddenAlbums: isShared(albumId)
      ? [...hiddenAlbums.value, albumId]
      : hiddenAlbums.value.filter((id) => id !== albumId),
  })

const shareAllAlbums = () => persist({ hiddenAlbums: [] }, 'Every album is on the public page')
const shareNoAlbums = () =>
  persist({ hiddenAlbums: albums.value.map((album) => album.id) }, 'Every album is held back')

const switchTrack = (on) => [
  'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40',
  on ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
]
const switchKnob = (on) => [
  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
  on ? 'translate-x-6' : 'translate-x-1',
]
</script>

<template>
  <SectionCard
    :icon="Globe"
    title="Public page"
    subtitle="What a visitor sees at the site address, before signing in"
    head-class="section-head"
  >
    <template #actions>
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        class="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <ExternalLink class="h-3.5 w-3.5" />
        Preview
      </a>
    </template>

    <p v-if="!isAdmin" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
      Only administrators can change the public page.
    </p>

    <template v-else>
      <div class="border-b border-gray-100 p-4 dark:border-gray-700">
        <div
          class="flex items-start gap-2 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900/40 dark:text-gray-300"
        >
          <Info class="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
          <p>
            Anything left empty is hidden on the page rather than shown blank — so a
            section only appears once you have something to put in it. The church's name,
            logo, mission and address come from Church details.
          </p>
        </div>
      </div>

      <!-- Saves on pick: there is nothing to type alongside a photograph, so it
           does not belong behind an editor you have to finish. -->
      <div class="border-b border-gray-100 p-4 dark:border-gray-700">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Hero photo
        </h3>
        <div class="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
          <img :src="heroPreview" alt="" class="h-32 w-full object-cover" />
          <div class="absolute inset-0 bg-gray-900/35"></div>
          <div class="absolute inset-0 flex items-center justify-center gap-2">
            <input
              ref="heroInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleHeroFile"
            />
            <button
              type="button"
              @click="heroInput?.click()"
              :disabled="uploading"
              class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/95 px-3 text-xs font-semibold text-gray-900 disabled:opacity-60"
            >
              <Loader2 v-if="uploading" class="h-3.5 w-3.5 animate-spin" />
              <ImagePlus v-else class="h-3.5 w-3.5" />
              Change
            </button>
            <button
              v-if="landing.heroImage"
              type="button"
              @click="resetHero"
              :disabled="uploading"
              class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/95 px-3 text-xs font-semibold text-gray-900 disabled:opacity-60"
            >
              <RotateCcw class="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
        <p class="mt-1 text-[11px] text-gray-400">
          Saved as soon as you pick it. Drawn as the arched window beside the welcome
          text — a tall, upright photo suits it best.
        </p>
      </div>

      <!-- What the page says, group by group. -->
      <div
        v-for="group in GROUPS"
        :key="group.key"
        class="border-b border-gray-100 p-4 dark:border-gray-700"
      >
        <div class="mb-2 flex items-baseline justify-between gap-2">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {{ group.label }}
          </h3>
          <button
            type="button"
            @click="openEditor(group.step)"
            :aria-label="`Edit ${group.label.toLowerCase()}`"
            class="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
          >
            <Pencil class="h-3.5 w-3.5" />
            Edit
          </button>
        </div>

        <dl class="space-y-3">
          <div v-for="field in group.fields" :key="field.key">
            <dt class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ field.label }}</dt>

            <!-- A list field: its rows, first line loudest. -->
            <template v-if="field.type === 'list'">
              <dd v-if="field.items.length" class="mt-1.5 space-y-1.5">
                <div
                  v-for="(entry, index) in field.items"
                  :key="index"
                  class="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700/40"
                >
                  <p
                    v-for="(sub, subIndex) in field.item"
                    :key="sub.key"
                    v-show="entry[sub.key]"
                    :class="
                      subIndex === 0
                        ? 'text-sm font-medium text-gray-900 dark:text-white'
                        : 'text-xs text-gray-500 dark:text-gray-400'
                    "
                  >
                    {{ entry[sub.key] }}
                  </p>
                </div>
              </dd>
              <dd v-else class="mt-0.5 text-sm text-gray-400 dark:text-gray-500">Not set</dd>
            </template>

            <dd
              v-else
              :class="[
                'mt-0.5 text-sm',
                field.wrap ? 'whitespace-pre-line' : 'truncate',
                field.display ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500',
              ]"
            >
              {{ field.display || 'Not set' }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- What the page draws for itself, from elsewhere in the app. Nothing
           here is typed, so nothing here waits for a Save. -->
      <div class="p-4">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Drawn from the app
        </h3>

        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Show what's coming up</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                The next few gatherings from your calendar. Titles and times only — never
                where they meet, and never one aimed at particular members.
              </p>
            </div>
            <button
              type="button"
              @click="toggleEvents"
              :class="switchTrack(landing.showEvents !== false)"
              role="switch"
              :aria-checked="landing.showEvents !== false"
              aria-label="Show what's coming up"
            >
              <span :class="switchKnob(landing.showEvents !== false)"></span>
            </button>
          </div>

          <!-- Its own switch, under the one it depends on. -->
          <div class="flex items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-white">Include birthdays</p>
              <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                The name a member is called by and the day — never a surname, never a
                year. Off unless you turn it on.
              </p>
            </div>
            <button
              type="button"
              @click="toggleBirthdays"
              :disabled="landing.showEvents === false"
              :class="switchTrack(landing.showBirthdays === true)"
              role="switch"
              :aria-checked="landing.showBirthdays === true"
              aria-label="Include birthdays"
            >
              <span :class="switchKnob(landing.showBirthdays === true)"></span>
            </button>
          </div>

          <div>
            <div class="mb-2 flex items-center gap-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white">
                  Photos from the gallery
                </p>
                <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  They fill the "Life together" strip near the foot of the page
                </p>
              </div>
              <button
                type="button"
                @click="togglePhotos"
                :class="switchTrack(landing.showPhotos !== false)"
                role="switch"
                :aria-checked="landing.showPhotos !== false"
                aria-label="Show photos from the gallery"
              >
                <span :class="switchKnob(landing.showPhotos !== false)"></span>
              </button>
            </div>

            <template v-if="landing.showPhotos !== false">
              <div
                class="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
              >
                <ShieldAlert class="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Every album is on the open internet, faces included, and a new one goes
                  up as soon as it is created. Untick any that should stay behind the
                  sign-in.
                </p>
              </div>

              <div v-if="picking && albums.length" class="mb-2 flex items-center gap-1">
                <button
                  type="button"
                  @click="shareAllAlbums"
                  class="h-9 rounded-lg px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 dark:text-primary-light"
                >
                  Share all
                </button>
                <button
                  type="button"
                  @click="shareNoAlbums"
                  class="h-9 rounded-lg px-2.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  Hide all
                </button>
              </div>

              <!-- Album covers are base64 inside the documents, so the list is
                   only fetched once somebody actually wants to pick from it. -->
              <button
                v-if="!picking"
                type="button"
                @click="openPicker"
                class="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-3 text-xs font-semibold text-gray-600 transition-colors hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300 dark:hover:text-primary-light"
              >
                <ImageIcon class="h-4 w-4" />
                {{
                  hiddenAlbums.length
                    ? `Choose albums (${hiddenAlbums.length} held back)`
                    : 'Choose albums'
                }}
              </button>

              <p v-else-if="loadingAlbums" class="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 class="h-3.5 w-3.5 animate-spin" />
                Loading albums…
              </p>

              <div v-else-if="albums.length" class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  v-for="album in albums"
                  :key="album.id"
                  type="button"
                  @click="toggleAlbum(album.id)"
                  :class="[
                    'relative overflow-hidden rounded-lg border text-left transition-colors',
                    isShared(album.id)
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500',
                  ]"
                  :aria-pressed="isShared(album.id)"
                >
                  <div class="aspect-4/3 w-full bg-gray-100 dark:bg-gray-900">
                    <img
                      v-if="album.coverUrl"
                      :src="album.coverUrl"
                      alt=""
                      :class="[
                        'h-full w-full object-cover transition-opacity',
                        isShared(album.id) ? '' : 'opacity-40 grayscale',
                      ]"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center">
                      <ImageIcon class="h-6 w-6 text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                  <div class="p-2">
                    <p class="truncate text-xs font-semibold text-gray-900 dark:text-white">
                      {{ album.title || 'Untitled' }}
                    </p>
                    <p class="truncate text-[11px] text-gray-400">
                      {{ [album.category, album.date].filter(Boolean).join(' · ') }}
                    </p>
                  </div>
                  <div
                    v-if="isShared(album.id)"
                    class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow"
                  >
                    <Check class="h-3.5 w-3.5" />
                  </div>
                  <div
                    v-else
                    class="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gray-900/70 text-white shadow"
                  >
                    <EyeOff class="h-3.5 w-3.5" />
                  </div>
                </button>
              </div>
              <p v-else class="text-xs italic text-gray-400">No albums in the gallery yet.</p>

              <p v-if="picking && albums.length" class="mt-2 text-[11px] text-gray-400">
                {{ sharedCount }} of {{ albums.length }} on the public page
              </p>
            </template>
          </div>
        </div>
      </div>
    </template>

    <LandingEditSheet
      ref="sheet"
      :show="showEditor"
      :landing="landing"
      :start-step="editorStep"
      :busy="saving"
      @close="showEditor = false"
      @save="saveEdit"
    />
  </SectionCard>
</template>
