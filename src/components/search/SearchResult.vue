<script setup>
import { CalendarBlank, CheckSquare, MusicNotes, Notebook, UsersThree } from '../../icons'
import AppArt from '../common/AppArt.vue'
import MemberAvatar from '../members/MemberAvatar.vue'

// One row of the search (SearchPanel): what it is, its name, and a word on
// what kind of thing it is. The same row whether it was just found or is one
// of the things opened from a search before.

defineProps({
  result: { type: Object, required: true },
  // The row Enter would open, tinted so it reads as already chosen.
  active: { type: Boolean, default: false },
})
defineEmits(['open'])

const KINDS = {
  app: { label: 'App' },
  person: { label: 'Person' },
  event: { label: 'Event', icon: CalendarBlank },
  song: { label: 'Song', icon: MusicNotes },
  task: { label: 'Task', icon: CheckSquare },
  minute: { label: 'Minutes', icon: Notebook },
  group: { label: 'Small group', icon: UsersThree },
}
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
    :class="active ? 'bg-primary/10 dark:bg-primary-light/10' : 'hover:bg-gray-100 focus-visible:bg-gray-100 dark:hover:bg-white/5 dark:focus-visible:bg-white/5'"
    @click="$emit('open', result)"
  >
    <MemberAvatar v-if="result.kind === 'person'" :member="result.member" alt="" size="h-10 w-10" class="shrink-0" />
    <span v-else class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-300">
      <AppArt v-if="result.kind === 'app'" :app-key="result.art" class="size-7" />
      <component :is="KINDS[result.kind].icon" v-else class="size-5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-[15px] font-semibold text-gray-900 dark:text-white">{{ result.title }}</span>
      <!-- Found in its text rather than its name: the words around it, so the
           row says why it is here. -->
      <span v-if="result.match" class="block truncate text-xs text-gray-500 dark:text-gray-400">
        {{ KINDS[result.kind].label }} · {{ result.match.before
        }}<strong class="font-semibold text-gray-900 dark:text-white">{{ result.match.hit }}</strong>{{ result.match.after }}
      </span>
      <span v-else class="block truncate text-xs text-gray-500 dark:text-gray-400">
        {{ KINDS[result.kind].label }}<template v-if="result.subtitle"> · {{ result.subtitle }}</template>
      </span>
    </span>
    <span
      v-if="result.byMeaning"
      class="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
    >
      By meaning
    </span>
    <kbd
      v-if="active"
      class="hidden shrink-0 rounded-md border border-gray-200 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-gray-500 sm:inline dark:border-gray-700 dark:text-gray-400"
      aria-hidden="true"
    >
      Enter
    </kbd>
  </button>
</template>
