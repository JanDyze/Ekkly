<script setup>
import { computed, ref, watch } from 'vue'
import { X, Save, Heart, User, Search, ChevronDown, Trash2 } from '../../icons'
import { useMembers } from '../../composables/useMembers'
import { useMediaQuery } from '../../composables/useMediaQuery'
import { useFocusTrap } from '../../composables/useFocusTrap'
import { PRAYER_PRIORITIES, PRAYER_STATUSES, dayLabel } from '../../composables/usePrayerOverview'
import { getFullName } from '../../utils/memberUtils'
import { memberKey } from '../../utils/sgUtils'
import { todayKey } from '../../utils/taskUtils'

// A prayer concern, beside its list on a computer and a sheet on a phone, the
// way a task opens (DESIGN.md, Drawer). Whoever looks after the list adds and
// edits here; everyone else who may see concerns reads the whole of one here
// — the rows say only what to pray for — with nothing on it they cannot do.

const isMobile = useMediaQuery('(max-width: 1023px)')

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  isEdit: {
    type: Boolean,
    default: false
  },
  // Read, not edited: for someone who may see concerns but not change them.
  readOnly: {
    type: Boolean,
    default: false
  },
  /** Shown only while editing. */
  canDelete: {
    type: Boolean,
    default: false
  },
  concernData: {
    type: Object,
    default: () => ({
      title: '',
      memberId: '',
      memberName: '',
      description: '',
      status: 'active',
      priority: 'normal',
      date: '',
      notes: ''
    })
  }
})

const emit = defineEmits(['update:show', 'update:concernData', 'save', 'cancel', 'delete'])

const { members } = useMembers()

const patch = (changes) => emit('update:concernData', { ...props.concernData, ...changes })

const isFormValid = computed(() => Boolean(props.concernData.title?.trim()))

const statusLabel = computed(() => PRAYER_STATUSES.find((s) => s.key === props.concernData.status)?.label || 'Praying now')
const priorityLabel = computed(() => PRAYER_PRIORITIES.find((p) => p.key === props.concernData.priority)?.label || 'Normal')
const dateLabel = computed(() => dayLabel(props.concernData.date))

// Searchable dropdown state
const showMemberDropdown = ref(false)
const memberSearchQuery = ref('')

const availableMembers = computed(() => {
  const all = members.value || []
  const query = memberSearchQuery.value.trim().toLowerCase()
  if (!query) return all
  return all.filter((member) => {
    const fullName = getFullName(member).toLowerCase()
    const nickname = (member.nickname || '').toLowerCase()
    return fullName.includes(query) || nickname.includes(query)
  })
})

// Kept by the same key every other record uses for a person (memberKey), so
// the concern finds their face on the roll again.
const selectMember = (member) => {
  patch({
    memberId: memberKey(member),
    memberName: getFullName(member).trim() || member.nickname || 'Unknown'
  })
  showMemberDropdown.value = false
  memberSearchQuery.value = ''
}

const clearMember = () => {
  patch({ memberId: '', memberName: '' })
  showMemberDropdown.value = false
  memberSearchQuery.value = ''
}

// Close dropdown when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.member-dropdown-container')) {
    showMemberDropdown.value = false
  }
}

watch(() => props.show, (open) => {
  if (open) {
    document.addEventListener('click', handleClickOutside)
    // Today on this device, never toISOString(), which is tomorrow's date in
    // Manila until eight in the morning.
    if (!props.readOnly && !props.concernData.date) patch({ date: todayKey() })
  } else {
    document.removeEventListener('click', handleClickOutside)
    showMemberDropdown.value = false
    memberSearchQuery.value = ''
  }
})

const handleSave = () => {
  if (isFormValid.value) {
    emit('save')
  }
}

const handleCancel = () => {
  emit('cancel')
}

const dialogRef = ref(null)
useFocusTrap(dialogRef, () => props.show, handleCancel)

const heading = computed(() => (props.readOnly ? 'Prayer concern' : props.isEdit ? 'Edit prayer concern' : 'New prayer concern'))

const INPUT = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white'
const LABEL = 'mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'
</script>

<template>
  <Teleport to="body" :disabled="!isMobile">
    <Transition :name="isMobile ? 'modal-sheet' : 'drawer'">
    <div
      v-if="show"
      :class="[
        isMobile
          ? 'fixed inset-0 z-80 flex flex-col justify-end'
          : 'prayer-concern-drawer m-3 rounded-2xl border-2 border-primary/30 dark:border-primary-light/30 bg-white dark:bg-gray-800 w-[calc(50%-1.5rem)] h-[calc(100%-1.5rem)] flex flex-col shrink-0 overflow-hidden'
      ]"
    >
      <div
        v-if="isMobile"
        class="absolute inset-0 bg-black/50"
        @click="handleCancel"
      />
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prayer-concern-drawer-title"
        tabindex="-1"
        :class="[
          'flex flex-col min-h-0',
          isMobile
            ? 'relative z-10 w-full max-h-[92dvh] rounded-t-2xl bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700'
            : 'h-full w-full'
        ]"
      >
      <!-- Header -->
      <div class="shrink-0 bg-white dark:bg-gray-800 rounded-t-2xl border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-between">
        <h3 id="prayer-concern-drawer-title" class="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart class="h-5 w-5 text-primary dark:text-primary-light" />
          {{ heading }}
        </h3>
        <button
          @click="handleCancel"
          aria-label="Close"
          class="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Read: the whole of it, for whoever is praying rather than editing. -->
      <div v-if="readOnly" class="flex-1 overflow-y-auto p-4 sm:p-6">
        <p class="text-xl font-semibold leading-snug text-gray-900 dark:text-white">{{ concernData.title || 'Prayer concern' }}</p>
        <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {{ [concernData.memberName ? `For ${concernData.memberName}` : '', dateLabel].filter(Boolean).join(' · ') }}
        </p>
        <p class="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span class="rounded-full bg-primary/10 px-2.5 py-1 text-primary dark:bg-primary-light/15 dark:text-primary-light">{{ statusLabel }}</span>
          <span
            v-if="['urgent', 'high'].includes(concernData.priority)"
            class="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          >
            {{ priorityLabel }}
          </span>
        </p>
        <p v-if="concernData.description" class="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-gray-800 dark:text-gray-200">{{ concernData.description }}</p>
        <template v-if="concernData.notes">
          <h4 class="mt-6 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Notes</h4>
          <p class="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-700 dark:text-gray-300">{{ concernData.notes }}</p>
        </template>
      </div>

      <!-- Scrollable Form Content -->
      <div v-else class="flex-1 overflow-y-auto p-4 sm:p-6">
        <form @submit.prevent="handleSave" class="space-y-4">
          <div>
            <label for="prayer-title" :class="LABEL">
              What to pray for <span class="text-red-500">*</span>
            </label>
            <input
              id="prayer-title"
              :value="concernData.title"
              @input="patch({ title: $event.target.value })"
              type="text"
              required
              :class="INPUT"
              placeholder="Healing after surgery"
            />
          </div>

          <div class="member-dropdown-container relative">
            <label :class="LABEL">Who it is for</label>
            <div class="relative">
              <div
                v-if="concernData.memberName"
                class="flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
              >
                <div class="flex min-w-0 items-center gap-2">
                  <User class="h-4 w-4 shrink-0 text-gray-400" />
                  <span class="truncate text-sm text-gray-900 dark:text-white">{{ concernData.memberName }}</span>
                </div>
                <button
                  type="button"
                  @click="clearMember"
                  aria-label="Clear who it is for"
                  class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
              <div v-else class="relative">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  v-model="memberSearchQuery"
                  @focus="showMemberDropdown = true"
                  type="text"
                  placeholder="Search people..."
                  class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <ChevronDown class="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>

              <!-- Dropdown -->
              <Transition name="dropdown">
                <div
                  v-if="showMemberDropdown && availableMembers.length > 0"
                  class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg max-h-60 overflow-y-auto"
                >
                  <button
                    v-for="member in availableMembers"
                    :key="memberKey(member)"
                    type="button"
                    @click="selectMember(member)"
                    class="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <User class="h-4 w-4 shrink-0 text-gray-400" />
                    <span class="min-w-0">
                      <span class="block truncate text-sm text-gray-900 dark:text-white">
                        {{ getFullName(member).trim() || 'Unknown' }}
                      </span>
                      <span v-if="member.nickname" class="block truncate text-xs text-gray-500 dark:text-gray-400">
                        {{ member.nickname }}
                      </span>
                    </span>
                  </button>
                </div>
              </Transition>
            </div>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Leave it empty for a family, a missionary, or the church itself.
            </p>
          </div>

          <div>
            <label for="prayer-description" :class="LABEL">What they asked</label>
            <textarea
              id="prayer-description"
              :value="concernData.description"
              @input="patch({ description: $event.target.value })"
              rows="4"
              :class="[INPUT, 'resize-none']"
              placeholder="What the person shared, in their words where you can..."
            ></textarea>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label for="prayer-status" :class="LABEL">Status</label>
              <select
                id="prayer-status"
                :value="concernData.status"
                @change="patch({ status: $event.target.value })"
                :class="INPUT"
              >
                <option v-for="option in PRAYER_STATUSES" :key="option.key" :value="option.key">{{ option.label }}</option>
              </select>
            </div>
            <div>
              <label for="prayer-priority" :class="LABEL">Priority</label>
              <select
                id="prayer-priority"
                :value="concernData.priority"
                @change="patch({ priority: $event.target.value })"
                :class="INPUT"
              >
                <option v-for="option in PRAYER_PRIORITIES" :key="option.key" :value="option.key">{{ option.label }}</option>
              </select>
            </div>
          </div>

          <div>
            <label for="prayer-date" :class="LABEL">When it was shared</label>
            <input
              id="prayer-date"
              :value="concernData.date"
              @input="patch({ date: $event.target.value })"
              type="date"
              :class="INPUT"
            />
          </div>

          <div>
            <label for="prayer-notes" :class="LABEL">Notes</label>
            <textarea
              id="prayer-notes"
              :value="concernData.notes"
              @input="patch({ notes: $event.target.value })"
              rows="3"
              :class="[INPUT, 'resize-none']"
              placeholder="How they are doing, what has changed..."
            ></textarea>
          </div>
        </form>
      </div>

      <!-- Footer -->
      <div class="shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 flex items-center justify-end gap-3">
        <template v-if="readOnly">
          <button
            @click="handleCancel"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </template>
        <template v-else>
          <button
            v-if="isEdit && canDelete"
            @click="emit('delete')"
            class="mr-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 class="h-4 w-4" />
            Delete
          </button>
          <button
            @click="handleCancel"
            class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleSave"
            :disabled="!isFormValid"
            :class="[
              'px-4 py-2 rounded-lg transition-colors flex items-center gap-2',
              isFormValid
                ? 'bg-primary text-white hover:bg-primary-hover'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            ]"
          >
            <Save class="h-4 w-4" />
            {{ isEdit ? 'Update' : 'Save' }}
          </button>
        </template>
      </div>
      </div>
    </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 0.3s ease-out;
}

.drawer-enter-from {
  transform: translateX(100%);
}

.drawer-leave-to {
  transform: translateX(100%);
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
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
