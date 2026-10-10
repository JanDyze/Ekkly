// The People app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as Schedules (see its routes.js): a launcher home, its
// sections one step in, and a person's record a step further.
//
// It keeps the address the roll always had. /members is the home now, and a
// record is still /members/:id, which the top bar, the people rail, Accounts
// and Minutes all link to. The sections' fixed names sit beside :id, and the
// router tries a fixed path before a parameter, so no record is ever mistaken
// for one of them.

export const peopleRoutes = [
  {
    path: 'members',
    meta: { capability: 'members.view', app: 'members', frame: 'app', art: 'members' },
    children: [
      {
        path: '',
        name: 'PeopleHome',
        meta: { depth: 0 },
        component: () => import('./PeopleHome.vue'),
      },
      {
        // The whole roll. Its name is the one the page always had: the slide
        // into a record and the add sheet's ?add=true both look for it.
        path: 'everyone',
        name: 'Members',
        meta: { art: 'people-everyone', title: 'Everyone', depth: 1 },
        component: () => import('./PeopleEveryone.vue'),
      },
      {
        path: 'birthdays',
        name: 'PeopleBirthdays',
        meta: { art: 'people-birthdays', title: 'Birthdays', depth: 1 },
        component: () => import('./PeopleBirthdays.vue'),
      },
      {
        path: 'ministries',
        name: 'PeopleMinistries',
        meta: { art: 'people-ministries', title: 'Ministries', depth: 1 },
        component: () => import('./PeopleMinistries.vue'),
      },
      {
        // The people in no ministry: the same screen as a ministry's, because
        // it is the same question asked of the ones left over.
        path: 'not-serving',
        name: 'PeopleUnplaced',
        meta: { art: 'people-ministries', depth: 2 },
        component: () => import('./PeopleMinistry.vue'),
      },
      {
        // The members in no small group: the same screen again, the same
        // question asked of small groups (usePeopleGroups).
        path: 'not-in-a-group',
        name: 'PeopleUngrouped',
        meta: { art: 'people-ministries', depth: 2, capability: 'smallgroups.view' },
        component: () => import('./PeopleMinistry.vue'),
      },
      {
        path: 'ministries/:name',
        name: 'PeopleMinistry',
        meta: { art: 'people-ministries', depth: 2 },
        component: () => import('./PeopleMinistry.vue'),
      },
      {
        path: 'glance',
        name: 'PeopleGlance',
        meta: { art: 'people-glance', title: 'Overview', depth: 1 },
        component: () => import('./PeopleGlance.vue'),
      },
      {
        // Filling in other people's records is for whoever may edit them.
        path: 'missing',
        name: 'PeopleMissing',
        meta: { art: 'people-missing', title: 'Missing info', depth: 1, capability: 'members.manage' },
        component: () => import('./PeopleMissing.vue'),
      },
      {
        // Many people at once, typed, pasted or imported: for whoever may add them.
        path: 'add',
        name: 'PeopleAdd',
        meta: { depth: 1, capability: 'members.manage' },
        component: () => import('./PeopleAdd.vue'),
      },
      {
        path: ':id',
        name: 'MemberDetails',
        meta: { art: 'people-everyone', depth: 2 },
        component: () => import('./PersonRecord.vue'),
      },
    ],
  },
]
