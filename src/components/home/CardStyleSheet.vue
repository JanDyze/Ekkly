<script setup>
import { computed, ref, toRef } from 'vue'
import { X } from '../../icons'
import CardStylePicker from './CardStylePicker.vue'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useHomeCards } from '../../composables/useHomeCards'
import { useToast } from '../../composables/useToast'
import { homeCardName } from '../../data/homeCards'

// A person's own choice of how the home draws its apps, from Preferences.
// "Church's choice" first, so following the church is the plain answer and
// a style of your own is the step away from it. Saved on the tap.

const props = defineProps({
  show: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const toast = useToast()
const { myChoice, churchStyle, setMine } = useHomeCards()

const panel = ref(null)
// Traps focus and holds the page still underneath while it is open.
useFocusTrap(panel, toRef(props, 'show'), () => emit('close'))

const followNote = computed(() => `${homeCardName(churchStyle.value)}, as your church set it`)

const choose = async (key) => {
  try {
    await setMine(key)
  } catch {
    toast.error('Could not save that style. Please try again.')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="fixed inset-0 z-100 flex items-end justify-center sm:items-center" @click.self="emit('close')">
        <div class="absolute inset-0 bg-black/50" aria-hidden="true" @click="emit('close')" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="card-style-title"
          tabindex="-1"
          class="relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-md sm:rounded-3xl dark:bg-gray-900"
        >
          <div class="flex shrink-0 items-start gap-3 px-5 pb-3 pt-5">
            <div class="min-w-0 flex-1">
              <h2 id="card-style-title" class="text-lg font-bold text-gray-900 dark:text-white">App cards</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">How your home draws its apps. Only you see your choice.</p>
            </div>
            <button
              type="button"
              class="flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Close"
              @click="emit('close')"
            >
              <X class="size-5" />
            </button>
          </div>
          <div class="min-h-0 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            <CardStylePicker
              :model-value="myChoice"
              follow-label="Church's choice"
              :follow-note="followNote"
              @update:model-value="choose"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
