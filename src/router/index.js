import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import { initAuth, useAuth } from '../composables/useAuth'
import { initPermissions, usePermissions } from '../composables/usePermissions'
import { appSettingsReady, isSetupPending } from '../composables/useAppSettings'
import { initChurchAccess, isChurchOpen, useChurchAccess } from '../composables/useChurchAccess'
import { getChurchId } from '../api/church'
import { churchAppsReady, isAppEnabled } from '../composables/useChurchApps'

// Where a signed-in member belongs: "/" is the visitors' page now.
//
// The catalogue rather than the dashboard, and it carries no capability on
// purpose — every "denied" redirect lands here, so a page that could itself be
// denied would bounce forever.
import { peopleRoutes } from '../apps/people/routes'
import { attendanceRoutes } from '../apps/attendance/routes'
import { financesRoutes } from '../apps/finances/routes'
import { tasksRoutes } from '../apps/tasks/routes'
import { eventsRoutes } from '../apps/events/routes'
import { schedulesRoutes } from '../apps/schedules/routes'
import { presentationRoutes } from '../apps/presentation/routes'
import { videosRoutes } from '../apps/videos/routes'
import { minutesRoutes } from '../apps/minutes/routes'
import { smallGroupsRoutes } from '../apps/smallgroups/routes'
import { prayerRoutes } from '../apps/prayer/routes'
import { galleryRoutes } from '../apps/gallery/routes'
import { songsRoutes } from '../apps/songs/routes'
import { teachingRoutes } from '../apps/teaching/routes'
import { inventoryRoutes } from '../apps/inventory/routes'
import { ticketsRoutes } from '../apps/tickets/routes'

const HOME = '/home'

// The door for somebody who is signed in but not in this church, and for an
// address with no church behind it at all.
const JOIN = '/join'

// A church's own app, served on its address: uec.church.app.
const churchRoutes = [
  {
    path: JOIN,
    name: 'JoinChurch',
    component: () => import('../views/JoinChurch.vue'),
    meta: { public: true }
  },
  // The church's public front door. Registered before the app shell below so
  // it — not the shell — is what "/" resolves to, and reachable by anyone who
  // knows the address: a church's own page is the first thing its address is
  // for, so nothing behind a sign-in stands in front of it.
  {
    path: '/',
    name: 'Landing',
    component: () => import('../views/Landing.vue'),
    meta: { public: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guestOnly: true }
  },
  {
    // Kept as a redirect rather than deleted: sign-up was a real page for a
    // year, and the address is in old links, bookmarks and at least one email.
    // Google sign-in creates the account anyway, so /login is where it went.
    path: '/register',
    redirect: '/login'
  },
  {
    // A new church's first screen. Outside the app shell on purpose: an
    // administrator who has not filled anything in yet has no use for a
    // sidebar of empty pages, and the guide is something you finish rather
    // than somewhere you browse from. The guard below sends them here until
    // the guide has been through once, and nothing links to it after that:
    // it is a church's first hour, not a page in Settings. Left ungated on
    // `setup` itself so the guard has somewhere to send them.
    path: '/setup',
    name: 'Setup',
    component: () => import('../views/ChurchSetup.vue'),
    meta: { requiresAuth: true, adminOnly: true }
  },
  {
    // The builder for a church's public page: a stack of sections the church
    // chooses and orders, instead of one fixed layout. Still on mock content
    // that is never saved while it is being made real — it is reached by
    // typing the address until Settings > Public page opens it.
    //
    // Two screens, because a public page has to be judged the way a visitor
    // meets it rather than squeezed beside a rail of fields: /public-page is
    // all controls, /public-page/preview is all page. The model they share is
    // in src/composables/useLandingLab.js.
    path: '/public-page',
    name: 'PublicPageBuilder',
    component: () => import('../views/PublicPageBuilder.vue'),
    meta: { requiresAuth: true, adminOnly: true }
  },
  {
    path: '/public-page/preview',
    name: 'PublicPagePreview',
    component: () => import('../views/PublicPagePreview.vue'),
    meta: { requiresAuth: true, adminOnly: true }
  },
  {
    // The projector's own window. Registered outside the app shell on purpose:
    // it is dragged onto a second screen and shown to a congregation, so it
    // must carry no sidebar, no topbar and no theme — just the slide.
    path: '/present-output',
    name: 'PresentOutput',
    component: () => import('../views/PresentOutput.vue'),
    // projector: nothing of ours may float over this window. It is on a second
    // screen in front of a congregation, so even a dismissible banner is a
    // banner the whole church reads mid-song.
    meta: { requiresAuth: true, projector: true }
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        // The dashboard became the Today deck on the home of all apps.
        path: 'dashboard',
        redirect: HOME
      },
      // People is an app of its own: a home, and its sections a step off it.
      // Its screens live with it, in src/apps/people.
      ...peopleRoutes,
      // Small groups is an app of its own (src/apps/smallgroups).
      ...smallGroupsRoutes,
      // Events is an app of its own (src/apps/events).
      ...eventsRoutes,
      // The Gallery is an app of its own (src/apps/gallery); an album and a
      // photo keep the addresses share links were made with.
      ...galleryRoutes,
      {
        path: 'links',
        name: 'Links',
        meta: { capability: 'links.view' },
        component: () => import('../views/Links.vue')
      },
      {
        // YUNIT, the assistant. No capability: everyone in a church that has
        // the app may meet him, so the app alone decides.
        path: 'yunit',
        name: 'Yunit',
        meta: { app: 'ai' },
        component: () => import('../views/Yunit.vue')
      },
      // Songs is an app of its own (src/apps/songs). A song keeps /songs/:id,
      // a full-screen editor that is read-only without songs.manage, so the
      // worship team can read lyrics off it on a phone.
      ...songsRoutes,
      {
        // Presentation is an app of its own at /presentation, and every old
        // link to the list of services lands on its home.
        path: 'present',
        redirect: '/presentation'
      },
      {
        // The tech booth, for one service. Keyed by date rather than month,
        // because a service is what gets run. Read-only access is enough —
        // presenting shows what the worship team planned, it does not change it.
        path: 'present/:date',
        name: 'Present',
        meta: { capability: 'lineups.view' },
        component: () => import('../views/Present.vue')
      },
      // Schedules is an app of its own: a home, and its sections a step off
      // it. Its screens live with it, in src/apps/schedules.
      ...schedulesRoutes,
      // Presentation, the booth's own app, beside it (src/apps/presentation).
      ...presentationRoutes,
      // Announcement videos, made from the calendar (src/apps/videos).
      ...videosRoutes,
      {
        // Lineups became Schedules. Old links live on in chats, bookmarks and
        // the notification history, and every one of them should still land.
        path: 'lineups/:month?',
        redirect: (to) => ({ path: `/schedules${to.params.month ? `/${to.params.month}` : ''}` })
      },
      {
        // Both params optional: bare /bible means "carry on from where I was",
        // and the full form is what a reference shared with somebody else
        // looks like. No capability — Scripture is not church data to be
        // granted by ministry tag, and every signed-in account may read it.
        path: 'bible/:slug?/:chapter?',
        name: 'Bible',
        // The page's own header already says which chapter you are in and
        // carries the search, so the app bar above it would only repeat the
        // word "Bible" and cost a reader a line of text. Not `focus`: the
        // bottom bar stays, because this is a page you browse from.
        meta: { hideTopbar: true, app: 'bible' },
        component: () => import('../views/Bible.vue')
      },
      // Minutes is an app of its own (src/apps/minutes). A meeting is still a
      // focus route inside it: a document read and written in full screen.
      ...minutesRoutes,
      // Teaching is an app of its own (src/apps/teaching): sermon notes, Sunday
      // school and lesson plans, sharing the sermons Schedules plans.
      ...teachingRoutes,
      // Attendance is an app of its own (src/apps/attendance).
      ...attendanceRoutes,
      // Tasks is an app of its own (src/apps/tasks).
      ...tasksRoutes,
      // Prayer concerns is an app of its own (src/apps/prayer), still at
      // /prayer-concerns.
      ...prayerRoutes,
      {
        // The home of all apps: where Ekkly opens and every app leads back to.
        path: 'home',
        name: 'Apps',
        meta: { root: true },
        component: () => import('../views/Apps.vue')
      },
      {
        // Every app, behind More apps on the home and the bottom bar's mark.
        // A page rather than a drawer, so it can be linked to and gone back
        // to. No capability, like the home: it lists only what each person
        // may open. On a phone it takes the whole screen (it asks for that
        // itself, useFocusMode) and carries its own way back; on a desktop
        // Ekkly's top bar stays over it, its mark the way home. ownLayout:
        // no padding round it and no people rail beside it on any size.
        path: 'apps',
        name: 'AllApps',
        meta: { ownLayout: true },
        component: () => import('../views/AllApps.vue')
      },
      // Finances is an app of its own (src/apps/finances).
      ...financesRoutes,
      // Inventory is an app of its own (src/apps/inventory): what the church
      // owns, photographed with the background taken out on the phone.
      ...inventoryRoutes,
      // Tickets is an app of its own (src/apps/tickets): anyone sends a bug,
      // an idea or a word of feedback, and the administrators answer it. It
      // was the administrators' To-do page, whose address still leads here.
      ...ticketsRoutes,
      {
        path: 'todo',
        redirect: '/tickets'
      },
      {
        path: 'accounts',
        name: 'Accounts',
        meta: { adminOnly: true },
        component: () => import('../views/Accounts.vue')
      },
      {
        path: 'audit',
        name: 'AuditLog',
        meta: { adminOnly: true },
        component: () => import('../views/AuditLog.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        meta: { adminOnly: true, noRail: true },
        component: () => import('../views/Settings.vue')
      }
    ]
  },
  // Anything unrecognised — a mistyped address, or a bookmark to a page that
  // has since been removed (/finances, say) — gets the lost little sheep,
  // which says so and leads back to the flock: the home for someone signed
  // in, the front page otherwise. Public, so it answers signed out too.
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    meta: { flock: 'church' },
    component: () => import('../views/NotFound.vue')
  }
]

// The platform's own front door, on the bare domain and app.church.app: where
// a congregation asks for a church, and where those requests are approved. No
// church's records are reachable from here.
const platformRoutes = [
  {
    path: '/',
    name: 'PlatformHome',
    component: () => import('../views/PlatformHome.vue'),
    meta: { public: true }
  },
  // The second front door, tried beside the first: one Sunday told by the
  // scroll, from the doors opening to the lights going off.
  {
    path: '/v2',
    name: 'PlatformHomeV2',
    component: () => import('../views/PlatformHomeV2.vue'),
    meta: { public: true }
  },
  // The front door's other pages. Pricing and Get started were the two longest
  // parts of the home page; Get started is also where someone comes back to
  // see whether their church was approved, so it needs a link of its own.
  {
    path: '/pricing',
    name: 'PlatformPricing',
    component: () => import('../views/PlatformPricing.vue'),
    meta: { public: true }
  },
  {
    path: '/start',
    name: 'PlatformStart',
    component: () => import('../views/PlatformStart.vue'),
    meta: { public: true }
  },
  {
    path: '/privacy',
    name: 'PlatformPrivacy',
    component: () => import('../views/PlatformLegal.vue'),
    meta: { public: true, doc: 'privacy' }
  },
  {
    path: '/terms',
    name: 'PlatformTerms',
    component: () => import('../views/PlatformLegal.vue'),
    meta: { public: true, doc: 'terms' }
  },
  {
    path: '/platform',
    name: 'PlatformAdmin',
    component: () => import('../views/PlatformAdmin.vue'),
    meta: { requiresAuth: true }
  },
  {
    // One church, as the platform runs it. The server refuses anyone who is
    // not a platform administrator, so the page only has to cope with that.
    path: '/platform/churches/:id',
    name: 'PlatformChurch',
    component: () => import('../views/PlatformChurch.vue'),
    meta: { requiresAuth: true }
  },
  {
    // Ekkly's QR code, to see and download. Public: it is handed out.
    path: '/qr',
    name: 'QrCode',
    component: () => import('../views/QrCode.vue'),
    meta: { public: true }
  },
  // The lost little sheep here too, leading back to the front door.
  {
    path: '/:pathMatch(.*)*',
    name: 'PlatformNotFound',
    meta: { flock: 'platform', public: true },
    component: () => import('../views/NotFound.vue')
  }
]

// Going back to a list must land where you left it. Every list opens a record
// as a full page now, so "check three people in a row" is back-scroll-tap —
// and without this, each back lands at the top of the roll.
// A change of query alone is not a new page - a sheet opening as ?add over
// the page you are on - so it leaves the scroll where it was.
const scrollBehavior = (to, from, savedPosition) =>
  savedPosition || (to.path === from.path ? false : { top: 0 })

const createPlatformRouter = () => {
  // A link to one of the home page's sections ("/#features", from Pricing) is
  // scrolled to by the home page once it has drawn, and the hash then taken
  // off the address; the router leaves those alone. Anywhere else, a new page
  // starts at the top.
  const platformScroll = (to, from, savedPosition) => {
    if (savedPosition) return savedPosition
    if (to.hash || to.path === from.path) return false
    return { top: 0 }
  }
  const router = createRouter({ history: createWebHistory(), routes: platformRoutes, scrollBehavior: platformScroll })
  router.beforeEach(async () => {
    // The pages themselves sort out who is signed in; nothing here is behind a
    // church's rules. The session still has to be restored first.
    await initAuth()
    return true
  })
  return router
}

const createChurchRouter = () => {
  const router = createRouter({ history: createWebHistory(), routes: churchRoutes, scrollBehavior })

  // Access taken away mid-session: leave on a full page load, so nothing the
  // church's listeners already delivered stays on screen or in memory.
  const { status } = useChurchAccess()
  watch(status, (now, before) => {
    if (before === 'granted' && now !== 'granted' && now !== 'signed-out' && now !== 'checking') {
      window.location.assign(JOIN)
    }
  })

  // Wait for Firebase to restore the persisted session before resolving any
  // route, otherwise a page refresh would bounce a signed-in user to /login.
  router.beforeEach(async (to) => {
    await initAuth()

    const { isAuthenticated, user } = useAuth()

    // An address with no church behind it, or a church that has been closed,
    // has one page: the one that says so.
    if (!isChurchOpen()) {
      return to.name === 'JoinChurch' ? true : { name: 'JoinChurch' }
    }

    if (to.meta.requiresAuth && !isAuthenticated.value) {
      return {
        name: 'Login',
        query: to.fullPath === HOME ? {} : { redirect: to.fullPath }
      }
    }

    if (to.name === 'Landing') {
      // Signed in or not, "/" stays the public page. A member who follows the
      // church's own link should land where visitors land — the page itself
      // offers them the way back into the app.
      return true
    }

    if (to.meta.guestOnly && isAuthenticated.value) {
      return { path: HOME }
    }

    // Signed in is not the same as in this church. Everything behind the app
    // shell needs an access document, and whoever has none is sent to ask for
    // one — before a single listener is started on the church's records.
    if (isAuthenticated.value && to.meta.requiresAuth) {
      const access = await initChurchAccess(user.value)
      if (access !== 'granted') return { name: 'JoinChurch' }
    }

    // Roles come from the signed-in member's ministry tags, so they can only be
    // consulted once admins, members and the tag map have all loaded. Awaiting
    // that here stops a hard refresh on a deep link from bouncing someone who
    // does in fact have access.
    if (isAuthenticated.value && to.meta.requiresAuth) {
      // Awaited on every navigation, not just guarded ones: the sidebar and
      // bottom bar filter themselves by capability, so the map has to be loaded
      // even on a page that grants itself freely. Which apps the church has is
      // part of every answer below — can() refuses a capability whose app is
      // off — and the settings say whether this church has ever been set up,
      // which decides the redirect before any of the rest is worth asking.
      await Promise.all([initPermissions(), churchAppsReady(), appSettingsReady()])

      const capability = to.matched.reduce((cap, record) => record.meta.capability || cap, null)
      const adminOnly = to.matched.some((record) => record.meta.adminOnly)
      const app = to.matched.reduce((key, record) => record.meta.app || key, null)
      const { can, isAdmin, hasNoAdmins } = usePermissions()

      // A church nobody has set up yet has one screen for whoever runs it. The
      // guide writes `setup.done` on the way out — finished or abandoned — so
      // this is a redirect somebody sees once, not a wall. Only administrators:
      // a member who happens to sign in first has nothing to fill in, and
      // being shown a half-built page is better than being shown a form for
      // somebody else's job.
      if (to.name !== 'Setup' && isAdmin.value && isSetupPending()) {
        return { name: 'Setup' }
      }

      if (app && !isAppEnabled(app)) return { path: HOME, query: { denied: to.path } }

      if (adminOnly && !isAdmin.value && !hasNoAdmins.value) {
        return { path: HOME, query: { denied: to.path } }
      }
      // Someone's own member record is theirs to read whatever else they may
      // see (meta.ownRecord): "My profile" is not a look at the roll.
      const { myMember } = usePermissions()
      const own =
        to.meta.ownRecord &&
        myMember.value &&
        [myMember.value.id, myMember.value.firestoreId].map(String).includes(String(to.params.id))
      // And a screen of someone's own things (meta.mine, "My tasks") opens
      // for anyone in the church: being given a task is reason enough to see
      // it, without leave to read everyone else's.
      const mine = to.matched.some((record) => record.meta.mine)
      if (capability && !can(capability) && !own && !mine) return { path: HOME, query: { denied: to.path } }
    }

    return true
  })

  return router
}

/** Called once, after resolveChurch() has decided what this page is serving. */
export const createAppRouter = () => (getChurchId() ? createChurchRouter() : createPlatformRouter())
