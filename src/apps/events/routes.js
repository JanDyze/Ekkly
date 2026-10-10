// The Events app's screens, mounted under AdminLayout by src/router/index.js
// — the same shape as the other apps: a home, and its sections one step in.
// /events is its home now; the month grid is its Calendar.
//
// Videos stays an app of its own at /videos (src/apps/videos), part of Events
// as far as a church's plan is concerned, and a door from this one's home.

export const eventsRoutes = [
  {
    path: 'events',
    meta: { capability: 'events.view', app: 'events', frame: 'app', art: 'events' },
    children: [
      {
        path: '',
        name: 'EventsHome',
        meta: { depth: 0 },
        component: () => import('./EventsHome.vue'),
      },
      {
        // The month grid. ?date=YYYY-MM-DD opens that day.
        path: 'calendar',
        name: 'Events',
        meta: { art: 'events-calendar', depth: 1 },
        component: () => import('./EventsCalendar.vue'),
      },
      {
        path: 'coming-up',
        name: 'EventsUpcoming',
        meta: { art: 'events-upcoming', depth: 1 },
        component: () => import('./EventsUpcoming.vue'),
      },
      {
        path: 'weekly',
        name: 'EventsWeekly',
        meta: { art: 'events-weekly', depth: 1 },
        component: () => import('./EventsWeekly.vue'),
      },
    ],
  },
]
