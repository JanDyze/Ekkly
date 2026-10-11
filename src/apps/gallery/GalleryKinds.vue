<script setup>
import { computed } from 'vue'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ListGroup from '../../components/appframe/ListGroup.vue'
import ListRow from '../../components/appframe/ListRow.vue'
import { useGalleryOverview } from '../../composables/useGalleryOverview'
import { formatShortDate } from '../../../lib/occurrences'
import { Tag } from '../../icons'

// The albums by the kind of gathering they were taken at — every Worship
// album together, every Outreach — the most photographed kind first. Months
// answer "what happened in March"; this answers "show me the outreach
// photos", which is what somebody putting together the year's report asks.
//
// Each kind wears the cover of its newest album, so the list is pictures to
// recognise rather than words to read.

const { kinds, loading } = useGalleryOverview({ photos: false })

const plural = (n, one, many) => `${n.toLocaleString()} ${n === 1 ? one : many}`

const rows = computed(() =>
  kinds.value.map(({ kind, albums }) => ({
    kind,
    cover: albums[0]?.coverUrl || '',
    detail: [plural(albums.length, 'album', 'albums'), albums[0]?.date ? `latest ${formatShortDate(albums[0].date)}` : '']
      .filter(Boolean)
      .join(' · '),
  }))
)

const subtitle = computed(() => (loading.value || !rows.value.length ? '' : plural(rows.value.length, 'kind', 'kinds')))
</script>

<template>
  <AppScreen title="By kind" :subtitle="subtitle" :back="{ name: 'GalleryHome' }" root="/gallery">
    <div
      v-if="loading"
      class="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/70 dark:divide-gray-700/60 dark:bg-gray-800 dark:ring-gray-700/70"
    >
      <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-4 py-2.5">
        <div class="size-11 shrink-0 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-600"></div>
        <div class="flex-1 space-y-2">
          <div class="h-3.5 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
          <div class="h-3 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-600"></div>
        </div>
      </div>
    </div>

    <div v-else-if="!rows.length" class="px-6 py-16 text-center">
      <Tag class="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
      <p class="text-sm font-medium text-gray-600 dark:text-gray-300">No photos yet</p>
      <p class="mx-auto mt-1 max-w-xs text-xs text-gray-400 dark:text-gray-500">
        Albums gather here by the kind of gathering they came from.
      </p>
    </div>

    <ListGroup v-else>
      <ListRow
        v-for="row in rows"
        :key="row.kind"
        :to="{ name: 'GalleryKind', params: { kind: row.kind } }"
        :title="row.kind"
        :subtitle="row.detail"
      >
        <template #leading>
          <span class="size-11 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-700">
            <img v-if="row.cover" :src="row.cover" alt="" loading="lazy" decoding="async" class="h-full w-full object-cover" />
          </span>
        </template>
      </ListRow>
    </ListGroup>
  </AppScreen>
</template>
