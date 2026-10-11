// The Small groups app's screens, mounted under AdminLayout by
// src/router/index.js — the same shape as People and Minutes: a home, its
// sections one step in, a group a step further, and one of its sessions a
// step beyond that.
//
// A group keeps the address it always had, /small-groups/:id, which People,
// search and Videos all link to, and a session its own under it. The
// sections' fixed names sit beside :id, and the router tries a fixed path
// before a parameter, so no group is ever mistaken for one of them.

export const smallGroupsRoutes = [
  {
    path: 'small-groups',
    meta: { capability: 'smallgroups.view', app: 'smallgroups', frame: 'app', art: 'smallgroups' },
    children: [
      {
        path: '',
        name: 'SmallGroupsHome',
        meta: { depth: 0 },
        component: () => import('./SmallGroupsHome.vue'),
      },
      {
        path: 'all',
        name: 'SmallGroupsAll',
        meta: { art: 'smallgroups-groups', title: 'Groups', depth: 1 },
        component: () => import('./SmallGroupsAll.vue'),
      },
      {
        path: 'sessions',
        name: 'SmallGroupsSessions',
        meta: { art: 'smallgroups-sessions', title: 'Sessions', depth: 1 },
        component: () => import('./SmallGroupsSessions.vue'),
      },
      {
        // Counted from the roll, so it needs the roll as well as the groups.
        path: 'not-in-a-group',
        name: 'SmallGroupsUnplaced',
        meta: { art: 'smallgroups-unplaced', title: 'Not in a group', depth: 1, capability: 'members.view' },
        component: () => import('./SmallGroupsUnplaced.vue'),
      },
      {
        path: 'forms',
        name: 'SmallGroupsForms',
        meta: { art: 'smallgroups-forms', title: 'Forms', depth: 1 },
        component: () => import('./SmallGroupsForms.vue'),
      },
      {
        path: ':id',
        name: 'SmallGroupDetails',
        meta: { art: 'smallgroups-groups', depth: 2 },
        component: () => import('../../views/SmallGroupDetails.vue'),
      },
      {
        path: ':id/sessions/:sessionId',
        name: 'SgSessionDetails',
        meta: { art: 'smallgroups-sessions', depth: 3 },
        component: () => import('../../views/SgSessionDetails.vue'),
      },
    ],
  },
]
