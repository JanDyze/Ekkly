// The Schedules app's screens, mounted under AdminLayout by src/router/index.js.
//
// An app inside Ekkly is a stack: its home (depth 0) is a launcher, each
// section is one step in (depth 1), and a Sunday is a step further (depth 2).
// `frame: 'app'` hands it the whole screen, and the depths are what the slide
// between screens reads to know which way to go (src/router/viewTransitions.js).
//
// The capability keeps its lineups name, because it is what the grants say.

export const schedulesRoutes = [
  {
    path: 'schedules',
    meta: { capability: 'lineups.view', app: 'lineups', frame: 'app' },
    children: [
      {
        path: '',
        name: 'SchedulesHome',
        meta: { depth: 0 },
        component: () => import('./ScheduleHome.vue'),
      },
      {
        // Optional: the calendar opens on this month. A month is what gets
        // shared with whoever is serving.
        path: 'calendar/:month(\\d{4}-\\d{2})?',
        name: 'SchedulesCalendar',
        meta: { depth: 1 },
        component: () => import('./ScheduleCalendar.vue'),
      },
      {
        path: 'mine',
        name: 'SchedulesMine',
        meta: { depth: 1 },
        component: () => import('./ScheduleMine.vue'),
      },
      {
        // Who serves how often is for whoever assigns people.
        path: 'team',
        name: 'SchedulesTeam',
        meta: { depth: 1, capability: 'lineups.manage' },
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
        meta: { depth: 2 },
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
