<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { Check, Plus } from '../../icons'
import { useQuickActions } from '../../composables/useQuickActions'
import { useScrollLock } from '../../composables/useScrollLock'

// The home's quick actions behind one round button in the corner of the
// day's card, so the card says the day and the greeting and nothing else
// until asked: four buttons on the card itself read as clutter. On a desktop
// the menu opens under the button; on a phone (`sheet`), whose day card is
// one of a swiped deck that clips whatever hangs off it, it rises from the
// foot of the screen over a dimmed page, which holds still under it. Each
// action is named in full; a tap outside, Escape, or following one closes
// it.
//
// Everyone starts with the same few (data/quickActions.js), and "Edit" at the
// menu's foot turns it into the whole list of what this person may do, each
// ticked on or off, saved to their account as they go (useQuickActions).

const props = defineProps({
  // Open as a sheet from the foot of the screen (a phone) rather than a menu
  // under the button.
  sheet: { type: Boolean, default: false },
})

const { actions, available, chosen, isDefault, setMine, toggle, max } = useQuickActions()

const open = ref(false)
const editing = ref(false)
const root = ref(null)
const panel = ref(null)
useScrollLock(computed(() => open.value && props.sheet))

const close = () => {
  open.value = false
}
// The sheet is drawn on the page itself, outside the button's own box.
const onPointer = (event) => {
  if (!root.value?.contains(event.target) && !panel.value?.contains(event.target)) close()
}
const onKey = (event) => {
  if (event.key === 'Escape') close()
}
watch(open, (now) => {
  if (!now) editing.value = false
  const method = now ? 'addEventListener' : 'removeEventListener'
  document[method]('pointerdown', onPointer)
  document[method]('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointer)
  document.removeEventListener('keydown', onKey)
})

const full = (key) => !chosen.value.includes(key) && chosen.value.length >= max
</script>

<template>
  <div v-if="available.length" ref="root" class="relative">
    <button
      type="button"
      class="flex size-9 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/25 transition-colors hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      :class="open ? 'bg-white/25' : ''"
      aria-label="Quick actions"
      title="Quick actions"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="open = !open"
    >
      <Plus class="size-5 transition-transform duration-200" :class="open ? 'rotate-45' : ''" />
    </button>

    <Teleport to="body" :disabled="!sheet">
    <div v-if="open && sheet" class="fixed inset-0 z-[70] bg-gray-950/40" aria-hidden="true" />
    <Transition
      :enter-active-class="sheet ? 'transition duration-200 ease-out' : 'transition duration-150 ease-out'"
      :enter-from-class="sheet ? 'opacity-0 translate-y-4' : 'opacity-0 -translate-y-1 scale-95'"
      :leave-active-class="sheet ? 'transition duration-150 ease-in' : 'transition duration-100 ease-in'"
      :leave-to-class="sheet ? 'opacity-0 translate-y-4' : 'opacity-0 -translate-y-1 scale-95'"
    >
      <div
        v-if="open"
        ref="panel"
        :class="[
          'bg-white p-1.5 ring-1 ring-black/5 dark:bg-gray-800 dark:ring-white/10',
          sheet
            ? 'fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[71] mx-auto max-w-md rounded-3xl p-2'
            : 'absolute right-0 top-11 z-30 w-64 origin-top-right rounded-2xl shadow-lg',
        ]"
      >
        <p v-if="sheet && !editing" class="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Start something</p>
        <!-- The actions, each opening its place. -->
        <ul v-if="!editing" role="menu" aria-label="Quick actions">
          <li v-for="action in actions" :key="action.key" role="none">
            <RouterLink
              :to="action.to"
              role="menuitem"
              class="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:outline-none dark:text-gray-100 dark:hover:bg-white/10 dark:focus-visible:bg-white/10"
              @click="close"
            >
              <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary-light/15 dark:text-primary-light">
                <component :is="action.icon" class="size-4" />
              </span>
              {{ action.label }}
            </RouterLink>
          </li>
          <li v-if="!actions.length" role="none" class="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">None chosen yet.</li>
        </ul>

        <!-- Choosing them: everything this person may do, ticked or not. -->
        <div v-else>
          <p class="px-3 pt-1.5 pb-1 text-xs text-gray-500 dark:text-gray-400">Choose up to {{ max }}.</p>
          <ul role="group" aria-label="Choose quick actions">
            <li v-for="action in available" :key="action.key">
              <button
                type="button"
                role="checkbox"
                :aria-checked="chosen.includes(action.key)"
                :disabled="full(action.key)"
                class="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-100 dark:hover:bg-white/10"
                @click="toggle(action.key)"
              >
                <component :is="action.icon" class="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                <span class="min-w-0 flex-1">{{ action.label }}</span>
                <span
                  :class="[
                    'flex size-5 shrink-0 items-center justify-center rounded-md ring-1 transition-colors',
                    chosen.includes(action.key) ? 'bg-primary text-white ring-primary dark:bg-primary-light dark:text-gray-900 dark:ring-primary-light' : 'ring-gray-300 dark:ring-white/25',
                  ]"
                >
                  <Check v-if="chosen.includes(action.key)" class="size-3.5" />
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div class="mt-1 flex items-center justify-between gap-2 border-t border-gray-100 px-1.5 pt-1.5 dark:border-white/10">
          <button
            v-if="editing && !isDefault"
            type="button"
            class="rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-100"
            @click="setMine(null)"
          >
            Back to the defaults
          </button>
          <span v-else />
          <button
            type="button"
            class="rounded-lg px-2 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 dark:text-primary-light dark:hover:bg-primary-light/15"
            :aria-pressed="editing"
            @click="editing = !editing"
          >
            {{ editing ? 'Done' : 'Edit' }}
          </button>
        </div>
      </div>
    </Transition>
    </Teleport>
  </div>
</template>
