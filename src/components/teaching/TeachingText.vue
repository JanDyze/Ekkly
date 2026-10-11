<script setup>
/**
 * Notes a preacher or a teacher wrote, read back: headings, lists and bold,
 * through the same Markdown renderer Minutes uses (utils/markdownUtils), which
 * escapes everything it is given.
 *
 * That renderer hands back anything that already looks like HTML untouched,
 * for minutes saved before it existed. Nothing in Teaching was ever saved as
 * HTML, so text that looks like it is shown as the plain words typed instead,
 * and a pasted tag cannot become part of the page.
 */
import { computed } from 'vue'
import { isStoredHtml, markdownToHtml } from '../../utils/markdownUtils'

const props = defineProps({
  text: { type: String, default: '' },
})

const asHtml = computed(() => !isStoredHtml(props.text))
const html = computed(() => (asHtml.value ? markdownToHtml(props.text) : ''))
</script>

<template>
  <div v-if="asHtml" class="teaching-text text-[15px] leading-relaxed text-gray-800 dark:text-gray-200" v-html="html" />
  <p v-else class="whitespace-pre-line text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">{{ text }}</p>
</template>

<style scoped>
.teaching-text :deep(h1),
.teaching-text :deep(h2),
.teaching-text :deep(h3) {
  margin: 1rem 0 0.25rem;
  font-weight: 700;
}
.teaching-text :deep(h1:first-child),
.teaching-text :deep(h2:first-child),
.teaching-text :deep(h3:first-child) {
  margin-top: 0;
}
.teaching-text :deep(p) {
  margin: 0.5rem 0;
}
.teaching-text :deep(ul),
.teaching-text :deep(ol) {
  margin: 0.5rem 0;
  padding-left: 1.25rem;
}
.teaching-text :deep(ul) {
  list-style: disc;
}
.teaching-text :deep(ol) {
  list-style: decimal;
}
.teaching-text :deep(li) {
  margin: 0.15rem 0;
}
</style>
