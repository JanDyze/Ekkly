<script setup>
import { Cake } from '../../icons'
import AppArt from '../common/AppArt.vue'
import DeckCard from '../appframe/DeckCard.vue'
import MemberAvatar from './MemberAvatar.vue'

// Somebody's birthday, as a card in a deck (AppHeroDeck) — on the People
// app's home and on the home of every app, so the day reads the same in both.
//
// The day itself is the headline: their face large with the cake pinned to
// it, their name, and the age they turn in big type, inside a dashed frame
// like an invitation's, with confetti that fills the card rather than one
// corner of it.
//
// `card`: `{ member, name, turning, kicker, detail, to, dest?, destLabel? }`.

defineProps({
  card: { type: Object, required: true },
})
</script>

<template>
  <DeckCard
    tone="celebrate"
    :icon="Cake"
    :kicker="card.kicker"
    :title="card.name"
    :detail="card.detail"
    :to="card.to"
    :dest="card.dest"
    :dest-label="card.destLabel"
    inset
  >
    <template #art>
      <div class="absolute inset-1.5 rounded-[18px] border-2 border-dashed border-white/35" />
      <svg class="absolute inset-0 size-full" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" fill="none">
        <circle cx="150" cy="22" r="3" class="fill-amber-300" />
        <circle cx="232" cy="40" r="4" class="fill-white/50" />
        <circle cx="318" cy="96" r="3.5" class="fill-amber-300/90" />
        <circle cx="268" cy="150" r="3" class="fill-white/40" />
        <circle cx="196" cy="178" r="2.5" class="fill-amber-200/80" />
        <circle cx="24" cy="186" r="3" class="fill-white/30" />
        <rect x="196" y="16" width="13" height="5" rx="2.5" transform="rotate(35 202 18)" class="fill-white/60" />
        <rect x="286" y="58" width="12" height="5" rx="2.5" transform="rotate(-30 292 60)" class="fill-amber-300/80" />
        <rect x="250" y="104" width="11" height="4.5" rx="2.2" transform="rotate(60 255 106)" class="fill-white/45" />
        <rect x="330" y="160" width="12" height="5" rx="2.5" transform="rotate(20 336 162)" class="fill-amber-200/70" />
        <rect x="120" y="150" width="10" height="4" rx="2" transform="rotate(-40 125 152)" class="fill-white/35" />
        <path d="M300 128c5-6 11-6 16 0s11 6 16 0" stroke-width="3" stroke-linecap="round" class="stroke-white/40" />
        <path d="M168 60c4-5 9-5 13 0s9 5 13 0" stroke-width="2.5" stroke-linecap="round" class="stroke-amber-300/70" />
        <path d="M60 158c4-5 9-5 13 0s9 5 13 0" stroke-width="2.5" stroke-linecap="round" class="stroke-white/30" />
      </svg>
    </template>
    <template #leading>
      <span class="relative shrink-0">
        <MemberAvatar :member="card.member" alt="" size="h-[72px] w-[72px]" plain-class="ring-4 ring-white/35" />
        <span class="absolute -bottom-1.5 -right-1.5 flex size-8 items-center justify-center rounded-full bg-white ring-1 ring-gray-200 dark:ring-gray-700">
          <AppArt app-key="people-birthdays" :play="1" class="size-6" />
        </span>
      </span>
    </template>
    <p v-if="card.turning" class="flex items-baseline gap-2 leading-none">
      <span class="text-sm font-medium text-white/80">Turns</span>
      <span class="text-5xl font-bold tabular-nums tracking-tight">{{ card.turning }}</span>
      <span class="text-sm font-medium text-white/80">today</span>
    </p>
    <p v-else class="text-2xl font-bold">Happy birthday!</p>
  </DeckCard>
</template>
