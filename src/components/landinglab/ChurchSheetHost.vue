<script setup>
import { ref } from 'vue'
import ChurchEditSheet from '../settings/ChurchEditSheet.vue'
import { useAppSettings } from '../../composables/useAppSettings'
import { usePermissions } from '../../composables/usePermissions'
import { useToast } from '../../composables/useToast'

// The Church details sheet, for the public page's two screens.
//
// The church's name, branch and how to find it belong to its record, not to
// the page, so both the builder and the preview change them through the same
// sheet Settings opens rather than through a copy of its fields. This holds
// the sheet and its save, so each screen only has to say which step to open.
//
// The one part of the public page that really saves: it is the church's
// record, shown on every screen of the app.

const toast = useToast()
const { isAdmin } = usePermissions()
const { church, saveChurchIdentity } = useAppSettings()

const sheet = ref(null)
const show = ref(false)
const step = ref(0)
const saving = ref(false)

const open = (at = 0) => {
  if (!isAdmin.value) return
  step.value = at
  // Seeded before it is shown, and told its step directly: the prop set above
  // has not reached the sheet yet. See ChurchSettings.vue.
  sheet.value?.reset(at)
  show.value = true
}

const save = async (changes) => {
  saving.value = true
  try {
    await saveChurchIdentity(changes)
    show.value = false
    toast.success('Church details saved')
  } catch (error) {
    console.error('Error saving church details:', error)
    toast.error('Could not save that. Please try again.')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>

<template>
  <ChurchEditSheet
    ref="sheet"
    :show="show"
    :church="church"
    :start-step="step"
    :busy="saving"
    @close="show = false"
    @save="save"
  />
</template>
