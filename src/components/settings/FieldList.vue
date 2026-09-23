<script setup>
// A run of fields, drawn from what they say they are.
//
// The descriptors live in src/data/landingSchema.js — a key, a label and a
// kind — and this turns them into controls. Written once so a new field on the
// public page costs a line of data rather than a block of markup, which is the
// bargain the landing-lab prototype is built on and the reason its section
// types and today's settings fields share one vocabulary.
//
// It edits the object it is given, in place: `model` belongs to whatever draft
// was passed in, and a list field hands back a new array so the draft's own
// change tracking sees it.
//
// `image` and `gallery` are not here. Only the prototype has them, and only
// against a stand-in photo library; a caller that needs one passes it through
// the per-field slot below.
import { computed } from 'vue'
import { Plus, Trash2 } from '../../icons'
import { blankRow } from '../../data/landingSchema'

const props = defineProps({
  fields: { type: Array, required: true },
  /** The draft being edited. Keys are the fields' own. */
  model: { type: Object, required: true },
  /** Prefixes every id, so two of these on one page cannot collide. */
  idPrefix: { type: String, default: 'field' },
})

/**
 * The fields, with runs of `half` ones gathered onto a row of their own.
 *
 * Two short boxes that belong together — the line after a visitor's name and
 * the line after a member's — read as a pair rather than as two more things to
 * fill in, and on a phone they stack anyway.
 */
const blocks = computed(() => {
  const out = []
  for (const field of props.fields) {
    const last = out[out.length - 1]
    if (field.half && last?.half) last.fields.push(field)
    else out.push({ half: !!field.half, fields: [field] })
  }
  return out
})

const idFor = (field) => `${props.idPrefix}-${field.key}`

/**
 * A `words` field, as one line.
 *
 * Thirty-odd one-word values want a text field, not thirty rows. Split on
 * commas and newlines so a list pasted from anywhere still parses, and joined
 * back with ", " so the field reads as a sentence.
 */
const wordsText = (field) => ({
  get: () => (props.model[field.key] || []).join(', '),
  set: (value) => {
    props.model[field.key] = String(value)
      .split(/[\n,]/)
      .map((word) => word.trim())
      .filter(Boolean)
  },
})

const rowsOf = (field) => props.model[field.key] || []

const addRow = (field) => {
  props.model[field.key] = [...rowsOf(field), blankRow(field)]
}

const removeRow = (field, index) => {
  props.model[field.key] = rowsOf(field).filter((_, i) => i !== index)
}

const input =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const label = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
const hint = 'mt-1 text-xs text-gray-500 dark:text-gray-400'
</script>

<template>
  <div class="space-y-5">
    <div
      v-for="(block, blockIndex) in blocks"
      :key="blockIndex"
      :class="block.half && block.fields.length > 1 ? 'grid gap-4 sm:grid-cols-2' : ''"
    >
      <div v-for="field in block.fields" :key="field.key">
        <!-- Anything a caller wants above a field: the service-time
             suggestions, say, which only the settings screen has. -->
        <slot :name="`before:${field.key}`" :field="field" />

        <template v-if="field.type === 'list'">
          <div class="mb-2 flex items-center justify-between gap-2">
            <p class="min-w-0 text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ field.label }}
            </p>
            <button
              type="button"
              @click="addRow(field)"
              class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary dark:text-primary-light"
            >
              <Plus class="h-3.5 w-3.5" />
              {{ field.addLabel || 'Add' }}
            </button>
          </div>

          <slot :name="`list:${field.key}`" :field="field" />

          <div v-if="rowsOf(field).length" class="space-y-2">
            <div
              v-for="(row, index) in rowsOf(field)"
              :key="index"
              class="flex items-start gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-600"
            >
              <div class="min-w-0 flex-1 space-y-2">
                <input
                  v-for="sub in field.item"
                  :key="sub.key"
                  v-model="row[sub.key]"
                  type="text"
                  :placeholder="sub.placeholder || sub.label"
                  :aria-label="sub.label"
                  :class="input"
                />
              </div>
              <button
                type="button"
                @click="removeRow(field, index)"
                :aria-label="`Remove ${row[field.item[0].key] || field.item[0].label.toLowerCase()}`"
                class="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </div>
          </div>
          <p v-else class="text-xs italic text-gray-400">
            {{ field.emptyText || 'None yet.' }}
          </p>
        </template>

        <template v-else>
          <label :class="label" :for="idFor(field)">{{ field.label }}</label>

          <textarea
            v-if="field.type === 'textarea'"
            :id="idFor(field)"
            v-model="model[field.key]"
            :rows="field.rows || 3"
            :placeholder="field.placeholder"
            :class="input"
          ></textarea>

          <select
            v-else-if="field.type === 'choice'"
            :id="idFor(field)"
            v-model="model[field.key]"
            :class="input"
          >
            <option v-for="option in field.options" :key="option" :value="option">
              {{ option }}
            </option>
          </select>

          <!-- A list of plain words, edited as one line. -->
          <input
            v-else-if="field.type === 'words'"
            :id="idFor(field)"
            :value="wordsText(field).get()"
            type="text"
            :placeholder="field.placeholder"
            :class="input"
            @input="wordsText(field).set($event.target.value)"
          />

          <input
            v-else
            :id="idFor(field)"
            v-model="model[field.key]"
            type="text"
            :placeholder="field.placeholder"
            :class="input"
          />
        </template>

        <p v-if="field.hint" :class="hint">{{ field.hint }}</p>
      </div>
    </div>
  </div>
</template>
