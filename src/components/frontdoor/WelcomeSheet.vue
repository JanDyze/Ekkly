<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ArrowRight, X } from '../../icons'
import AnimatedMark from '../common/AnimatedMark.vue'
import { sendFrontDoorLead } from '../../api/platformService'
import { usePlatformConfig } from '../../composables/usePlatformConfig'
import { useScrollLock } from '../../composables/useScrollLock'
import { suggestChurchId } from '../../../lib/churchId.js'
import { knownChurch } from './knownChurches'

// The front door's welcome, once per visitor: which church are they with, and
// how could someone from Ekkly reach them?
//
// It is how a church that is only looking gets a conversation started, so it
// asks lightly. One field, then an optional second, then thanks — and "Skip"
// at every step closes it for good, as do the backdrop and Escape. As the
// church's name is typed the address it could have appears, and the phone in
// the hero takes the name, so the question is answered by something happening
// rather than by filling in a form.
//
// Not a wall: it waits for the headline to play, sits in the middle of the
// screen as a small card with room around it, never focuses a field on its
// own, and does not come back by itself — only when "Say hello" in the hero
// asks for it.

const props = defineProps({
  domain: { type: String, default: '' },
  // How long to let the page play first. None when they asked for it.
  delay: { type: Number, default: 1400 },
})

const emit = defineEmits(['done', 'church'])
const { branding } = usePlatformConfig()

const SEEN_KEY = 'ekkly.frontDoor.welcomed'
const LEAD_KEY = 'ekkly.frontDoor.lead'

const show = ref(false)
const step = ref('church') // church | contact | thanks

// The page behind holds still while the welcome is up.
useScrollLock(show)

let timer = 0
onMounted(() => {
  timer = setTimeout(() => (show.value = true), props.delay)
})
onUnmounted(() => clearTimeout(timer))

const remember = () => {
  try {
    localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Asked again next time; that is all.
  }
}

// Closed here; "done" is said once the card has finished leaving, so the page
// does not take it away mid-animation.
const finish = () => {
  remember()
  show.value = false
}

// Their own id for this entry, so the church and the contact, sent a step
// apart, are one entry in the console rather than two.
const leadId = (() => {
  try {
    const saved = localStorage.getItem(LEAD_KEY)
    if (saved) return saved
  } catch {
    // Made fresh for this page.
  }
  const made = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')
  try {
    localStorage.setItem(LEAD_KEY, made)
  } catch {
    // Kept for this page only.
  }
  return made
})()

const website = ref('')
const error = ref('')
const sending = ref(false)

const send = (fields) =>
  sendFrontDoorLead({ id: leadId, churchName: church.value.trim(), page: window.location.href, website: website.value, ...fields })

/* --------------------------------------------------------------- church */

const church = ref('')
const address = computed(() => {
  const slug = suggestChurchId(church.value)
  return slug ? `${slug}.${props.domain}` : ''
})
const churchReady = computed(() => church.value.trim().length >= 2)
// A church the front door knows shows its own logo the moment its name is typed.
const known = computed(() => knownChurch(church.value))

const continueWithChurch = async () => {
  if (!churchReady.value || sending.value) return
  error.value = ''
  sending.value = true
  emit('church', church.value.trim())
  try {
    await send({})
    step.value = 'contact'
  } catch (e) {
    console.error('Error recording a church:', e)
    error.value = e.message || 'Could not save that. Please try again.'
  } finally {
    sending.value = false
  }
}

/* -------------------------------------------------------------- contact */

const name = ref('')
const contact = ref('')
const contactOk = computed(() => {
  const text = contact.value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) || text.replace(/\D/g, '').length >= 7
})
const gaveContact = ref(false)

const sendContact = async () => {
  if (!contactOk.value || sending.value) return
  error.value = ''
  sending.value = true
  try {
    await send({ name: name.value.trim(), contact: contact.value.trim() })
    gaveContact.value = true
    thank()
  } catch (e) {
    console.error('Error recording a contact:', e)
    error.value = e.message || 'Could not send that. Please try again.'
  } finally {
    sending.value = false
  }
}

/* --------------------------------------------------------------- thanks */

let closeTimer = 0
const thank = () => {
  remember()
  step.value = 'thanks'
  closeTimer = setTimeout(finish, 2600)
}
onUnmounted(() => clearTimeout(closeTimer))

const onKey = (event) => {
  if (event.key === 'Escape' && show.value) finish()
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))

/* ------------------------------------------------------ phone keyboard */

// The card is centred in the part of the screen that can be seen. A phone's
// keyboard does not shrink the page, so centred in the whole window it would
// sit half behind the keyboard once a field is tapped; centred in the visual
// viewport, it moves up into the space above it.
const visible = ref(null)
const measure = () => {
  const vv = window.visualViewport
  visible.value = vv ? { height: vv.height, top: vv.offsetTop } : null
}
const follow = (on) => {
  const vv = window.visualViewport
  if (!vv) return
  vv[on ? 'addEventListener' : 'removeEventListener']('resize', measure)
  vv[on ? 'addEventListener' : 'removeEventListener']('scroll', measure)
  if (on) measure()
}
watch(show, follow)
onUnmounted(() => follow(false))

const frameStyle = computed(() =>
  visible.value ? { top: `${visible.value.top}px`, height: `${visible.value.height}px`, bottom: 'auto' } : null
)

// 16px on a phone, or iOS zooms the page in when a field is tapped.
const field =
  'h-12 w-full rounded-xl border border-gray-300 bg-white px-3.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white'
const primary =
  'group inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-700 dark:disabled:text-gray-500'
const skip = 'h-12 rounded-xl px-4 text-sm font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'
</script>

<template>
  <Teleport to="body">
    <Transition name="welcome" @after-leave="emit('done')">
      <div
        v-if="show"
        :style="frameStyle"
        class="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
      >
        <!-- Light, so the page it opened on still shows through. Fixed to the
             whole window, so it still covers the page behind the keyboard. -->
        <div class="fixed inset-0 bg-gray-950/30 backdrop-blur-[2px]" @click="finish"></div>

        <div
          class="welcome-panel relative max-h-full w-full max-w-md overflow-y-auto rounded-3xl bg-white pb-5 shadow-2xl ring-1 ring-gray-900/5 sm:pb-6 dark:bg-gray-900 dark:ring-white/10"
        >
          <!-- The window's colours, a thin band along the top. -->
          <div class="mark-band h-1 w-full" aria-hidden="true"></div>

          <button type="button" aria-label="Close" class="absolute right-3 top-4 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300" @click="finish">
            <X class="h-5 w-5" />
          </button>

          <!-- Only a bot fills this in. -->
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" class="absolute -left-[9999px] h-px w-px opacity-0" />

          <Transition name="step" mode="out-in">
            <!-- Which church? -->
            <form v-if="step === 'church'" key="church" class="px-5 pt-6 sm:px-7" @submit.prevent="continueWithChurch">
              <!-- The mark beside the greeting, one line, leaving room for the X. -->
              <div class="flex items-center gap-3 pr-8">
                <AnimatedMark mode="once" class="h-9 w-9 shrink-0" />
                <h2 id="welcome-title" class="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Welcome to {{ branding.name }}</h2>
              </div>
              <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">Which church are you with?</p>

              <input v-model="church" type="text" maxlength="120" autocomplete="organization" enterkeyhint="next" placeholder="Grace Baptist Church" aria-label="Your church’s name" :class="[field, 'mt-4']" />

              <!-- The address it could have, appearing as they type — with the
                   church's own logo beside it, if it is one we know. -->
              <p class="mt-2 flex h-6 items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Transition name="fade">
                  <img v-if="known" :key="known.key" :src="known.logo" alt="" class="known-logo h-6 w-6 shrink-0 rounded-md bg-white object-contain ring-1 ring-black/5" />
                </Transition>
                <Transition name="fade">
                  <span v-if="address" class="min-w-0 truncate">
                    Yours could be <span class="font-mono font-semibold text-primary dark:text-primary-light">{{ address }}</span>
                  </span>
                </Transition>
              </p>

              <p v-if="error" role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

              <div class="mt-4 flex items-center gap-2">
                <button type="button" :class="skip" @click="finish">Skip</button>
                <button type="submit" :disabled="!churchReady || sending" :class="primary">
                  Continue
                  <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>

            <!-- How to reach them, if they like. -->
            <form v-else-if="step === 'contact'" key="contact" class="px-5 pt-6 sm:px-7" @submit.prevent="sendContact">
              <p class="truncate text-xs font-bold uppercase tracking-wide text-primary dark:text-primary-light">{{ church }}</p>
              <h2 class="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">Can we reach out?</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Only to talk about {{ branding.name }}. Never shared.</p>

              <div class="mt-4 space-y-2.5">
                <input v-model="name" type="text" maxlength="80" autocomplete="name" enterkeyhint="next" placeholder="Your name" aria-label="Your name" :class="field" />
                <input v-model="contact" type="text" maxlength="120" autocomplete="email" inputmode="email" enterkeyhint="send" placeholder="Email or phone number" aria-label="Email or phone number" :class="field" />
              </div>

              <p v-if="error" role="alert" class="mt-2 text-sm text-red-600 dark:text-red-400">{{ error }}</p>

              <div class="mt-4 flex items-center gap-2">
                <button type="button" :class="skip" @click="thank">Skip</button>
                <button type="submit" :disabled="!contactOk || sending" :class="primary">
                  Send
                  <ArrowRight class="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>

            <!-- Thanks, and away. -->
            <div v-else key="thanks" class="flex flex-col items-center px-5 pb-2 pt-8 text-center sm:px-7">
              <svg viewBox="0 0 52 52" class="h-14 w-14 text-primary dark:text-primary-light" aria-hidden="true">
                <circle class="check-ring" cx="26" cy="26" r="23" fill="none" stroke="currentColor" stroke-width="3" pathLength="1" />
                <path class="check-tick" d="M16 27l7 7 13-15" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
              </svg>
              <h2 class="mt-4 text-2xl font-black tracking-tight text-gray-900 dark:text-white">{{ gaveContact ? 'Thank you!' : 'Glad you’re here' }}</h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ gaveContact ? 'We’ll be in touch soon.' : `Have a look at what ${branding.name} does.` }}
              </p>
              <button type="button" :class="[skip, 'mt-3']" @click="finish">Look around</button>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* The window's own four colours, from the mark: the one place here that does
   not follow the accent, because it is Ekkly's glass rather than a church's. */
.mark-band {
  background: linear-gradient(90deg, #fdc24b, #f19140 35%, #09a4c6 68%, #0270dc);
}

/* The card opens out of the middle of itself; the page behind dims lightly. */
.welcome-enter-active,
.welcome-leave-active {
  transition: opacity 0.3s ease;
}

.welcome-enter-active .welcome-panel {
  transition: clip-path 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.welcome-leave-active .welcome-panel {
  transition: clip-path 0.25s ease-in;
}

.welcome-enter-from,
.welcome-leave-to {
  opacity: 0;
}

.welcome-panel {
  clip-path: inset(0 round 1.5rem);
}

.welcome-enter-from .welcome-panel,
.welcome-leave-to .welcome-panel {
  clip-path: inset(40% 30% 40% 30% round 1.5rem);
}

/* One step to the next: a quick slide sideways, the way a step moves on. */
.step-enter-active,
.step-leave-active {
  transition:
    opacity 0.18s ease,
    translate 0.18s ease;
}

.step-enter-from {
  opacity: 0;
  translate: 1rem 0;
}

.step-leave-to {
  opacity: 0;
  translate: -1rem 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* The tick draws itself once: the ring, then the mark. */
.check-ring,
.check-tick {
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.check-ring {
  animation: draw 0.5s cubic-bezier(0.65, 0, 0.35, 1) 0.1s forwards;
}

.check-tick {
  animation: draw 0.35s cubic-bezier(0.65, 0, 0.35, 1) 0.5s forwards;
}

@keyframes draw {
  to {
    stroke-dashoffset: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .welcome-enter-active .welcome-panel,
  .welcome-leave-active .welcome-panel,
  .step-enter-active,
  .step-leave-active {
    transition: opacity 0.15s ease;
  }

  .welcome-enter-from .welcome-panel,
  .welcome-leave-to .welcome-panel,
  .step-enter-from,
  .step-leave-to {
    translate: none;
    clip-path: none;
  }

  .check-ring,
  .check-tick {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
