// The Videos app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as Schedules (see its routes.js).
//
// Part of the Events app as far as a church's plan and grants are concerned:
// the videos are made from the calendar, and a church without one would have
// nothing to announce. Anyone who can see the calendar can watch and save a
// month's video; changing what it says, or how it looks, is for whoever
// manages events.

export const videosRoutes = [
  {
    path: 'videos',
    meta: { capability: 'events.view', app: 'events', frame: 'app' },
    children: [
      {
        path: '',
        name: 'VideosHome',
        meta: { depth: 0 },
        component: () => import('./VideoHome.vue'),
      },
      {
        // Before the month, so "look" is never read as one.
        path: 'look',
        name: 'VideosLook',
        meta: { depth: 1, capability: 'events.manage' },
        component: () => import('./VideoLook.vue'),
      },
      {
        path: ':month(\\d{4}-\\d{2})',
        name: 'VideosMonth',
        meta: { depth: 1 },
        component: () => import('./VideoStudio.vue'),
      },
    ],
  },
]
