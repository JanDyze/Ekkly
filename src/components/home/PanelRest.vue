<script setup>
import { computed } from 'vue'

// What fills a home panel that has little or nothing in it (HomeAttention,
// HomeCommunity, HomeWeek), which keep their height whatever they hold. Not
// an app's icon: a small doodle of a quiet moment, in soft grey with one
// touch of the church's colour, so the room says "nothing to do" kindly and
// lightly, without asking to be looked at.
//
// Empty, the doodle sits in the middle over a line saying so. With only a
// few rows, the room left under them holds it small and faint with a short
// line, rather than bare white. The touch of colour drifts in once as it
// comes; nothing loops, and for less motion it is simply there.
//
// It fits whatever room the panel has rather than being cut off: it is a
// size container, and as the room shrinks the second line goes first, then
// the doodle grows smaller, then it goes, leaving the title (the rules at the
// foot).

const props = defineProps({
  // Which quiet moment (DOODLES).
  doodle: { type: String, required: true },
  title: { type: String, required: true },
  line: { type: String, default: '' },
  // Under a few rows rather than in place of them.
  few: { type: Boolean, default: false },
})

// Each in a 120 × 80 box: its pen lines, and its touch of colour, filled or
// (`stroke`) drawn as a line.
const DOODLES = {
  // A cup of tea, its steam a heart: nothing needs you.
  tea: {
    lines: ['M38 40H78V54A14 14 0 0 1 64 68H52A14 14 0 0 1 38 54Z', 'M78 44A8 8 0 0 1 78 60', 'M28 74H88'],
    touch: 'M58 22C52 16 45 21 49 27L58 35L67 27C71 21 64 16 58 22Z',
  },
  // A park bench, a bird come to sit on its back: a quiet day.
  bench: {
    lines: ['M26 40H94M24 52H96M32 40V52M88 40V52M30 52V70M90 52V70'],
    touch: 'M72 34C72 28 77 25 82 27C85 25 89 27 88 31L92 32L88 34C87 37 84 39 80 39C76 39 72 37 72 34Z',
  },
  // A hammock between two posts, and a "z": a quiet week.
  hammock: {
    lines: ['M22 72V26M98 72V26M16 72H28M92 72H104', 'M22 34Q60 66 98 34'],
    touch: 'M56 16H66L56 26H66',
    stroke: true,
  },
}
const drawing = computed(() => DOODLES[props.doodle] || DOODLES.tea)
</script>

<template>
  <div :class="['panel-rest min-h-0 flex-1', few ? 'is-few' : '']">
    <div
      :class="
        few
          ? 'flex h-full flex-row-reverse items-end justify-start gap-2.5 px-5 pt-2 pb-4'
          : 'flex h-full flex-col items-center justify-center gap-2 px-6 py-3 text-center'
      "
    >
    <svg viewBox="0 0 120 80" :class="['rest-doodle shrink-0', few ? 'h-8 w-12 opacity-70' : 'h-16 w-24']" aria-hidden="true">
      <path v-for="d in drawing.lines" :key="d" class="doodle-line" :d="d" />
      <path :class="['doodle-touch', drawing.stroke ? 'doodle-touch-line' : '']" :d="drawing.touch" />
    </svg>
    <template v-if="few">
      <p class="rest-title min-w-0 pb-1 text-right text-xs font-semibold text-gray-400 dark:text-gray-500">{{ title }}</p>
    </template>
    <template v-else>
      <p class="rest-title text-base font-bold text-gray-800 dark:text-gray-100">{{ title }}</p>
      <p v-if="line" class="rest-line max-w-88 text-sm text-balance text-gray-500 dark:text-gray-400">{{ line }}</p>
    </template>
    </div>
  </div>
</template>

<style scoped>
/* Soft grey lines, drawn round, like a pen doodle in a margin. */
.doodle-line {
  fill: none;
  stroke: var(--color-gray-300);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
:global(html.dark .doodle-line) {
  stroke: var(--color-gray-600);
}
/* The one touch of colour: the church's, light. */
.doodle-touch {
  fill: color-mix(in srgb, var(--color-primary) 45%, transparent);
  stroke: color-mix(in srgb, var(--color-primary) 60%, transparent);
  stroke-width: 2;
  stroke-linejoin: round;
}
.doodle-touch-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
}
/* Fitting the room it has (see the top). */
.panel-rest {
  container-type: size;
  overflow: hidden;
}
@container (max-height: 10.5rem) {
  .rest-line {
    display: none;
  }
}
@container (max-height: 7.5rem) {
  .panel-rest:not(.is-few) .rest-doodle {
    height: 2.5rem;
    width: 3.75rem;
  }
}
@container (max-height: 5rem) {
  .panel-rest:not(.is-few) .rest-doodle {
    display: none;
  }
}
@container (max-height: 3.25rem) {
  .panel-rest.is-few .rest-doodle {
    display: none;
  }
}
@container (max-height: 2rem) {
  .rest-title {
    display: none;
  }
}

</style>
