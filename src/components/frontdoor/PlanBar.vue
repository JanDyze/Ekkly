<script setup>
import { computed, onUnmounted, ref, watchEffect } from 'vue'
import { ArrowRight, CaretUp, Check, X } from '../../icons'
import AppArt from '../common/AppArt.vue'
import { formatMoney } from '../../utils/moneyUtils'
import { planFrom, useFrontDoor } from '../../composables/useFrontDoor'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { MONTHS_PER_YEAR_PAID, yearlyPrice } from '../../../lib/apps.js'

// The plan, kept at the foot of Pricing on a phone.
//
// The summary card sits beside the apps on a wide screen and is always in view;
// on a phone it would be below fourteen of them, so choosing an app and seeing
// what it costs would be a scroll each way. This bar carries the total instead,
// and opens into a drawer with the whole plan when they want to look.

const props = defineProps({
  catalog: { type: Array, default: () => [] },
})

const emit = defineEmits(['start'])

const { picks, yearly } = useFrontDoor()

const plan = computed(() => planFrom(props.catalog, picks.value))
const hasPrices = computed(() => plan.value.apps.some((app) => app.price > 0))
const peso = (centavos) => formatMoney(centavos)
const shown = computed(() => (yearly.value ? yearlyPrice(plan.value.total) : plan.value.total))
const monthsFree = 12 - MONTHS_PER_YEAR_PAID

// The chat bubble rests above the bar rather than on top of it.
const LIFT = '4.5rem'
watchEffect(() => document.documentElement.style.setProperty('--chat-lift', LIFT))
onUnmounted(() => document.documentElement.style.removeProperty('--chat-lift'))

const open = ref(false)
const drawer = ref(null)
// The focus trap holds the page still behind the drawer as well.
useFocusTrap(drawer, open, () => (open.value = false))

const start = () => {
  open.value = false
  emit('start')
}
</script>

<template>
  <div class="lg:hidden">
    <!-- The drawer, over the page. -->
    <Transition name="sheet">
      <div v-if="open" class="fixed inset-0 z-100">
        <div class="absolute inset-0 bg-gray-950/50 backdrop-blur-[2px]" @click="open = false"></div>
        <div
          ref="drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Your plan"
          class="sheet absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-3xl bg-gray-900 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 text-white shadow-2xl dark:bg-gray-800"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase tracking-wider text-white/60">Your plan</p>
            <button type="button" aria-label="Close" class="-mr-2 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" @click="open = false">
              <X class="h-5 w-5" />
            </button>
          </div>

          <template v-if="hasPrices">
            <div class="mt-3 flex h-10 items-center rounded-lg bg-white/10 p-0.5 text-xs font-semibold" role="group" aria-label="How often to pay">
              <button
                type="button"
                :aria-pressed="!yearly"
                :class="['h-9 flex-1 rounded-md px-2.5 transition-colors', !yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70']"
                @click="yearly = false"
              >
                Monthly
              </button>
              <button
                type="button"
                :aria-pressed="yearly"
                :class="['h-9 flex-1 rounded-md px-2.5 transition-colors', yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70']"
                @click="yearly = true"
              >
                Yearly <span :class="yearly ? 'text-emerald-600' : 'text-emerald-400'">· {{ monthsFree }} months free</span>
              </button>
            </div>
            <p class="mt-3 flex items-baseline gap-1">
              <span class="text-3xl font-black tabular-nums">{{ peso(shown) }}</span>
              <span class="text-sm text-white/60">/ {{ yearly ? 'year' : 'month' }}</span>
            </p>
            <p class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <Check class="h-3.5 w-3.5" /> First month free
            </p>
          </template>
          <p v-else class="mt-2 text-2xl font-black">Priced for your church</p>

          <ul class="mt-4 space-y-2">
            <li v-for="app in plan.apps" :key="app.key" class="flex items-center gap-3 text-sm">
              <AppArt :app-key="app.key" class="h-7 w-7 shrink-0" />
              <span class="min-w-0 flex-1 truncate">{{ app.name }}</span>
              <span v-if="hasPrices" class="shrink-0 tabular-nums text-white/60">{{ app.price ? peso(app.price) : 'Included' }}</span>
            </li>
          </ul>

          <button
            type="button"
            class="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-gray-900"
            @click="start"
          >
            Start with these
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>
    </Transition>

    <!-- The bar itself: what the plan comes to, and the way on. -->
    <div class="fixed inset-x-0 bottom-0 z-40 border-t border-gray-800 bg-gray-900/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:bg-gray-800/95">
      <div class="flex items-center gap-3">
        <button type="button" class="flex min-w-0 flex-1 items-center gap-3 text-left" :aria-expanded="open" @click="open = true">
          <span class="flex shrink-0 -space-x-2">
            <AppArt v-for="app in plan.apps.slice(0, 3)" :key="app.key" :app-key="app.key" class="h-8 w-8 rounded-lg bg-gray-900 ring-2 ring-gray-900 dark:bg-gray-800 dark:ring-gray-800" />
          </span>
          <span class="min-w-0">
            <span class="flex items-baseline gap-1 text-white">
              <span v-if="hasPrices" class="text-lg font-black tabular-nums">{{ peso(shown) }}</span>
              <span v-else class="text-sm font-bold">Priced for your church</span>
              <span v-if="hasPrices" class="text-xs text-white/60">/ {{ yearly ? 'year' : 'month' }}</span>
            </span>
            <span class="flex items-center gap-1 text-xs text-white/60">
              {{ plan.apps.length }} {{ plan.apps.length === 1 ? 'app' : 'apps' }} · see plan
              <CaretUp class="h-3 w-3" />
            </span>
          </span>
        </button>
        <button
          type="button"
          class="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-white"
          @click="emit('start')"
        >
          Start
          <ArrowRight class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The drawer rises from the foot of the screen, and the page behind dims. */
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: translate 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  translate: 0 100%;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-leave-active,
  .sheet-enter-active .sheet,
  .sheet-leave-active .sheet {
    transition: none;
  }
}
</style>
