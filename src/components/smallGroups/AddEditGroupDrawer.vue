<script setup>
import { computed, ref, watch } from 'vue'
import { Trash2, UsersRound, X } from '../../icons'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { useSgLanguage } from '../../composables/useSgLanguage'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import SelectMenu from '../common/SelectMenu.vue'
import GroupCoverPicker from './GroupCoverPicker.vue'
import GroupMemberPicker from './GroupMemberPicker.vue'
import LanguageToggle from './LanguageToggle.vue'

// Adding or editing a group, built the way every other drawer is (DESIGN.md,
// "Drawer: adding or editing"; TaskDrawer is the one to copy): a bottom sheet
// on a phone, and on a desktop a card beside the list that grows in from the
// right. The page that shows it supplies the flex row it sits in.

const FIELD =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'

const props = defineProps({
  show: { type: Boolean, default: false },
  group: { type: Object, default: null },
  members: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['update:show', 'save', 'delete'])

const isMobile = useMediaQuery('(max-width: 1023px)')
const { t, weekdayName } = useSgLanguage()
const dialogRef = ref(null)

const blankForm = () => ({
  name: '',
  description: '',
  coverPhoto: '',
  leaderId: null,
  coLeaderIds: [],
  memberIds: [],
  meetingDay: null,
  meetingTime: '',
  location: '',
  defaultLanguage: 'en',
  active: true,
})

const form = ref(blankForm())

// Re-seed whenever the drawer opens, so editing one group then creating another
// never carries the previous values over.
watch(
  () => [props.show, props.group],
  ([show]) => {
    if (!show) return
    form.value = props.group ? { ...blankForm(), ...props.group } : blankForm()
  },
  { immediate: true }
)

const isEdit = computed(() => Boolean(props.group))
const isValid = computed(() => form.value.name.trim().length > 0)

// The leader is picked from the roster, so a group can never point at someone
// who is not in it.
const rosterOptions = computed(() =>
  props.members
    .filter((member) => form.value.memberIds.some((id) => String(id) === memberKey(member)))
    .sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
)

watch(
  () => form.value.memberIds,
  (ids) => {
    if (form.value.leaderId && !ids.some((id) => String(id) === String(form.value.leaderId))) {
      form.value.leaderId = null
    }
  }
)

/* ------------------------------------------------------------ the dropdowns */

// Ekkly's own dropdown (SelectMenu) rather than the browser's. It matches by
// strict equality and takes no null, so "nothing chosen" is '' here, and the
// form keeps its null: the two are translated at the edge.
const dayOptions = computed(() => [
  { value: '', label: '—' },
  ...Array.from({ length: 7 }, (_, day) => ({ value: day, label: weekdayName(day) })),
])
const meetingDayValue = computed(() => form.value.meetingDay ?? '')
const setMeetingDay = (value) => {
  form.value.meetingDay = value === '' ? null : value
}

const leaderOptions = computed(() => [
  { value: '', label: '—' },
  ...rosterOptions.value.map((member) => ({ value: memberKey(member), label: getFullName(member) })),
])
// A leader saved as a number still matches the roster's string keys.
const leaderValue = computed(() => (form.value.leaderId == null ? '' : String(form.value.leaderId)))
const setLeader = (value) => {
  form.value.leaderId = value === '' ? null : value
}

/* ---------------------------------------------------------------- closing */

const close = () => emit('update:show', false)

const handleSave = () => {
  if (!isValid.value || props.saving) return
  emit('save', {
    ...form.value,
    name: form.value.name.trim(),
    leaderId: form.value.leaderId || null,
    meetingDay: form.value.meetingDay === null || form.value.meetingDay === ''
      ? null
      : Number(form.value.meetingDay),
  })
}

useFocusTrap(dialogRef, () => props.show, close)
</script>

<template>
  <Teleport to="body" :disabled="!isMobile">
    <Transition :name="isMobile ? 'modal-sheet' : 'drawer'">
      <div
        v-if="show"
        :class="[
          isMobile
            ? 'fixed inset-0 z-80 flex flex-col justify-end'
            : 'flex h-full w-116 shrink-0 justify-end overflow-hidden pl-4 xl:w-132',
        ]"
      >
        <div v-if="isMobile" class="absolute inset-0 bg-black/50" @click="close" />

        <div
          ref="dialogRef"
          role="dialog"
          aria-modal="true"
          aria-labelledby="sg-group-drawer-title"
          tabindex="-1"
          :class="[
            'flex min-h-0 flex-col',
            isMobile
              ? 'relative z-10 max-h-[92dvh] w-full rounded-t-2xl border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              : 'h-full w-md shrink-0 overflow-hidden rounded-2xl border-2 border-primary/30 bg-white xl:w-lg dark:border-primary-light/30 dark:bg-gray-800',
          ]"
        >
          <!-- Header -->
          <div
            class="flex shrink-0 items-center justify-between gap-3 rounded-t-2xl border-b border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6"
          >
            <h3
              id="sg-group-drawer-title"
              class="flex min-w-0 items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
            >
              <UsersRound class="h-5 w-5 shrink-0 text-primary dark:text-primary-light" />
              <span class="truncate">{{ isEdit ? t('edit') : t('newGroup') }}</span>
            </h3>
            <div class="flex shrink-0 items-center gap-2">
              <LanguageToggle />
              <button
                type="button"
                @click="close"
                class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X class="h-5 w-5" />
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <!-- The Save button below is tied to this form by its id, so Enter in
                 a field saves, and an empty name (a disabled Save) does not. -->
            <form id="sg-group-form" @submit.prevent="handleSave" class="space-y-4">
              <GroupCoverPicker v-model="form.coverPhoto" />

              <div>
                <label for="sg-group-name" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('groupName') }} <span class="text-red-500">*</span>
                </label>
                <input id="sg-group-name" v-model="form.name" type="text" :class="FIELD" />
              </div>

              <div>
                <label for="sg-group-description" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('description') }}
                </label>
                <textarea id="sg-group-description" v-model="form.description" rows="2" :class="FIELD" />
              </div>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label for="sg-group-day" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('meetingDay') }}
                  </label>
                  <SelectMenu
                    id="sg-group-day"
                    :model-value="meetingDayValue"
                    :options="dayOptions"
                    :field-class="FIELD"
                    @update:model-value="setMeetingDay"
                  />
                </div>
                <div>
                  <label for="sg-group-time" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('meetingTime') }}
                  </label>
                  <input id="sg-group-time" v-model="form.meetingTime" type="time" :class="FIELD" />
                </div>
              </div>

              <div>
                <label for="sg-group-location" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('location') }}
                </label>
                <input id="sg-group-location" v-model="form.location" type="text" :class="FIELD" />
              </div>

              <div>
                <span class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('members') }}
                </span>
                <div class="h-72">
                  <GroupMemberPicker
                    v-model="form.memberIds"
                    :members="members"
                    :search-label="t('search')"
                    :empty-label="t('noMembers')"
                  />
                </div>
              </div>

              <div>
                <label for="sg-group-leader" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('leader') }}
                </label>
                <SelectMenu
                  id="sg-group-leader"
                  :model-value="leaderValue"
                  :options="leaderOptions"
                  :field-class="FIELD"
                  @update:model-value="setLeader"
                />
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Pick from the members selected above.
                </p>
              </div>

              <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  v-model="form.active"
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                {{ t('active') }}
              </label>
            </form>
          </div>

          <!-- Actions, pinned to the foot -->
          <div
            class="flex shrink-0 items-center justify-end gap-3 border-t border-gray-200 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700 sm:px-6"
          >
            <button
              v-if="isEdit"
              type="button"
              @click="$emit('delete')"
              class="mr-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 class="h-4 w-4" />
              {{ t('delete') }}
            </button>
            <button
              type="button"
              @click="close"
              class="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              {{ t('cancel') }}
            </button>
            <button
              type="submit"
              form="sg-group-form"
              :disabled="!isValid || saving"
              :class="[
                'rounded-lg px-4 py-2 transition-colors',
                isValid && !saving
                  ? 'bg-primary text-white hover:bg-primary-hover'
                  : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
              ]"
            >
              {{ t('save') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* On a desktop the panel opens beside the list by growing from nothing, its
   card pinned to the right edge and a fixed width, so the list gives up its
   room in the same movement as the card comes in and nothing inside the card
   reflows while it does (the same movement as TaskDrawer). */
.drawer-enter-active,
.drawer-leave-active {
  transition:
    width 0.28s cubic-bezier(0.2, 0.8, 0.2, 1),
    padding-left 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.drawer-enter-from,
.drawer-leave-to {
  width: 0;
  padding-left: 0;
}

@media (prefers-reduced-motion: reduce) {
  .drawer-enter-active,
  .drawer-leave-active {
    transition: none;
  }
}

.modal-sheet-enter-active,
.modal-sheet-leave-active {
  transition: opacity 0.25s ease;
}
.modal-sheet-enter-active > div:last-child,
.modal-sheet-leave-active > div:last-child {
  transition: transform 0.25s ease;
}
.modal-sheet-enter-from,
.modal-sheet-leave-to {
  opacity: 0;
}
.modal-sheet-enter-from > div:last-child,
.modal-sheet-leave-to > div:last-child {
  transform: translateY(100%);
}
</style>
