<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { ImagePlus, Loader2, NotePencil, Trash2, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useToast } from '../../composables/useToast'
import { compressImageToBase64 } from '../../utils/imageUtils'
import { uploadImage } from '../../api/blobService'
import { spokenDate } from '../../utils/video/scenes'

// Changing what one card of the video says, or writing a new one.
//
// A card made from the calendar keeps its link to it: the words typed here sit
// over the calendar's until "Use the calendar's words" takes them off again,
// so fixing a typo in the event itself still reaches a card nobody edited.
// A card the church wrote is its own, and can be deleted.

const props = defineProps({
  show: { type: Boolean, default: false },
  scene: { type: Object, default: null },
  isNew: { type: Boolean, default: false },
  // How this month shows the scene's list — 'together', 'each', or '' for
  // the church's usual — when the scene comes from one that can be split.
  split: { type: String, default: '' },
  usualSplit: { type: String, default: 'auto' },
})

const emit = defineEmits(['save', 'remove', 'revert', 'close', 'split'])

const toast = useToast()
const dialogRef = ref(null)
const fileInput = ref(null)
const backgroundInput = ref(null)
const uploading = ref(false)

const form = reactive({ eyebrow: '', title: '', date: '', when: '', where: '', body: '', footer: '', image: '', background: '', seconds: 0 })

const custom = computed(() => props.scene?.kind === 'custom')

const GROUP_LABELS = { birthdays: 'birthdays', sundays: 'the Sundays', groups: 'small groups' }
const groupLabel = computed(() => GROUP_LABELS[props.scene?.group] || 'these')
const monthWord = 'this month'
const USUAL = { auto: 'Auto', together: 'Together', each: 'One each' }
const splitModes = computed(() => [
  { key: '', label: `Usual (${USUAL[props.usualSplit] || 'Auto'})` },
  { key: 'together', label: 'One card' },
  { key: 'each', label: 'One each' },
])
const layout = computed(() => props.scene?.layout || 'feature')
const isOutro = computed(() => props.scene?.kind === 'outro')

watch(
  () => [props.show, props.scene],
  ([open, scene]) => {
    if (!open || !scene) return
    Object.assign(form, {
      eyebrow: scene.eyebrow || '',
      title: scene.title || '',
      date: scene.date || '',
      when: scene.when || '',
      where: scene.where || '',
      body: scene.body || '',
      footer: scene.footer || '',
      image: scene.image || '',
      background: scene.background || '',
      seconds: Number(scene.secondsChosen) || 0,
    })
  },
  { immediate: true }
)

const close = () => emit('close')
useFocusTrap(dialogRef, () => props.show, close)

const valid = computed(() => form.title.trim().length > 0)

const pickPhoto = () => fileInput.value?.click()

// Which picture sits behind the card: the video's photos in turn (''), one of
// its own (a URL), or none at all ('none').
const backgroundMode = computed(() => (!form.background ? 'video' : form.background === 'none' ? 'none' : 'own'))

const onPhoto = async (event, field = 'image') => {
  const picked = event.target.files?.[0]
  event.target.value = ''
  if (!picked) return
  uploading.value = true
  try {
    const dataUrl = await compressImageToBase64(picked, { maxDim: 1920, maxSize: 900_000 })
    form[field] = await uploadImage(dataUrl, 'videos')
  } catch (error) {
    console.error('Could not upload the photo:', error)
    toast.error('Could not add that photo. Please try another.')
  } finally {
    uploading.value = false
  }
}

const save = () => {
  if (!valid.value || uploading.value) return
  const fields = {
    eyebrow: form.eyebrow.trim(),
    title: form.title.trim(),
    body: form.body.trim(),
    background: form.background,
    seconds: Number(form.seconds) || 0,
  }
  if (layout.value === 'feature' || layout.value === 'person') {
    Object.assign(fields, { when: form.when.trim(), where: form.where.trim() })
    if (layout.value === 'feature') fields.image = form.image
    // A date with nothing typed for when: the date says it.
    if (custom.value) {
      fields.date = form.date
      if (!fields.when && form.date) fields.when = spokenDate(form.date)
    }
  }
  if (isOutro.value) fields.footer = form.footer.trim()
  emit('save', fields)
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div
        v-if="show && scene"
        class="fixed inset-0 z-100 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
        @click.self="close"
      >
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scene-sheet-title"
          tabindex="-1"
          class="sheet-panel flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-gray-200 bg-white sm:max-w-lg sm:rounded-2xl dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-3.5 dark:border-gray-700">
            <div class="flex min-w-0 items-center gap-2.5">
              <NotePencil class="h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
              <h2 id="scene-sheet-title" class="truncate text-lg font-semibold text-gray-900 dark:text-white">
                {{ isNew ? 'New announcement' : 'Edit card' }}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <form class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" @submit.prevent="save">
            <div>
              <label for="scene-title" :class="labelClass">Headline <span class="text-red-500">*</span></label>
              <input
                id="scene-title"
                v-model="form.title"
                :class="inputClass"
                :placeholder="custom ? 'Building fund: halfway there' : ''"
                maxlength="120"
              />
            </div>
            <div>
              <label for="scene-eyebrow" :class="labelClass">Small heading above it</label>
              <input id="scene-eyebrow" v-model="form.eyebrow" :class="inputClass" placeholder="Announcement" maxlength="40" />
            </div>

            <!-- One card per person, or all on one: this month only. -->
            <div v-if="scene.group && !isNew">
              <span :class="labelClass">Show {{ groupLabel }}</span>
              <div class="flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
                <button
                  v-for="mode in splitModes"
                  :key="mode.key"
                  type="button"
                  :class="[
                    'h-9 flex-1 truncate rounded-md px-2 text-xs font-medium sm:text-sm',
                    (split || '') === mode.key
                      ? 'bg-white text-primary dark:bg-gray-800 dark:text-primary-light ring-1 ring-gray-200 dark:ring-gray-700'
                      : 'text-gray-500 dark:text-gray-400',
                  ]"
                  @click="emit('split', mode.key)"
                >
                  {{ mode.label }}
                </button>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">For {{ monthWord }} only. Changes the cards straight away.</p>
            </div>

            <template v-if="layout === 'feature' || layout === 'person'">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div v-if="custom">
                  <label for="scene-date" :class="labelClass">Date, if it has one</label>
                  <input id="scene-date" v-model="form.date" type="date" :class="inputClass" />
                </div>
                <div :class="custom ? '' : 'sm:col-span-2'">
                  <label for="scene-when" :class="labelClass">When</label>
                  <input id="scene-when" v-model="form.when" :class="inputClass" placeholder="Saturday, 18 October · 9:00 AM" maxlength="80" />
                </div>
              </div>
              <div>
                <label for="scene-where" :class="labelClass">Where</label>
                <input id="scene-where" v-model="form.where" :class="inputClass" placeholder="Fellowship hall" maxlength="80" />
              </div>
            </template>

            <div v-if="layout !== 'list'">
              <label for="scene-body" :class="labelClass">{{ layout === 'title' ? 'Line under the headline' : 'A little more about it' }}</label>
              <textarea
                id="scene-body"
                v-model="form.body"
                rows="3"
                :class="inputClass"
                placeholder="Bring a dish to share. Everyone is welcome."
                maxlength="240"
              />
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Short reads best. A sentence or two.</p>
            </div>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">
              The rows on this card come from the church's records and update on their own. To say something
              different, leave this card out and add an announcement of your own.
            </p>

            <div v-if="isOutro">
              <label for="scene-footer" :class="labelClass">Link at the bottom</label>
              <input id="scene-footer" v-model="form.footer" :class="inputClass" placeholder="facebook.com/ourchurch" maxlength="60" />
            </div>

            <div v-if="layout === 'feature'">
              <span :class="labelClass">Photo on the card</span>
              <div v-if="form.image" class="flex items-center gap-3">
                <img :src="form.image" alt="" class="h-16 w-24 rounded-lg object-cover" />
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  @click="form.image = ''"
                >
                  Remove photo
                </button>
              </div>
              <button
                v-else
                type="button"
                class="flex h-10 items-center gap-2 rounded-lg bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-60 dark:bg-primary-light/15 dark:text-primary-light"
                :disabled="uploading"
                @click="pickPhoto"
              >
                <Loader2 v-if="uploading" class="h-4 w-4 animate-spin" />
                <ImagePlus v-else class="h-4 w-4" />
                {{ uploading ? 'Adding photo…' : 'Add a photo' }}
              </button>
              <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onPhoto" />
            </div>

            <div>
              <span :class="labelClass">Behind this card</span>
              <div class="flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700">
                <button
                  v-for="mode in [
                    { key: 'video', label: 'The video’s photos' },
                    { key: 'own', label: 'Its own photo' },
                    { key: 'none', label: 'No photo' },
                  ]"
                  :key="mode.key"
                  type="button"
                  :class="[
                    'h-9 flex-1 truncate rounded-md px-2 text-xs font-medium sm:text-sm',
                    backgroundMode === mode.key
                      ? 'bg-white text-primary dark:bg-gray-800 dark:text-primary-light ring-1 ring-gray-200 dark:ring-gray-700'
                      : 'text-gray-500 dark:text-gray-400',
                  ]"
                  @click="
                    mode.key === 'video'
                      ? (form.background = '')
                      : mode.key === 'none'
                        ? (form.background = 'none')
                        : backgroundMode !== 'own' && backgroundInput?.click()
                  "
                >
                  {{ mode.label }}
                </button>
              </div>
              <div v-if="backgroundMode === 'own'" class="mt-2 flex items-center gap-3">
                <img :src="form.background" alt="" class="h-14 w-24 rounded-lg object-cover" />
                <button
                  type="button"
                  class="rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/10 dark:text-primary-light"
                  :disabled="uploading"
                  @click="backgroundInput?.click()"
                >
                  Change
                </button>
              </div>
              <p v-else-if="uploading" class="mt-1 text-xs text-gray-500 dark:text-gray-400">Adding photo…</p>
              <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ backgroundMode === 'none' ? 'Just the look’s colour behind this card.' : 'The next of the photos chosen in Look and sound, if there are any.' }}
              </p>
              <input ref="backgroundInput" type="file" accept="image/*" class="hidden" @change="onPhoto($event, 'background')" />
            </div>

            <div>
              <label for="scene-seconds" :class="labelClass">
                How long it shows ·
                <span class="font-normal text-gray-500 dark:text-gray-400">
                  {{ form.seconds ? `${form.seconds} seconds` : 'Worked out from what it says' }}
                </span>
              </label>
              <input
                id="scene-seconds"
                v-model.number="form.seconds"
                type="range"
                min="0"
                max="15"
                step="1"
                class="scene-range h-10 w-full"
              />
            </div>
          </form>

          <div class="flex shrink-0 items-center gap-2 border-t border-gray-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-gray-700">
            <button
              v-if="custom && !isNew"
              type="button"
              class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              @click="emit('remove')"
            >
              <Trash2 class="h-4 w-4" />
              Delete
            </button>
            <button
              v-else-if="!custom && scene.edited"
              type="button"
              class="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              @click="emit('revert')"
            >
              Use the calendar's words
            </button>
            <div class="flex-1" />
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!valid || uploading"
              :class="[
                'rounded-lg px-4 py-2',
                valid && !uploading
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
              ]"
              @click="save"
            >
              {{ isNew ? 'Add' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scene-range {
  accent-color: var(--color-primary);
}
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet-panel,
.sheet-leave-active .sheet-panel {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-leave-active .sheet-panel {
  transition-duration: 0.2s;
  transition-timing-function: ease-in;
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet-panel,
.sheet-leave-to .sheet-panel {
  transform: translateY(100%);
}
@media (min-width: 640px) {
  .sheet-enter-from .sheet-panel,
  .sheet-leave-to .sheet-panel {
    transform: translateY(0.5rem) scale(0.96);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sheet-enter-active .sheet-panel,
  .sheet-leave-active .sheet-panel {
    transition: none;
  }
}
</style>
