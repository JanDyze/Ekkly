// The Prayer app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as Minutes and Tasks: a home, and its sections one step in.
//
// It keeps the address the page always had. /prayer-concerns is the home now,
// which the notifications, YUNIT and the home of all apps all link to. Every
// list is the one screen (PrayerList), told by its route which concerns it is
// about, and a concern still opens in a drawer over its list rather than as a
// page: it is a small record, mostly edited (DESIGN.md).
//
// The whole list keeps the name the page had (PrayerConcerns), so anything
// that asks for it by name still lands on every concern rather than on a
// launcher. ?open=<id> opens one concern in it, and ?show=new or ?show=quiet
// narrows it to what a card on the home was about.

export const prayerRoutes = [
  {
    path: 'prayer-concerns',
    meta: { capability: 'prayer.view', app: 'prayer', frame: 'app', art: 'prayer' },
    children: [
      {
        path: '',
        name: 'PrayerHome',
        meta: { depth: 0 },
        component: () => import('./PrayerHome.vue'),
      },
      {
        path: 'now',
        name: 'PrayerNow',
        meta: { art: 'prayer-now', title: 'Praying now', depth: 1 },
        component: () => import('./PrayerList.vue'),
      },
      {
        path: 'ongoing',
        name: 'PrayerOngoing',
        meta: { art: 'prayer-ongoing', title: 'Ongoing', depth: 1 },
        component: () => import('./PrayerList.vue'),
      },
      {
        path: 'answered',
        name: 'PrayerAnswered',
        meta: { art: 'prayer-answered', title: 'Answered', depth: 1 },
        component: () => import('./PrayerList.vue'),
      },
      {
        path: 'all',
        name: 'PrayerConcerns',
        meta: { art: 'prayer-all', title: 'All concerns', depth: 1 },
        component: () => import('./PrayerList.vue'),
      },
    ],
  },
]
