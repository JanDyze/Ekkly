<script setup>
import { computed, ref } from 'vue'
import { Plus, Loader2, CalendarBlank, User, Tag } from '../../icons'
import { useMembers } from '../../composables/useMembers'
import { useMinistries } from '../../composables/useMinistries'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import { dueLabel, todayKey } from '../../utils/taskUtils'
import { parseQuickTask } from '../../utils/quickTask'

// The whole reason a to-do list gets used or abandoned. "Buy candles" does not
// deserve a drawer, a member picker and a priority select — it deserves a line
// you type and press Enter on, and the details can be filled in later by
// tapping the row. The full editor is still one button away in the toolbar.
//
// The line can say more than the task: "Print bulletins friday @Ana #worship"
// is read for its date, its person and its ministry (quickTask.js), and what
// was understood shows under the box before it is added, so nobody has to
// trust a guess they cannot see.

const emit = defineEmits(['add'])

const { members } = useMembers()
const { ministryNames } = useMinistries()

const title = ref('')
const saving = ref(false)
const inputRef = ref(null)

const parsed = computed(() =>
  parseQuickTask(title.value, { today: todayKey(), members: members.value || [], ministryNames: ministryNames.value || [] })
)
const nameOf = (member) => getFullName(member).trim() || member.nickname || 'Unknown'
const understood = computed(() => Boolean(parsed.value.dueDate || parsed.value.people.length || parsed.value.ministry))
const canAdd = computed(() => Boolean(parsed.value.title) && !saving.value)

// The whole box is the place to type, not only the line of text in its
// middle: a click anywhere on it but the button lands in the input.
const focusInput = (event) => {
  if (event.target.closest('button') || event.target === inputRef.value) return
  // Held back, or the browser takes the focus off the input again as it
  // finishes the press on the box.
  event.preventDefault()
  inputRef.value?.focus()
}

// The page owns the write, so it reports back through a callback rather than
// the box guessing: a failed save has to leave the words in the input, not
// clear them and expect the person to remember what they typed.
const submit = () => {
  if (!canAdd.value) return
  const { title: taskTitle, dueDate, people, ministry } = parsed.value

  saving.value = true
  emit(
    'add',
    {
      title: taskTitle,
      dueDate,
      ministry,
      assigneeIds: people.map(memberKey),
      assigneeNames: people.map(nameOf),
    },
    (saved) => {
      saving.value = false
      if (saved) title.value = ''
      // Focus stays put: a list is written in bursts, and reaching back for the
      // box between each line is what stops people writing the second one.
      inputRef.value?.focus()
    }
  )
}
</script>

<template>
  <div class="mb-3 shrink-0">
    <form
      @submit.prevent="submit"
      @mousedown="focusInput"
      class="flex h-11 cursor-text items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white pl-3 pr-1.5 focus-within:border-primary focus-within:border-solid dark:border-gray-600 dark:bg-gray-800 dark:focus-within:border-primary-light"
    >
      <Plus class="h-5 w-5 shrink-0 text-gray-400" />
      <input
        ref="inputRef"
        v-model="title"
        type="text"
        enterkeyhint="done"
        placeholder="Add a task… try “friday @name #ministry”"
        aria-label="Add a task"
        aria-describedby="quick-add-understood"
        class="h-full min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none dark:text-white"
      />
      <button
        type="submit"
        :disabled="!canAdd"
        :class="[
          'h-8 shrink-0 rounded-lg px-3 text-xs font-medium transition-colors',
          canAdd
            ? 'bg-primary text-white hover:bg-primary-hover'
            : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
        ]"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <span v-else>Add</span>
      </button>
    </form>

    <!-- What the line was read as, before it is added. -->
    <p
      id="quick-add-understood"
      v-show="understood"
      aria-live="polite"
      class="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 text-xs text-gray-500 dark:text-gray-400"
    >
      <span v-if="understood">Adds</span>
      <span v-if="parsed.dueDate" class="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 font-medium text-primary dark:bg-primary/20 dark:text-primary-light">
        <CalendarBlank class="size-3.5" />Due {{ dueLabel(parsed.dueDate) }}
      </span>
      <span
        v-for="person in parsed.people"
        :key="memberKey(person)"
        class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
      >
        <User class="size-3.5" />{{ nameOf(person) }}
      </span>
      <span v-if="parsed.ministry" class="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
        <Tag class="size-3.5" />{{ parsed.ministry }}
      </span>
    </p>
  </div>
</template>
