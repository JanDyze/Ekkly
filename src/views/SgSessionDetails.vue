<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppScreen from '../components/appframe/AppScreen.vue'
import { Pencil, Printer, FileSpreadsheet } from '../icons'
import { useSmallGroups } from '../composables/useSmallGroups'
import { useSgSessions, useSessionPhotos } from '../composables/useSgSessions'
import { useMembers } from '../composables/useMembers'
import { useSgLanguage } from '../composables/useSgLanguage'
import { useToast } from '../composables/useToast'
import { exportSgSession } from '../utils/sgExport'
import SessionFormPrintable from '../components/smallGroups/SessionFormPrintable.vue'
import SessionEditorDrawer from '../components/smallGroups/SessionEditorDrawer.vue'
import { usePermissions } from '../composables/usePermissions'
import ConfirmationModal from '../components/common/ConfirmationModal.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { lang, setLang, t } = useSgLanguage()
const { canManage } = usePermissions()

const groupId = computed(() => route.params.id)
const sessionId = computed(() => route.params.sessionId)

const { groups } = useSmallGroups()
const { members } = useMembers()
const { sessions, loading, saveSession, removeSession } = useSgSessions(groupId)
const { photos, addPhoto, removePhoto } = useSessionPhotos(sessionId)

const group = computed(() => groups.value.find((g) => g.firestoreId === groupId.value) || null)
const session = computed(
  () => sessions.value.find((s) => s.firestoreId === sessionId.value) || null
)

const ready = computed(() => Boolean(session.value))

// A saved session remembers the language it was written in, so it opens the
// way it was filled out; after that the toggle is the user's to drive.
let languageApplied = false
watch(
  session,
  (value) => {
    if (!value || languageApplied) return
    languageApplied = true
    setLang(value.language)
  },
  { immediate: true }
)

/* ------------------------------------------------------------------ actions */
const showEditor = ref(false)
const saving = ref(false)

const handleSave = async (sessionData) => {
  saving.value = true
  try {
    await saveSession(sessionId.value, sessionData)
    showEditor.value = false
    toast.success('Session updated')
  } catch (error) {
    console.error('Error saving SG session:', error)
    toast.error('Failed to save the session. Please try again.')
  } finally {
    saving.value = false
  }
}

const handlePhotoUpload = async (base64) => {
  try {
    await addPhoto(base64, '')
  } catch (error) {
    console.error('Error uploading session photo:', error)
    toast.error('Failed to upload the photo.')
  }
}

const handlePhotoDelete = async (photo) => {
  try {
    await removePhoto(photo)
  } catch (error) {
    console.error('Error deleting session photo:', error)
    toast.error('Failed to delete the photo.')
  }
}

const handlePrint = () => window.print()

const handleExport = () => {
  if (!session.value) return
  exportSgSession(session.value, group.value, members.value, lang.value)
}

const showConfirmation = ref(false)
const confirmDelete = () => {
  showConfirmation.value = true
}
const handleConfirmation = async () => {
  try {
    await removeSession(sessionId.value)
    toast.success('Session deleted')
    router.replace({ name: 'SmallGroupDetails', params: { id: groupId.value } })
  } catch (error) {
    console.error('Error deleting SG session:', error)
    toast.error('Failed to delete the session.')
  }
}
</script>

<template>
  <div class="relative h-full">
    <!-- A screen of the Small groups app (AppScreen): back is to wherever in
         the app the session was opened from — its group, or Sessions. Marked
         print-main so the report runs past one screen on paper: the screen
         scrolls in a box of its own, and printing has to undo that. -->
    <AppScreen
      :title="session?.lesson?.title || t('sessionReport')"
      :subtitle="group?.name || ''"
      :back="{ name: 'SmallGroupDetails', params: { id: groupId } }"
      :trail="[{ label: 'Groups', to: { name: 'SmallGroupsAll' } }, { label: group?.name || '', to: { name: 'SmallGroupDetails', params: { id: groupId } } }]"
      root="/small-groups"
      class="print-main"
    >
      <template #action>
      <button
        v-if="canManage('smallgroups')"
        @click="showEditor = true"
        :disabled="!ready"
        class="shrink-0 p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
        :title="t('edit')"
        :aria-label="t('edit')"
      >
        <Pencil class="h-4.5 w-4.5" />
      </button>
      <button
        @click="handleExport"
        :disabled="!ready"
        class="shrink-0 p-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
        :title="t('export')"
        :aria-label="t('export')"
      >
        <FileSpreadsheet class="h-4.5 w-4.5" />
      </button>
      <button
        @click="handlePrint"
        :disabled="!ready"
        class="shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-40"
      >
        <Printer class="h-4 w-4" />
        <span class="hidden sm:inline">{{ t('print') }}</span>
      </button>
      </template>

      <!-- The form itself -->
      <div class="min-w-0 print-area">
        <div
          v-if="loading && !session"
          class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-3 no-print"
        >
          <div class="h-6 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div class="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div class="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>

        <p
          v-else-if="!session"
          class="p-8 text-center text-gray-500 dark:text-gray-400 no-print"
        >
          Session not found.
        </p>

        <div
          v-else
          class="mx-auto w-full max-w-3xl mb-6 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden sg-paper"
        >
          <SessionFormPrintable
            :group="group"
            :session="session"
            :members="members"
            :photos="photos"
          />
        </div>
      </div>
    </AppScreen>

      <SessionEditorDrawer
        v-if="group && session"
        v-model:show="showEditor"
        :session="session"
        :group="group"
        :members="members"
        :photos="photos"
        :saving="saving"
        @save="handleSave"
        @delete="confirmDelete"
        @upload-photo="handlePhotoUpload"
        @delete-photo="handlePhotoDelete"
      />

    <ConfirmationModal
      v-model:show="showConfirmation"
      title="Delete Session"
      message="Delete this session? Its photos are deleted with it."
      confirm-text="Delete"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @confirm="handleConfirmation"
    />
  </div>
</template>

<style scoped>
@media print {
  /* On paper the sheet is the page — drop the card chrome around it. */
  .sg-paper {
    max-width: none;
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
}
</style>
