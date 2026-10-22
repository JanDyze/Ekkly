<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import HomeScene from '../home/HomeScene.vue'
import YunitLamb, { LAMB_WALK_SPEED } from '../yunit/YunitLamb.vue'
import LostAbout from './LostAbout.vue'
import LostField from './LostField.vue'
import { useAuth } from '../../composables/useAuth'
import { useSounds } from '../../composables/useSounds'
import { bleat } from '../../utils/bleat'
import { useTheme } from '../../composables/useTheme'

// The other lost page (views/NotFound.vue): YUNIT out in the dark field with
// his lantern, looking for the page, and not finding it. Here he is dressed
// as a lamb (YunitLamb), his colours a crown of dyed wool on his head: a lost lamb
// himself, out looking for what is lost.
//
// The field follows the theme. In the light he simply searches it; in the
// dark his lantern is lit and is the light, the field lying dark but for a
// pool of warm light round him. Either way he searches on
// his own — walks to another spot, looks about, and now and then says how it
// is going ("Not here.") — and a tap anywhere in the dark sends him over to
// look there. Tapped himself, he hops (YunitLamb) and says "Baa!", aloud if
// the app's sounds are on, his mouth open while he does. He moves
// because something happened, never idles (BRAND.md), and with less motion
// asked for he stands still.

const route = useRoute()
const router = useRouter()
const { isAuthenticated } = useAuth()
const { isDark } = useTheme()
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const home = computed(() => (route.meta.flock === 'church' && isAuthenticated.value ? '/home' : '/'))
const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push(home.value)
}

/* --------------------------------------------------- where he looks */

const walker = ref(null)
const mascot = ref(null)
const x = ref(0)
const facing = ref(1)

const width = () => walker.value?.offsetWidth || 112
const clamp = (value) => {
  const edge = window.innerWidth * 0.04
  return Math.max(edge, Math.min(window.innerWidth - width() - edge, value))
}

// What he says as he searches, one at a time, never twice running.
const LINES = [
  'Not here.',
  'Hmm. Not under this hill.',
  'Is it behind the signpost? No.',
  'I’ll try over there.',
  'I’ve looked twice. It isn’t anywhere.',
  'Still looking…',
  'Whoever linked here may have moved it.',
]
const said = ref('')
let lineAt = -1
let sayTimer = null
const sayLine = (line, ms = 2600) => {
  said.value = line
  clearTimeout(sayTimer)
  sayTimer = setTimeout(() => (said.value = ''), ms)
}
const say = () => {
  let next = Math.floor(Math.random() * LINES.length)
  if (next === lineAt) next = (next + 1) % LINES.length
  lineAt = next
  sayLine(LINES[next])
}

// Tapped: "Baa!", aloud if the sounds are on, his mouth open for as long as
// it lasts.
const { soundsOn } = useSounds()
const bleating = ref(false)
let bleatTimer = null
const sayBaa = () => {
  sayLine('Baa!', 1600)
  const length = soundsOn.value ? bleat() : 800
  bleating.value = true
  clearTimeout(bleatTimer)
  bleatTimer = setTimeout(() => (bleating.value = false), length)
}

// Off to another spot on foot, facing the way he goes, his lantern swinging
// with him. He is carried across at the pace his steps make (LAMB_WALK_SPEED), so
// his feet stay where they land rather than skating, and the move takes as
// long as the walk does. Then he stops and looks about.
const walking = ref(false)
const walkMs = ref(0)
let moveTimer = null
let setOff = 0
const searchAt = (to, talk, then) => {
  const goal = clamp(to)
  clearTimeout(moveTimer)
  cancelAnimationFrame(setOff)
  const done = () => {
    walking.value = false
    mascot.value?.play('glance')
    if (talk) say()
    then?.()
  }
  // A tap mid-walk sets off from where he has got to, not from where he was
  // headed: the transition is stopped where it is by reading it back.
  const at = walker.value ? new DOMMatrixReadOnly(getComputedStyle(walker.value).transform).m41 : x.value
  if (reduced || Math.abs(goal - at) < 4) {
    x.value = goal
    walkMs.value = 0
    done()
    return
  }
  facing.value = goal > at ? 1 : -1
  walkMs.value = 0
  x.value = at
  walking.value = true
  // On the next frame, so the stop where he was is drawn before the walk.
  cancelAnimationFrame(setOff)
  setOff = requestAnimationFrame(() => {
    walkMs.value = Math.round((Math.abs(goal - at) / (width() * LAMB_WALK_SPEED)) * 1000)
    x.value = goal
    moveTimer = setTimeout(done, walkMs.value)
  })
}

// On his own: a moment after he stops, another spot, and now and then a word.
let wanderTimer = null
const wander = () => {
  clearTimeout(wanderTimer)
  wanderTimer = setTimeout(() => {
    const distance = (90 + Math.random() * 260) * (Math.random() < 0.5 ? -1 : 1)
    let to = x.value + distance
    if (to !== clamp(to)) to = x.value - distance
    searchAt(to, Math.random() < 0.55, wander)
  }, 2400 + Math.random() * 2600)
}

// A tap in the dark: he goes to look there, and says how it went.
const lookHere = (event) => {
  clearTimeout(wanderTimer)
  searchAt(event.clientX - width() / 2, true, wander)
}

const onResize = () => {
  x.value = clamp(x.value)
}

onMounted(() => {
  x.value = clamp(window.innerWidth * (window.innerWidth >= 640 ? 0.3 : 0.1))
  window.addEventListener('resize', onResize)
  if (reduced) return
  // Once he has arrived, a first look about and a word.
  setTimeout(() => {
    mascot.value?.play('glance')
    say()
    wander()
  }, 1500)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  clearTimeout(wanderTimer)
  clearTimeout(moveTimer)
  clearTimeout(sayTimer)
  clearTimeout(bleatTimer)
  cancelAnimationFrame(setOff)
})

// The pool of his light on the dark, centred on his lantern, which hangs at
// his side away from his facing.
const light = computed(() => ({
  '--lx': `${x.value + width() * (facing.value > 0 ? 0.61 : 0.39)}px`,
  '--walk': `${walkMs.value}ms`,
}))
</script>

<template>
  <main class="home-scene relative isolate min-h-dvh overflow-hidden bg-(--scene-sky-3)">
    <HomeScene part="sky" class="pointer-events-none absolute inset-0 -z-10 size-full" />

    <!-- Where this page comes from, for whoever wonders (LostAbout). -->
    <LostAbout />

    <!-- What happened, and the way back. -->
    <section class="relative z-20 mx-auto flex max-w-xl flex-col items-center px-6 pt-[max(10dvh,4rem)] text-center">
      <p class="lost-ink text-xs font-bold uppercase tracking-[0.2em] text-(--scene-ink-accent)">404 · Page not found</p>
      <h1 class="lost-ink mt-3 text-4xl font-black tracking-tight text-(--scene-ink) sm:text-6xl">YUNIT the Sheep looked everywhere.</h1>
      <p class="lost-ink mt-4 max-w-md text-base text-(--scene-ink) sm:text-lg">
        {{ isDark ? 'Even with his lantern, this page' : 'He’s been all over the field, and this page' }} isn’t anywhere. It may have moved, or the link may be
        wrong.
      </p>
      <div class="mt-7 flex flex-wrap items-center justify-center gap-3">
        <RouterLink
          :to="home"
          class="inline-flex h-12 items-center rounded-xl bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Take me home
        </RouterLink>
        <button
          type="button"
          class="inline-flex h-12 items-center rounded-xl bg-gray-900/60 px-5 text-[15px] font-semibold text-gray-100 ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-gray-900/80"
          @click="goBack"
        >
          Go back
        </button>
      </div>
    </section>

    <LostField />

    <!-- The field, to tap: a tap anywhere sends him to look there. In the
         dark it is the dark itself, but for the pool of his lantern's light
         round him. -->
    <div :class="['absolute inset-0 z-5 cursor-pointer', isDark && 'lost-dark']" :style="light" aria-hidden="true" @click="lookHere" />
    <p class="pointer-events-none absolute inset-x-0 bottom-2 z-6 text-center text-xs font-semibold text-white/80">
      Tap the {{ isDark ? 'dark' : 'field' }} to send him looking
    </p>

    <!-- YUNIT, where his search has got to, his lantern lit in the dark. -->
    <div ref="walker" class="lost-walker absolute left-0 z-10 w-24 sm:w-28" :style="{ transform: `translateX(${x}px)`, '--walk': `${walkMs}ms` }">
      <Transition enter-active-class="lost-pop-in" leave-active-class="lost-pop-out">
        <span
          v-if="said"
          :key="said"
          :class="[
            'absolute -top-12 w-max max-w-[14rem] rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-gray-900 ring-1 ring-black/5',
            facing > 0 ? 'left-[55%] origin-bottom-left rounded-bl-md' : 'right-[55%] origin-bottom-right rounded-br-md',
          ]"
          aria-live="polite"
        >
          {{ said }}
        </span>
      </Transition>
      <div :style="{ transform: facing < 0 ? 'scaleX(-1)' : null }">
        <YunitLamb ref="mascot" :walking="walking" :lantern="isDark" :bleating="bleating" class="w-full" @click="sayBaa" />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Words set on the sky, haloed so they read over a cloud. */
.lost-ink {
  text-shadow:
    0 0 12px var(--scene-ink-halo),
    0 0 2px var(--scene-ink-halo);
}

/* Where he stands: his feet on the near hill, a fifth of the field up. He
   goes at an even pace for as long as his walk takes (--walk, set from the
   distance), as walking does, not easing in and out like a slide. */
.lost-walker {
  bottom: calc(min(40dvh, 22rem) * 0.2);
  transition: transform var(--walk, 0ms) linear;
}

/* The dark over the field, a hole of warm light round his lantern that goes
   with him. Its centre is at his lantern's height above the foot of the
   page. */
.lost-dark {
  --ly: calc(100% - min(40dvh, 22rem) * 0.2 - 1.75rem);
  background: rgb(4 10 24 / 0.62);
  mask-image: radial-gradient(circle 9rem at var(--lx) var(--ly), transparent 0, transparent 35%, #000 100%);
  transition: --lx var(--walk, 0ms) linear;
}

/* What he says pops out from beside him, and goes. */
.lost-pop-in {
  animation: lost-pop 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.lost-pop-out {
  animation: lost-pop 160ms ease-in reverse;
}
@keyframes lost-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lost-walker,
  .lost-dark {
    transition: none;
  }
  .lost-pop-in,
  .lost-pop-out {
    animation: none;
  }
}
</style>

<!-- The light's centre glides with him: registered so it can be transitioned. -->
<style>
@property --lx {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}
</style>
