// The Schedules app's screens, mounted under AdminLayout by src/router/index.js.
//
// An app inside Ekkly is a stack: its home (depth 0) is a launcher, each
// section is one step in (depth 1), and a Sunday is a step further (depth 2).
// `frame: 'app'` hands it the whole screen, and the depths are what the top
// bar's trail and the app's rail read to know where a screen stands.
//
// The capability keeps its lineups name, because it is what the grants say.

export const schedulesRoutes = [
  {
    path: 'schedules',
    meta: { capability: 'lineups.view', app: 'lineups', frame: 'app', art: 'lineups' },
    children: [
      {
        path: '',
        name: 'SchedulesHome',
        meta: { depth: 0 },
        component: () => import('./ScheduleHome.vue'),
      },
      // The sections in the order the home's tiles are in, which is the order
      // a desktop's rail lists them in too (AppRail), so each wears the same
      // colour in both places.
      {
        path: 'mine',
        name: 'SchedulesMine',
        meta: { art: 'schedules-mine', title: 'My turns', depth: 1 },
        component: () => import('./ScheduleMine.vue'),
      },
      {
        // Optional: the calendar opens on this month. A month is what gets
        // shared with whoever is serving.
        path: 'calendar/:month(\\d{4}-\\d{2})?',
        name: 'SchedulesCalendar',
        meta: { art: 'schedules-calendar', title: 'Calendar', depth: 1 },
        component: () => import('./ScheduleCalendar.vue'),
      },
      // Each team's own section: its Sundays as it sees them, and the work only
      // it does — the songs, the message, the door, the newcomers. Anyone who
      // can see Schedules sees every team; planning each is the team's own
      // permission (src/data/scheduleTeams.js).
      {
        path: 'worship',
        name: 'SchedulesWorship',
        meta: { art: 'schedules-worship', title: 'Worship', depth: 1 },
        component: () => import('./ScheduleWorship.vue'),
      },
      {
        path: 'preaching',
        name: 'SchedulesPreaching',
        meta: { art: 'schedules-preaching', title: 'Preaching', depth: 1 },
        component: () => import('./SchedulePreaching.vue'),
      },
      {
        path: 'ushers',
        name: 'SchedulesUshers',
        meta: { art: 'schedules-ushers', title: 'Ushers', depth: 1 },
        component: () => import('./ScheduleUshers.vue'),
      },
      {
        path: 'welcome',
        name: 'SchedulesWelcome',
        meta: { art: 'schedules-welcome', title: 'Welcome', depth: 1 },
        component: () => import('./ScheduleWelcome.vue'),
      },
      {
        // Who serves how often is for whoever assigns people.
        path: 'team',
        name: 'SchedulesTeam',
        meta: { art: 'schedules-who', title: 'Who serves', depth: 1, capability: 'lineups.manage' },
        component: () => import('./ScheduleTeam.vue'),
      },
      {
        // Presenting is an app of its own now (src/apps/presentation).
        path: 'present',
        redirect: '/presentation/services',
      },
      {
        path: 'sunday/:date(\\d{4}-\\d{2}-\\d{2})',
        name: 'SchedulesSunday',
        meta: { art: 'schedules-calendar', depth: 2 },
        component: () => import('./ScheduleSunday.vue'),
      },
      {
        // The address a month always had, which shared links and the
        // "published" notification still carry.
        path: ':month(\\d{4}-\\d{2})',
        redirect: (to) => ({ name: 'SchedulesCalendar', params: { month: to.params.month }, query: to.query }),
      },
    ],
  },
]
