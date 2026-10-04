<script setup>
import { Guitar, Microphone, MusicNotes, PianoKeys } from '../../icons'
import { instrumentName } from '../../data/instruments'

// One instrument, as a small picture beside a musician's name.
//
// Phosphor has a microphone, a guitar and piano keys, but no drum and no bass
// guitar, and a bass drawn as a guitar would say the wrong thing about who is
// holding down the low end. Those two are drawn here in Phosphor's own manner —
// a 256 grid, round 16-unit strokes, no fill — so they sit beside the others
// as one set.

defineProps({
  id: { type: String, required: true },
})

const PHOSPHOR = { vocals: Microphone, guitar: Guitar, keys: PianoKeys, other: MusicNotes }
</script>

<template>
  <component
    :is="PHOSPHOR[id]"
    v-if="PHOSPHOR[id]"
    :aria-label="instrumentName(id)"
    role="img"
  />

  <!-- A snare: its head, its shell, and two sticks crossed over it. -->
  <svg
    v-else-if="id === 'drums'"
    viewBox="0 0 256 256"
    fill="none"
    stroke="currentColor"
    stroke-width="16"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    :aria-label="instrumentName(id)"
  >
    <ellipse cx="128" cy="128" rx="88" ry="32" />
    <path d="M40 128v48c0 17.7 39.4 32 88 32s88-14.3 88-32v-48" />
    <path d="M80 157v46M176 157v46" />
    <path d="M64 40l64 72M192 40l-64 72" />
  </svg>

  <!-- A bass: a long neck with four tuners, and a narrow, offset body. -->
  <svg
    v-else-if="id === 'bass'"
    viewBox="0 0 256 256"
    fill="none"
    stroke="currentColor"
    stroke-width="16"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    :aria-label="instrumentName(id)"
  >
    <path d="M216 24l16 16-16 16-16-16z" />
    <path d="M200 56l-80 80" />
    <path
      d="M120 136c-10-14-34-14-48 0-10 10-10 24-4 34l-28 28c-14 14-12 32 2 42s30 8 40-4l26-30c12 6 26 2 34-8 12-14 10-34-6-46z"
    />
    <path d="M96 176l-16 16" />
  </svg>
</template>
