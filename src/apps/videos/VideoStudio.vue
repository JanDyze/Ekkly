<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { AlertTriangle, CalendarDots, FilmSlate, MusicNotes, Palette, Plus } from '../../icons'
import AppScreen from '../../components/appframe/AppScreen.vue'
import ConfirmationModal from '../../components/common/ConfirmationModal.vue'
import VideoPlayer from '../../components/videos/VideoPlayer.vue'
import VideoSceneRow from '../../components/videos/VideoSceneRow.vue'
import VideoSceneSheet from '../../components/videos/VideoSceneSheet.vue'
import VideoExportSheet from '../../components/videos/VideoExportSheet.vue'
import { formatLength, useVideoOverview } from '../../composables/useVideoOverview'
import { useVideoBuild } from '../../composables/useVideoBuild'
import { usePermissions } from '../../composables/usePermissions'
import { useToast } from '../../composables/useToast'
import { formatMonthLabel, isValidMonthKey, monthKeyOf } from '../../utils/lineupUtils'
import { blankCustomScene } from '../../utils/video/scenes'

// One month's video: watch it, shape it, and make the file.
//
// The running order under the player is the video itself. It starts as the
// calendar says and stays that way until somebody changes it; whatever they
// change is kept for this month alone, and anything added to the calendar
// later still arrives on its own.

const route = useRoute()
const toast = useToast()
const { canManage } = usePermissions()
const canEdit = computed(() => canManage('events'))

const monthKey = computed(() => (isValidMonthKey(route.params.month) ? route.params.month : monthKeyOf()))
const monthLabel = computed(() => formatMonthLabel(monthKey.value))

const { settings, monthOf, saveMonth, resetMonth, scenesFor, announcements, lengthOf, loading } = useVideoOverview()

const scenes = computed(() => scenesFor(monthKey.value))
const { video, music, volume, preparing, musicNote, trackLabel } = useVideoBuild(scenes, settings)

const count = computed(() => announcements(scenes.value).length)
const subtitle = computed(() =>
  loading.value
    ? 'Reading the calendar…'
    : `${count.value} ${count.value === 1 ? 'announcement' : 'announcements'} · ${formatLength(lengthOf(scenes.value))}`
)

const month = computed(() => monthOf(monthKey.value))
const changed = computed(() => {
  const m = month.value
  return Boolean(
    m.hidden.length || m.order.length || m.custom.length || Object.keys(m.edits).length || Object.keys(m.split).length
  )
})

/* ------------------------------------------------------------ the player */

const player = ref(null)
const time = ref(0)
const currentId = computed(() => video.value?.sceneAt(time.value)?.id || null)

const jumpTo = (scene) => {
  if (!video.value || scene.hidden) return
  player.value?.seek(video.value.startOf(scene.id))
}

/* --------------------------------------------------------- changing it */

const save = async (partial, failure) => {
  try {
    await saveMonth(monthKey.value, partial)
    return true
  } catch (error) {
    console.error('Could not save the video:', error)
    toast.error(failure)
    return false
  }
}

const toggle = (scene) => {
  const hidden = new Set(month.value.hidden)
  if (hidden.has(scene.id)) hidden.delete(scene.id)
  else hidden.add(scene.id)
  save({ hidden: [...hidden] }, 'Could not change that card. Please try again.')
}

const move = (index, step) => {
  const ids = scenes.value.map((s) => s.id)
  const target = index + step
  if (target < 0 || target >= ids.length) return
  ;[ids[index], ids[target]] = [ids[target], ids[index]]
  save({ order: ids }, 'Could not move that card. Please try again.')
}

const editing = ref(null)
const isNew = ref(false)

const open = (scene) => {
  jumpTo(scene)
  if (!canEdit.value) return
  isNew.value = false
  editing.value = scene
}

const addAnnouncement = () => {
  isNew.value = true
  editing.value = { ...blankCustomScene(), seconds: 0, secondsChosen: 0 }
}

const FIELDS = ['eyebrow', 'title', 'when', 'where', 'body', 'footer', 'image', 'background', 'date']

const onSave = async (fields) => {
  const scene = editing.value
  if (!scene) return
  let ok
  if (scene.kind === 'custom') {
    const entry = { ...blankCustomScene(), ...pick(scene), ...fields, id: scene.id }
    if (!entry.seconds) delete entry.seconds
    const custom = isNew.value
      ? [...month.value.custom, entry]
      : month.value.custom.map((c) => (c.id === scene.id ? entry : c))
    ok = await save({ custom }, 'Could not save that announcement. Please try again.')
  } else {
    // Only what was actually changed is kept, so the rest of the card goes
    // on following the calendar.
    const edit = { ...(month.value.edits[scene.id] || {}) }
    FIELDS.forEach((field) => {
      if (fields[field] !== undefined && fields[field] !== (scene[field] || '')) edit[field] = fields[field]
    })
    if (fields.seconds !== scene.secondsChosen) {
      if (fields.seconds) edit.seconds = fields.seconds
      else delete edit.seconds
    }
    ok = await save({ edits: { ...month.value.edits, [scene.id]: edit } }, 'Could not save that card. Please try again.')
  }
  if (ok) {
    if (isNew.value) toast.success('Announcement added')
    editing.value = null
  }
}

/** A custom scene's stored fields, without what the overview added for display. */
const pick = (scene) => {
  const { edited, hidden, secondsChosen, seconds, ...rest } = scene
  return secondsChosen ? { ...rest, seconds: secondsChosen } : rest
}

const onRevert = async () => {
  const scene = editing.value
  const edits = { ...month.value.edits }
  delete edits[scene.id]
  if (await save({ edits }, 'Could not undo those changes. Please try again.')) editing.value = null
}

const confirmingRemove = ref(false)
const removeMessage = computed(() => `Delete "${editing.value?.title || 'this announcement'}"? This cannot be undone.`)
const onRemove = () => (confirmingRemove.value = true)
const remove = async () => {
  const scene = editing.value
  confirmingRemove.value = false
  const custom = month.value.custom.filter((c) => c.id !== scene.id)
  const hidden = month.value.hidden.filter((id) => id !== scene.id)
  if (await save({ custom, hidden }, 'Could not delete that announcement. Please try again.')) {
    editing.value = null
    toast.success('Announcement deleted')
  }
}

// One card each or all together, for this month: the card being edited is
// replaced by its split (or merged) self, so the sheet closes on it.
const onSplit = async (mode) => {
  const group = editing.value?.group
  if (!group) return
  const split = { ...month.value.split }
  if (mode) split[group] = mode
  else delete split[group]
  if (await save({ split }, 'Could not change those cards. Please try again.')) editing.value = null
}

const confirmingReset = ref(false)
const startOver = async () => {
  confirmingReset.value = false
  try {
    await resetMonth(monthKey.value)
    toast.success(`${monthLabel.value} is back to what the calendar says`)
  } catch (error) {
    console.error('Could not reset the video:', error)
    toast.error('Could not start the month over. Please try again.')
  }
}

const exporting = ref(false)
</script>

<template>
  <AppScreen :title="monthLabel" :subtitle="subtitle" :back="{ name: 'VideosHome' }" root="/videos">
    <template v-if="canEdit" #action>
      <RouterLink
        :to="{ name: 'VideosLook' }"
        class="flex size-10 shrink-0 items-center justify-center rounded-xl text-gray-500 transition-colors hover:bg-gray-200/70 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        aria-label="Look and sound"
      >
        <Palette class="size-5" />
      </RouterLink>
    </template>

    <div class="flex flex-col gap-3">
      <VideoPlayer
        ref="player"
        :video="video"
        :music="music"
        :volume="volume"
        :preparing="preparing"
        :aspect="settings.style.aspect"
        max-height="62dvh"
        @time="time = $event"
      />

      <div class="flex items-center gap-2 px-0.5 text-xs text-gray-500 dark:text-gray-400">
        <MusicNotes class="h-4 w-4 shrink-0" />
        <span class="min-w-0 truncate">
          {{ settings.music.track === 'none' ? 'No music' : trackLabel }}
        </span>
        <RouterLink
          v-if="canEdit"
          :to="{ name: 'VideosLook', hash: '#music' }"
          class="ml-auto shrink-0 font-medium text-primary hover:underline dark:text-primary-light"
        >
          Change
        </RouterLink>
      </div>
      <p
        v-if="musicNote"
        class="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/15 dark:text-amber-200"
      >
        <AlertTriangle class="mt-px h-4 w-4 shrink-0" />
        {{ musicNote }}
      </p>

      <button
        type="button"
        class="flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-semibold text-white transition-transform duration-200 ease-out hover:bg-primary-hover pressed:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-600 dark:disabled:text-gray-400"
        :disabled="!video"
        @click="exporting = true"
      >
        <FilmSlate class="size-5" />
        Make the video
      </button>

      <!-- Nothing on the calendar: the video still opens and closes, and says why it is short. -->
      <div
        v-if="!loading && count === 0"
        class="flex flex-col items-center justify-center px-8 py-10 text-center text-gray-500 dark:text-gray-400"
      >
        <CalendarDots class="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
        <p class="mb-1 text-lg">Nothing to announce in {{ monthLabel }} yet</p>
        <p class="text-sm">
          {{ canEdit ? 'Add events to the calendar, or write an announcement of your own below.' : 'Announcements show here as events are added to the calendar.' }}
        </p>
      </div>

      <section class="mt-2">
        <h2 class="mb-2 flex items-baseline gap-2 px-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
          In this video
          <span class="text-xs tabular-nums text-gray-400 dark:text-gray-500">{{ scenes.filter((s) => !s.hidden).length }}</span>
        </h2>
        <div class="rounded-2xl border border-gray-200 bg-white p-1.5 dark:border-gray-700/80 dark:bg-gray-800">
          <ul v-if="!loading || scenes.length > 2" class="space-y-0.5">
            <VideoSceneRow
              v-for="(scene, index) in scenes"
              :key="scene.id"
              :scene="scene"
              :index="index"
              :current="scene.id === currentId"
              :can-edit="canEdit"
              :first="index === 0"
              :last="index === scenes.length - 1"
              @open="open(scene)"
              @toggle="toggle(scene)"
              @move="move(index, $event)"
            />
          </ul>
          <div v-else class="space-y-2 p-2">
            <div v-for="n in 4" :key="n" class="flex items-center gap-3">
              <div class="size-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-600" />
              <div class="flex-1 space-y-1.5">
                <div class="h-3.5 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
                <div class="h-3 w-1/3 animate-pulse rounded bg-gray-200 dark:bg-gray-600" />
              </div>
            </div>
          </div>
        </div>

        <button
          v-if="canEdit"
          type="button"
          class="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light"
          @click="addAnnouncement"
        >
          <Plus class="h-4 w-4" />
          Add an announcement
        </button>

        <button
          v-if="canEdit && changed"
          type="button"
          class="mx-auto mt-4 block rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          @click="confirmingReset = true"
        >
          Start {{ monthLabel }} over from the calendar
        </button>
      </section>
    </div>

    <VideoSceneSheet
      :show="Boolean(editing)"
      :scene="editing"
      :is-new="isNew"
      :split="editing?.group ? month.split[editing.group] || '' : ''"
      :usual-split="editing?.group ? settings.split[editing.group] : 'auto'"
      @split="onSplit"
      @save="onSave"
      @revert="onRevert"
      @remove="onRemove"
      @close="editing = null"
    />

    <VideoExportSheet
      :show="exporting"
      :video="video"
      :music="music"
      :volume="volume"
      :aspect="settings.style.aspect"
      :title="monthLabel"
      @close="exporting = false"
    />

    <ConfirmationModal
      :show="confirmingRemove"
      title="Delete announcement"
      :message="removeMessage"
      confirm-text="Delete"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @confirm="remove"
      @cancel="confirmingRemove = false"
      @update:show="confirmingRemove = $event"
    />
    <ConfirmationModal
      :show="confirmingReset"
      :title="`Start ${monthLabel} over`"
      :message="`Put back every card you left out, drop the wording you changed and delete the announcements you added for ${monthLabel}? This cannot be undone.`"
      confirm-text="Start over"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @confirm="startOver"
      @cancel="confirmingReset = false"
      @update:show="confirmingReset = $event"
    />
  </AppScreen>
</template>
