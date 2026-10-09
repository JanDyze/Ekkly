<script setup>
import { computed, ref, watch } from 'vue'
import { YEARLESS, birthdayParts } from '../../utils/memberUtils'

// A birthday as three plain answers — the month, the day, and the year if it
// is known — in place of the browser's date picker.
//
// The picker opened on today and made somebody born in 1958 page back through
// sixty-eight years of calendars, or know to tap the year in its header; on
// some phones it was a spinner that overshot. And it could not be told "I know
// the day but not the year", which is the answer a lot of people give. Here
// the month and day are a list each (a phone shows its own wheel for those),
// the year is four digits typed, and leaving the year empty is allowed: the
// record keeps 0000 for it (memberUtils' YEARLESS), so the birthday is still
// greeted on the day with no age put to it.
//
// v-model is the stored string: "YYYY-MM-DD", "0000-MM-DD", or "" for none.
// Until both a month and a day are chosen it stays "", so half an answer is
// never saved as a date.

const props = defineProps({
  modelValue: { type: String, default: '' },
  // The field style of the form it sits in, so it matches its neighbours.
  fieldClass: { type: [String, Array], default: '' },
  // Smaller, for a row of a sheet.
  compact: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: new Date(2000, i, 1).toLocaleDateString(undefined, { month: props.compact ? 'short' : 'long' }),
}))

const month = ref('')
const day = ref('')
const year = ref('')

// What was last sent up, so the record coming back down as that same string
// does not clear a half-typed year.
let sent = null

const load = (value) => {
  const parts = birthdayParts(value)
  month.value = parts?.month || ''
  day.value = parts?.day || ''
  year.value = parts?.year ? String(parts.year) : ''
}

watch(
  () => props.modelValue,
  (value) => {
    if (value === sent) return
    load(value)
  },
  { immediate: true }
)

const thisYear = new Date().getFullYear()

/** A year that could be somebody's, or null — partly typed counts as not yet. */
const validYear = computed(() => {
  const y = Number(year.value)
  return /^\d{4}$/.test(year.value) && y >= 1900 && y <= thisYear ? y : null
})
const yearWrong = computed(() => year.value.length === 4 && !validYear.value)

// February has 29 days when the year is not known, since it may have been a
// leap year and a real 29 February birthday should not be refused.
const daysIn = computed(() => {
  if (!month.value) return 31
  return new Date(validYear.value || 2000, Number(month.value), 0).getDate()
})

watch(daysIn, (n) => {
  if (Number(day.value) > n) day.value = n
})

const pad = (n) => String(n).padStart(2, '0')

watch([month, day, validYear], () => {
  const value =
    month.value && day.value ? `${validYear.value ? validYear.value : YEARLESS}-${pad(month.value)}-${pad(day.value)}` : ''
  if (value === props.modelValue) return
  sent = value
  emit('update:modelValue', value)
})

const onYear = (event) => {
  year.value = event.target.value.replace(/\D/g, '').slice(0, 4)
  event.target.value = year.value
}

const size = computed(() => (props.compact ? 'text-sm' : ''))
</script>

<template>
  <div>
    <div :class="['grid gap-2', compact ? 'grid-cols-[1.2fr_1fr_1.1fr]' : 'grid-cols-[1.6fr_1fr_1.1fr]']">
      <select :id="id" v-model="month" :class="[fieldClass, size]" aria-label="Month">
        <option value="">Month</option>
        <option v-for="m in MONTHS" :key="m.value" :value="m.value">{{ m.label }}</option>
      </select>
      <select v-model="day" :class="[fieldClass, size]" aria-label="Day">
        <option value="">Day</option>
        <option v-for="n in daysIn" :key="n" :value="n">{{ n }}</option>
      </select>
      <input
        :value="year"
        @input="onYear"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        maxlength="4"
        placeholder="Year"
        aria-label="Year, if known"
        :class="[fieldClass, size, yearWrong ? 'ring-2 ring-red-400' : '']"
      />
    </div>
    <p v-if="!compact" :class="['mt-1 text-xs', yearWrong ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400']">
      <slot name="hint" :year-wrong="yearWrong">
        {{ yearWrong ? `A year from 1900 to ${thisYear}, or leave it empty.` : 'No year? Leave it empty. Their birthday is still remembered.' }}
      </slot>
    </p>
  </div>
</template>
