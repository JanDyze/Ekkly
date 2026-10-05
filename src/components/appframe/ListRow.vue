<script setup>
import { computed, useAttrs } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'

// One row of a ListGroup: something on the left (a date, a face, an icon), one
// strong line, at most one quiet line, and on the right whatever it ends in —
// a count, a key, a tick, or a chevron when it leads somewhere.
//
// A link with `to`, a button when it is listened to (@click), and plain text
// otherwise. `muted` greys the strong line, for a slot nobody fills yet.

defineOptions({ inheritAttrs: false })

const props = defineProps({
  to: { type: [String, Object], default: null },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  muted: { type: Boolean, default: false },
  // The strong line in amber: something still to be done.
  warn: { type: Boolean, default: false },
  // Hide the chevron a link would otherwise end in.
  noChevron: { type: Boolean, default: false },
})

const attrs = useAttrs()
const clickable = computed(() => Boolean(props.to || attrs.onClick))
const tag = computed(() => (props.to ? RouterLink : attrs.onClick ? 'button' : 'div'))
</script>

<template>
  <component
    :is="tag"
    v-bind="$attrs"
    :to="to || undefined"
    :type="tag === 'button' ? 'button' : undefined"
    :class="[
      'flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left',
      clickable ? 'transition-colors hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-700/40 dark:active:bg-gray-700/60' : '',
    ]"
  >
    <slot name="leading" />
    <span class="min-w-0 flex-1">
      <span
        :class="[
          'block truncate text-[15px] leading-snug',
          warn
            ? 'font-medium text-amber-700 dark:text-amber-400'
            : muted
              ? 'text-gray-400 dark:text-gray-500'
              : 'font-medium text-gray-900 dark:text-white',
        ]"
      >
        <slot name="title">{{ title }}</slot>
      </span>
      <span v-if="subtitle || $slots.subtitle" class="mt-0.5 block truncate text-sm text-gray-500 dark:text-gray-400">
        <slot name="subtitle">{{ subtitle }}</slot>
      </span>
    </span>
    <slot name="trailing" />
    <ChevronRight v-if="to && !noChevron" class="size-4 shrink-0 text-gray-300 dark:text-gray-600" />
  </component>
</template>
