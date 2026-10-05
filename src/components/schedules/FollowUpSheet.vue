<script setup>
/**
 * Where one newcomer stands: how far the welcome team has got with them, who
 * is looking after them, when they were last in touch, and anything worth
 * remembering.
 *
 * These are notes about a real person, kept for the people caring for them.
 * Read-only for anyone who may see them but not change them.
 */
import { computed, ref, watch } from 'vue'
import { HandWaving, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { FOLLOW_UP_STEPS } from '../../api/followUpsService'
import { getDisplayName, getFullName } from '../../utils/memberUtils'
import MemberAvatar from '../members/MemberAvatar.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  person: { type: Object, default: null },
  followUp: { type: Object, default: null },
  // Who may look after them: the welcome team first, then everyone.
  caretakers: { type: Array, default: () => [] },
  canEdit: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'save'])

const dialogRef = ref(null)
const form = ref(null)

watch(
  () => [props.show, props.person?.firestoreId],
  ([open]) => {
    if (!open || !props.followUp) return
    form.value = { ...props.followUp }
  },
  { immediate: true }
)

const close = () => emit('update:show', false)
useFocusTrap(dialogRef, computed(() => props.show), close)

const save = () => {
  if (!props.canEdit || props.saving) return
  emit('save', { ...form.value })
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary disabled:opacity-70 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show && person && form"
      class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      @click.self="close"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="follow-up-title"
        tabindex="-1"
        class="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3.5 dark:border-gray-700">
          <MemberAvatar :member="person" alt="" size="h-10 w-10" />
          <div class="min-w-0 flex-1">
            <h2 id="follow-up-title" class="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {{ getFullName(person) }}
            </h2>
            <p class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <HandWaving class="h-3.5 w-3.5" /> Following up {{ getDisplayName(person) }}
            </p>
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

        <form class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4" @submit.prevent="save">
          <div>
            <span :class="labelClass">Where they are</span>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="step in FOLLOW_UP_STEPS"
                :key="step.key"
                type="button"
                :disabled="!canEdit"
                :aria-pressed="form.step === step.key"
                :class="[
                  'rounded-xl px-3 py-2 text-left transition-colors',
                  form.step === step.key
                    ? 'bg-primary/10 ring-1 ring-primary/30 dark:bg-primary-light/15'
                    : 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/50 dark:hover:bg-gray-700',
                ]"
                @click="form.step = step.key"
              >
                <span
                  :class="[
                    'block text-sm font-semibold',
                    form.step === step.key ? 'text-primary dark:text-primary-light' : 'text-gray-900 dark:text-white',
                  ]"
                >
                  {{ step.label }}
                </span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">{{ step.hint }}</span>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="follow-up-caretaker" :class="labelClass">Who is looking after them</label>
              <select id="follow-up-caretaker" v-model="form.caretakerId" :disabled="!canEdit" :class="inputClass">
                <option value="">Nobody yet</option>
                <option v-for="option in caretakers" :key="option.id" :value="option.id">{{ option.name }}</option>
              </select>
            </div>
            <div>
              <label for="follow-up-last" :class="labelClass">Last in touch</label>
              <input id="follow-up-last" v-model="form.lastContact" type="date" :disabled="!canEdit" :class="inputClass" />
            </div>
          </div>

          <div>
            <label for="follow-up-notes" :class="labelClass">Notes</label>
            <textarea
              id="follow-up-notes"
              v-model="form.notes"
              rows="4"
              :disabled="!canEdit"
              :class="inputClass"
              placeholder="Came with her cousin. Asked about the youth group."
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Seen only by the people following up newcomers.</p>
          </div>
        </form>

        <div
          v-if="canEdit"
          class="flex justify-end gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700"
        >
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
            @click="save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
