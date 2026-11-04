<script setup>
import { computed, ref, watch } from 'vue'
import { Check, Trash2, Trophy, X } from '../../../icons'
import { useFocusTrap } from '../../../composables/useFocusTrap'

// Starting a goal, or changing one: what its road leads to, why it is worth
// the trip, and which goals come before it, which is where it stands on the
// map of every goal (GoalsMap). Deleting the whole roadmap lives here too.

const props = defineProps({
  show: { type: Boolean, default: false },
  // The roadmap being changed, or null for a new one.
  roadmap: { type: Object, default: null },
  // The goals this one may come after: every other goal but those that
  // already come after it, which would make a loop.
  others: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  // The goal's colour (goalHue), for the sheet's own pieces.
  hue: { type: String, default: '' },
})

const emit = defineEmits(['close', 'save', 'delete'])

const form = ref({ title: '', why: '', after: [] })

watch(
  () => props.show,
  (open) => {
    if (open) {
      form.value = {
        title: props.roadmap?.title || '',
        why: props.roadmap?.why || '',
        after: [...(props.roadmap?.after || [])],
      }
    }
  },
  { immediate: true }
)

const isNew = computed(() => !props.roadmap)
const canSave = computed(() => form.value.title.trim().length > 0 && !props.saving)

const toggleAfter = (id) => {
  const after = form.value.after
  form.value.after = after.includes(id) ? after.filter((a) => a !== id) : [...after, id]
}

const save = () => {
  if (!canSave.value) return
  const allowed = new Set(props.others.map((o) => o.id))
  emit('save', {
    title: form.value.title.trim(),
    why: form.value.why.trim(),
    after: form.value.after.filter((id) => allowed.has(id)),
  })
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, () => emit('close'))
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show"
        :style="{ '--hue': hue || 'var(--color-primary)' }"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="emit('close')"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="goal-sheet-title"
          tabindex="-1"
          class="sheet-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl rm-popup-card sm:max-w-md sm:rounded-2xl"
        >
          <div
            class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-linear-to-r from-(--hue)/12 to-transparent px-4 py-3.5 dark:border-gray-700 dark:from-(--hue)/20"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div class="rm-token rm-btn shrink-0 rounded-xl p-2.5">
                <Trophy class="h-5 w-5 text-white" />
              </div>
              <div class="min-w-0">
                <h2 id="goal-sheet-title" class="truncate text-base font-bold text-gray-900 dark:text-white">
                  {{ isNew ? 'New goal' : 'Goal' }}
                </h2>
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">Where the road leads, and why it is worth the trip</p>
              </div>
            </div>
            <button
              type="button"
              @click="emit('close')"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <form class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" @submit.prevent="save">
            <div>
              <label for="goal-title" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">The end goal</label>
              <input
                id="goal-title"
                v-model="form.title"
                maxlength="140"
                autocomplete="off"
                placeholder="A hundred churches on Ekkly"
                class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label for="goal-why" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Why it matters</label>
              <textarea
                id="goal-why"
                v-model="form.why"
                rows="4"
                maxlength="2000"
                placeholder="What it frees churches to do once we are there"
                class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              ></textarea>
            </div>

            <div v-if="others.length">
              <p class="mb-0.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Comes after</p>
              <p class="mb-2 text-xs text-gray-500 dark:text-gray-400">
                The goals that lead into this one. Leave them all off for one that runs on its own.
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="other in others"
                  :key="other.id"
                  type="button"
                  :aria-pressed="form.after.includes(other.id)"
                  @click="toggleAfter(other.id)"
                  :class="[
                    'flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition-colors',
                    form.after.includes(other.id)
                      ? 'bg-(--hue)/12 text-(--hue) ring-(--hue)/50 dark:bg-(--hue)/20'
                      : 'bg-white text-gray-600 ring-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-600',
                  ]"
                >
                  <Check v-if="form.after.includes(other.id)" class="size-4 shrink-0" />
                  <span class="truncate">{{ other.title }}</span>
                </button>
              </div>
            </div>
          </form>

          <div
            class="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700"
          >
            <button
              v-if="!isNew"
              type="button"
              @click="emit('delete')"
              class="flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
            >
              <Trash2 class="size-4" />
              Delete
            </button>
            <button
              type="button"
              @click="emit('close')"
              class="ml-auto h-10 rounded-lg px-4 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              @click="save"
              :disabled="!canSave"
              class="rm-token rm-btn h-10 rounded-xl px-5 text-sm font-black tracking-wide text-white uppercase disabled:opacity-50"
            >
              {{ isNew ? 'Add the goal' : 'Update' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style src="./roadmap3d.css"></style>

<style scoped>
/* The sheet fades in where it stands rather than sliding up. */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
/* The card itself pops open, a touch past full size and back, the way the
   map's own popups do. Nothing slides. */
.sheet-enter-active .sheet-panel {
  transition: transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}
.sheet-enter-from .sheet-panel {
  transform: scale(0.92);
}

@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active,
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active {
    transition: none;
  }
}
</style>
