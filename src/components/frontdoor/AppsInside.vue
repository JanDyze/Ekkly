<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ArrowRight, Check, ChevronLeft, ChevronRight, X } from '../../icons'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useScrollLock } from '../../composables/useScrollLock'
import { formatMoney } from '../../utils/moneyUtils'
import { appIcon } from './appIcons'
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
})

const emit = defineEmits(['plan'])

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

const step = (by) => {
  const list = ordered.value
  if (!list.length || openIndex.value < 0) return
  openKey.value = list[(openIndex.value + by + list.length) % list.length].key
}

// What an app costs, beside the button that adds it. Whole pesos read as a
// price tag; the centavos only matter on a bill.
const priceOf = (app) => (app.price > 0 ? `${formatMoney(app.price).replace(/\.00$/, '')} a month` : 'Free')

const addToPlan = (app) => {
  openKey.value = null
  emit('plan', app.key)
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

// The strip of apps is wider than a phone, so the open one is brought to its
// middle — scrolling only the strip, never the page.
const strip = ref(null)
watch(openKey, async (key) => {
  if (!key) return
  await nextTick()
  const bar = strip.value
  const tab = bar?.querySelector('[aria-selected="true"]')
  if (!bar || !tab) return
  const left = tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2
  bar.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
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
          >
            <span class="app-icon relative flex aspect-square w-14 items-center justify-center overflow-hidden rounded-[28%] sm:w-16 lg:w-[clamp(3.75rem,9dvh,5rem)]">
              <component :is="appIcon(app.key)" class="relative h-[46%] w-[46%]" />
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
            'panel relative flex flex-col bg-white shadow-2xl shadow-gray-900/10 ring-1 ring-gray-900/5 focus:outline-none dark:bg-gray-900 dark:shadow-black/40 dark:ring-white/10',
            isDesktop ? 'h-full rounded-2xl' : 'max-h-[85dvh] w-full max-w-md rounded-3xl',
          ]"
        >
          <!-- Every app, to go straight to another. -->
          <div class="panel-fade flex items-center gap-2 border-b border-gray-100 px-3 py-2.5 sm:px-4 dark:border-gray-800">
            <div ref="strip" class="relative flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" role="tablist" aria-label="Apps">
              <button
                v-for="app in ordered"
                :key="app.key"
                type="button"
                role="tab"
                :aria-selected="app.key === openKey"
                :aria-label="app.name"
                :title="app.name"
                :class="[
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  app.key === openKey
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200',
                ]"
                @click="openKey = app.key"
              >
                <component :is="appIcon(app.key)" class="h-4.5 w-4.5" />
              </button>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <button type="button" aria-label="Previous app" class="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 sm:block dark:text-gray-400 dark:hover:bg-gray-800" @click="step(-1)">
                <ChevronLeft class="h-5 w-5" />
              </button>
              <button type="button" aria-label="Next app" class="hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100 sm:block dark:text-gray-400 dark:hover:bg-gray-800" @click="step(1)">
                <ChevronRight class="h-5 w-5" />
              </button>
              <span class="mx-1 hidden h-5 w-px bg-gray-200 sm:block dark:bg-gray-700" aria-hidden="true"></span>
              <button type="button" aria-label="Close" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800" @click="close">
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <div class="panel-fade relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <Transition name="swap" mode="out-in">
              <div
                :key="openApp.key"
                class="grid gap-6 p-5 lg:min-h-full lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:content-center lg:items-center lg:gap-12 lg:p-[clamp(1.25rem,5dvh,3rem)]"
              >
                <div class="min-w-0">
                  <div class="flex items-center gap-3">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[28%] bg-linear-to-br from-primary to-primary-hover text-white shadow-lg shadow-primary/30">
                      <component :is="appIcon(openApp.key)" class="h-5.5 w-5.5" />
                    </span>
                    <div class="min-w-0">
                      <h3 class="truncate text-base font-bold">{{ openApp.name }}</h3>
                      <p v-if="openApp.group !== openApp.name" class="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{{ openApp.group }}</p>
                    </div>
                  </div>
                  <p class="mt-4 text-balance text-2xl font-black leading-[1.1] tracking-tight lg:mt-[clamp(1rem,3dvh,1.75rem)] lg:text-[clamp(1.75rem,5dvh,2.75rem)] lg:leading-[1.08]">{{ detail.headline }}</p>

                  <div class="mt-5 hidden flex-wrap items-center gap-x-4 gap-y-2 lg:mt-[clamp(1.25rem,4dvh,2.25rem)] lg:flex">
                    <span
                      v-if="openApp.core"
                      class="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
                    >
                      <Check class="h-4 w-4" />
                      Always included
                    </span>
                    <button
                      v-else
                      type="button"
                      class="group/add inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover"
                      @click="addToPlan(openApp)"
                    >
                      Add {{ openApp.name }} to my plan
                      <ArrowRight class="h-4 w-4 transition-transform group-hover/add:translate-x-1" />
                    </button>
                    <span class="text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">{{ priceOf(openApp) }}</span>
                  </div>
                </div>

                <ul v-if="detail.wins.length" class="grid min-w-0 gap-2 lg:gap-[clamp(0.5rem,1.6dvh,0.875rem)]">
                  <li
                    v-for="(win, i) in detail.wins"
                    :key="win.text"
                    :style="{ '--i': i }"
                    class="win flex items-center gap-3 rounded-2xl bg-gray-50 p-3 lg:gap-4 lg:p-[clamp(0.625rem,2dvh,1.125rem)] dark:bg-gray-800/60"
                  >
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm lg:h-11 lg:w-11 dark:bg-gray-900 dark:text-primary-light">
                      <component :is="win.icon" class="h-5 w-5 lg:h-5.5 lg:w-5.5" />
                    </span>
                    <span class="text-sm font-semibold text-gray-800 lg:text-base dark:text-gray-100">{{ win.text }}</span>
                  </li>
                </ul>

                <!-- A phone puts the price and the button last, under the wins. -->
                <div class="flex flex-wrap items-center justify-between gap-3 lg:hidden">
                  <span class="text-sm font-semibold tabular-nums text-gray-500 dark:text-gray-400">{{ priceOf(openApp) }}</span>
                  <span
                    v-if="openApp.core"
                    class="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary/10 px-4 text-sm font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
                  >
                    <Check class="h-4 w-4" />
                    Always included
                  </span>
                  <button
                    v-else
                    type="button"
                    class="group/add inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-colors hover:bg-primary-hover"
                    @click="addToPlan(openApp)"
                  >
                    Add to my plan
                    <ArrowRight class="h-4 w-4 transition-transform group-hover/add:translate-x-1" />
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

/* The icon: grey until it comes on, then the accent, lit from the top left like
   an app icon, with a sheen that crosses it once. */
.app-icon {
  background-color: var(--color-gray-100);
  color: var(--color-gray-400);
  box-shadow: none;
  transition:
    background-color 0.35s ease,
    color 0.35s ease,
    box-shadow 0.3s ease;
}

.dark .app-icon {
  background-color: var(--color-gray-800);
  color: var(--color-gray-500);
}

.launch.is-on .app-icon {
  background-color: var(--color-primary);
  background-image: linear-gradient(145deg, color-mix(in oklab, white 18%, transparent), transparent 55%, color-mix(in oklab, black 14%, transparent));
  color: white;
  box-shadow: 0 8px 18px -8px color-mix(in oklab, var(--color-primary) 70%, transparent);
}

.launch.is-on:hover .app-icon {
  box-shadow: 0 14px 26px -10px color-mix(in oklab, var(--color-primary) 75%, transparent);
}

.app-icon::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgb(255 255 255 / 0.5) 50%, transparent 70%);
  transform: translateX(-120%);
}

.launch.is-on .app-icon::after {
  transform: translateX(120%);
  transition: transform 0.7s ease-in-out 0.15s;
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

/* Going from one app to another: a quick cross-fade, and the wins arrive one
   after another. */
.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.18s ease,
    filter 0.18s ease;
}

.swap-enter-from,
.swap-leave-to {
  opacity: 0;
  filter: blur(4px);
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
  .swap-enter-active,
  .swap-leave-active {
    transition: none;
  }

  .win {
    animation: none;
  }
}
</style>
