<script setup>
// One card in the studio's running order, as components/videos/VideoSceneRow
// draws it: its picture, what it is, what it says, and how long it is up —
// lit when it is the one playing, struck through when it is left out.

defineProps({
  card: { type: Object, required: true },
  current: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },
  // Words in front of the detail: "Left out", "Edited".
  note: { type: String, default: '' },
})
</script>

<template>
  <div
    :class="[
      'flex items-center gap-2.5 rounded-xl px-2 py-1.5 transition-colors duration-300',
      current ? 'bg-primary/10 ring-1 ring-primary/30 dark:bg-primary/20 dark:ring-primary-light/30' : '',
      hidden ? 'opacity-60' : '',
    ]"
  >
    <span :class="['flex size-8 shrink-0 items-center justify-center rounded-lg', hidden ? 'bg-gray-100 dark:bg-gray-700' : 'bg-primary/10 dark:bg-primary-light/15']">
      <component :is="card.icon" :class="['size-4', hidden ? 'text-gray-400' : 'text-primary dark:text-primary-light']" />
    </span>
    <span class="min-w-0 flex-1">
      <span :class="['block truncate text-sm font-medium', hidden ? 'text-gray-500 line-through decoration-gray-400/60 dark:text-gray-400' : '']">{{ card.title }}</span>
      <span class="block truncate text-xs text-gray-500 dark:text-gray-400">
        <template v-if="note">{{ note }} · </template>{{ card.detail }}
      </span>
    </span>
    <span v-if="!hidden" class="shrink-0 text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ card.seconds }}s</span>
  </div>
</template>
