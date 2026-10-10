<script setup>
import { computed } from 'vue'
import { CalendarDots, CalendarPlus, ChevronRight, Palette, PlayFill } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import AppHero from '../../components/appframe/AppHero.vue'
import AppTile from '../../components/appframe/AppTile.vue'
import { formatLength, useVideoOverview } from '../../composables/useVideoOverview'
import { usePermissions } from '../../composables/usePermissions'
import { aspectOf, LOOKS } from '../../utils/video/render'
import { TRACKS } from '../../utils/video/music'

// The Videos app's home: this month's announcement video, already made.
//
// Nobody has to start it. The calendar, the weekly services, the small groups
// and the serving schedule already say what is happening, so the video is
// there the moment the month is — the hero says how much is in it, and the
// main action plays it. Shaping it is a step further in.

const { loading, settings, thisMonth, nextMonth, thisMonthScenes, nextMonthScenes, announcements, lengthOf, monthName } =
  useVideoOverview()
const { myMember, canManage } = usePermissions()
const canEdit = computed(() => canManage('events'))

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

const greeting = computed(() => {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const name = myMember.value?.nickname || myMember.value?.firstName || ''
  return name ? `${part}, ${name}` : part
})

const thisName = computed(() => monthName(thisMonth))
const nextName = computed(() => monthName(nextMonth))
const thisCount = computed(() => announcements(thisMonthScenes.value).length)
const nextCount = computed(() => announcements(nextMonthScenes.value).length)

const headline = computed(() => {
  if (loading.value) return 'Videos'
  return thisCount.value ? `${thisName.value}’s video is ready` : `Nothing to announce in ${thisName.value} yet`
})

const heroDetail = computed(() => {
  if (loading.value) return ''
  if (!thisCount.value) return 'It fills itself in as events go on the calendar.'
  return `${plural(thisCount.value, 'announcement')} · ${formatLength(lengthOf(thisMonthScenes.value))} long`
})

const lookDetail = computed(() => {
  const style = settings.value.style
  const look = LOOKS.find((l) => l.key === style.look)?.label || 'Bold'
  const track = settings.value.music.track
  const sound = track === 'upload' ? 'your music' : TRACKS.find((t) => t.key === track)?.label.toLowerCase() || 'morning'
  return `${aspectOf(style.aspect).label} · ${look} · ${sound}`
})

// The first few things this month's video announces, in order.
const preview = computed(() => announcements(thisMonthScenes.value).slice(0, 5))
const moreCount = computed(() => Math.max(0, thisCount.value - preview.value.length))
</script>

<template>
  <AppScreen>
    <div class="flex flex-col gap-3">
      <AppHero art="videos" :greeting="greeting" :title="headline" :detail="heroDetail" />

      <nav class="grid grid-cols-2 gap-3" aria-label="Videos">
        <AppTile
          :to="{ name: 'VideosMonth', params: { month: thisMonth } }"
          :title="thisName"
          :detail="thisCount ? plural(thisCount, 'announcement') : 'Nothing yet'"
          :icon="CalendarDots"
          :delay="60"
        />
        <AppTile
          :to="{ name: 'VideosMonth', params: { month: nextMonth } }"
          :title="nextName"
          :detail="nextCount ? `${plural(nextCount, 'announcement')} so far` : 'Nothing yet'"
          :icon="CalendarPlus"
          :delay="110"
        />
        <AppTile
          v-if="canEdit"
          :to="{ name: 'VideosLook' }"
          title="Look and sound"
          :detail="lookDetail"
          :icon="Palette"
          wide
          :delay="160"
        />
      </nav>

      <RouterLink
        :to="{ name: 'VideosMonth', params: { month: thisMonth } }"
        class="animate-rise flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white transition-transform duration-200 ease-out hover:bg-primary-hover"
        style="animation-delay: 210ms"
      >
        <PlayFill class="size-5" />
        Watch {{ thisName }}’s video
      </RouterLink>

      <!-- What it says -->
      <section v-if="preview.length" class="animate-rise mt-3" style="animation-delay: 260ms">
        <h2 class="mb-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">In {{ thisName }}’s video</h2>
        <RouterLink
          :to="{ name: 'VideosMonth', params: { month: thisMonth } }"
          class="group block rounded-2xl border border-gray-200 bg-white p-4 transition-[transform,border-color] duration-200 ease-out hover:border-gray-300 dark:border-gray-700/80 dark:bg-gray-800 dark:hover:border-gray-600"
        >
          <div class="flex items-start gap-3">
            <ol class="min-w-0 flex-1 space-y-1.5">
              <li
                v-for="(scene, index) in preview"
                :key="scene.id"
                class="flex items-center gap-2.5 text-sm text-gray-700 dark:text-gray-300"
              >
                <span class="w-4 shrink-0 text-right text-xs tabular-nums text-gray-400">{{ index + 1 }}</span>
                <span class="min-w-0 truncate">{{ scene.title }}</span>
                <span v-if="scene.when" class="ml-auto hidden shrink-0 text-xs text-gray-400 sm:inline">
                  {{ scene.when.split(' · ')[0] }}
                </span>
              </li>
            </ol>
            <ChevronRight
              class="mt-1 size-4 shrink-0 text-gray-300 transition-transform duration-300 group-engaged:translate-x-1 dark:text-gray-600"
            />
          </div>
          <p v-if="moreCount" class="mt-1.5 pl-6.5 text-xs text-gray-400">and {{ moreCount }} more</p>
        </RouterLink>
      </section>
    </div>
  </AppScreen>
</template>
