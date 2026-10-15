<script>
// Several can share a page, and clip ids are global, so each copy names its
// own. Counted here, outside setup, so the count is the module's.
let copies = 0
</script>

<script setup>
// Ekkly's mark (public/ekkly-mark.svg) as a group to set into a drawing: the
// four panes, the cross between them left as whatever is behind. Drawn in its
// own coordinates (x 18–93, y 12–96), so place it with a transform. Its
// colours are its own and never follow anybody's accent (BRAND.md).
const id = `story-mark-${++copies}-`
</script>

<template>
  <g>
    <defs>
      <clipPath :id="`${id}tl`"><path d="M18.6 53Q18 52.6 18 51V46A34 34 0 0 1 48.5 12.2Q52 12 52 15.5V41C52 46.5 41 49.5 20 52.8Z" /></clipPath>
      <clipPath :id="`${id}tr`"><path d="M92.4 53Q93 52.6 93 51V46A34 34 0 0 0 62.5 12.2Q59 12 59 15.5V41C59 46.5 70 49.5 91 52.8Z" /></clipPath>
      <clipPath :id="`${id}bl`"><path d="M18 62Q18 57.5 22 56.3C30 53.5 40 53 45 54.5Q51 56 51 61V93Q51 96 48 96H24Q18 96 18 90Z" /></clipPath>
      <clipPath :id="`${id}br`"><path d="M59.5 61Q59.5 56 65 54.8C70 53.5 80 53.8 88 56Q92.5 57.5 92.5 62V89Q92.5 96 86 96H63Q59.5 96 59.5 92.5Z" /></clipPath>
    </defs>
    <g :clip-path="`url(#${id}tl)`">
      <rect x="10" y="8" width="45" height="50" fill="#fdc24b" />
      <path d="M10 31H36L35 46L31 56H10Z" fill="#fdcf5c" />
      <path d="M50 10H56V48L33 54L35 46L36 31Z" fill="#f7b63b" />
    </g>
    <g :clip-path="`url(#${id}tr)`">
      <rect x="56" y="8" width="45" height="50" fill="#f19140" />
      <path d="M82 17L96 34.5H73Z" fill="#dc5a31" />
      <path d="M72 34.5H96V58L57 48Z" fill="#cc6d3d" />
    </g>
    <g :clip-path="`url(#${id}bl)`">
      <rect x="10" y="50" width="45" height="50" fill="#0270dc" />
      <path d="M35 50H56V100H46L35 75Z" fill="#0b6fe3" />
      <path d="M10 50H35V75L10 76Z" fill="#48bcf0" />
    </g>
    <g :clip-path="`url(#${id}br)`">
      <rect x="56" y="50" width="45" height="50" fill="#09a4c6" />
      <path d="M73 50H101V71L84 73L77 74L73 62Z" fill="#027595" />
      <path d="M101 69L86 73L60 99H101Z" fill="#14aaae" />
    </g>
  </g>
</template>
