<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Plus, X } from '../../icons'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useScrollLock } from '../../composables/useScrollLock'
import { formatMoney } from '../../utils/moneyUtils'
import { appArt } from './appIcons'
import AppArt from './AppArt.vue'
import { appDetail } from './appDetails'
import { vScrollLight } from './scrollLight'

// "What's inside": every app on sale, laid out like the apps on a phone's home
// screen — an icon and a name, nothing more — so the whole of Ekkly is taken in
// at a glance. Tapping an app is how to learn what it does.
//
// On a desktop the app grows out of its icon until it covers the section, with
// a strip along the top to go from one app to the next, so the section stays
// one screen whatever is open. On a phone it opens as a card in the middle of
// the screen, and the page holds still behind it.
//
// The heading comes in through the slot, so it keeps the page's own styles.

const props = defineProps({
  apps: { type: Array, default: () => [] },
  // The keys of the apps in the plan builder's plan, so an open app can say
  // it is already in it.
  planned: { type: Array, default: () => [] },
})

const emit = defineEmits(['plan', 'view-plan'])

const isDesktop = useMediaQuery('(min-width: 1024px)')

// Each app numbered in the order it is drawn, which is the order it lights up.
const ordered = computed(() => props.apps.map((app, order) => ({ ...app, order })))

// The icons come on one at a time as the grid rises, all of them by the time
// its last row reaches the bottom of the screen. On a desktop the section fits
// the screen with only a sliver of padding below, so it has to be the very
// bottom edge, or a reader who has arrived would find the last icons still
// dark. Lit is the default, for a page without motion.
const litApps = ref(Infinity)
const BOARD_LIGHT = {
  start: 1,
  end: 0.995,
  onProgress: (p) => (litApps.value = p >= 1 ? Infinity : Math.round(p * props.apps.length)),
}

// Each icon plays its little animation as it comes on, and again when the
// pointer arrives on it. A counter per app: bumping it is what replays.
const plays = ref({})
const replay = (key) => {
  plays.value = { ...plays.value, [key]: (plays.value[key] || 0) + 1 }
}
watch(litApps, (lit, before) => {
  ordered.value.forEach((app) => {
    if (app.order < lit && !(app.order < before)) replay(app.key)
  })
})

/* ------------------------------------------------------------- opening */

const openKey = ref(null)
const openIndex = computed(() => ordered.value.findIndex((app) => app.key === openKey.value))
const openApp = computed(() => ordered.value[openIndex.value] || null)
const detail = computed(() => (openApp.value ? appDetail(openApp.value) : null))

// On a phone the open app covers the screen, so the page behind holds still.
useScrollLock(() => Boolean(openApp.value) && !isDesktop.value)

const root = ref(null)
const panel = ref(null)
const tiles = new Map()
const setTile = (key) => (el) => (el ? tiles.set(key, el) : tiles.delete(key))

// Where the panel grows from and shrinks back to. On a desktop, the open app's
// own icon, as an inset of the whole section, so the clip starts exactly on
// it; on a phone, the middle of the card.
const CENTRE = 'inset(40% 30% 40% 30% round 1.5rem)'
const origin = ref(CENTRE)
const measureOrigin = (key) => {
  if (!isDesktop.value) {
    origin.value = CENTRE
    return
  }
  const tile = tiles.get(key)
  const box = root.value?.getBoundingClientRect()
  if (!tile || !box) return
  const t = tile.getBoundingClientRect()
  origin.value = `inset(${t.top - box.top}px ${box.right - t.right}px ${box.bottom - t.bottom}px ${t.left - box.left}px round 1.25rem)`
}

const open = async (app) => {
  // On a desktop the section is brought wholly into view first, so the open
  // app has all of it.
  if (isDesktop.value) {
    const box = root.value?.closest('section')?.getBoundingClientRect()
    if (box && (box.top < 0 || box.bottom > window.innerHeight)) {
      root.value.closest('section').scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
  measureOrigin(app.key)
  openKey.value = app.key
  await nextTick()
  panel.value?.focus({ preventScroll: true })
}

// Back into whichever app is open now, which may not be the one first opened.
const close = async () => {
  const key = openKey.value
  if (!key) return
  measureOrigin(key)
  await nextTick()
  openKey.value = null
  // The grid is inert until the panel's removal is rendered, and an inert
  // button refuses focus.
  await nextTick()
  tiles.get(key)?.focus({ preventScroll: true })
}

// Which way the apps are going, so the next one slides in from the side it
// comes from.
const direction = ref('next')

const step = (by) => {
  const list = ordered.value
  if (!list.length || openIndex.value < 0) return
  direction.value = by > 0 ? 'next' : 'prev'
  openKey.value = list[(openIndex.value + by + list.length) % list.length].key
}

const pick = (key) => {
  const to = ordered.value.findIndex((app) => app.key === key)
  direction.value = to < openIndex.value ? 'prev' : 'next'
  openKey.value = key
}

// A sideways swipe on a phone goes to the next app or back to the last, the way
// a phone's own screens turn. A swipe that is mostly up or down is the card
// scrolling, and is left alone.
let touch = null
const onTouchStart = (event) => {
  const t = event.touches[0]
  touch = event.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null
}
const onTouchEnd = (event) => {
  if (!touch) return
  const t = event.changedTouches[0]
  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y
  touch = null
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1)
}

// What an app costs, beside the button that adds it. Whole pesos read as a
// price tag; the centavos only matter on a bill.
const priceOf = (app) => (app.price > 0 ? `${formatMoney(app.price).replace(/\.00$/, '')} a month` : 'Free')

const inPlan = (app) => props.planned.includes(app.key)

// Adding keeps the panel open and says so in place; "See my plan" is there for
// anyone who wants to go and look.
const justAdded = ref('')
const addToPlan = (app) => {
  justAdded.value = app.key
  emit('plan', app.key)
}

const viewPlan = async () => {
  await close()
  emit('view-plan')
}

// Escape closes and the arrow keys walk the apps, while one is open and nobody
// is typing.
const onKey = (event) => {
  if (!openKey.value) return
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return
  if (event.key === 'Escape') close()
  else if (event.key === 'ArrowRight') step(1)
  else if (event.key === 'ArrowLeft') step(-1)
  else return
  event.preventDefault()
}

watch(openKey, (key) => {
  if (key) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div ref="root" class="relative">
    <!-- Faded on a desktop while an app is open, so none of it shows past the
         panel's rounded corners, and back as the panel shrinks into its icon. -->
    <div :inert="Boolean(openApp)" :class="['transition-opacity duration-500', { 'opacity-0': isDesktop && openApp }]">
      <slot name="heading" />

      <!-- The apps, as a phone's home screen lays them out. -->
      <ul
        v-scroll-light="BOARD_LIGHT"
        class="mx-auto mt-10 grid max-w-5xl grid-cols-4 gap-x-1 gap-y-5 sm:grid-cols-5 sm:gap-x-3 lg:mt-[clamp(1.5rem,5dvh,3.5rem)] lg:grid-cols-7 lg:gap-x-4 lg:gap-y-[clamp(0.75rem,3.5dvh,2.25rem)]"
      >
        <li v-for="app in ordered" :key="app.key">
          <button
            :ref="setTile(app.key)"
            type="button"
            :aria-label="`${app.name}: see what it does`"
            :class="[
              'launch group flex w-full flex-col items-center gap-2 rounded-2xl px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-2.5 lg:py-3',
              { 'is-on': app.order < litApps },
            ]"
            @click="open(app)"
            @pointerenter="$event.pointerType === 'mouse' && replay(app.key)"
          >
            <span class="app-icon relative flex aspect-square w-14 items-center justify-center sm:w-16 lg:w-[clamp(3.75rem,9.5dvh,5.25rem)]">
              <AppArt :app-key="app.key" :play="plays[app.key] || 0" class="h-full w-full" />
            </span>
            <span class="line-clamp-2 text-xs font-semibold leading-tight text-gray-800 sm:text-sm dark:text-gray-100">{{ app.name }}</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- The open app. A desktop grows it out of its icon over the section; a
         phone shows it as a card in the middle of the screen. -->
    <Transition name="grow" :duration="{ enter: 500, leave: 350 }">
      <div
        v-if="openApp"
        :class="isDesktop ? 'absolute inset-0 z-10' : 'fixed inset-0 z-100 flex items-center justify-center p-4'"
        :style="{ '--origin': origin }"
      >
        <div v-if="!isDesktop" class="backdrop absolute inset-0 bg-gray-950/40 backdrop-blur-[2px]" @click="close"></div>

        <div
          ref="panel"
          tabindex="-1"
          role="dialog"
          :aria-modal="!isDesktop"
          :aria-label="openApp.name"
          :class="[
            'panel relative flex flex-col bg-gray-100 shadow-2xl shadow-gray-900/10 ring-1 ring-gray-900/5 focus:outline-none dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/10',
            isDesktop ? 'h-full rounded-2xl' : 'max-h-[85dvh] w-full max-w-md rounded-3xl',
          ]"
        >
          <!-- Going from one app to the next. A desktop also has every app in a
               row, which fits it; a phone has only where it is, and the arrows,
               rather than a row that would have to scroll sideways. -->
          <div class="panel-fade flex items-center gap-2 border-b border-gray-200/80 px-3 py-2.5 sm:px-4 dark:border-gray-800">
            <p class="min-w-0 flex-1 px-1 text-sm font-semibold tabular-nums text-gray-500 lg:hidden dark:text-gray-400">
              {{ openIndex + 1 }} of {{ ordered.length }}
            </p>
            <div class="hidden min-w-0 flex-1 items-center gap-1 lg:flex" role="tablist" aria-label="Apps">
              <button
                v-for="app in ordered"
                :key="app.key"
                type="button"
                role="tab"
                :aria-selected="app.key === openKey"
                :aria-label="app.name"
                :title="app.name"
                :class="[
                  'tab flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  app.key === openKey ? 'is-current bg-white shadow-sm ring-1 ring-primary/30 dark:bg-gray-800' : 'hover:bg-gray-200/70 dark:hover:bg-gray-800',
                ]"
                @click="pick(app.key)"
              >
                <img :src="appArt(app.key)" alt="" draggable="false" class="h-full w-full select-none" />
              </button>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button type="button" aria-label="Previous app" class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800" @click="step(-1)">
                <ChevronLeft class="h-5 w-5" />
              </button>
              <button type="button" aria-label="Next app" class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800" @click="step(1)">
                <ChevronRight class="h-5 w-5" />
              </button>
              <span class="mx-1 h-5 w-px bg-gray-300 dark:bg-gray-700" aria-hidden="true"></span>
              <button type="button" aria-label="Close" class="rounded-lg p-2 text-gray-500 hover:bg-gray-200/70 dark:text-gray-400 dark:hover:bg-gray-800" @click="close">
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            class="panel-fade relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <Transition :name="`swap-${direction}`" mode="out-in">
              <!-- A phone reads it top to bottom: the app, its wins, then what to
                   do. A desktop puts the app and what to do on the left and the
                   wins beside them. -->
              <div
                :key="openApp.key"
                class="grid gap-6 p-5 lg:min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[1fr_auto_1fr] lg:gap-x-12 lg:gap-y-0 lg:p-[clamp(1.25rem,5dvh,3rem)]"
              >
                <div class="min-w-0 lg:row-start-2">
                  <div class="flex items-center gap-3">
                    <AppArt :key="openApp.key" :app-key="openApp.key" :play="1" class="art-glow h-12 w-12 shrink-0" />
                    <div class="min-w-0">
                      <h3 class="truncate text-base font-bold">{{ openApp.name }}</h3>
                      <p v-if="openApp.group !== openApp.name" class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-500">{{ openApp.group }}</p>
                    </div>
                  </div>
                  <p class="mt-4 text-balance text-2xl font-black leading-[1.1] tracking-tight lg:mt-[clamp(1rem,3dvh,1.75rem)] lg:text-[clamp(1.75rem,5dvh,2.75rem)] lg:leading-[1.08]">{{ detail.headline }}</p>
                </div>

                <ul v-if="detail.wins.length" class="grid min-w-0 gap-2 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:content-center lg:gap-[clamp(0.5rem,1.6dvh,0.875rem)]">
                  <li
                    v-for="(win, i) in detail.wins"
                    :key="win.text"
                    :style="{ '--i': i }"
                    class="win flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm shadow-gray-900/5 lg:gap-4 lg:p-[clamp(0.625rem,2dvh,1.125rem)] dark:bg-gray-800/60 dark:shadow-none"
                  >
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary lg:h-11 lg:w-11 dark:bg-primary-light/15 dark:text-primary-light">
                      <component :is="win.icon" class="h-5 w-5 lg:h-5.5 lg:w-5.5" />
                    </span>
                    <span class="text-sm font-semibold text-gray-800 lg:text-base dark:text-gray-100">{{ win.text }}</span>
                  </li>
                </ul>

                <!-- What to do, in one place: a single button that adds the app,
                     and once it is in the plan becomes the way to see the plan,
                     with a line beside it saying where the app stands. -->
                <div class="flex items-center justify-between gap-3 lg:col-start-1 lg:row-start-3 lg:mt-[clamp(1.25rem,4dvh,2.25rem)] lg:flex-row-reverse lg:justify-end lg:self-start">
                  <p class="min-w-0 text-sm font-semibold tabular-nums">
                    <span v-if="openApp.core" class="flex items-center gap-1.5 text-primary dark:text-primary-light">
                      <Check class="h-4 w-4 shrink-0" />
                      Always included
                    </span>
                    <span v-else-if="inPlan(openApp)" :class="['flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400', { 'just-added': justAdded === openApp.key }]">
                      <span class="added-check flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500">
                        <Check class="h-3 w-3" />
                      </span>
                      In your plan
                    </span>
                    <span v-else class="text-gray-500 dark:text-gray-400">{{ priceOf(openApp) }}</span>
                  </p>
                  <button
                    v-if="openApp.core || inPlan(openApp)"
                    type="button"
                    class="group/cta inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-gray-900 shadow-sm ring-1 ring-gray-900/10 transition-colors hover:bg-gray-50 lg:px-5 dark:bg-gray-800 dark:text-white dark:ring-white/10 dark:hover:bg-gray-700"
                    @click="viewPlan"
                  >
                    See my plan
                    <ArrowRight class="h-4 w-4 transition-transform group-hover/cta:translate-x-0.5" />
                  </button>
                  <button
                    v-else
                    type="button"
                    class="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover lg:px-5"
                    @click="addToPlan(openApp)"
                  >
                    <span class="lg:hidden">Add to my plan</span>
                    <span class="hidden lg:inline">Add {{ openApp.name }} to my plan</span>
                    <Plus class="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* An app on the home screen answers the pointer with a soft tint behind it and
   a deeper shadow under its icon, never by moving. */
.launch:hover,
.launch:active {
  background-color: color-mix(in oklab, var(--color-gray-100) 70%, transparent);
}

.dark .launch:hover,
.dark .launch:active {
  background-color: color-mix(in oklab, var(--color-gray-800) 60%, transparent);
}

/* The icon: Ekkly's artwork, grey and faint until it comes on, then in its own
   colours with the glow of the glass behind it — orange above, blue below. */
.app-icon {
  filter: grayscale(1);
  opacity: 0.4;
  transition:
    filter 0.5s ease,
    opacity 0.5s ease;
}

.launch.is-on .app-icon,
.art-glow {
  filter: drop-shadow(0 -2px 8px rgb(255 140 30 / 0.28)) drop-shadow(0 6px 12px rgb(20 103 232 / 0.26));
  opacity: 1;
}

.launch.is-on:hover .app-icon {
  filter: drop-shadow(0 -3px 12px rgb(255 140 30 / 0.4)) drop-shadow(0 9px 18px rgb(20 103 232 / 0.36));
}

/* The strip of apps in an open panel: the one showing in colour, the rest
   quieter until pointed at. */
.tab img {
  filter: grayscale(0.85);
  opacity: 0.55;
  transition:
    filter 0.2s ease,
    opacity 0.2s ease;
}

.tab:hover img,
.tab.is-current img {
  filter: none;
  opacity: 1;
}

/* The open app grows out of where it was tapped: the panel is clipped to that
   box and the clip opens to its full size, then the contents come in. Closing
   runs it backwards. */
.panel {
  clip-path: inset(0 round 1.5rem);
}

.grow-enter-active .panel {
  transition: clip-path 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.grow-leave-active .panel {
  transition: clip-path 0.35s cubic-bezier(0.65, 0, 0.35, 1);
}

.grow-enter-from .panel,
.grow-leave-to .panel {
  clip-path: var(--origin);
}

.grow-enter-active .panel-fade,
.grow-enter-active .backdrop {
  transition: opacity 0.3s ease 0.15s;
}

.grow-leave-active .panel-fade,
.grow-leave-active .backdrop {
  transition: opacity 0.15s ease;
}

.grow-enter-from .panel-fade,
.grow-leave-to .panel-fade,
.grow-enter-from .backdrop,
.grow-leave-to .backdrop {
  opacity: 0;
}

/* Just added: the tick arrives with a little give, once. */
.just-added .added-check {
  animation: added-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@keyframes added-in {
  from {
    opacity: 0;
    scale: 0.8;
  }
}

/* Going from one app to another: the one showing slides away and the next
   comes in from the side it lies on, as a phone's screens turn, and the wins
   arrive one after another. */
.swap-next-enter-active,
.swap-next-leave-active,
.swap-prev-enter-active,
.swap-prev-leave-active {
  transition:
    opacity 0.18s ease,
    translate 0.18s ease;
}

.swap-next-enter-from,
.swap-prev-leave-to {
  opacity: 0;
  translate: 1.5rem 0;
}

.swap-next-leave-to,
.swap-prev-enter-from {
  opacity: 0;
  translate: -1.5rem 0;
}

.win {
  animation: win-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) calc(0.12s + var(--i, 0) * 60ms) both;
}

@keyframes win-in {
  from {
    opacity: 0;
    translate: 0.75rem 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grow-enter-active .panel,
  .grow-leave-active .panel,
  .grow-enter-active .panel-fade,
  .grow-leave-active .panel-fade,
  .grow-enter-active .backdrop,
  .grow-leave-active .backdrop,
  .swap-next-enter-active,
  .swap-next-leave-active,
  .swap-prev-enter-active,
  .swap-prev-leave-active {
    transition: none;
  }

  .win,
  .just-added .added-check {
    animation: none;
  }
}
</style>
