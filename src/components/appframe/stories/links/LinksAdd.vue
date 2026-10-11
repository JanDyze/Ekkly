<script setup>
import { computed, ref } from 'vue'
import { AlertTriangle, CheckCircle, Globe, Video, X } from '../../../../icons'
import { useSceneTimeline } from '../../../frontdoor/useSceneTimeline'
import LinksBar from './LinksBar.vue'
import LinksRow from './LinksRow.vue'
import { CATEGORY_STYLE, LINKS } from './links'

// Scene: a link kept in seconds. + is tapped and the form comes up; the
// title is typed, then the address, which the form reads back as it goes:
// "not a web address yet" until it is one, then where it goes. A category is
// chosen and Add link pressed, so a mistyped address is caught here rather
// than by whoever taps the dead link on Sunday morning.

const TITLE = 'Prayer meeting on Zoom'
const ADDRESS = 'zoom.us/j/8812345678'
const CHOICES = ['Video', 'Social', 'Resource', 'Worship']

const tapAdd = ref(false)
const open = ref(false)
const title = ref('')
const url = ref('')
const category = ref('Video')
const tapCategory = ref(false)
const saving = ref(false)
const saved = ref(false)
const { at, type, still } = useSceneTimeline()

// The new link, as the list shows it once it is saved: under its category,
// with the drawn mark for a meeting link and where it goes under its title.
const ADDED = { id: 'zoom', title: TITLE, note: 'zoom.us', icon: Video }
const WORSHIP = 'text-primary bg-primary/10 dark:text-primary-light'

at(300, () => (tapAdd.value = true))
at(550, () => (open.value = true))
const typedTitle = type(title, TITLE, 850, 40)
const typedUrl = type(url, ADDRESS, typedTitle + 250, 45)
at(typedUrl + 250, () => (tapCategory.value = true))
at(typedUrl + 400, () => (category.value = 'Worship'))
at(typedUrl + 750, () => (saving.value = true))
at(typedUrl + 1050, () => {
  open.value = false
  saved.value = true
})

// What the form says under the address, as the page decides it: a host once
// there is a dot in one, a warning before that.
const openable = computed(() => /^[^/]+\.[^/]+/.test(url.value))
const focus = computed(() => (saving.value ? '' : url.value || title.value.length === TITLE.length ? 'url' : 'title'))
</script>

<template>
  <div class="relative h-full px-2 pt-5">
    <LinksBar class="st-rise" :tap-add="tapAdd" />
    <section class="st-rise mt-2" style="--d: 120ms">
      <div class="flex items-center gap-2 py-2">
        <span :class="['rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', CATEGORY_STYLE.Video]">Video</span>
        <span class="text-xs font-medium text-gray-400 dark:text-gray-500">2</span>
      </div>
      <LinksRow v-for="link in LINKS.slice(0, 2)" :key="link.id" :link="link" />
    </section>
    <section v-if="saved" class="st-pop">
      <div class="flex items-center gap-2 py-2">
        <span :class="['rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', WORSHIP]">Worship</span>
        <span class="text-xs font-medium text-gray-400 dark:text-gray-500">1</span>
      </div>
      <LinksRow :link="ADDED" />
    </section>

    <Transition name="links-sheet">
      <div v-if="open" class="absolute inset-0 z-10 flex flex-col justify-end">
        <div class="absolute inset-0 rounded-[28px] bg-black/50" />
        <div class="links-sheet-panel relative rounded-b-[28px] rounded-t-2xl border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div class="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
            <span>
              <span class="block text-base font-semibold">Add link</span>
              <span class="block text-xs text-gray-500 dark:text-gray-400">Everyone signed in can see it</span>
            </span>
            <X class="size-5 text-gray-400" />
          </div>

          <div class="flex flex-col gap-3 p-4">
            <div>
              <p class="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Title</p>
              <span
                :class="[
                  'flex h-9 items-center rounded-lg border px-3 text-sm dark:bg-gray-900',
                  focus === 'title' ? 'border-transparent ring-2 ring-primary dark:ring-primary-light' : 'border-gray-300 dark:border-gray-600',
                ]"
              >
                <span :class="['truncate', title ? '' : 'text-gray-400', !still && focus === 'title' ? 'st-caret' : '']">{{ title || 'e.g. Sunday livestream' }}</span>
              </span>
            </div>

            <div>
              <p class="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Link</p>
              <span
                :class="[
                  'flex h-9 items-center rounded-lg border px-3 text-sm dark:bg-gray-900',
                  focus === 'url' ? 'border-transparent ring-2 ring-primary dark:ring-primary-light' : 'border-gray-300 dark:border-gray-600',
                ]"
              >
                <span :class="['truncate', url ? '' : 'text-gray-400', !still && focus === 'url' ? 'st-caret' : '']">{{ url || 'Paste or type an address' }}</span>
              </span>
              <p v-if="url && openable" class="flex h-5 items-center gap-1.5 pt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Globe class="size-3.5 shrink-0" />
                Goes to zoom.us
              </p>
              <p v-else-if="url" class="flex h-5 items-center gap-1.5 pt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle class="size-3.5 shrink-0" />
                That does not look like a web address yet
              </p>
              <p v-else class="h-5" />
            </div>

            <div>
              <p class="mb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">Category</p>
              <div class="grid grid-cols-2 gap-2">
                <span
                  v-for="cat in CHOICES"
                  :key="cat"
                  :class="[
                    'relative rounded-lg border px-3 py-2 text-center text-sm font-semibold',
                    category === cat ? 'st-filled border-primary bg-primary text-white' : 'border-gray-200 text-gray-600 dark:border-gray-600 dark:text-gray-300',
                    tapCategory && cat === 'Worship' ? 'st-tap' : '',
                  ]"
                >
                  {{ cat }}
                </span>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-200 px-4 pb-4 pt-3 dark:border-gray-700">
            <span
              :class="[
                'relative flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold text-white',
                title && openable ? 'st-filled bg-primary' : 'bg-primary/50',
                saving ? 'st-tap bg-primary-hover' : '',
              ]"
            >
              Add link
            </span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- What the page says once it is saved. -->
    <span
      v-if="saved"
      class="st-pop absolute inset-x-4 bottom-5 flex items-center gap-2 rounded-xl bg-gray-900 px-3 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
    >
      <CheckCircle class="size-5 shrink-0 text-emerald-400 dark:text-emerald-600" />
      Link added
    </span>
  </div>
</template>

<style scoped>
.links-sheet-enter-active {
  animation: links-sheet-fade 0.25s ease both;
}
.links-sheet-leave-active {
  animation: links-sheet-fade 0.2s ease reverse both;
}
.links-sheet-enter-active .links-sheet-panel {
  animation: links-sheet-grow 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.links-sheet-leave-active .links-sheet-panel {
  animation: links-sheet-grow 0.2s ease reverse both;
}
.links-sheet-panel {
  transform-origin: bottom center;
}

@keyframes links-sheet-fade {
  from {
    opacity: 0;
  }
}
@keyframes links-sheet-grow {
  from {
    transform: scale(0.94);
  }
}

@media (prefers-reduced-motion: reduce) {
  .links-sheet-enter-active,
  .links-sheet-leave-active,
  .links-sheet-enter-active .links-sheet-panel,
  .links-sheet-leave-active .links-sheet-panel {
    animation: none;
  }
}
</style>
