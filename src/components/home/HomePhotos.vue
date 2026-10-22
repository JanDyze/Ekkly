<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import HomePanel from './HomePanel.vue'
import { useGalleryOverview } from '../../composables/useGalleryOverview'

// The latest photos, on the desktop home (a panel someone turns on;
// useHomeLayout): the newest pictures the church has put up, a small grid of
// them under the album they went into, each opening where Share would take
// you. Nothing else on the home shows the church's own faces from last
// Sunday, and it is the warmest thing a quiet week can have on it.
//
// Each picture is as big as the panel's height lets it be and no bigger than
// a fifth of its width (--tile, measured against the room under the album's
// name), five to a row: a short panel is a strip of them, a tall one two
// rows. Sized to the width alone, a wide panel's one row was taller than the
// panel, so it never fitted and the panel showed only the album's name
// (HomePanel shows only the rows that fit).

// Two rows of five.
const SHOWN = 10

const { loading, recentByAlbum } = useGalleryOverview()

// The newest album's pictures first, then the next album's, up to a grid.
const tiles = computed(() =>
  recentByAlbum.value
    .flatMap(({ album, photos }) => photos.map((photo) => ({ photo, album })))
    .slice(0, SHOWN)
    .map(({ photo, album }) => ({
      key: photo.id,
      url: photo.url,
      alt: photo.description || album.title || 'Photo',
      to: `/gallery/${album.id}/v/${photo.id}`,
    }))
)
const newest = computed(() => recentByAlbum.value[0]?.album || null)
</script>

<template>
  <HomePanel
    id="home-photos"
    title="Latest photos"
    :link="{ to: newest ? `/gallery/${newest.id}` : '/gallery', label: 'Gallery' }"
    :loading="loading"
    :empty="tiles.length ? null : { doodle: 'bench', title: 'No photos yet', line: 'The newest pictures show here once someone adds them.' }"
  >
    <div class="flex h-full flex-col px-4 py-3">
      <p v-if="newest" class="mb-2 shrink-0 truncate px-1 text-xs text-gray-500 dark:text-gray-400">{{ newest.title || 'Album' }}</p>
      <div class="photo-room min-h-0 flex-1">
        <ul data-rows class="flex flex-wrap gap-1">
          <li v-for="tile in tiles" :key="tile.key" class="photo-tile">
            <RouterLink
              :to="tile.to"
              class="block size-full overflow-hidden rounded-lg bg-gray-100 ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10"
            >
              <img :src="tile.url" :alt="tile.alt" loading="lazy" class="size-full object-cover" />
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>
  </HomePanel>
</template>

<style scoped>
/* The room under the album's name, which the pictures are measured against. */
.photo-room {
  container-type: size;
}
/* Five to a row (four gaps of 0.25rem between them), never taller than the
   room. */
.photo-tile {
  --tile: min(100cqh, (100cqw - 1rem) / 5);
  width: var(--tile);
  height: var(--tile);
}
</style>
