<script setup>
import { computed, ref } from 'vue'
import { Check } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'

// Scene: the ushers' Sunday checklist. The jobs done every Sunday are listed
// for this one, and they are ticked off one by one as they are done, each
// with who ticked it, and the count beside the heading keeps up. Each church
// writes its own list; these are one church's.

const DUTIES = [
  { id: 'doors', text: 'Open the doors', by: 'Rey Domingo' },
  { id: 'chairs', text: 'Set out the chairs', by: 'Grace Tan' },
  { id: 'greet', text: 'Greet at the door', by: 'Rey Domingo' },
  { id: 'offering', text: 'Take the offering', by: 'Nonoy Sison' },
  { id: 'count', text: 'Count the room', by: '' },
]

const done = ref([])
const last = ref('')
const { at } = useSceneTimeline()
DUTIES.slice(0, 4).forEach((d, i) =>
  at(900 + i * 600, () => {
    done.value = [...done.value, d.id]
    last.value = d.id
  })
)
const count = computed(() => done.value.length)
</script>

<template>
  <div class="px-4 pt-6">
    <p class="st-rise text-xl font-bold">Ushers</p>
    <p class="st-rise mt-1 text-xs text-gray-500 dark:text-gray-400" style="--d: 60ms">Who is on the door, and the jobs done every Sunday</p>

    <section class="st-rise mt-4" style="--d: 150ms">
      <p class="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Jobs for Oct 18 <span class="ml-1 font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ count }} of {{ DUTIES.length }}</span>
      </p>
      <ul class="divide-y divide-gray-100 rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70">
        <li
          v-for="(d, i) in DUTIES"
          :key="d.id"
          :class="[
            'relative flex min-h-14 items-center gap-3 px-4 py-2',
            i === 0 ? 'rounded-t-2xl' : '',
            i === DUTIES.length - 1 ? 'rounded-b-2xl' : '',
            last === d.id ? 'st-tap text-primary dark:text-primary-light' : '',
          ]"
        >
          <span
            :class="[
              'flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200',
              done.includes(d.id) ? 'st-filled border-primary bg-primary text-white' : 'border-gray-300 dark:border-gray-600',
            ]"
          >
            <Check v-if="done.includes(d.id)" class="st-pop size-4" style="--d: 0ms" />
          </span>
          <span class="min-w-0 flex-1">
            <span
              :class="[
                'block truncate text-[15px] leading-snug transition-colors',
                done.includes(d.id) ? 'text-gray-400 dark:text-gray-500' : 'font-medium text-gray-900 dark:text-white',
              ]"
            >
              {{ d.text }}
            </span>
            <span v-if="done.includes(d.id)" class="st-rise mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400" style="--d: 0ms">
              {{ d.by }}
            </span>
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
