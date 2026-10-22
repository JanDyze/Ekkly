import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { addTicket } from '../api/ticketsService'
import { useAuth } from './useAuth'
import { usePermissions } from './usePermissions'
import { NAV_ITEMS } from '../data/navigation'
import { getDisplayName } from '../utils/memberUtils'

// A ticket sent from wherever you are, without going to the Tickets app first.
// It is for going through the app page by page and noting what each one needs:
// the form opens over the page, already knowing which page it is, and closes
// as soon as the ticket is sent, so the next note is one keystroke away.
//
// The page is kept as its full address (`page` on the ticket), query and all,
// because "the People app" is rarely enough to find what someone meant, and
// the app it belongs to fills in "Where in Ekkly" as the form opens.

// One form for the whole signed-in shell (QuickTicket.vue, in AdminLayout).
const open = ref(false)
const page = ref('')
const where = ref('')

/** The app a path belongs to, by its name in navigation, as the top bar names it. */
const appAt = (path) =>
  NAV_ITEMS.filter((item) => path === item.path || path.startsWith(item.path + '/')).sort(
    (a, b) => b.path.length - a.path.length
  )[0]?.name || ''

export function useQuickTicket() {
  const route = useRoute()
  const { user, displayName } = useAuth()
  const { myMember } = usePermissions()

  const start = () => {
    page.value = route.fullPath
    where.value = appAt(route.path)
    open.value = true
  }

  const send = (fields) =>
    addTicket(
      { ...fields, page: page.value },
      { uid: user.value?.uid || '', name: getDisplayName(myMember.value) || displayName.value || '' }
    )

  return { open, page, where, start, send }
}

/**
 * Alt+T (Option+T on a Mac) opens the form from any page. Matched on the key's
 * place rather than the letter it types, because Option+T on a Mac types "†".
 */
export function useQuickTicketShortcut(start) {
  const onKey = (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.code !== 'KeyT') return
    event.preventDefault()
    if (!open.value) start()
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onUnmounted(() => window.removeEventListener('keydown', onKey))
}
