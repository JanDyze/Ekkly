<script setup>
import { computed, onMounted, ref } from 'vue'
import { Loader2, Plus, Trash2, UsersThree } from '../../icons'
import SectionCard from '../common/SectionCard.vue'
import ConfirmationModal from '../common/ConfirmationModal.vue'
import { callPlatform } from '../../api/platformService'
import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { agoFrom } from '../../composables/usePlatformConsole'

// Who can run the platform. A platform administrator can do everything in this
// console — approve and close churches, change prices, choose AI models, and
// appoint or remove other administrators — so add only people you would hand
// the whole platform to. The last one cannot be removed.

const toast = useToast()
const { user } = useAuth()

const admins = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    admins.value = await callPlatform('listAdmins')
  } catch (error) {
    toast.error(error.message || 'Could not load the administrators.')
  } finally {
    loading.value = false
  }
})

const email = ref('')
const adding = ref(false)
const confirmAdd = ref(false)

const add = async () => {
  adding.value = true
  try {
    admins.value = await callPlatform('addAdmin', { email: email.value })
    toast.success(`${email.value.trim()} can now run the platform`)
    email.value = ''
  } catch (error) {
    console.error('Error adding administrator:', error)
    toast.error(error.message || 'Could not add them. Please try again.')
  } finally {
    adding.value = false
  }
}

const pendingRemove = ref(null)
const removeMessage = computed(() => {
  const target = pendingRemove.value
  if (!target) return ' '
  return target.uid === user.value?.uid
    ? 'Remove yourself as a platform administrator? You lose this console as soon as it is done.'
    : `Remove ${target.email}? They can no longer run the platform.`
})

const confirmRemove = async () => {
  const target = pendingRemove.value
  if (!target) return
  try {
    admins.value = await callPlatform('removeAdmin', { uid: target.uid })
    toast.success(`${target.email} removed`)
    if (target.uid === user.value?.uid) window.location.assign('/')
  } catch (error) {
    toast.error(error.message || 'Could not remove them. Please try again.')
  } finally {
    pendingRemove.value = null
  }
}
</script>

<template>
  <SectionCard :icon="UsersThree" title="Platform admins" subtitle="Everyone here can do everything in this console">
    <div v-if="loading" class="space-y-1 p-2">
      <div v-for="i in 2" :key="i" class="h-14 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
    </div>
    <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
      <li v-for="admin in admins" :key="admin.uid" class="flex items-center gap-3 px-4 py-3">
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-1.5 text-sm font-medium text-gray-900 dark:text-white">
            <span class="truncate">{{ admin.displayName || admin.email }}</span>
            <span v-if="admin.uid === user?.uid" class="shrink-0 rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary dark:text-primary-light">You</span>
          </p>
          <p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
            {{ admin.email }} &middot; added {{ agoFrom(admin.addedAt) }}<template v-if="admin.addedByEmail"> by {{ admin.addedByEmail }}</template>
          </p>
        </div>
        <button
          v-if="admins.length > 1"
          type="button"
          @click="pendingRemove = admin"
          :aria-label="`Remove ${admin.email}`"
          class="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </li>
    </ul>

    <form class="space-y-2 border-t border-gray-100 p-4 dark:border-gray-700" @submit.prevent="email.includes('@') && (confirmAdd = true)">
      <label for="admin-email" class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Add an administrator</label>
      <div class="flex gap-2">
        <input
          id="admin-email"
          v-model="email"
          type="email"
          autocapitalize="off"
          placeholder="their Google account's email"
          class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        />
        <button
          type="submit"
          :disabled="!email.includes('@') || adding"
          :class="[
            'flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2 transition-colors',
            email.includes('@') ? 'bg-primary text-white hover:bg-primary-hover' : 'cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400',
          ]"
        >
          <Loader2 v-if="adding" class="h-4 w-4 animate-spin" />
          <Plus v-else class="h-4 w-4" />
          Add
        </button>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400">They must have signed in once, at the front door or any church.</p>
    </form>

    <ConfirmationModal
      :show="confirmAdd"
      title="Add platform administrator"
      :message="`Give ${email.trim()} the whole platform? They can approve and close churches, change prices and add or remove administrators, you included.`"
      confirm-text="Add"
      cancel-text="Cancel"
      confirm-button-class="bg-primary text-white hover:bg-primary-hover"
      @update:show="confirmAdd = $event"
      @confirm="add"
      @cancel="confirmAdd = false"
    />

    <ConfirmationModal
      :show="Boolean(pendingRemove)"
      title="Remove platform administrator"
      :message="removeMessage"
      confirm-text="Remove"
      cancel-text="Cancel"
      confirm-button-class="bg-red-600 text-white hover:bg-red-700"
      @update:show="(open) => { if (!open) pendingRemove = null }"
      @confirm="confirmRemove"
      @cancel="pendingRemove = null"
    />
  </SectionCard>
</template>
