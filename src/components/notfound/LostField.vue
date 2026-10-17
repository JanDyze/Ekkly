<script setup>
// The open field the lost-page scenes stand in (views/NotFound.vue): rolling
// hills, near and far, in the home picture's colours (HomeScene's --scene-*
// settings, so it goes to night with them), a few bushes and flowers, and a
// signpost that points both ways and helps nobody. Wide enough to be cut to
// any screen from the middle.
</script>

<template>
  <!-- The open field: rolling hills, near and far, with a few bushes and
       flowers, and a signpost that points both ways. Wide enough to be cut
       to any screen from the middle. -->
  <svg
    class="pointer-events-none absolute inset-x-0 bottom-0 h-[min(40dvh,22rem)] w-full"
    viewBox="0 0 1600 300"
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
  >
    <path d="M0 150C200 104 400 112 610 138C820 164 1010 108 1230 116C1400 122 1520 138 1600 148V300H0Z" style="fill: var(--scene-hill-far)" />
    <path d="M0 178C180 150 360 150 560 170C760 190 940 150 1150 156C1340 162 1480 178 1600 186V300H0Z" style="fill: var(--scene-hill-back)" />
    <path d="M0 214C210 190 430 188 660 200C880 212 1060 186 1270 190C1420 194 1530 206 1600 212V300H0Z" style="fill: var(--scene-hill-mid)" />
    <g style="fill: var(--scene-bush)">
      <path d="M140 222c-6-22 18-38 38-26c10-16 38-12 42 8c14 0 22 12 18 24z" />
      <path d="M1290 214c-4-20 16-34 34-24c10-14 34-10 38 8c12 0 20 10 16 22z" />
    </g>
    <g style="fill: var(--scene-bush-teal)">
      <path d="M1070 206c-2-14 12-24 26-16c8-10 26-6 28 6c10 2 14 10 10 18z" />
      <path d="M430 210c-2-12 10-20 22-14c6-8 22-6 24 6c8 2 12 8 8 14z" />
    </g>
    <!-- The signpost, an arrow each way and a word on neither. -->
    <g class="lost-wood">
      <rect x="986" y="122" width="9" height="90" rx="3" />
      <path d="M948 132h64l14 11-14 11h-64z" />
      <path d="M1032 158h-60l-14 10 14 10h60z" />
    </g>
    <g class="lost-wood-line" fill="none" stroke-width="2" stroke-linecap="round">
      <path d="M958 143h44M970 168h44" />
    </g>
    <path d="M0 262C220 236 470 236 720 246C960 256 1180 232 1400 236C1500 238 1560 244 1600 248V300H0Z" style="fill: var(--scene-hill-near)" />
    <path d="M0 286C260 270 560 272 860 280C1130 287 1380 276 1600 280V300H0Z" style="fill: var(--scene-ground)" />
    <!-- Flowers in the grass, the home's yellow and orange. -->
    <g>
      <circle v-for="([cx, cy, c], i) in [[300, 252, '#FFCB4A'], [342, 258, '#FF8D4A'], [880, 258, '#FFCB4A'], [1180, 248, '#FF8D4A'], [1222, 254, '#FFCB4A'], [620, 262, '#FFCB4A']]" :key="i" :cx="cx" :cy="cy" r="4" :fill="c" />
    </g>
  </svg>

</template>

<style scoped>
/* The signpost: weathered wood, darkening with the field at night. */
.lost-wood {
  fill: color-mix(in oklab, #b0835c 78%, var(--scene-ground));
}
.lost-wood-line {
  stroke: color-mix(in oklab, #7d5a3c 78%, var(--scene-ground));
}
</style>
