<script setup>
import { computed } from 'vue'
import {
  AddressBookDuotone,
  UserPlusDuotone,
  BookOpenTextDuotone,
  CakeDuotone,
  CalendarDotsDuotone,
  ChartPieSliceDuotone,
  ChurchDuotone,
  ClipboardTextDuotone,
  DoorOpenDuotone,
  HandWavingDuotone,
  IdentificationBadgeDuotone,
  IdentificationCardDuotone,
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
  // Schedules: calendar · mine · who · worship · preaching · ushers · welcome
  // People: everyone · birthdays · ministries · glance · missing · me
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
  everyone: AddressBookDuotone,
  birthdays: CakeDuotone,
  ministries: ChurchDuotone,
  glance: ChartPieSliceDuotone,
  missing: ClipboardTextDuotone,
  me: IdentificationCardDuotone,
  add: UserPlusDuotone,
}

const glyph = computed(() => GLYPHS[props.name] || CalendarDotsDuotone)
</script>

<template>
  <component :is="glyph" aria-hidden="true" class="text-primary dark:text-primary-light" />
</template>
