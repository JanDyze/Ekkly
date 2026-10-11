<script setup>
/**
 * Writing a message ahead: its title, the one thing to take home, the
 * passages, the outline and the notes the preacher preaches from.
 *
 * The same record the preaching sheet in Schedules writes (sermonsService),
 * and the title, passages and outline are shared with it: write them here and
 * they are what the screen shows on Sunday. What is only the screen's — the
 * slides, the recording, the team's notes — stays there, and saving here
 * never touches it. Who preaches and the series are the schedule's, so they
 * are shown, not edited.
 */
import { computed, ref, watch } from 'vue'
import { X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { formatServiceDate } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'
import PassageList from './PassageList.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  date: { type: String, default: '' },
  sermon: { type: Object, default: null },
  preachers: { type: Array, default: () => [] },
  theme: { type: String, default: '' },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'save'])

const isMobile = useMediaQuery('(max-width: 1023px)')
const dialogRef = ref(null)
const form = ref(null)

watch(
  () => [props.show, props.date],
  ([show]) => {
    if (!show) return
    const sermon = props.sermon || {}
    form.value = {
      title: sermon.title || '',
      bigIdea: sermon.bigIdea || '',
      passages: (sermon.passages || []).map((p) => ({ ...p })),
      pointsText: (sermon.points || []).join('\n'),
      manuscript: sermon.manuscript || '',
    }
  },
  { immediate: true }
)

const close = () => emit('update:show', false)
useFocusTrap(dialogRef, computed(() => props.show), close)

const who = computed(() => {
  const names = props.preachers.map(getDisplayName)
  return [names.length ? names.join(' and ') : 'Nobody on the schedule yet', props.theme].filter(Boolean).join(' · ')
})

const handleSave = () => {
  if (!form.value || props.saving) return
  emit('save', {
    title: form.value.title,
    bigIdea: form.value.bigIdea,
    passages: form.value.passages,
    points: form.value.pointsText.split('\n'),
    manuscript: form.value.manuscript,
  })
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const hintClass = 'mt-1 text-xs text-gray-500 dark:text-gray-400'
</script>

<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'modal-sheet' : 'fade'">
      <div v-if="show && form" class="fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-4">
        <div class="absolute inset-0 bg-black/50" @click="close" />
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sermon-notes-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white ring-1 ring-gray-200 sm:max-w-xl sm:rounded-2xl dark:bg-gray-800 dark:ring-gray-700"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <div class="min-w-0">
              <h2 id="sermon-notes-title" class="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {{ formatServiceDate(date) }}
              </h2>
              <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ who }}</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <form class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" @submit.prevent="handleSave">
            <div>
              <label for="sermon-title" :class="labelClass">Title of the message</label>
              <input id="sermon-title" v-model="form.title" :class="inputClass" placeholder="The man in the sycamore tree" maxlength="120" />
            </div>

            <div>
              <label for="sermon-big-idea" :class="labelClass">The one thing to take home</label>
              <input
                id="sermon-big-idea"
                v-model="form.bigIdea"
                :class="inputClass"
                placeholder="Jesus goes looking for the ones everyone else has given up on"
                maxlength="200"
              />
              <p :class="hintClass">One sentence. Sunday school can teach the same thing to the children.</p>
            </div>

            <PassageList
              v-model="form.passages"
              input-id="sermon-passage"
              placeholder="Luke 19:1-10"
              hint="Each passage goes up on the screen as a reading on Sunday."
            />

            <div>
              <label for="sermon-points" :class="labelClass">Outline</label>
              <textarea id="sermon-points" v-model="form.pointsText" rows="4" :class="inputClass" placeholder="One point to a line" />
              <p :class="hintClass">The same outline Schedules can put on the screen, a point to a slide.</p>
            </div>

            <div>
              <label for="sermon-manuscript" :class="labelClass">Preaching notes</label>
              <textarea
                id="sermon-manuscript"
                v-model="form.manuscript"
                rows="10"
                :class="[inputClass, 'font-normal leading-relaxed']"
                placeholder="## Opening&#10;A story about being left out of a group photo.&#10;&#10;## 1. Jesus sees&#10;- He stops under the tree&#10;- He calls him by name"
              />
              <p :class="hintClass">What you preach from. ## starts a heading, - starts a point, **bold** for what to stress.</p>
            </div>
          </form>

          <div class="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700">
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="saving"
              :class="[
                'rounded-lg px-4 py-2',
                saving ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400' : 'bg-primary text-white hover:bg-primary-hover',
              ]"
              @click="handleSave"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
