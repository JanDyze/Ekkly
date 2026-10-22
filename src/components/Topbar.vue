<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { List, Bell, Sun, Moon, X, Users, LogOut, UserCheck, UserPlus, Clock3, ChevronLeft, ChevronRight, SpeakerHigh, SpeakerSlash, Settings, SquaresFour, Layout, CloudSun, MagnifyingGlass, Swap } from '../icons';
import { useSounds } from "../composables/useSounds";
import { useRouter } from "vue-router";
import { useTheme } from "../composables/useTheme";
import { useNotifications } from "../composables/useNotifications";
import { useNotificationFeed, timeAgo } from "../composables/useNotificationFeed";
import { useFocusTrap } from "../composables/useFocusTrap";
import { useSwipeDismiss } from "../composables/useSwipeDismiss";
import { useAuth } from "../composables/useAuth";
import { useAvatars } from "../composables/useAvatars";
import { useToast } from "../composables/useToast";
import { useMembers } from "../composables/useMembers";
import { useMyMember } from "../composables/useMyMember";
import { useClaimFlow } from "../composables/useClaimFlow";
import { usePresence } from "../composables/usePresence";
import { useMediaQuery } from "../composables/useMediaQuery";
import { useSearchSheet } from "../composables/useSearchSheet";
import { openPageSearch } from "../composables/usePageSearch";
import { usePermissions } from "../composables/usePermissions";
import { useAppSettings } from "../composables/useAppSettings";
import { useTrail, clearTrail } from "../composables/useTrail";
import { canReceive } from "../../lib/notifications";
import { notificationIcon, toneClass } from "../utils/notificationIcons";
import { getFullName } from "../utils/memberUtils";
import ClaimMemberSheet from "./auth/ClaimMemberSheet.vue";
import MemberAvatar from "./members/MemberAvatar.vue";
import AppArt from "./common/AppArt.vue";
import { NAV_ITEMS } from "../data/navigation";
import { homeCardName } from "../data/homeCards";
import { useHomeCards } from "../composables/useHomeCards";
import { homeArranging, useHomeLayout } from "../composables/useHomeLayout";
import { useLiveSky } from "../composables/useLiveSky";
import { useMotion } from "../composables/useMotion";
import { useSimpleView, simpleNavOpen } from "../composables/useSimpleView"
import { themeOverride } from "../composables/useTheme"
import CardStyleSheet from "./home/CardStyleSheet.vue";
import HomePanelSwitches from "./home/HomePanelSwitches.vue";
import SearchSheet from "./search/SearchSheet.vue";

const route = useRoute();
const router = useRouter();
const { isDark, toggleTheme } = useTheme();
// The app's small sounds, on or off for this device (useSounds). In the
// account menu on a desktop; a phone has the same switch in the people drawer.
const { soundsOn, toggleSounds } = useSounds();
const { displayName, email: userEmail, logout } = useAuth();
// Prefers the linked member record's photo over the sign-in thumbnail.
const { myAvatarUrl } = useAvatars();
const toast = useToast();
const { isEnabled: notificationsEnabled, enabling, enable } = useNotifications();

// The mark doubles as the way out to the church's public page, which every
// church has at "/" — there is nothing to check before offering it.
const { church, logoUrl } = useAppSettings();

// The icon beside the title is the app you are in, not the church's logo: the
// title says the page, and its app's artwork says it at a glance, the same
// picture the bar and the sidebar use for it. Longest match wins, so a nested
// page (/members/12) names its own app. Pages that belong to no app — the
// catalogue, your profile — keep the church's logo.
const currentApp = computed(() => {
  const path = route.path;
  return (
    NAV_ITEMS.filter((item) => path === item.path || path.startsWith(item.path + '/'))
      .sort((a, b) => b.path.length - a.path.length)[0] || null
  );
});

// The app's artwork in the bar holds still: it used to play each time the
// page changed, which set the bar moving on every step through an app.

// No digest switch here any more: the digest is simply sent. api/email.js has
// always treated it as opt-out, so an account that never touches a setting
// gets one — which is what "automatic" means. Administrators still have the
// wider controls in Settings.

// Notifications panel + history
const isNotifOpen = ref(false);
const { isAdmin, capabilities } = usePermissions();
const { visibleNotifications, unreadCount, markSeen } = useNotificationFeed();

const toggleNotifPanel = () => {
  isNotifOpen.value = !isNotifOpen.value;
  if (isNotifOpen.value) markSeen();
};

// The bar is hidden rather than unmounted on a focus route (AdminLayout), so
// its drawer no longer closes by being thrown away; it is closed on the way in.
watch(
  () => route.meta?.focus,
  (focus) => {
    if (focus) isNotifOpen.value = false;
  }
);

const openNotification = (n) => {
  isNotifOpen.value = false;
  const url = n.url || "/";
  if (url.startsWith("http")) window.open(url, "_blank");
  else router.push(url);
};

const isMenuOpen = ref(false);

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

// Inside an app of its own (meta.frame: 'app'), this bar is that app's name and
// the way back out of it. The app's own sections are named on its screens, so
// the bar just says which app.
const inApp = computed(() => route.matched.some((record) => record.meta?.frame === 'app'))

// The home of all apps is the way between them now that there is no bottom
// bar or sidebar, so from every other screen the mark is a back arrow to it.
// Only on the home itself is it the link to the church's public page.
const onHome = computed(() => Boolean(route.meta?.root))

const pageTitle = computed(() => {
  if (inApp.value && currentApp.value) return currentApp.value.name
  // The home of all apps is the church's own front room, so it carries the
  // church's name rather than a generic "Home".
  if (onHome.value) return church.value.shortName || 'Home'
  const routeNames = {
    Members: 'People',
    MemberDetails: 'Person',
    MinuteDetails: 'Minutes',
    AllApps: 'All apps',
    PrayerConcerns: 'Prayer Concerns'
  };
  // Fall back to the route name so new pages are labelled correctly
  return routeNames[route.name] || route.name || 'Dashboard';
});

/* ------------------------------------------------------------- the trail */

// How deep you are (useTrail): People › Ministries › Worship beside the mark
// (which is the way home), every step above this screen a link up to it. The
// last step is this screen, and is the title; on the home of all apps, which
// has no steps, the title is the church's.
const trail = useTrail()
const currentLabel = computed(() => (trail.value.length ? trail.value[trail.value.length - 1].label : pageTitle.value))
const earlier = computed(() => trail.value.slice(0, -1))

// The mark's back arrow goes up one level: to the step before this one on
// the trail (People, from People › Everyone), and only from an app's own home
// out to every app. It always went out to every app, which was right while
// the bar showed on an app's home alone; inside a section it skipped the
// level everyone expected back to. On the home itself, the mark is the way
// to the church's public page.
const back = computed(() => {
  if (onHome.value) return { to: '/', label: `Go to the ${church.value.shortName} public page` }
  const up = earlier.value.at(-1)
  return up ? { to: up.to, label: `Back to ${up.label}` } : { to: '/home', label: 'Back to all apps' }
})

// As many steps above as the bar has room for, the nearest kept; the rest
// fold into "…", which opens them as a list. A phone has room for one.
const isWide = useMediaQuery('(min-width: 640px)')
const shownCount = computed(() => (isDesktop.value ? 4 : isWide.value ? 2 : 1))
const shownSteps = computed(() => earlier.value.slice(-shownCount.value))
const foldedSteps = computed(() => earlier.value.slice(0, Math.max(0, earlier.value.length - shownCount.value)))

const isTrailOpen = ref(false)
const trailMenuRef = ref(null)
useFocusTrap(trailMenuRef, isTrailOpen, () => { isTrailOpen.value = false }, { trap: false })
watch(() => route.fullPath, () => { isTrailOpen.value = false })

// Live presence now belongs to the people rail; the Topbar only carries the
// button that opens it on screens too narrow for the permanent column.
const { onlineCount, showPeoplePanel, togglePeoplePanel } = usePresence()

// The dropdown is a desktop affordance; a phone gets the drawer instead.
const isDesktop = useMediaQuery('(min-width: 1024px)')

// Same gesture as the drawer beside it, so the two behave alike.
const { swipeTarget: notifSwipe, swipeStyle: notifStyle } = useSwipeDismiss({
  direction: 'right',
  onDismiss: () => {
    isNotifOpen.value = false
  },
})

const notifPanelRef = ref(null)
useFocusTrap(notifPanelRef, isNotifOpen, () => { isNotifOpen.value = false }, { trap: false })

// Search everything (SearchSheet). Ctrl+K or ⌘K anywhere, Ctrl+F or ⌘F too
// (in place of the browser's find on the page, since what someone looking
// for something wants is the church's records, not the words on one screen),
// and "/" when the caret is not already in a field, the way most apps open
// their search. Shared (useSearchSheet), so a desktop's home can open it from
// its own field. The bar is hidden on some screens, never removed
// (AdminLayout), so these work on every one.
const { open: showSearch } = useSearchSheet()
const onSearchKey = (event) => {
  const typing = event.target?.closest?.('input, textarea, select, [contenteditable="true"]')
  // A browser filling in a form sends a keydown with no key.
  const key = (event.key || '').toLowerCase()
  if (((key === 'k' || key === 'f') && (event.ctrlKey || event.metaKey) && !event.altKey) || (event.key === '/' && !typing)) {
    event.preventDefault()
    showSearch.value = true
    return
  }
  // Ctrl+G or ⌘G: this screen's own search instead (usePageSearch), in place
  // of the browser's "find next". The search over everything is put away
  // first, so the key lands in the page under it.
  if (key === 'g' && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
    event.preventDefault()
    showSearch.value = false
    openPageSearch().then((found) => {
      if (!found) toast.info('This page has no search of its own. Ctrl+F searches everything.')
    })
  }
}
onMounted(() => window.addEventListener('keydown', onSearchKey))
onUnmounted(() => window.removeEventListener('keydown', onSearchKey))

// How the home draws its apps, for this person (useHomeCards).
const { style: cardStyle, myChoice: myCardStyle } = useHomeCards()
// The home's panels, where this person has put them.
const { isDefault: layoutIsDefault } = useHomeLayout()
// Off to the home with its panels free to drag (homeArranging), where a bar
// says how and has Done; the board holds still the rest of the time.
const rearrangeHome = () => {
  isUserMenuOpen.value = false
  homeArranging.value = true
  if (!route.meta?.root) router.push('/home')
}
const showCardStyles = ref(false)
// The home's sky following the time and weather over the church.
const { liveSky, setLiveSky } = useLiveSky()
// Whether a card turns over into the page it opens: on or off, a click at a time.
const { motionLabel, nextMotion } = useMotion()
// Simple view: the quiet home, and the apps after it (useSimpleView).
const { simpleView, setSimpleView } = useSimpleView()
const openSimpleNav = () => (simpleNavOpen.value = true)
// The home in simple view, where the sidebar already names the church.
const churchInSidebar = computed(() => simpleView.value && onHome.value)

// User account menu
const isUserMenuOpen = ref(false)
const signingOut = ref(false)
const userMenuRef = ref(null)
useFocusTrap(userMenuRef, isUserMenuOpen, () => { isUserMenuOpen.value = false }, { trap: false })

// A press anywhere but the menu (or the button that opens it) closes it.
// Listened for on the page, not by a sheet laid over it: the bar is frosted
// (backdrop-blur), which makes it the box a fixed sheet inside it is laid in,
// so the old click-away sheet covered only the bar's own strip and a click
// on the page below went straight through. The same goes for the trail's
// "…" list. Captured, so a press on a link still closes the menu first.
const accountButtonRef = ref(null)
const trailButtonRef = ref(null)
const outside = (event, menu, button) => !menu?.contains(event.target) && !button?.contains(event.target)
const onPressAnywhere = (event) => {
  if (isUserMenuOpen.value && outside(event, userMenuRef.value, accountButtonRef.value)) isUserMenuOpen.value = false
  if (isTrailOpen.value && outside(event, trailMenuRef.value, trailButtonRef.value)) isTrailOpen.value = false
}
onMounted(() => document.addEventListener('pointerdown', onPressAnywhere, true))
onUnmounted(() => document.removeEventListener('pointerdown', onPressAnywhere, true))

const handleLogout = async () => {
  signingOut.value = true
  try {
    await logout()
    // The names the top bar remembers for its trail are the church's; the next
    // person to sign in on this tab starts without them.
    clearTrail()
    isUserMenuOpen.value = false
    toast.success('Signed out')
    router.push('/login')
  } catch {
    toast.error('Could not sign out. Please try again.')
  } finally {
    signingOut.value = false
  }
}

/* --------------------------------------------------- linked member record */
const { members } = useMembers()
const { myMember, isLinked } = useMyMember()
const {
  myClaim,
  myPendingClaim,
  showClaimSheet,
  submittingClaim,
  openClaimSheet: openSharedClaimSheet,
  handleClaimSubmit,
  handleWithdrawClaim,
} = useClaimFlow()

const openClaimSheet = () => {
  isUserMenuOpen.value = false
  openSharedClaimSheet()
}

const openMyProfile = () => {
  isUserMenuOpen.value = false
  router.push(`/people/${myMember.value.id || myMember.value.firestoreId}`)
}

</script>

<template>
  <!-- Deliberately slight: this bar says where you are and gives you your
       account, and every row it takes is a row the page does not get. A hairline
       under it does the work the old height and weight were doing. -->
  <header
    class="sticky top-0 z-70 no-print border-b border-gray-100 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-800/90"
  >
    <div class="px-4 sm:px-6 lg:px-4">
      <div class="flex items-center justify-between h-12">
        <div class="flex min-w-0 items-center gap-2.5">
          <!-- Simple view's sidebar, on a phone (SimpleSidebar). -->
          <button
            v-if="simpleView"
            type="button"
            class="-ml-1.5 flex size-9 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-gray-700"
            aria-label="Open the menu"
            @click="openSimpleNav"
          >
            <List class="size-5" />
          </button>
          <router-link
            :to="back.to"
            :title="back.label"
            :aria-label="back.label"
            :class="[
              'relative -ml-1 flex shrink-0 items-center gap-0.5 rounded-lg p-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700',
              // On the home in simple view the sidebar heads with the church's
              // mark and name, so the bar's own step aside on a desktop.
              churchInSidebar ? 'lg:hidden' : '',
            ]"
          >
            <ChevronLeft v-if="!onHome" class="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
            <!-- Keyed by app, so moving between apps swaps one picture for the
                 next with a small pop, and the new one plays as it arrives.
                 The two overlap rather than taking turns (out-in), so the new
                 picture is there at once. -->
            <Transition name="topbar-app">
              <AppArt
                v-if="currentApp?.art"
                :key="currentApp.path"
                :app-key="currentApp.art"
                class="h-8 w-8"
              />
              <component
                v-else-if="currentApp"
                :key="currentApp.path"
                :is="currentApp.icon"
                class="h-7 w-7 m-0.5 text-primary dark:text-primary-light"
              />
              <img v-else key="logo" :src="logoUrl" :alt="church.shortName" class="h-8 w-auto" />
            </Transition>
          </router-link>
          <!-- How deep you are: the steps above this screen, each a link up
               to it, the highest folded into "…" when there is no room. -->
          <nav
            v-if="earlier.length"
            aria-label="Breadcrumb"
            class="relative flex min-w-0 shrink items-center gap-1 text-sm text-gray-500 dark:text-gray-400"
          >
            <template v-if="foldedSteps.length">
              <button
                type="button"
                class="shrink-0 rounded-md px-1.5 py-0.5 font-semibold tracking-wider transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white"
                :aria-label="`${foldedSteps.length} more ${foldedSteps.length === 1 ? 'level' : 'levels'} above this one`"
                aria-haspopup="true"
                :aria-expanded="isTrailOpen"
                ref="trailButtonRef"
                @click="isTrailOpen = !isTrailOpen"
              >
                …
              </button>
              <ChevronRight class="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            </template>
            <template v-for="step in shownSteps" :key="step.key">
              <router-link
                :to="step.to"
                class="min-w-0 max-w-28 truncate rounded-md px-1 py-0.5 transition-colors hover:bg-gray-100 hover:text-gray-900 sm:max-w-36 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                {{ step.label }}
              </router-link>
              <ChevronRight class="size-3.5 shrink-0 text-gray-300 dark:text-gray-600" aria-hidden="true" />
            </template>

            <!-- The folded steps, from the top down, as a list hanging off "…". -->
            <Transition name="fade">
              <div
                v-if="isTrailOpen"
                ref="trailMenuRef"
                role="menu"
                tabindex="-1"
                class="absolute left-0 top-full z-100 mt-2 w-60 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white py-1.5 ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700"
              >
                <p class="px-3 pb-1 pt-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500">Above</p>
                <router-link
                  v-for="step in foldedSteps"
                  :key="step.key"
                  :to="step.to"
                  role="menuitem"
                  class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  <AppArt v-if="step.art" :app-key="step.art" class="size-6 shrink-0" />
                  <span class="min-w-0 truncate">{{ step.label }}</span>
                </router-link>
              </div>
            </Transition>
          </nav>
          <!-- The trail's last step: where you are. Not the page's heading,
               which is the page's own title under the bar; two headings
               saying the same name read out twice. -->
          <span
            aria-current="page"
            :class="['truncate text-sm font-semibold text-gray-900 dark:text-white', earlier.length ? 'min-w-16 shrink-[0.5]' : 'min-w-0', churchInSidebar ? 'lg:hidden' : '']"
          >
            {{ currentLabel }}
          </span>
        </div>
        <!-- Right: User menu and notifications -->
        <div class="flex items-center gap-2">
          <!-- Who is online. The permanent rail replaces this from xl up. -->
          <button
            @click="togglePeoplePanel"
            class="hidden lg:relative lg:inline-flex xl:hidden p-1.5 rounded-full text-primary dark:text-primary-light hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Who is online"
            aria-label="Who is online"
            aria-haspopup="dialog"
            :aria-expanded="showPeoplePanel"
          >
            <Users class="w-5 h-5" />
            <span
              v-if="onlineCount"
              class="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-black"
            >
              {{ onlineCount }}
            </span>
          </button>

          <!-- Theme Toggle. Not while live sky sets the light (AdminLayout),
               when choosing would do nothing. -->
          <button
            v-if="themeOverride === null"
            @click="toggleTheme($event)"
            class="hidden lg:inline-flex p-1.5 rounded-full text-primary dark:text-primary-light hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <Sun v-if="isDark" class="w-4 h-4" />
            <Moon v-else class="w-4 h-4" />
          </button>

          <!-- Search everything, at every size. -->
          <button
            type="button"
            class="p-1.5 rounded-full text-primary dark:text-primary-light hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Search (Ctrl+K)"
            aria-label="Search"
            aria-haspopup="dialog"
            @click="showSearch = true"
          >
            <MagnifyingGlass class="w-5 h-5" />
          </button>

          <!-- Notifications, at every size. A feed you come to read earns its
               own drawer rather than a menu hanging off the bar. -->
          <div>
            <button
              @click="toggleNotifPanel"
              class="p-1.5 rounded-full text-primary dark:text-primary-light hover:bg-gray-100 dark:hover:bg-gray-700 relative"
              title="Notifications"
              aria-label="Notifications"
              aria-haspopup="true"
              :aria-expanded="isNotifOpen"
            >
              <Bell class="w-5 h-5" />
              <span
                v-if="unreadCount > 0"
                class="absolute top-1 right-1 w-2 h-2 bg-[#bc1c09] rounded-full"
              ></span>
            </button>

          </div>

          <!-- User account menu -->
          <div class="relative">
            <!-- One control on a phone. The theme toggle, the bell and the
                 who-is-online button all used to sit out here beside it, which
                 is four taps' worth of chrome on a 360px bar; they are all in
                 the drawer this opens now. A desktop still gets the dropdown,
                 since it has the room for the separate buttons. -->
            <button
              ref="accountButtonRef"
              @click="isDesktop ? (isUserMenuOpen = !isUserMenuOpen) : togglePeoplePanel()"
              aria-label="Account, notifications and who is online"
              aria-haspopup="true"
              :aria-expanded="isDesktop ? isUserMenuOpen : showPeoplePanel"
              class="relative flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <MemberAvatar
                :member="myMember"
                :src="myAvatarUrl"
                alt="User Avatar"
                size="w-7 h-7"
              />
              <!-- The bell is gone from the bar, so its badge rides here. -->
              <span
                v-if="unreadCount > 0"
                class="lg:hidden absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-[#bc1c09] ring-2 ring-white dark:ring-gray-800"
              />
            </button>

            <Transition name="fade">
              <div
                v-if="isUserMenuOpen && isDesktop"
                ref="userMenuRef"
                role="dialog"
                aria-labelledby="user-menu-title"
                tabindex="-1"
                class="absolute top-full right-0 mt-3 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border-2 border-primary/20 dark:border-primary-light/20 rounded-2xl z-100 overflow-hidden"
              >
                <div class="flex items-center gap-3 p-4">
                  <MemberAvatar
                    :member="myMember"
                    :src="myAvatarUrl"
                    alt=""
                    size="w-10 h-10"
                    plain-class="border-2 border-primary/20"
                  />
                  <div class="min-w-0">
                    <p
                      id="user-menu-title"
                      class="text-[11px] font-black text-gray-900 dark:text-white truncate"
                    >
                      {{ displayName }}
                    </p>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {{ userEmail }}
                    </p>
                  </div>
                </div>

                <!-- Which member record this account is, if any -->
                <div class="px-3 pb-3 border-t-2 border-gray-50 dark:border-gray-800 pt-3">
                  <button
                    v-if="isLinked"
                    @click="openMyProfile"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-primary/5 dark:bg-primary/10 text-left hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
                  >
                    <UserCheck class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 min-w-0">
                      <span class="block text-[9px] font-black uppercase tracking-widest text-primary dark:text-primary-light">
                        My profile
                      </span>
                      <span class="block text-[11px] font-bold text-gray-900 dark:text-white truncate">
                        {{ getFullName(myMember) }}
                      </span>
                    </span>
                    <ChevronRight class="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600" />
                  </button>

                  <div
                    v-else-if="myPendingClaim"
                    class="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10"
                  >
                    <p class="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">
                      <Clock3 class="w-3.5 h-3.5" />
                      Awaiting approval
                    </p>
                    <p class="mt-1 text-[11px] font-bold text-gray-900 dark:text-white truncate">
                      {{ myPendingClaim.memberName }}
                    </p>
                    <button
                      @click="handleWithdrawClaim"
                      class="mt-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Withdraw request
                    </button>
                  </div>

                  <button
                    v-else
                    @click="openClaimSheet"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800 text-left hover:border-primary/40 transition-colors"
                  >
                    <UserPlus class="w-4 h-4 shrink-0 text-gray-400" />
                    <span class="flex-1 min-w-0">
                      <span class="block text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                        Link my member record
                      </span>
                      <span
                        v-if="myClaim && myClaim.status === 'rejected'"
                        class="block text-[10px] text-red-500 truncate"
                      >
                        Last request was declined
                      </span>
                    </span>
                  </button>
                </div>

                <div class="px-3 pb-3 border-t-2 border-gray-50 dark:border-gray-800 pt-3">
                  <!-- Settings is not an app, so it opens from the account
                       rather than from the home. -->
                  <button
                    v-if="isAdmin"
                    @click="isUserMenuOpen = false; router.push('/settings')"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Settings class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">Settings</span>
                    <ChevronRight class="w-4 h-4 shrink-0 text-gray-300 dark:text-gray-600" />
                  </button>
                  <button
                    @click="isUserMenuOpen = false; showCardStyles = true"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <SquaresFour class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">App cards</span>
                    <span class="truncate text-[10px] text-gray-400 dark:text-gray-500">{{ myCardStyle ? homeCardName(cardStyle) : 'Church’s choice' }}</span>
                  </button>
                  <!-- The home's panels hold still until someone asks to move
                       them: this opens the home with them free to drag
                       (homeArranging), and a bar there with "Put back the
                       usual" and Done. -->
                  <button
                    @click="rearrangeHome"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Layout class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">Rearrange home</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ layoutIsDefault ? 'Usual' : 'Yours' }}</span>
                  </button>
                  <!-- Which of the home's panels show (useHomeLayout). -->
                  <HomePanelSwitches />
                  <button
                    @click="setLiveSky(!liveSky)"
                    role="switch"
                    :aria-checked="liveSky"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <CloudSun class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">Live sky</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ liveSky ? 'On' : 'Off' }}</span>
                  </button>
                  <button
                    @click="setSimpleView(!simpleView)"
                    role="switch"
                    :aria-checked="simpleView"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Layout class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">Simple view</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ simpleView ? 'On' : 'Off' }}</span>
                  </button>
                  <button
                    @click="nextMotion"
                    :aria-label="`Transitions: ${motionLabel}. Click to change.`"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Swap class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">Transitions</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ motionLabel }}</span>
                  </button>
                  <button
                    @click="toggleSounds"
                    :aria-pressed="soundsOn"
                    class="w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <SpeakerHigh v-if="soundsOn" class="w-4 h-4 shrink-0 text-primary dark:text-primary-light" />
                    <SpeakerSlash v-else class="w-4 h-4 shrink-0 text-gray-400" />
                    <span class="flex-1 text-[11px] font-bold text-gray-900 dark:text-white">Sounds</span>
                    <span class="text-[10px] text-gray-400 dark:text-gray-500">{{ soundsOn ? 'On' : 'Off' }}</span>
                  </button>
                </div>

                <div class="px-3 pb-3 border-t-2 border-gray-50 dark:border-gray-800 pt-3">
                  <button
                    @click="handleLogout"
                    :disabled="signingOut"
                    class="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-100 dark:hover:border-red-500/20 transition-all disabled:opacity-50"
                  >
                    <LogOut class="w-3.5 h-3.5" />
                    {{ signingOut ? 'Signing out...' : 'Sign out' }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>

        </div>
      </div>
    </div>


    <!-- Notifications drawer. Same shape as the people drawer it sits beside,
         so the two read as one family rather than a menu and a panel. -->
    <Teleport to="body">
      <Transition name="notif-drawer">
        <div v-if="isNotifOpen" class="fixed inset-0 z-110 no-print">
          <div class="absolute inset-0 bg-black/50" @click="isNotifOpen = false" />
              <div
                v-if="isNotifOpen"
                ref="notifPanelRef"
                role="dialog"
                aria-labelledby="notif-panel-title"
                tabindex="-1"
                v-bind="notifSwipe"
                :style="notifStyle()"
                class="notif-panel absolute inset-y-0 right-0 flex w-[21rem] max-w-[85vw] flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800"
              >
                <div
                  class="shrink-0 flex items-center justify-between px-4 pb-2 pt-[calc(1rem+env(safe-area-inset-top))]"
                >
                  <p id="notif-panel-title" class="text-[9px] font-black uppercase tracking-widest text-primary">
                    Notifications
                  </p>
                  <button
                    @click="isNotifOpen = false"
                    aria-label="Close"
                    class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <X class="w-5 h-5" />
                  </button>
                </div>

                <!-- Enable state -->
                <div v-if="!notificationsEnabled" class="px-4 pb-3">
                  <button
                    @click="enable"
                    :disabled="enabling"
                    class="w-full py-2.5 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-primary-hover transition-all disabled:opacity-50"
                  >
                    {{ enabling ? "Enabling..." : "Enable on this device" }}
                  </button>
                </div>
                <div v-else class="px-4 pb-2 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  <span class="text-[9px] font-black uppercase tracking-widest text-gray-400">
                    Enabled on this device
                  </span>
                </div>

                <!-- History -->
                <div
                  class="flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar border-t-2 border-gray-50 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]"
                >
                  <p
                    v-if="visibleNotifications.length === 0"
                    class="p-6 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400"
                  >
                    No notifications yet
                  </p>
                  <button
                    v-for="n in visibleNotifications"
                    :key="n.id"
                    @click="openNotification(n)"
                    class="w-full flex items-start gap-2.5 text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-50 dark:border-gray-800/60 last:border-b-0"
                  >
                    <!-- What kind of thing happened, before a word is read -->
                    <span
                      :class="['shrink-0 mt-0.5 p-1.5 rounded-lg', toneClass(n.kind)]"
                    >
                      <component :is="notificationIcon(n.kind)" class="w-3.5 h-3.5" />
                    </span>
                    <span class="min-w-0 flex-1">
                      <span class="block text-[11px] font-black text-gray-900 dark:text-white leading-snug">
                        {{ n.title }}
                      </span>
                      <span
                        v-if="n.body"
                        class="block text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2"
                      >
                        {{ n.body }}
                      </span>
                      <span
                        class="block text-[9px] font-black uppercase tracking-widest text-gray-300 dark:text-gray-500 mt-1"
                      >
                        {{ timeAgo(n.sentAt) }}
                      </span>
                    </span>
                  </button>
                </div>
              </div>
                    </div>
      </Transition>
    </Teleport>

    <CardStyleSheet :show="showCardStyles" @close="showCardStyles = false" />
    <SearchSheet :show="showSearch" @close="showSearch = false" />

    <ClaimMemberSheet
      v-model:show="showClaimSheet"
      :members="members"
      :submitting="submittingClaim"
      @submit="handleClaimSubmit"
    />

  </header>
</template>

<style scoped>
/* Scrollbars are themed globally in src/style.css (.custom-scrollbar) */

.notif-drawer-enter-active,
.notif-drawer-leave-active {
  transition: opacity 0.25s ease;
}

.notif-drawer-enter-active .notif-panel,
.notif-drawer-leave-active .notif-panel {
  transition: transform 0.25s ease;
}

.notif-drawer-enter-from,
.notif-drawer-leave-to {
  opacity: 0;
}

.notif-drawer-enter-from .notif-panel,
.notif-drawer-leave-to .notif-panel {
  transform: translateX(100%);
}

/* One app's picture giving way to the next: the old one shrinks out quickly,
   the new one rises into place and settles, then plays its own animation. */
.topbar-app-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Lifted out of the row as it goes, so the picture arriving takes its place
   straight away instead of standing beside it. */
.topbar-app-leave-active {
  position: absolute;
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.topbar-app-enter-from {
  opacity: 0;
  transform: scale(0.7);
}

.topbar-app-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

@media (prefers-reduced-motion: reduce) {
  .topbar-app-enter-active,
  .topbar-app-leave-active {
    transition: none;
  }
}
</style>
