<script setup>
import { useRouter } from 'vue-router'
import { Eye, X } from '../../icons'
import { seeAs, usePermissions } from '../../composables/usePermissions'

// Across the top of every screen while an administrator is seeing the app as
// a ministry sees it (Settings → Roles). It says so, so nobody forgets they
// are looking through someone else's eyes and wonders where Settings went,
// and it is the one way back: Settings itself is hidden meanwhile, as it is
// from the ministry.

const router = useRouter()
const { previewing } = usePermissions()

const stop = () => {
  seeAs('')
  router.push({ name: 'Settings', query: { section: 'roles' } })
}
</script>

<template>
  <div
    v-if="previewing"
    role="status"
    class="flex shrink-0 items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-white"
  >
    <Eye class="h-4 w-4 shrink-0" />
    <span class="min-w-0 truncate">Seeing Ekkly as a {{ previewing }}</span>
    <button
      type="button"
      class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 text-xs font-bold transition-colors hover:bg-white/30"
      @click="stop"
    >
      <X class="h-3.5 w-3.5" />
      Stop
    </button>
  </div>
</template>
