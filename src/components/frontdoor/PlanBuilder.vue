<script setup>
import { computed, ref, watch } from 'vue'
import { ArrowRight, Check } from '../../icons'
import { formatMoney } from '../../utils/moneyUtils'
import { appIcon } from './appIcons'

// "Build your plan": a visitor ticks the apps their church would use and
// watches the monthly price add up. It is the front door's way of saying the
// thing that sets Ekkly apart — a church pays for what it uses — by letting
// them try it rather than read it.
//
// Prices come from the console (Apps & prices). Until any are set, the same
// picker shows without figures and invites them to ask.

const props = defineProps({
  catalog: { type: Array, default: () => [] },
})

const emit = defineEmits(['start'])

const offered = computed(() => props.catalog.filter((app) => app.available))
const hasPrices = computed(() => offered.value.some((app) => app.price > 0))

// A sensible first plan: the roll, the calendar and attendance.
const STARTER = ['members', 'events', 'attendance']
const picked = ref(new Set(STARTER))
watch(offered, (apps) => {
  const keys = new Set(apps.map((a) => a.key))
  picked.value = new Set([...picked.value].filter((k) => keys.has(k)))
})

const toggle = (app) => {
  if (app.core) return
  const next = new Set(picked.value)
  if (next.has(app.key)) next.delete(app.key)
  else next.add(app.key)
  picked.value = next
}

const isOn = (app) => app.core || picked.value.has(app.key)
const chosen = computed(() => offered.value.filter(isOn))
const total = computed(() => chosen.value.reduce((n, app) => n + (app.price || 0), 0))
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
          <span
            :class="[
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
              isOn(app) ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300',
            ]"
          >
            <component :is="appIcon(app.key)" class="h-5 w-5" />
          </span>
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
              {{ app.core ? `Included · ${formatMoney(app.price)}` : app.price ? `${formatMoney(app.price)} / month` : 'Included' }}
            </span>
          </span>
        </button>
      </li>
    </ul>

    <!-- The running total, kept in view on a wide screen. -->
    <aside class="lg:sticky lg:top-24 lg:self-start">
      <div class="overflow-hidden rounded-3xl bg-gray-900 p-6 text-white shadow-2xl dark:bg-gray-800">
        <p class="text-xs font-semibold uppercase tracking-wider text-white/60">Your plan</p>
        <template v-if="hasPrices">
          <p class="mt-2 flex items-baseline gap-1">
            <span class="total text-4xl font-black tabular-nums" :key="total">{{ formatMoney(total) }}</span>
            <span class="text-sm text-white/60">/ month</span>
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

@media (prefers-reduced-motion: reduce) {
  .total {
    animation: none;
  }
}
</style>
