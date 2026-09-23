<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Church,
  Clock,
  ExternalLink,
  HandWaving,
  Home,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from '../icons'
import { useAppSettings } from '../composables/useAppSettings'
import { useToast } from '../composables/useToast'
import { compressImageToBase64, HERO_OPTIONS } from '../utils/imageUtils'
import { prepareLogo, themeFromBrandColour } from '../utils/logoUtils'
import { uploadImage } from '../api/blobService'
import bundledHero from '../assets/hero-cover.webp'

// The first screen a new church's administrator ever sees.
//
// A church's address opens on its public page from the day it is approved, so
// this asks for what that page needs. One question a step, in the order
// somebody would answer them out loud, and every step skippable.
//
// Deliberately thin. It is not a second Settings screen — it asks for the few
// things a page looks wrong without, and leaves the rest (full legal name,
// mission and vision, core values, which albums are public) to Settings, where
// somebody has gone looking for them. Anything asked here is one field with a plain label
// and no paragraph under it.
//
// It ends by writing `setup.done`, which is what stops the router sending an
// administrator back — see the guard in src/router/index.js.

const router = useRouter()
const toast = useToast()
const {
  church,
  landing,
  logoUrl,
  theme: savedTheme,
  isConfigured,
  saveChurch,
  saveChurchIdentity,
  saveLogo,
  saveLanding,
  saveTheme,
  finishSetup,
} = useAppSettings()

/* ---------------------------------------------------------------- the form */

const form = reactive({
  shortName: '',
  theme: {},
  heroImage: '',
  intro: '',
  services: [],
  about: '',
  address: '',
  phone: '',
  facebook: '',
})

// Seeded once, when the settings land: re-seeding on every change would
// overwrite what is being typed as soon as an earlier step's save came back
// through the listener.
let seeded = false
watch(
  isConfigured,
  (ready) => {
    if (!ready || seeded) return
    seeded = true
    form.shortName = church.value.shortName === 'Church' ? '' : church.value.shortName
    form.theme = { ...(savedTheme.value || {}) }
    form.heroImage = landing.value.heroImage
    form.intro = landing.value.intro
    form.services = (landing.value.services || []).map((service) => ({ ...service }))
    // From the church rather than the landing block: this is what the church
    // is, and it moved onto the church itself in v0.29.4. The fallback in
    // withChurchDefaults means a church part-way through the old guide still
    // reads back whatever it answered.
    form.about = landing.value.about
    form.address = church.value.address
    form.phone = church.value.phone
    form.facebook = church.value.facebook
  },
  { immediate: true }
)

const trimmed = (value) => String(value ?? '').trim()

/* ------------------------------------------------------------------- steps */

const STEPS = [
  { title: 'Your church', hint: 'Its name and logo.', icon: Church },
  { title: 'Your welcome', hint: 'What a visitor sees first.', icon: HandWaving },
  { title: 'When you gather', hint: 'Your service times.', icon: Clock },
  { title: 'About', hint: 'A few words about your church.', icon: Sparkles },
  { title: 'Finding you', hint: 'Where you are, and how to reach you.', icon: MapPin },
]

const step = ref(0)
const last = computed(() => step.value === STEPS.length - 1)
const current = computed(() => STEPS[step.value])
const done = ref(false)

// Only the name is asked for. Everything else is a church talking about itself,
// and one that would rather do that later should be able to.
const canGoOn = computed(() => (step.value === 0 ? Boolean(trimmed(form.shortName)) : true))

// Whether this step has anything in it, so the button can say "Skip" rather
// than asking somebody to continue past a question they have left alone.
const stepAnswered = computed(() => {
  if (step.value === 0) return Boolean(trimmed(form.shortName))
  if (step.value === 1) return Boolean(form.heroImage || trimmed(form.intro))
  if (step.value === 2) return form.services.some((service) => trimmed(service.name))
  if (step.value === 3) return Boolean(trimmed(form.about))
  return Boolean(trimmed(form.address) || trimmed(form.phone) || trimmed(form.facebook))
})

const onwardsLabel = computed(() => {
  if (last.value) return stepAnswered.value ? 'Finish' : 'Skip and finish'
  return stepAnswered.value ? 'Continue' : 'Skip'
})

const error = ref('')
const saving = ref(false)

/**
 * What each step writes.
 *
 * Saved on the way out of a step rather than all at once at the end, so
 * closing the tab halfway keeps what was answered and the guide re-opens on
 * it. Writing an unchanged value is harmless, which is why a skipped step
 * needs no second path through here.
 */
const SAVE_STEP = [
  async () => {
    await saveChurch({ shortName: trimmed(form.shortName) })
    await saveTheme(form.theme)
  },
  () => saveLanding({ heroImage: form.heroImage, intro: trimmed(form.intro) }),
  () =>
    saveLanding({
      // A row with no name draws nothing on the page, so it is dropped rather
      // than stored as an empty card. `note` is carried through untouched: the
      // guide does not ask for it, and Settings does.
      services: form.services
        .filter((service) => trimmed(service.name))
        .map((service) => ({
          name: trimmed(service.name),
          when: trimmed(service.when),
          note: trimmed(service.note),
        })),
    }),
  () => saveLanding({ about: trimmed(form.about) }),
  () =>
    saveChurchIdentity({
      address: trimmed(form.address),
      phone: trimmed(form.phone),
      facebook: trimmed(form.facebook),
    }),
]

// Which way the steps are going, so one slides out the way the next comes in.
const direction = ref('next')

const back = () => {
  error.value = ''
  direction.value = 'prev'
  step.value = Math.max(0, step.value - 1)
}

const onwards = async () => {
  error.value = ''
  if (!canGoOn.value) {
    error.value = 'Give your church a name.'
    return
  }
  saving.value = true
  try {
    await SAVE_STEP[step.value]()
    if (last.value) {
      await finishSetup()
      done.value = true
      return
    }
    direction.value = 'next'
    step.value += 1
  } catch (saveError) {
    console.error('Error saving the setup step:', saveError)
    error.value = 'Could not save that. Please try again.'
  } finally {
    saving.value = false
  }
}

// The way out, from any step. It marks the guide done rather than leaving it
// pending: being sent back to a screen you chose to leave is how a guide
// becomes something to dread. Settings can start it again.
const finishLater = async () => {
  saving.value = true
  try {
    await SAVE_STEP[step.value]()
  } catch (saveError) {
    console.error('Error saving the setup step on the way out:', saveError)
  }
  try {
    await finishSetup()
  } catch (saveError) {
    console.error('Error closing the setup guide:', saveError)
    toast.error('Could not close the guide. Please try again.')
    saving.value = false
    return
  }
  router.replace('/home')
}

// A sideways swipe moves between steps. A swipe that is mostly up or down is
// the page scrolling.
let touch = null
const onTouchStart = (event) => {
  const point = event.touches[0]
  touch = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : null
}
const onTouchEnd = (event) => {
  if (!touch) return
  const point = event.changedTouches[0]
  const dx = point.clientX - touch.x
  const dy = point.clientY - touch.y
  touch = null
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  if (dx < 0 && !last.value) onwards()
  else if (dx > 0 && step.value > 0) back()
}

/* ------------------------------------------------------------------ images */

const logoInput = ref(null)
const heroInput = ref(null)
const uploading = ref('')

// What the last upload did, so the screen can offer the background back and
// show the colours it found.
const logoWork = ref(null)

const storeLogo = async (dataUrl) => saveLogo(await uploadImage(dataUrl, 'branding'))

const handleLogo = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = 'logo'
  try {
    // Background cut and colours read before anything is uploaded, so one
    // upload stores the version we mean to keep.
    const prepared = await prepareLogo(file)
    await storeLogo(prepared.dataUrl)
    logoWork.value = prepared
    toast.success(prepared.removed ? 'Logo saved, background removed' : 'Logo saved')
  } catch (uploadError) {
    console.error('Error saving the logo:', uploadError)
    toast.error('Could not save that image. Try a smaller PNG or JPG.')
  } finally {
    uploading.value = ''
  }
}

// Puts the logo back as it arrived, background and all — for the crest that was
// meant to sit on a cream disc.
const keepBackground = async () => {
  if (!logoWork.value) return
  uploading.value = 'logo'
  try {
    await storeLogo(logoWork.value.original)
    logoWork.value = { ...logoWork.value, removed: false }
  } catch (uploadError) {
    console.error('Error restoring the logo background:', uploadError)
    toast.error('Could not change that back. Please try again.')
  } finally {
    uploading.value = ''
  }
}

const handleHero = async (event) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = 'hero'
  try {
    form.heroImage = await uploadImage(await compressImageToBase64(file, HERO_OPTIONS), 'branding')
  } catch (uploadError) {
    console.error('Error saving the hero photo:', uploadError)
    toast.error('Could not save that image. Try a smaller JPG.')
  } finally {
    uploading.value = ''
  }
}

const heroPreview = computed(() => form.heroImage || bundledHero)

/* ---------------------------------------------------------------- colours */

// The only way to set a colour here: press one of the church's own, off its
// logo. No hex box and no second shade — somebody setting up a church for the
// first time is not carrying a colour code, and the pair a colour needs (one
// for light pages, a lighter one for dark) is worked out for them. Settings has
// the full editor for anyone who does want to type one.
const chooseColour = (hex) => {
  form.theme = themeFromBrandColour(hex)
}

// Compared through the same conversion, because what is stored is the adjusted
// accent rather than the colour straight off the artwork.
const chosenColour = computed(
  () =>
    (logoWork.value?.colours || []).find(
      (hex) => themeFromBrandColour(hex).primary === form.theme.primary
    ) || ''
)

/* --------------------------------------------------------------- services */

const addService = () => {
  form.services = [...form.services, { name: '', when: '', note: '' }]
}

const removeService = (index) => {
  form.services = form.services.filter((_, position) => position !== index)
}

/* ------------------------------------------------------------------ styles */

const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
</script>

<template>
  <div class="min-h-dvh bg-gray-50 dark:bg-gray-900">
    <div
      class="mx-auto flex min-h-dvh max-w-xl flex-col px-4 py-6 sm:px-6 sm:py-10"
      style="padding-top: max(1.5rem, env(safe-area-inset-top))"
    >
      <div class="flex items-center gap-3">
        <img :src="logoUrl" :alt="church.shortName" class="h-9 w-auto shrink-0" />
        <p class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
          {{ form.shortName || church.shortName }}
        </p>
      </div>

      <!-- The guide -->
      <div
        v-if="!done"
        class="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 dark:border-gray-700 dark:bg-gray-800"
      >
        <h1 class="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          Let's set up your page
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Skip anything you like.</p>

        <div class="mt-5 flex items-center gap-1.5" aria-hidden="true">
          <span
            v-for="(one, index) in STEPS"
            :key="one.title"
            :class="[
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              index <= step ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600',
            ]"
          ></span>
        </div>
        <p
          class="mt-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary dark:text-primary-light"
        >
          <component :is="current.icon" class="h-3.5 w-3.5" />
          {{ current.title }}
        </p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ current.hint }}</p>

        <form
          class="mt-5 overflow-hidden"
          @submit.prevent="onwards"
          @touchstart.passive="onTouchStart"
          @touchend.passive="onTouchEnd"
        >
          <Transition :name="`step-${direction}`" mode="out-in">
            <div :key="step" class="space-y-4">
              <!-- 1. Name and logo. -->
              <template v-if="step === 0">
                <div>
                  <label for="setup-name" :class="label">Church name</label>
                  <input
                    id="setup-name"
                    v-model="form.shortName"
                    type="text"
                    maxlength="60"
                    autocomplete="organization"
                    placeholder="Grace Community"
                    :class="input"
                  />
                </div>

                <div>
                  <p :class="label">Logo</p>
                  <div class="flex items-center gap-3">
                    <!-- Checkered, so a cut-out logo reads as transparent. -->
                    <div
                      class="checkerboard flex h-16 w-16 shrink-0 items-center justify-center rounded-lg"
                    >
                      <img :src="logoUrl" :alt="church.shortName" class="max-h-12 w-auto" />
                    </div>
                    <button
                      type="button"
                      :disabled="uploading === 'logo'"
                      class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
                      @click="logoInput?.click()"
                    >
                      <Loader2 v-if="uploading === 'logo'" class="h-4 w-4 animate-spin" />
                      <ImagePlus v-else class="h-4 w-4" />
                      {{ church.logo ? 'Change' : 'Upload' }}
                    </button>
                    <button
                      v-if="logoWork?.removed"
                      type="button"
                      :disabled="uploading === 'logo'"
                      class="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 underline underline-offset-2 hover:bg-gray-100 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-700"
                      @click="keepBackground"
                    >
                      Keep background
                    </button>
                  </div>
                  <input
                    ref="logoInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleLogo"
                  />
                </div>

                <!-- Only after a logo has been read, and only when it has
                     colours worth offering. -->
                <div v-if="logoWork?.colours?.length">
                  <p :class="label">Colour</p>
                  <div class="flex flex-wrap gap-2">
                    <button
                      v-for="hex in logoWork.colours"
                      :key="hex"
                      type="button"
                      :aria-label="`Use this colour from your logo`"
                      :aria-pressed="chosenColour === hex"
                      :class="[
                        'h-10 w-10 rounded-full border transition-transform hover:scale-105',
                        chosenColour === hex
                          ? 'border-transparent ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-800'
                          : 'border-black/10 dark:border-white/20',
                      ]"
                      :style="{ backgroundColor: hex }"
                      @click="chooseColour(hex)"
                    >
                      <Check
                        v-if="chosenColour === hex"
                        class="mx-auto h-4 w-4 text-white drop-shadow"
                      />
                    </button>
                  </div>
                </div>
              </template>

              <!-- 2. The photo and the line under it. -->
              <template v-else-if="step === 1">
                <div>
                  <p :class="label">Photo</p>
                  <div class="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-600">
                    <img :src="heroPreview" alt="" class="h-36 w-full object-cover sm:h-44" />
                  </div>
                  <div class="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      :disabled="uploading === 'hero'"
                      class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
                      @click="heroInput?.click()"
                    >
                      <Loader2 v-if="uploading === 'hero'" class="h-4 w-4 animate-spin" />
                      <ImagePlus v-else class="h-4 w-4" />
                      {{ form.heroImage ? 'Change' : 'Upload' }}
                    </button>
                    <button
                      v-if="form.heroImage"
                      type="button"
                      class="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                      @click="form.heroImage = ''"
                    >
                      <RotateCcw class="h-4 w-4" />
                      Reset
                    </button>
                  </div>
                  <input
                    ref="heroInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="handleHero"
                  />
                </div>
                <div>
                  <label for="setup-intro" :class="label">Welcome line</label>
                  <textarea
                    id="setup-intro"
                    v-model="form.intro"
                    rows="3"
                    maxlength="300"
                    :class="input"
                  ></textarea>
                </div>
              </template>

              <!-- 3. When the church meets. -->
              <template v-else-if="step === 2">
                <div
                  v-for="(service, index) in form.services"
                  :key="index"
                  class="flex items-start gap-2"
                >
                  <div class="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      v-model="service.name"
                      type="text"
                      maxlength="60"
                      placeholder="Sunday service"
                      :class="input"
                      :aria-label="`Service ${index + 1} name`"
                    />
                    <input
                      v-model="service.when"
                      type="text"
                      maxlength="60"
                      placeholder="Sundays, 9:00 AM"
                      :class="input"
                      :aria-label="`Service ${index + 1} time`"
                    />
                  </div>
                  <button
                    type="button"
                    class="mt-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                    :aria-label="`Remove service ${index + 1}`"
                    @click="removeService(index)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  class="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-3 text-sm font-semibold text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
                  @click="addService"
                >
                  <Plus class="h-4 w-4" />
                  Add a service
                </button>
              </template>

              <!-- 4. What the church is about. -->
              <template v-else-if="step === 3">
                <div>
                  <label for="setup-about" class="sr-only">About your church</label>
                  <textarea
                    id="setup-about"
                    v-model="form.about"
                    rows="6"
                    maxlength="1000"
                    placeholder="When you started, who you are, what a Sunday is like."
                    :class="input"
                  ></textarea>
                </div>
              </template>

              <!-- 5. Where the church is, and how to reach it. -->
              <template v-else>
                <div>
                  <label for="setup-address" :class="label">Address</label>
                  <textarea
                    id="setup-address"
                    v-model="form.address"
                    rows="2"
                    maxlength="300"
                    :class="input"
                  ></textarea>
                </div>
                <div>
                  <label for="setup-phone" :class="label">Phone</label>
                  <input
                    id="setup-phone"
                    v-model="form.phone"
                    type="tel"
                    maxlength="40"
                    placeholder="0917 123 4567"
                    :class="input"
                  />
                </div>
                <div>
                  <label for="setup-facebook" :class="label">Facebook page</label>
                  <input
                    id="setup-facebook"
                    v-model="form.facebook"
                    type="url"
                    maxlength="200"
                    placeholder="facebook.com/yourchurch"
                    :class="input"
                  />
                </div>
              </template>

              <p v-if="error" class="text-sm font-medium text-red-600 dark:text-red-400">
                {{ error }}
              </p>
            </div>
          </Transition>

          <div class="mt-5 flex items-center gap-3">
            <button
              v-if="step > 0"
              type="button"
              class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="back"
            >
              <ArrowLeft class="h-4 w-4" />
              Back
            </button>
            <button
              type="submit"
              :disabled="saving"
              class="group flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              <Check v-else-if="last" class="h-4 w-4" />
              {{ onwardsLabel }}
              <ArrowRight v-if="!last" class="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </form>
      </div>

      <!-- Finished. -->
      <div
        v-else
        class="mt-6 rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div
          class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary-light/15"
        >
          <Check class="h-6 w-6 text-primary dark:text-primary-light" />
        </div>
        <h1 class="mt-4 text-xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ form.shortName || church.shortName }} is open
        </h1>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Anyone with your link sees your page now.
        </p>
        <div class="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href="/"
            class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-white hover:bg-primary-hover"
          >
            <ExternalLink class="h-4 w-4" />
            See your page
          </a>
          <RouterLink
            to="/home"
            class="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Home class="h-4 w-4" />
            Go to the app
          </RouterLink>
        </div>
      </div>

      <div v-if="!done" class="mt-4 text-center">
        <button
          type="button"
          :disabled="saving"
          class="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-60 dark:text-gray-400 dark:hover:bg-gray-800"
          @click="finishLater"
        >
          I'll finish this later
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The transparency check, so a cut-out logo is visibly cut out rather than
   looking like a logo on a light panel. */
.checkerboard {
  --square: color-mix(in srgb, currentColor 8%, transparent);
  background-color: rgb(249 250 251);
  background-image:
    linear-gradient(45deg, var(--square) 25%, transparent 25%, transparent 75%, var(--square) 75%),
    linear-gradient(45deg, var(--square) 25%, transparent 25%, transparent 75%, var(--square) 75%);
  background-position: 0 0, 6px 6px;
  background-size: 12px 12px;
}

:global(.dark) .checkerboard {
  background-color: rgb(55 65 81);
}

/* One step slides away and the next comes in from the side it lies on. */
.step-next-enter-active,
.step-next-leave-active,
.step-prev-enter-active,
.step-prev-leave-active {
  transition:
    opacity 0.2s ease,
    translate 0.2s ease;
}

.step-next-enter-from,
.step-prev-leave-to {
  opacity: 0;
  translate: 1.5rem 0;
}

.step-next-leave-to,
.step-prev-enter-from {
  opacity: 0;
  translate: -1.5rem 0;
}

@media (prefers-reduced-motion: reduce) {
  .step-next-enter-active,
  .step-next-leave-active,
  .step-prev-enter-active,
  .step-prev-leave-active {
    transition: none;
  }
}
</style>
