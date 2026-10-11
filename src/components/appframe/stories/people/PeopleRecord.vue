<script setup>
import { ref } from 'vue'
import { Cake, ChatCircle, Phone, UsersThree } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import StoryFace from '../StoryFace.vue'
import { person, nameOf } from './cast'

// Scene: one person, whole. Ana's record opens, her details settle in one
// after another, and a thumb goes to Call: the number someone needed is a tap
// from her name.

const ana = person('ana')
const calling = ref(false)
const { at } = useSceneTimeline()
at(2900, () => (calling.value = true))

const DETAILS = [
  { icon: Cake, label: 'Birthday', value: 'March 14 · turns 30' },
  { icon: UsersThree, label: 'Small group', value: 'Thursday women’s group' },
]
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="st-rise flex flex-col items-center rounded-t-[28px] bg-white px-4 pb-4 pt-6 text-center dark:bg-gray-800">
      <StoryFace :person="ana" size="size-16 text-xl" class="st-pop" />
      <p class="mt-3 text-xl font-bold">{{ nameOf(ana) }}</p>
      <p class="text-sm text-gray-500 dark:text-gray-400">Member since 2019 · Married to Paolo</p>

      <div class="mt-4 flex gap-2">
        <span
          :class="[
            'st-pop st-filled relative flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold text-white',
            calling ? 'st-tap bg-primary-hover' : 'bg-primary',
          ]"
          style="--d: 500ms"
        >
          <Phone class="size-4" />
          Call
        </span>
        <span class="st-pop flex h-10 items-center gap-1.5 rounded-lg bg-primary/10 px-4 text-sm font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light" style="--d: 580ms">
          <ChatCircle class="size-4" />
          Text
        </span>
      </div>
    </div>

    <div class="flex flex-col gap-2 px-4 pt-3">
      <div class="st-rise rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700" style="--d: 800ms">
        <p class="text-xs font-semibold uppercase tracking-wider text-gray-400">Serves in</p>
        <div class="mt-2 flex gap-1.5">
          <span class="st-pop rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light" style="--d: 1000ms">Worship</span>
          <span class="st-pop rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light" style="--d: 1080ms">Media</span>
        </div>
      </div>

      <div
        v-for="(d, i) in DETAILS"
        :key="d.label"
        class="st-rise flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
        :style="{ '--d': `${1300 + i * 200}ms` }"
      >
        <span class="flex size-9 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
          <component :is="d.icon" class="size-4.5" />
        </span>
        <span>
          <span class="block text-xs text-gray-500 dark:text-gray-400">{{ d.label }}</span>
          <span class="block text-sm font-semibold">{{ d.value }}</span>
        </span>
      </div>
    </div>
  </div>
</template>
