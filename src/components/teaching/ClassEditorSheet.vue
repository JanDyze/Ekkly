<script setup>
/**
 * Adding or changing a Sunday school class: its name, who it is for, where it
 * meets and who usually teaches it.
 *
 * A class that stops meeting is put away rather than deleted, so the lessons
 * it was taught keep saying which class they were for (teachingClassesService).
 */
import { computed, ref, watch } from 'vue'
import { Plus, X } from '../../icons'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { findRosterMember } from '../../utils/lineupUtils'
import { getDisplayName } from '../../utils/memberUtils'
import { BAND_OPTIONS } from '../../utils/teachingUtils'
import MemberAvatar from '../members/MemberAvatar.vue'
import PeoplePickerSheet from '../schedules/PeoplePickerSheet.vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  // The class being changed, or null for a new one.
  cls: { type: Object, default: null },
  members: { type: Array, default: () => [] },
  teachingRole: { type: Object, default: null },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'save', 'archive'])

const isMobile = useMediaQuery('(max-width: 1023px)')
const dialogRef = ref(null)
const form = ref(null)
const pickerOpen = ref(false)
const editing = computed(() => Boolean(props.cls?.id))

watch(
  () => [props.show, props.cls?.id],
  ([show]) => {
    if (!show) return
    const cls = props.cls || {}
    form.value = {
      name: cls.name || '',
      band: cls.band || 'kids',
      ages: cls.ages || '',
      room: cls.room || '',
      teacherIds: [...(cls.teacherIds || [])],
      order: cls.order || 0,
    }
  },
  { immediate: true }
)

const close = () => emit('update:show', false)
useFocusTrap(dialogRef, computed(() => props.show && !pickerOpen.value), close)

const pickerRole = computed(() => ({
  id: props.teachingRole?.id || 'sunday-school',
  name: 'Who usually teaches it',
  ministries: props.teachingRole?.ministries || [],
}))
const memberOf = (id) => findRosterMember(props.members, id)
const toggleTeacher = (id) => {
  const ids = form.value.teacherIds
  form.value.teacherIds = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

const valid = computed(() => Boolean(form.value?.name.trim()))
const handleSave = () => {
  if (!valid.value || props.saving) return
  emit('save', { ...form.value })
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const labelClass = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <Teleport to="body">
    <Transition :name="isMobile ? 'modal-sheet' : 'fade'">
      <div v-if="show && form" class="fixed inset-0 z-80 flex items-end justify-center sm:items-center sm:p-4">
        <div class="absolute inset-0 bg-black/50" @click="close" />
        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="class-editor-title"
          tabindex="-1"
          class="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white ring-1 ring-gray-200 sm:max-w-md sm:rounded-2xl dark:bg-gray-800 dark:ring-gray-700"
        >
          <div class="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-700">
            <h2 id="class-editor-title" class="truncate text-lg font-semibold text-gray-900 dark:text-white">
              {{ editing ? 'Edit class' : 'New class' }}
            </h2>
            <button
              type="button"
              aria-label="Close"
              class="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <form class="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" @submit.prevent="handleSave">
            <div>
              <label for="class-name" :class="labelClass">What is the class called <span class="text-red-500">*</span></label>
              <input id="class-name" v-model="form.name" :class="inputClass" placeholder="Little Lambs" maxlength="60" />
            </div>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="class-band" :class="labelClass">Who it is for</label>
                <select id="class-band" v-model="form.band" :class="inputClass">
                  <option v-for="band in BAND_OPTIONS" :key="band.key" :value="band.key">{{ band.label }}</option>
                </select>
              </div>
              <div>
                <label for="class-ages" :class="labelClass">Ages</label>
                <input id="class-ages" v-model="form.ages" :class="inputClass" placeholder="4 to 6" maxlength="20" />
              </div>
            </div>

            <div>
              <label for="class-room" :class="labelClass">Where it meets</label>
              <input id="class-room" v-model="form.room" :class="inputClass" placeholder="The room behind the stage" maxlength="60" />
            </div>

            <div>
              <div class="mb-1 flex items-center justify-between gap-2">
                <span :class="labelClass">Who usually teaches it</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary dark:bg-primary-light/15 dark:text-primary-light"
                  @click="pickerOpen = true"
                >
                  <Plus class="h-3.5 w-3.5" />
                  Choose
                </button>
              </div>
              <div v-if="form.teacherIds.length" class="flex flex-wrap gap-1.5">
                <span
                  v-for="id in form.teacherIds"
                  :key="id"
                  class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 py-1 pl-1 pr-2 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                >
                  <MemberAvatar v-if="memberOf(id)" :member="memberOf(id)" alt="" size="h-5 w-5" />
                  {{ memberOf(id) ? getDisplayName(memberOf(id)) : 'Former member' }}
                  <button
                    type="button"
                    class="text-gray-500 hover:text-red-600 dark:text-gray-400"
                    :aria-label="`Remove ${memberOf(id) ? getDisplayName(memberOf(id)) : 'this teacher'}`"
                    @click="toggleTeacher(id)"
                  >
                    <X class="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <p v-else class="text-xs text-gray-500 dark:text-gray-400">Nobody yet</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">A new lesson for the class is offered to them first.</p>
            </div>
          </form>

          <div class="flex shrink-0 items-center gap-2 border-t border-gray-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700">
            <button
              v-if="editing"
              type="button"
              class="rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              @click="emit('archive')"
            >
              Stop this class
            </button>
            <span class="flex-1" />
            <button
              type="button"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              @click="close"
            >
              Cancel
            </button>
            <button
              type="button"
              :disabled="!valid || saving"
              :class="[
                'rounded-lg px-4 py-2',
                !valid || saving
                  ? 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400'
                  : 'bg-primary text-white hover:bg-primary-hover',
              ]"
              @click="handleSave"
            >
              {{ editing ? 'Update' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <PeoplePickerSheet
      v-model:show="pickerOpen"
      :role="pickerRole"
      :members="members"
      :selected-ids="form?.teacherIds || []"
      @toggle="toggleTeacher"
    />
  </Teleport>
</template>
