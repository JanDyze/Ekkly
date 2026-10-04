<script setup>
import { computed } from 'vue'
import {
  ArrowDown,
  ArrowUp,
  Cake,
  CalendarDots,
  CalendarX,
  Church,
  Clock,
  Eye,
  EyeSlash,
  FlagBanner,
  HandWaving,
  Megaphone,
  MicrophoneStage,
  UsersRound,
} from '../../icons'

// One card of the video in the studio's running order: what it is, what it
// says, and how long it is up. Whoever can manage events can leave it out,
// move it and open it to change the words; anyone else taps it to watch it.

const props = defineProps({
  scene: { type: Object, required: true },
  index: { type: Number, default: 0 },
  current: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  first: { type: Boolean, default: false },
  last: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'toggle', 'move'])

const ICONS = {
  intro: FlagBanner,
  event: CalendarDots,
  change: CalendarX,
  occasion: Church,
  weekly: Clock,
  groups: UsersRound,
  sundays: MicrophoneStage,
  birthdays: Cake,
  custom: Megaphone,
  outro: HandWaving,
  birthday: Cake,
  sunday: MicrophoneStage,
  group: UsersRound,
}

const KINDS = {
  intro: 'Opening',
  outro: 'Closing',
  custom: 'Your announcement',
}

const icon = computed(() => ICONS[props.scene.kind] || Megaphone)

const detail = computed(() => {
  const s = props.scene
  if (s.layout === 'list') {
    const n = s.rows?.length || 0
    return `${s.eyebrow} · ${n} ${n === 1 ? 'row' : 'rows'}`
  }
  return [KINDS[s.kind], s.when, s.where].filter(Boolean).join(' · ') || s.body || s.eyebrow
})
</script>

<template>
  <li
    :class="[
      'flex items-center gap-2 rounded-xl p-2 pl-3 transition-colors',
      current ? 'bg-primary/10 ring-1 ring-primary/30 dark:bg-primary/20 dark:ring-primary-light/30' : '',
      scene.hidden ? 'opacity-60' : '',
    ]"
  >
    <button type="button" class="flex min-w-0 flex-1 items-center gap-3 py-1 text-left" @click="emit('open')">
      <span
        :class="[
          'flex size-10 shrink-0 items-center justify-center rounded-xl',
          scene.hidden ? 'bg-gray-100 dark:bg-gray-700' : 'bg-primary/10 dark:bg-primary-light/15',
        ]"
      >
        <component
          :is="icon"
          :class="['size-5', scene.hidden ? 'text-gray-400' : 'text-primary dark:text-primary-light']"
        />
      </span>
      <span class="min-w-0 flex-1">
        <span
          :class="[
            'block truncate text-sm font-medium',
            scene.hidden ? 'text-gray-500 line-through decoration-gray-400/60 dark:text-gray-400' : 'text-gray-900 dark:text-white',
          ]"
        >
          {{ scene.title || 'Untitled' }}
        </span>
        <span class="mt-0.5 block truncate text-xs text-gray-500 dark:text-gray-400">
          <template v-if="scene.hidden">Left out · </template>
          <template v-else-if="scene.edited">Edited · </template>
          {{ detail }}
        </span>
      </span>
      <span v-if="!scene.hidden" class="shrink-0 text-xs tabular-nums text-gray-400 dark:text-gray-500">
        {{ Math.round(scene.seconds) }}s
      </span>
    </button>

    <template v-if="canEdit">
      <div class="flex shrink-0 flex-col">
        <button
          type="button"
          class="flex h-5 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:invisible dark:hover:bg-gray-700 dark:hover:text-gray-200"
          :disabled="first"
          :aria-label="`Move ${scene.title} earlier`"
          @click="emit('move', -1)"
        >
          <ArrowUp class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="flex h-5 w-8 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:invisible dark:hover:bg-gray-700 dark:hover:text-gray-200"
          :disabled="last"
          :aria-label="`Move ${scene.title} later`"
          @click="emit('move', 1)"
        >
          <ArrowDown class="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        class="flex size-10 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
        :aria-label="scene.hidden ? `Put ${scene.title} back in` : `Leave ${scene.title} out`"
        :aria-pressed="!scene.hidden"
        @click="emit('toggle')"
      >
        <EyeSlash v-if="scene.hidden" class="h-5 w-5" />
        <Eye v-else class="h-5 w-5" />
      </button>
    </template>
  </li>
</template>
