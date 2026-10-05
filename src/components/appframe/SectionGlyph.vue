<script setup>
import { computed } from 'vue'
import {
  BookOpenTextDuotone,
  CalendarDotsDuotone,
  DoorOpenDuotone,
  HandWavingDuotone,
  IdentificationBadgeDuotone,
  MicrophoneStageDuotone,
  UsersThreeDuotone,
} from '../../icons'

// A section of an app, as a small picture: a calendar, a microphone, an open
// door.
//
// Phosphor's duotone weight — the same family as every line icon in the app,
// drawn by people who draw icons, with a soft fill of the same colour behind
// the line. Plainer than the app icons on purpose: an app's icon is Ekkly's
// own glossy artwork and says "this is something you open from anywhere"; a
// section is a room inside it.
//
// In the church's accent, the colour most churches took from their logo, so
// inside the church's app its rooms look like the church.

const props = defineProps({
  // calendar · mine · who · worship · preaching · ushers · welcome
  name: { type: String, required: true },
})

const GLYPHS = {
  calendar: CalendarDotsDuotone,
  mine: IdentificationBadgeDuotone,
  who: UsersThreeDuotone,
  worship: MicrophoneStageDuotone,
  preaching: BookOpenTextDuotone,
  ushers: DoorOpenDuotone,
  welcome: HandWavingDuotone,
}

const glyph = computed(() => GLYPHS[props.name] || CalendarDotsDuotone)
</script>

<template>
  <component :is="glyph" aria-hidden="true" class="text-primary dark:text-primary-light" />
</template>
