<script setup>
import { computed } from 'vue'
import { CheckCircle, Heart } from '../../icons'
import ListRow from '../appframe/ListRow.vue'
import MemberAvatar from '../members/MemberAvatar.vue'
import { dayLabel, daysQuiet, isQuiet, lastNewsOn, quietLabel, raisedOn } from '../../composables/usePrayerOverview'

// One prayer concern in a list of them (PrayerList): who it is for, what it
// is, and one quiet line. The face of the person it is about when they are on
// the roll, a heart when it is for a family, a missionary, the nation.
//
// It used to carry a coloured pill for its status and another for its
// priority, the first two lines of its description, and a bin. A list of
// concerns is read through in prayer, so the row says what to pray for and no
// more: the whole of it is a tap away, in the drawer, and so is deleting it.

const props = defineProps({
  concern: { type: Object, required: true },
  // The person it is about, already found on the roll, or null.
  person: { type: Object, default: null },
  today: { type: String, required: true },
  selected: { type: Boolean, default: false },
  // Said on the row only where the list mixes them (every concern); a list of
  // answered prayers need not say "answered" on each one.
  showStatus: { type: Boolean, default: false },
})

const emit = defineEmits(['open'])

const answered = computed(() => props.concern.status === 'answered')

// When it was raised, or for an answered one when it was answered; and, for
// one nobody has touched in a long while, how long — the words a search for
// "no news" finds.
const subtitle = computed(() => {
  const c = props.concern
  const day = dayLabel(answered.value ? lastNewsOn(c) : raisedOn(c), props.today)
  const when = answered.value ? `Answered ${['Today', 'Yesterday'].includes(day) ? day.toLowerCase() : day}` : day
  return [
    c.memberName ? `For ${c.memberName}` : '',
    isQuiet(c, props.today) ? quietLabel(daysQuiet(c, props.today)) : when,
    props.showStatus && c.status === 'ongoing' ? 'Ongoing' : '',
  ]
    .filter(Boolean)
    .join(' · ')
})

// Urgent and high are said in amber, which is "needs attention" here
// (DESIGN.md): asked to be prayed for first. Red is kept for what is gone.
const flag = computed(() =>
  !answered.value && ['urgent', 'high'].includes(props.concern.priority)
    ? props.concern.priority === 'urgent'
      ? 'Urgent'
      : 'High'
    : ''
)
</script>

<template>
  <ListRow
    :title="concern.title || 'Prayer concern'"
    :subtitle="subtitle"
    :class="selected ? 'bg-primary/10 dark:bg-primary/20' : ''"
    @click="emit('open', concern)"
  >
    <template #leading>
      <MemberAvatar v-if="person" :member="person" alt="" size="h-10 w-10" class="shrink-0" />
      <span
        v-else
        class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light"
      >
        <Heart class="size-5" />
      </span>
    </template>
    <template #trailing>
      <span
        v-if="flag"
        class="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
      >
        {{ flag }}
      </span>
      <CheckCircle
        v-else-if="showStatus && answered"
        class="size-5 shrink-0 text-primary dark:text-primary-light"
        aria-label="Answered"
      />
    </template>
  </ListRow>
</template>
