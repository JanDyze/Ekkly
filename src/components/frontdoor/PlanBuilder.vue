<script setup>
import { computed, ref } from 'vue'
import { ArrowRight, Check } from '../../icons'
import { formatMoney } from '../../utils/moneyUtils'
import { MONTHS_PER_YEAR_PAID, yearlyPrice } from '../../../lib/apps.js'
import AppArt from './AppArt.vue'
import { useFrontDoor } from '../../composables/useFrontDoor'

// "Build your plan": a visitor ticks the apps their church would use and
// watches the monthly price add up. It is the front door's way of saying the
// thing that sets Ekkly apart — a church pays for what it uses — by letting
// them try it rather than read it.
//
// Prices come from the console (Apps & prices), or the starting prices in
// lib/apps.js until the console saves its own. If every app is free, the same
// picker shows without figures and invites them to ask.

const props = defineProps({
  catalog: { type: Array, default: () => [] },
})

const emit = defineEmits(['start'])

// Prices are written out in full, centavos and all, the way a bill has them.
const peso = (centavos) => formatMoney(centavos)

const offered = computed(() => props.catalog.filter((app) => app.available))
const hasPrices = computed(() => offered.value.some((app) => app.price > 0))

// The plan is the front door's, not this picker's: apps added from the home
// page are already ticked here, and what is ticked here goes with them to Get
// started (useFrontDoor). It starts with the roll, the calendar and attendance.
const { hasPick, togglePick, yearly } = useFrontDoor()

// An app's picture plays its animation when the app joins the plan.
const plays = ref({})
const celebrate = (key) => {
  plays.value = { ...plays.value, [key]: (plays.value[key] || 0) + 1 }
}

const toggle = (app) => {
  if (app.core) return
  if (!hasPick(app.key)) celebrate(app.key)
  togglePick(app.key)
}

const isOn = (app) => app.core || hasPick(app.key)
const chosen = computed(() => offered.value.filter(isOn))
const total = computed(() => chosen.value.reduce((n, app) => n + (app.price || 0), 0))

// Monthly, or a year up front for the price of ten months. The yearly figure
// also says what that comes to a month, since that is the number they just
// watched add up. Which it is belongs to the front door, so the bar at the
// foot of the page on a phone says the same.
const shown = computed(() => (yearly.value ? yearlyPrice(total.value) : total.value))
// Rounded to the whole peso, like every other price here.
const perMonthYearly = computed(() => Math.round(yearlyPrice(total.value) / 1200) * 100)
const monthsFree = 12 - MONTHS_PER_YEAR_PAID
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
    <ul class="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      <li v-for="app in offered" :key="app.key">
        <button
          type="button"
          @click="toggle(app)"
          :aria-pressed="isOn(app)"
          :disabled="app.core"
          :class="[
            'group flex h-full w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all',
            isOn(app)
              ? 'border-primary/40 bg-primary/5 shadow-sm dark:border-primary-light/40 dark:bg-primary-light/10'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600',
          ]"
        >
          <AppArt :app-key="app.key" :play="plays[app.key] || 0" :class="['plan-art h-11 w-11 shrink-0', { 'is-off': !isOn(app) }]" />
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-semibold text-gray-900 dark:text-white">{{ app.name }}</span>
              <span
                :class="[
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                  isOn(app) ? 'border-primary bg-primary text-white' : 'border-gray-300 text-transparent dark:border-gray-600',
                ]"
              >
                <Check class="h-3 w-3" />
              </span>
            </span>
            <span class="mt-0.5 block text-xs leading-relaxed text-gray-500 dark:text-gray-400">{{ app.description }}</span>
            <span v-if="hasPrices" class="mt-1.5 block text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">
              {{ app.core ? `Included · ${peso(app.price)}` : app.price ? `${peso(app.price)} / month` : 'Included' }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <!-- The running total, kept in view on a wide screen. A phone has it at
         the foot of the page instead (PlanBar), where it is always in reach. -->
    <aside class="hidden lg:sticky lg:top-24 lg:block lg:self-start">
      <div class="overflow-hidden rounded-3xl bg-gray-900 p-6 text-white shadow-2xl dark:bg-gray-800">
        <p class="text-xs font-semibold uppercase tracking-wider text-white/60">Your plan</p>
        <template v-if="hasPrices">
          <!-- Monthly or yearly: two choices, so a segment control. -->
          <div class="mt-3 flex h-10 items-center rounded-lg bg-white/10 p-0.5 text-xs font-semibold sm:text-sm" role="group" aria-label="How often to pay">
            <button
              type="button"
              :aria-pressed="!yearly"
              :class="['h-9 flex-1 rounded-md px-2.5 transition-colors', !yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white']"
              @click="yearly = false"
            >
              Monthly
            </button>
            <button
              type="button"
              :aria-pressed="yearly"
              :class="['h-9 flex-1 rounded-md px-2.5 transition-colors', yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white']"
              @click="yearly = true"
            >
              Yearly <span :class="yearly ? 'text-emerald-600' : 'text-emerald-400'">· {{ monthsFree }} months free</span>
            </button>
          </div>
          <p class="mt-3 flex items-baseline gap-1">
            <span class="total text-4xl font-black tabular-nums" :key="`${yearly}-${total}`">{{ peso(shown) }}</span>
            <span class="text-sm text-white/60">/ {{ yearly ? 'year' : 'month' }}</span>
          </p>
          <p v-if="yearly" class="text-xs tabular-nums text-white/60">That is {{ peso(perMonthYearly) }} a month.</p>
          <p class="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            <Check class="h-3.5 w-3.5" /> First month free
          </p>
        </template>
        <p v-else class="mt-2 text-2xl font-black leading-tight">Priced for your church</p>
        <p class="mt-1 text-sm text-white/70">
          {{ chosen.length }} {{ chosen.length === 1 ? 'app' : 'apps' }} chosen. Add or drop apps any time.
        </p>

        <ul class="mt-4 space-y-1.5">
          <li v-for="app in chosen" :key="app.key" class="flex items-center gap-2 text-sm text-white/85">
            <Check class="h-4 w-4 shrink-0 text-emerald-400" />
            <span class="truncate">{{ app.name }}</span>
          </li>
        </ul>

        <button
          type="button"
          @click="emit('start')"
          class="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-gray-900 transition-colors hover:bg-gray-100"
        >
          Start with these
          <ArrowRight class="h-4 w-4" />
        </button>
        <p v-if="!hasPrices" class="mt-3 text-center text-xs text-white/50">We will send you the price when you ask.</p>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.total {
  display: inline-block;
  animation: bump 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bump {
  from { transform: scale(0.9); opacity: 0.4; }
}

/* An app's picture: in colour once it is in the plan, greyed while it is not. */
.plan-art {
  transition:
    filter 0.3s ease,
    opacity 0.3s ease;
}

.plan-art.is-off {
  filter: grayscale(1);
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .total {
    animation: none;
  }
}
</style>
