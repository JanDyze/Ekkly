<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppArt from '../common/AppArt.vue'
import SectionGlyph from './SectionGlyph.vue'
import { prefetchRoute } from '../../router/prefetch'

// One way into a section of an app: a tile with its picture and its name, and
// nothing more unless something in it is waiting on you, and then only how
// many, on the corner. The home of all apps draws its apps itself, in the
// style its church or its person chose (components/home/HomeAppCards.vue).
//
// It began as a phone's home-screen icon, a small square with the name under
// it, four across, and then a white tile with a glyph floating in its corner.
// The first left each square alone in a wide column; the second was mostly
// empty box, and its thin glyph read as neither an icon nor a button.
//
// The picture is the section's own artwork where it has one (`art`, drawn
// with the app icons by brand/ekkly/make-app-icons.mjs), and otherwise its
// glyph on a tinted square of the church's colour. Section tiles used to carry
// their data too (faces, a date, a ring, a bar) so that no two looked alike;
// that only repeated what the deck and the section already say, so the
// drawing now does that work instead, drawn large and cropped by the corner.
//
// Two levels, and they must never be mistaken for each other: an app is
// Ekkly's, and opens from anywhere; a section is a room inside one, and
// belongs to the church. So an app's tile (`level="app"`, on the home of all
// apps) carries Ekkly's glossy artwork on a raised plate, the way an icon sits
// on a phone's home screen, and a section's carries the same kind of drawing
// flat, in the church's accent, on a wash of that colour with no lift. The colour, the
// plate and the depth all differ at once, so no one of them has to carry the
// difference alone, and it holds for every church's colours.
//
// The picture sits top left and the words bottom left, so a row of tiles
// lines up along both edges however long the names are. Anything waiting
// inside shows as a count on the corner. The grid around them decides how many
// go across: two where every tile has a line, three where they do not.

const props = defineProps({
  to: { type: [String, Object], required: true },
  title: { type: String, required: true },
  // What is true inside the section right now, in a few words.
  detail: { type: String, default: '' },
  // The section's artwork in src/assets/app-icons, by name. Wins over `glyph`.
  art: { type: String, default: '' },
  // A section's glyph (SectionGlyph), for a section with no artwork.
  glyph: { type: String, default: '' },
  // 'app' on the home of all apps; 'section' inside an app.
  level: { type: String, default: 'section' },
  // How many things in there are waiting on you.
  badge: { type: Number, default: 0 },
  // The badge in the warning colour, for things that are overdue rather than new.
  urgent: { type: Boolean, default: false },
  // Its beat in the home's entrance, in milliseconds.
  delay: { type: Number, default: 0 },
})

// The page's code is fetched as the finger comes down, so it is usually there
// by the time the tap lands (src/router/prefetch.js).
const router = useRouter()
const warm = () => prefetchRoute(router, props.to)

// The path this tile opens, which the section's header carries too, so its
// name can fly up into the header and back (router/viewTransitions.js).
const morphKey = computed(() => router.resolve(props.to).path)

// A section with artwork is drawn the other way round from an app: no plate
// and no lift, but its drawing large in the bottom corner, cropped by the
// tile's edge, on a wash of the church's colour. Its name alone says what it
// is, so the picture is what makes one tile unlike the next — the job the
// faces and bars used to do, without saying anything the section's own
// screen says better.
const bleed = computed(() => Boolean(props.art) && props.level !== 'app')

// The drawing plays once as the tile comes in, and again when a pointer
// arrives on it: a small answer to being noticed, never a loop.
const play = ref(1)
const replay = (event) => {
  if (event.pointerType === 'mouse') play.value += 1
}
</script>

<template>
  <!-- A section with artwork: its name, and its drawing bleeding off the
       corner on a wash of the church's colour. -->
  <RouterLink
    v-if="bleed"
    :to="to"
    :style="{ animationDelay: `${delay}ms` }"
    @pointerdown="warm"
    @pointerenter="replay"
    @focus="warm"
    class="animate-rise group relative isolate flex min-h-28 min-w-0 flex-col overflow-hidden rounded-2xl bg-linear-to-br from-primary/8 to-primary/3 p-3.5 ring-1 ring-primary/8 transition duration-200 ease-out hover:ring-primary/25 pressed:scale-[0.97] dark:from-primary-light/10 dark:to-primary-light/3 dark:ring-primary-light/8 dark:hover:ring-primary-light/25"
  >
    <span class="relative z-10 min-w-0 pr-6">
      <span :data-morph-label="morphKey" class="block text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ title }}</span>
      <span v-if="detail" class="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-300">{{ detail }}</span>
    </span>

    <slot />

    <AppArt
      :app-key="art"
      :play="play"
      flat
      :data-morph-icon="morphKey"
      class="pointer-events-none absolute -bottom-4 -right-3 -z-10 size-24 text-primary opacity-80 dark:text-primary-light"
    />

    <!-- Inside the corner rather than over it: the tile crops what spills. -->
    <span
      v-if="badge > 0"
      :class="[
        'absolute right-2.5 top-2.5 z-10 flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums text-white',
        urgent ? 'bg-amber-500' : 'bg-primary dark:bg-primary-light dark:text-gray-900',
      ]"
    >
      {{ badge > 99 ? '99+' : badge }}
    </span>
  </RouterLink>

  <!-- A section with no artwork yet: its glyph on a tinted square. -->
  <RouterLink
    v-else
    :to="to"
    :style="{ animationDelay: `${delay}ms` }"
    @pointerdown="warm"
    @focus="warm"
    class="animate-rise group relative flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/80 transition duration-200 ease-out hover:ring-gray-300 pressed:scale-[0.97] dark:bg-gray-800 dark:ring-gray-700/80 dark:hover:ring-gray-600"
  >
    <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary-light/15">
      <SectionGlyph :name="glyph" class="size-6" />
    </span>

    <span class="mt-auto min-w-0">
      <span :data-morph-label="morphKey" class="block truncate text-[15px] font-semibold leading-snug text-gray-900 dark:text-white">{{ title }}</span>
      <span v-if="detail" class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">{{ detail }}</span>
    </span>

    <slot />

    <span
      v-if="badge > 0"
      :class="[
        'absolute -right-1.5 -top-1.5 flex h-5.5 min-w-5.5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums text-white ring-2 ring-gray-50 dark:ring-gray-900',
        urgent ? 'bg-amber-500' : 'bg-primary',
      ]"
    >
      {{ badge > 99 ? '99+' : badge }}
    </span>
  </RouterLink>
</template>
