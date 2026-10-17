<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight } from '../../icons'

// A list as a desktop reads one: columns with their names over them, a row a
// thing, each row opening it. An app's sections are lists on a phone, one
// strong line and one quiet one (ListRow), because a phone has room for no
// more; a desktop has the room to say what the phone keeps a tap away — a
// person's age, ministries and birthday on the roll; a task's ministry, who
// has it and when it is due — so it does, in columns the eye runs down.
//
// Grouped the way the phone's list is grouped (`groups`: the age bands, the
// months, the days), each group a quiet heading row across the table with its
// count, and room at its end for one action (`#group-action`). The column
// names stay at the top of the screen as the rows scroll under them, under
// the screen's own header while it shows (AppScreen's --screen-head).
//
// Columns go when the table is too narrow for them, the least needed first:
// a column with `min` (a width in pixels) is only drawn where the table is at
// least that wide, so a desktop's narrowest width keeps the name and what
// matters most rather than squeezing everything into slivers.
//
// Columns: [{ key, label, width, min?, align? }], `width` a grid track
// ('minmax(14rem, 2fr)', '7rem'). A cell is the `cell-<key>` slot, given
// { row }, or the row's own value by that key.

const props = defineProps({
  columns: { type: Array, required: true },
  // [{ key, label?, count?, dot?, rows }] — or `rows` alone for one flat list.
  groups: { type: Array, default: null },
  rows: { type: Array, default: () => [] },
  rowKey: { type: Function, default: (row) => row.id },
  // Where a row leads, or null: a link when it leads somewhere, otherwise a
  // row that answers a click (`row-click`) or is only read.
  rowTo: { type: Function, default: null },
  rowClass: { type: Function, default: () => '' },
  clickable: { type: Boolean, default: false },
  // What the table is, for a screen reader.
  label: { type: String, default: '' },
})

const emit = defineEmits(['row-click', 'row-contextmenu'])

const box = ref(null)
const width = ref(1200)
let watcher = null
onMounted(() => {
  if (!box.value || typeof ResizeObserver === 'undefined') return
  watcher = new ResizeObserver(([entry]) => (width.value = entry.contentRect.width))
  watcher.observe(box.value)
})
onBeforeUnmount(() => watcher?.disconnect())

const shown = computed(() => props.columns.filter((column) => !column.min || width.value >= column.min))
const template = computed(() => [...shown.value.map((column) => column.width || '1fr'), props.rowTo || props.clickable ? '1rem' : ''].filter(Boolean).join(' '))
const sections = computed(() => props.groups || [{ key: 'all', rows: props.rows }])
const ALIGN = { right: 'justify-self-end text-right', center: 'justify-self-center text-center' }
</script>

<template>
  <div ref="box" role="table" :aria-label="label || undefined" class="rounded-2xl bg-white ring-1 ring-gray-200/70 dark:bg-gray-800 dark:ring-gray-700/70">
    <div
      role="row"
      class="sticky top-(--screen-head,0px) z-20 grid items-center gap-4 rounded-t-2xl border-b border-gray-100 bg-white/95 px-4 py-2.5 text-xs font-semibold text-gray-500 backdrop-blur transition-[top] duration-300 dark:border-gray-700/60 dark:bg-gray-800/95 dark:text-gray-400"
      :style="{ gridTemplateColumns: template }"
    >
      <span v-for="column in shown" :key="column.key" role="columnheader" :class="['truncate', ALIGN[column.align] || '']">{{ column.label }}</span>
    </div>

    <div v-for="(section, s) in sections" :key="section.key" role="rowgroup">
      <div
        v-if="section.label"
        :class="[
          'flex items-center justify-between gap-3 bg-gray-50/80 px-4 py-2 dark:bg-gray-900/30',
          s ? 'border-t border-gray-100 dark:border-gray-700/60' : '',
        ]"
      >
        <h3 class="flex min-w-0 items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          <span v-if="section.dot" :class="['size-2 shrink-0 rounded-full', section.dot]" aria-hidden="true" />
          <span class="truncate">{{ section.label }}</span>
          <span v-if="section.count !== undefined" class="font-semibold tabular-nums text-gray-400 dark:text-gray-500">{{ section.count }}</span>
        </h3>
        <slot name="group-action" :group="section" />
      </div>
      <component
        :is="rowTo && rowTo(row) ? RouterLink : 'div'"
        v-for="row in section.rows"
        :key="rowKey(row)"
        role="row"
        :to="rowTo ? rowTo(row) || undefined : undefined"
        :class="[
          'group/row grid min-h-14 items-center gap-4 border-t border-gray-100 px-4 py-2 text-sm text-gray-700 dark:border-gray-700/60 dark:text-gray-200',
          rowTo || clickable ? 'cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40' : '',
          rowClass(row),
        ]"
        :style="{ gridTemplateColumns: template }"
        @click="emit('row-click', row, $event)"
        @contextmenu="emit('row-contextmenu', row, $event)"
      >
        <div v-for="column in shown" :key="column.key" role="cell" :class="['min-w-0', ALIGN[column.align] || '']">
          <slot :name="`cell-${column.key}`" :row="row">
            <span class="block truncate">{{ row[column.key] }}</span>
          </slot>
        </div>
        <ChevronRight
          v-if="rowTo || clickable"
          class="size-4 text-gray-300 transition-transform group-hover/row:translate-x-0.5 dark:text-gray-600"
          aria-hidden="true"
        />
      </component>
    </div>

    <slot name="empty" />
  </div>
</template>
