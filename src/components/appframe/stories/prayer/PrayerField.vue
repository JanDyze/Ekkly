<script setup>
import { ChevronDown, Search, User, X } from '../../../../icons'

// One of the form's fields: its label over a box holding what has been
// typed or chosen, ringed in the church's colour while it has the focus. A
// select shows its chevron, a chosen member their name with the way to clear
// it, and a member still being looked for the search the form gives it.

const props = defineProps({
  label: { type: String, required: true },
  value: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  kind: { type: String, default: 'text' }, // 'text' | 'area' | 'select' | 'member' | 'find'
  focused: { type: Boolean, default: false },
  caret: { type: Boolean, default: false },
  tapped: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
})
</script>

<template>
  <div>
    <p class="mb-1 text-[13px] font-medium text-gray-700 dark:text-gray-300">
      {{ props.label }}
      <span v-if="props.required" class="text-red-500">*</span>
    </p>
    <span
      :class="[
        'relative flex items-center gap-2 rounded-lg border bg-white px-3 text-sm dark:bg-gray-700',
        props.kind === 'area' ? 'min-h-13 items-start py-2' : 'h-9',
        props.focused ? 'border-transparent ring-2 ring-primary dark:ring-primary-light' : 'border-gray-300 dark:border-gray-600',
        props.tapped ? 'st-tap text-primary dark:text-primary-light' : '',
      ]"
    >
      <User v-if="props.kind === 'member'" class="size-4 shrink-0 text-gray-400" />
      <Search v-if="props.kind === 'find'" class="size-4 shrink-0 text-gray-400" />
      <span
        :class="[
          'min-w-0 flex-1',
          props.kind === 'area' ? '' : 'truncate',
          props.value ? 'text-gray-900 dark:text-white' : 'text-gray-400',
          props.caret ? 'st-caret' : '',
        ]"
      >{{ props.value || props.placeholder }}</span>
      <ChevronDown v-if="props.kind === 'select' || props.kind === 'find'" class="size-4 shrink-0 text-gray-400" />
      <X v-if="props.kind === 'member'" class="size-4 shrink-0 text-gray-400" />
    </span>
  </div>
</template>
