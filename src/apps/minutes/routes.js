// The Minutes app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as Tasks and People: a home, its sections one step in, and a
// meeting a step further.
//
// A meeting keeps the address it always had, /minutes/:id, which search, a
// task made from an action item and the attendance recorder all link to. The
// sections' fixed names sit beside :id, and the router tries a fixed path
// before a parameter, so no meeting is ever mistaken for one of them.
//
// The meeting itself is still a focus route: it is a document, read on a
// phone and written into during the meeting, so it takes the whole screen and
// carries its own way back (views/MinuteDetails.vue).

export const minutesRoutes = [
  {
    path: 'minutes',
    meta: { capability: 'minutes.view', app: 'minutes', frame: 'app', art: 'minutes' },
    children: [
      {
        path: '',
        name: 'MinutesHome',
        meta: { depth: 0 },
        component: () => import('./MinutesHome.vue'),
      },
      {
        path: 'meetings',
        name: 'MinutesMeetings',
        meta: { art: 'minutes-meetings', title: 'Meetings', depth: 1 },
        component: () => import('./MinutesMeetings.vue'),
      },
      {
        path: 'write-up',
        name: 'MinutesWriteUp',
        meta: { art: 'minutes-writeup', title: 'To write up', depth: 1 },
        component: () => import('./MinutesWriteUp.vue'),
      },
      {
        path: 'actions',
        name: 'MinutesActions',
        meta: { art: 'minutes-actions', title: 'Action items', depth: 1 },
        component: () => import('./MinutesActions.vue'),
      },
      {
        path: 'decisions',
        name: 'MinutesDecisions',
        meta: { art: 'minutes-decisions', title: 'Decisions', depth: 1 },
        component: () => import('./MinutesDecisions.vue'),
      },
      {
        path: ':id',
        name: 'MinuteDetails',
        meta: { art: 'minutes-meetings', depth: 2, focus: true },
        component: () => import('../../views/MinuteDetails.vue'),
      },
    ],
  },
]
