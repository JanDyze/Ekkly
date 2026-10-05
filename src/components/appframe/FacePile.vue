<script setup>
import MemberAvatar from '../members/MemberAvatar.vue'

// The faces at the start of a row about people: one face large, or up to three
// overlapping. An empty slot is a dashed circle, so a row nobody is on yet
// still lines up with the rest.

defineProps({
  members: { type: Array, default: () => [] },
})
</script>

<template>
  <span class="flex size-11 shrink-0 items-center justify-center">
    <span
      v-if="!members.length"
      class="size-9 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600"
      aria-hidden="true"
    />
    <MemberAvatar v-else-if="members.length === 1" :member="members[0]" alt="" size="h-10 w-10" />
    <span v-else class="flex -space-x-3.5">
      <MemberAvatar
        v-for="member in members.slice(0, 3)"
        :key="member.firestoreId || member.id"
        :member="member"
        alt=""
        size="h-8 w-8"
        plain-class="ring-2 ring-white dark:ring-gray-800"
      />
    </span>
  </span>
</template>
