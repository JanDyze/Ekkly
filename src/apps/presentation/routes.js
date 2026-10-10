// The Presentation app's screens, mounted under AdminLayout by
// src/router/index.js — the same shape as Schedules (see its routes.js).
//
// Running a service itself stays where it always was, at /present/:date: a
// full-screen focus page for the booth, which this app's home and the
// Schedules app both open.
//
// One app as far as a church's plan and grants are concerned — lineups,
// "Schedules & Presentation" in lib/apps.js — but two places to work, because
// they are two different teams' jobs.

export const presentationRoutes = [
  {
    path: 'presentation',
    meta: { capability: 'lineups.view', app: 'lineups', frame: 'app', art: 'presentation' },
    children: [
      {
        path: '',
        name: 'PresentationHome',
        meta: { depth: 0 },
        component: () => import('./PresentationHome.vue'),
      },
      {
        // Every service on file. The name is the one the presenter's own back
        // button has always used.
        path: 'services',
        name: 'Services',
        meta: { depth: 1 },
        component: () => import('./PresentationServices.vue'),
      },
    ],
  },
]
