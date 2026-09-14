<script setup>
import { computed, ref } from 'vue'
import { BookOpen, EyeSlash, MusicNotes, PresentationChart, ProjectorScreen } from '../../../icons'
import FloatNote from '../FloatNote.vue'
import ScaledScreen from '../ScaledScreen.vue'
import SlideView from '../SlideView.vue'
import { useSceneTimeline } from '../useSceneTimeline'

// Scene: Present. The run sheet for Sunday lists a song, a reading and the
// announcements deck; the operator steps through them, and whatever is live is
// what the congregation sees — lyrics, then a Bible passage, then a PowerPoint
// slide. This is the tech booth's page (views/Present.vue), which stacks its
// run sheet above the slides on a phone and sets them side by side on a
// computer, with the projector's output window (views/PresentOutput.vue) beside
// the monitor. The hymn and the verse are in the public domain.

const props = defineProps({
  domain: { type: String, default: '' },
  desktop: { type: Boolean, default: false },
})

const ITEMS = [
  { title: 'Amazing Grace', type: 'Song', icon: MusicNotes },
  { title: 'Psalm 23:1–2', type: 'Scripture', icon: BookOpen },
  { title: 'Announcements', type: 'PowerPoint', icon: PresentationChart },
]

const SLIDES = [
  { id: 's1', item: 0, kind: 'lyrics', lines: ['Amazing grace, how sweet the sound', 'that saved a wretch like me'] },
  { id: 's2', item: 0, kind: 'lyrics', lines: ['I once was lost, but now am found,', 'was blind, but now I see'] },
  {
    id: 's3',
    item: 1,
    kind: 'verse',
    lines: ['The LORD is my shepherd; I shall not want.', 'He maketh me to lie down in green pastures.'],
    reference: 'Psalm 23:1–2',
  },
  { id: 's4', item: 2, kind: 'deck', title: 'Youth camp', lines: ['14–16 November', 'Sign up at the welcome desk'] },
]

const live = ref(-1)
const slide = computed(() => SLIDES[live.value] || null)
const { at } = useSceneTimeline()

at(700, () => (live.value = 0))
at(2200, () => (live.value = 1))
at(3800, () => (live.value = 2))
at(5500, () => (live.value = 3))

const itemClass = (i) => (slide.value && slide.value.item === i ? 'bg-primary/10 dark:bg-primary/20' : '')
const iconClass = (i) =>
  slide.value && slide.value.item === i ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
const thumbClass = (s, i) => [
  'aspect-video overflow-hidden rounded-md p-1 ring-2 transition-shadow duration-300',
  s.kind === 'deck' ? 'bg-linear-to-br from-orange-500 via-rose-500 to-violet-600' : 'bg-gray-800',
  i === live.value ? 'ring-primary' : 'ring-transparent',
]
</script>

<template>
  <div class="absolute inset-0">
    <!-- ------------------------------------------------------------ phone -->
    <ScaledScreen v-if="!props.desktop" :width="272" :height="544" round="rounded-[2.1rem]" ground="">
      <div class="px-4 pt-12">
        <div class="fd-rise flex items-center justify-between">
          <div>
            <p class="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Present</p>
            <p class="text-sm font-bold text-gray-900 dark:text-white">Sunday 21 September</p>
          </div>
          <span class="flex h-6 items-center gap-1.5 rounded-md bg-red-50 px-2 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <span class="h-1.5 w-1.5 rounded-full bg-current"></span> Live
          </span>
        </div>

        <div class="fd-rise mt-3 space-y-1 rounded-2xl bg-white p-2 shadow-sm dark:bg-gray-800" style="--d: 100ms">
          <div v-for="(item, i) in ITEMS" :key="item.title" :class="['flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-300', itemClass(i)]">
            <span :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-300', iconClass(i)]">
              <component :is="item.icon" class="h-3.5 w-3.5" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-xs font-semibold text-gray-900 dark:text-white">{{ item.title }}</span>
              <span class="block text-[10px] text-gray-500 dark:text-gray-400">{{ item.type }}</span>
            </span>
          </div>
        </div>

        <div class="fd-rise relative mt-3 aspect-video overflow-hidden rounded-xl ring-2 ring-red-500/70" style="--d: 200ms">
          <SlideView :slide="slide" size="lg" />
        </div>

        <div class="fd-rise mt-2.5 grid grid-cols-4 gap-1.5" style="--d: 300ms">
          <div v-for="(s, i) in SLIDES" :key="s.id" :class="thumbClass(s, i)">
            <span class="block h-0.5 w-3/4 rounded-full bg-white/50"></span>
            <span class="mt-0.5 block h-0.5 w-1/2 rounded-full bg-white/35"></span>
          </div>
        </div>
      </div>
    </ScaledScreen>

    <!-- --------------------------------------------------------- computer -->
    <ScaledScreen v-else>
      <div class="flex h-10 items-center gap-2 border-b border-gray-100 px-3 dark:border-gray-800">
        <ProjectorScreen class="h-4 w-4 text-primary dark:text-primary-light" />
        <span class="text-[13px] font-bold text-gray-900 dark:text-white">Present</span>
        <span class="text-[11px] text-gray-400">Sunday 21 September</span>
        <span class="ml-auto flex h-6 items-center gap-1 rounded-md bg-gray-100 px-2 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
          <EyeSlash class="h-3 w-3" /> Blank
        </span>
        <span class="flex h-6 items-center gap-1.5 rounded-md bg-red-50 px-2 text-[10px] font-bold text-red-600 dark:bg-red-500/10 dark:text-red-400">
          <span class="h-1.5 w-1.5 rounded-full bg-current"></span> Live
        </span>
      </div>

      <div class="grid h-70 grid-cols-[150px_1fr]">
        <div class="space-y-1 border-r border-gray-100 p-2 dark:border-gray-800">
          <p class="px-1.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-gray-400">Run sheet</p>
          <div
            v-for="(item, i) in ITEMS"
            :key="item.title"
            :class="['fd-rise flex items-center gap-2 rounded-lg px-1.5 py-1.5 transition-colors duration-300', itemClass(i)]"
            :style="{ '--d': `${100 + i * 90}ms` }"
          >
            <span :class="['flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors duration-300', iconClass(i)]">
              <component :is="item.icon" class="h-3.5 w-3.5" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-[11px] font-semibold text-gray-900 dark:text-white">{{ item.title }}</span>
              <span class="block text-[9px] text-gray-500 dark:text-gray-400">{{ item.type }}</span>
            </span>
          </div>
        </div>

        <div class="flex flex-col p-3">
          <div class="relative aspect-video w-full overflow-hidden rounded-lg ring-2 ring-red-500/70">
            <SlideView :slide="slide" size="sm" />
          </div>
          <div class="mt-2.5 grid grid-cols-4 gap-1.5">
            <div v-for="(s, i) in SLIDES" :key="s.id" :class="thumbClass(s, i)">
              <span class="block h-0.5 w-3/4 rounded-full bg-white/50"></span>
              <span class="mt-0.5 block h-0.5 w-1/2 rounded-full bg-white/35"></span>
            </div>
          </div>
        </div>
      </div>
    </ScaledScreen>

    <!-- The projector's picture on the wall: below the monitor on a
         phone-width page, overlapping its corner on anything wider. -->
    <div
      v-if="props.desktop"
      class="fd-pop absolute left-1/2 top-[calc(100%+3.5rem)] z-30 w-52 -translate-x-1/2 sm:-bottom-28 sm:-right-10 sm:left-auto sm:top-auto sm:w-72 sm:translate-x-0"
      style="--d: 500ms"
    >
      <div class="relative aspect-video overflow-hidden rounded-lg shadow-2xl ring-4 ring-gray-800 dark:ring-gray-700">
        <SlideView :slide="slide" size="lg" />
      </div>
      <p class="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <ProjectorScreen class="h-4 w-4" /> On the projector
      </p>
    </div>

    <template v-else>
      <FloatNote :icon="MusicNotes" title="Songs and verses" body="split into slides for you" :delay="900" class="-right-40 top-36" />
      <FloatNote :icon="PresentationChart" tone="orange" title="PowerPoint too" body="in the same run sheet" :delay="1500" class="-left-40 bottom-28" />
    </template>
  </div>
</template>
