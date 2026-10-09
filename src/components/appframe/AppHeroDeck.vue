<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, X } from '../../icons'
import AppHero from './AppHero.vue'
import { useSounds } from '../../composables/useSounds'

// An app's first card, when there is more than one thing worth leading with.
//
// Whatever matters most today gets a card of its own — an account waiting to
// be linked, somebody's birthday — stacked over the card that is always true
// (how many people the church has, the next Sunday). The top card is the one
// read; the ones under it peek out below, so it is plain there are more.
// A swipe either way sends the top card under the deck — it flies off the
// side it was pushed and tucks in at the bottom — and the next one is on top.
// So the deck is a loop, the way a real one is: keep going and the first card
// comes round again. The dots under it say where you are and go straight to
// a card; the arrow keys go forward and back.
//
// A card that is news rather than a fact can be dismissed. Dismissed is for
// this session only — until the app is closed and opened again — because
// something that mattered this morning may matter again tomorrow, and a card
// gone for good would hide it. sessionStorage is exactly that span; where it
// is blocked, dismissing still works until the page is left.
//
// A card about a standing chore — records to fill in, people to ask — is the
// exception (`remember`, with a `level`: how many there are). Back every
// session, it would be the same card every day for months, and soon one
// nobody reads. So putting it away lasts, on this device, until the number
// goes up: something new to do, rather than the same old pile. Going down is
// progress, not news, and lowers the mark instead, so the next one added
// brings it back. Such a card is passed in even at level 0, where it is not
// shown, so the mark can follow the pile all the way down.
//
// Cards: `{ key, tone, dismissible, ... }`, and whatever else the app's own
// faces need. Give a card's key whatever would make it news again — `claims:3`
// comes back when a fourth request arrives. Each card's face is the `card`
// slot, given `{ card, top }` — a DeckCard, so each kind can look like what it
// is about (People's home draws a birthday, a bar, a date). Without the slot a
// card is a plain AppHero, from `{ greeting, title, detail, to, badge }`.
// `tone` is the card's background, so the dismiss button can be seen on it.
//
// Each move is heard as well as seen (useSounds): a whoosh to the side a card
// is swiped, a soft thud as it lands under the deck, a light lift as one is
// put away.

const props = defineProps({
  cards: { type: Array, required: true },
  // The app's artwork, for cards drawn as a plain AppHero.
  art: { type: String, default: '' },
  // Which app's dismissals these are, so two apps' keys never collide.
  scope: { type: String, required: true },
  label: { type: String, default: 'Today' },
})

/* ------------------------------------------------------------- dismissing */

const STORE = 'ekkly:dismissed-cards'

const readDismissed = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(STORE) || '[]'))
  } catch {
    return new Set()
  }
}

const { prime, swipe, tuck, lift } = useSounds()

const dismissed = ref(readDismissed())
const idOf = (card) => `${props.scope}:${card.key}`

// The `remember` cards' marks: the level each was put away at, per device.
const KEPT_STORE = 'ekkly:put-away-cards'

const readKept = () => {
  try {
    return JSON.parse(localStorage.getItem(KEPT_STORE) || '{}') || {}
  } catch {
    return {}
  }
}

const kept = ref(readKept())

const writeKept = (next) => {
  kept.value = next
  try {
    localStorage.setItem(KEPT_STORE, JSON.stringify(next))
  } catch {
    // Not remembered past this page; it is still put away on it.
  }
}

const levelOf = (card) => (Number.isFinite(card.level) ? card.level : 0)

const isPutAway = (card) => {
  if (!card.dismissible) return false
  if (!card.remember) return dismissed.value.has(idOf(card))
  const mark = kept.value[idOf(card)]
  return Number.isFinite(mark) && levelOf(card) <= mark
}

// The pile shrank under its mark: the mark follows it down, so the next one
// added is news again.
watch(
  () => props.cards.filter((card) => card.remember).map((card) => [idOf(card), levelOf(card)]),
  (pairs) => {
    const lower = pairs.filter(([id, level]) => Number.isFinite(kept.value[id]) && level < kept.value[id])
    if (lower.length) writeKept({ ...kept.value, ...Object.fromEntries(lower) })
  },
  { immediate: true }
)

const visible = computed(() =>
  props.cards.filter((card) => !(card.remember && levelOf(card) <= 0) && !isPutAway(card))
)

// The card on its way out: it lifts and fades first, and only then leaves the
// deck, so the one under it rises into a space that has visibly been made.
const leaving = ref(null)

const dismiss = (card) => {
  if (leaving.value) return
  leaving.value = card.key
  lift()
  setTimeout(() => {
    leaving.value = null
    if (card.remember) {
      writeKept({ ...kept.value, [idOf(card)]: levelOf(card) })
    } else {
      const next = new Set(dismissed.value)
      next.add(idOf(card))
      dismissed.value = next
      try {
        sessionStorage.setItem(STORE, JSON.stringify([...next]))
      } catch {
        // Not remembered past this page; it is still gone from it.
      }
    }
    // The card that rose into its place is the one left on top now.
    rememberTop()
  }, 220)
}

/* -------------------------------------------------------------- the deck */

const index = ref(0)
const count = computed(() => visible.value.length)
const wrap = (i) => (count.value ? ((i % count.value) + count.value) % count.value : 0)

// A card dismissed, or a list that shrank as data arrived, must not leave the
// deck pointing past its last card.
watch(count, () => {
  index.value = wrap(index.value)
})

// The card on its way under: it flies off to the side first, at full height,
// and only once it is clear does the deck turn, so it is seen going under
// rather than vanishing.
const flying = ref(null)
const FLY_MS = 260
// The thud waits for the card to be most of the way back under the deck: its
// slide in eases out, so by this point it has all but landed.
const LAND_MS = FLY_MS + 150

const sendUnder = (dir) => {
  if (count.value < 2 || flying.value || leaving.value) return
  flying.value = { key: visible.value[index.value].key, dir }
  swipe(dir)
  setTimeout(() => {
    index.value = wrap(index.value + 1)
    flying.value = null
    rememberTop()
  }, FLY_MS)
  setTimeout(tuck, LAND_MS)
}

/** Straight to a card — a dot, or back one with the arrow key. */
const go = (to) => {
  if (flying.value) return
  index.value = wrap(to)
  rememberTop()
}

/* ------------------------------------------------- the card left on top */

// Whichever card was on top when the app was left is on top when it is come
// back to, so going into a section and out again does not turn the deck back
// to its first card. Per device, in localStorage, because it is how this
// person left their own screen; blocked storage just starts at the top.
const TOP_STORE = `ekkly:deck-top:${props.scope}`

let wanted = (() => {
  try {
    return localStorage.getItem(TOP_STORE)
  } catch {
    return null
  }
})()

const rememberTop = () => {
  // Turned by hand, so whatever was remembered has been answered.
  wanted = null
  try {
    localStorage.setItem(TOP_STORE, visible.value[wrap(index.value)]?.key || '')
  } catch {
    // Not remembered this time; the deck still turned.
  }
}

// Set without its slide, so coming back finds the card already there rather
// than watching the deck turn to it.
const instant = ref(false)

// The cards arrive over time — the roll at once, a birthday when the roll
// has loaded — so the remembered card is looked for each time the deck
// changes, until it is found or the deck is turned by hand. A card that has
// gone since (dismissed, or no longer true) leaves the deck at its top.
watch(
  () => visible.value.map((card) => card.key).join('|'),
  () => {
    if (!wanted) return
    const at = visible.value.findIndex((card) => card.key === wanted)
    if (at < 0 || at === index.value) return
    instant.value = true
    index.value = at
    requestAnimationFrame(() => requestAnimationFrame(() => (instant.value = false)))
  },
  { immediate: true }
)

/* ------------------------------------------------------------- swiping */

const deck = ref(null)
const dx = ref(0)
const dragging = ref(false)
let start = null
let recent = null
// A swipe ends in a click on the card it started on; that click must not open
// the card.
let swallowClick = false

const width = () => deck.value?.clientWidth || 320

const onPointerDown = (event) => {
  // A browser lets a page make sound only from inside a touch, so the audio
  // is woken here, before the swipe it will be needed for.
  prime()
  if (event.button > 0 || count.value < 2 || flying.value) return
  if (event.target.closest('[data-deck-dismiss]')) return
  start = { x: event.clientX, y: event.clientY }
  recent = { x: event.clientX, t: event.timeStamp }
  swallowClick = false
}

const onPointerMove = (event) => {
  if (!start) return
  const mx = event.clientX - start.x
  const my = event.clientY - start.y
  if (!dragging.value) {
    // Undecided until the finger has gone somewhere: sideways is ours, and
    // up or down is the page scrolling, which is left alone entirely.
    if (Math.abs(mx) < 8 && Math.abs(my) < 8) return
    if (Math.abs(my) >= Math.abs(mx)) {
      start = null
      return
    }
    dragging.value = true
    swallowClick = true
    deck.value?.setPointerCapture?.(event.pointerId)
  }
  dx.value = mx
  recent = { x: event.clientX, t: event.timeStamp, vx: (event.clientX - recent.x) / Math.max(event.timeStamp - recent.t, 1) }
}

const onPointerUp = () => {
  if (dragging.value) {
    // Far enough, or flicked: either one sends it under, off the side it
    // was pushed. Not far enough and it settles back on top.
    const far = width() * 0.25
    const flick = recent?.vx || 0
    if (dx.value < -far || flick < -0.5) sendUnder(-1)
    else if (dx.value > far || flick > 0.5) sendUnder(1)
  }
  dragging.value = false
  dx.value = 0
  start = null
}

const onClickCapture = (event) => {
  if (!swallowClick) return
  event.preventDefault()
  event.stopPropagation()
  swallowClick = false
}

/* ------------------------------------------------------- where each card sits */

// Two cards show under the top one; any further down wait unseen behind them.
const UNDER = 2

const styleOf = (card, i) => {
  // Where the card is counting down from the top: 0 is on top, and the one
  // after the last comes round to the first.
  const pos = wrap(i - index.value)
  const w = width()
  const motion = dragging.value || instant.value
    ? { transition: 'none' }
    : { transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease' }

  if (card.key === leaving.value) {
    return { ...motion, zIndex: 60, opacity: 0, transform: 'translateY(-12px) scale(0.96)' }
  }

  // Off to the side it was pushed, above everything until it is clear. Once
  // the deck turns it is the bottom card, and slides back in under the rest.
  if (flying.value?.key === card.key) {
    const dir = flying.value.dir
    return {
      transition: `transform ${FLY_MS}ms cubic-bezier(0.4, 0, 1, 1)`,
      zIndex: 60,
      transform: `translateX(${dir * w * 1.15}px) rotate(${dir * 12}deg)`,
    }
  }

  if (pos === 0) {
    return {
      ...motion,
      zIndex: 50,
      transform: `translateX(${dx.value}px) rotate(${(dx.value / w) * 8}deg)`,
    }
  }

  // How far the top card has gone, 0 to 1: the cards underneath come up by
  // as much, so the next card is already arriving under the finger.
  const pull = flying.value ? 1 : dragging.value ? Math.min(Math.abs(dx.value) / w, 1) : 0
  const depth = Math.min(Math.max(pos - pull, 0), UNDER)
  // At rest the cards underneath are faded, so the deck reads as one card
  // with more behind it. Once the top card is moving the next one is being
  // read, and see-through it would show the card under it through its words,
  // so it is solid from the moment a swipe starts — eased in quickly rather
  // than snapping, while its position still follows the finger exactly.
  const moving = dragging.value || flying.value
  const opacity = pos - pull > UNDER ? 0 : moving && pos === 1 ? 1 : 1 - depth * 0.3
  return {
    ...(dragging.value ? { transition: 'opacity 150ms ease' } : motion),
    zIndex: 50 - pos,
    opacity,
    transform: `translateY(${depth * 9}px) scale(${1 - depth * 0.05})`,
  }
}
</script>

<template>
  <div
    v-if="visible.length"
    role="region"
    aria-roledescription="carousel"
    :aria-label="label"
    class="-mx-4 flex flex-col gap-2 overflow-x-clip px-4"
    @keydown.left="go(index - 1)"
    @keydown.right="sendUnder(-1)"
  >
    <!-- Every card in the one grid cell, each the same fixed share of the
         screen's height (DeckCard), so nothing jumps between them. The one
         column is minmax(0, 1fr) and the cards min-w-0: left to itself a grid
         column grows to its widest unbroken line (a row of chips, a caption),
         and the card would run off the screen instead of ending in "…".
         The region round it is clipped sideways at the screen's edge rather
         than the column's, so a swiped card can travel to the edge without
         the page scrolling sideways under it. -->
    <div
      ref="deck"
      :class="['grid grid-cols-1 touch-pan-y select-none', visible.length > 1 ? 'pb-[18px]' : '']"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click.capture="onClickCapture"
      @dragstart.prevent
    >
      <div
        v-for="(card, i) in visible"
        :key="card.key"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} of ${visible.length}`"
        :inert="i !== index"
        class="deck-card relative min-w-0 [grid-area:1/1] origin-bottom"
        :style="styleOf(card, i)"
      >
        <slot name="card" :card="card" :top="i === index">
          <AppHero
            class="h-full"
            :art="art"
            :greeting="card.greeting"
            :title="card.title"
            :detail="card.detail"
            :badge="card.dismissible ? '' : card.badge"
            :to="card.to"
            :inset="card.dismissible"
          />
        </slot>

        <button
          v-if="card.dismissible"
          type="button"
          data-deck-dismiss
          :class="[
            'absolute right-3 top-3 flex size-8 items-center justify-center rounded-full transition-colors',
            !card.tone || card.tone === 'accent' || card.tone === 'celebrate'
              ? 'bg-white/15 text-white hover:bg-white/25'
              : 'bg-gray-900/5 text-gray-500 hover:bg-gray-900/10 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15',
          ]"
          :aria-label="card.remember ? 'Dismiss until there are more' : 'Dismiss until the app is opened again'"
          @click="dismiss(card)"
        >
          <X class="size-4" />
        </button>
      </div>
    </div>

    <!-- Where you are in the deck, and a tap to any card in it. The chevrons
         either side are for whoever has not guessed the cards swipe: quiet
         enough to pass unnoticed by someone who has, and doing the same as a
         swipe (next sends the top card under) for someone who has not. -->
    <div v-if="visible.length > 1" class="flex items-center justify-center gap-0.5">
      <button
        type="button"
        class="mr-1 flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-900/5 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"
        aria-label="Previous card"
        @click="go(index - 1)"
      >
        <ChevronLeft class="size-4" />
      </button>
      <button
        v-for="(card, i) in visible"
        :key="card.key"
        type="button"
        class="flex h-4 items-center px-0.5"
        :aria-label="`Card ${i + 1} of ${visible.length}`"
        :aria-current="i === index ? 'true' : undefined"
        @click="go(i)"
      >
        <span
          :class="[
            'block h-1.5 rounded-full transition-all duration-300',
            i === index ? 'w-5 bg-primary dark:bg-primary-light' : 'w-1.5 bg-gray-300 dark:bg-gray-600',
          ]"
        />
      </button>
      <button
        type="button"
        class="ml-1 flex size-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-900/5 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-gray-300"
        aria-label="Next card"
        @click="sendUnder(-1)"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@media (prefers-reduced-motion: reduce) {
  .deck-card {
    transition: none !important;
  }
}
</style>
