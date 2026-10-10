// The Finances app's screens, mounted under AdminLayout by src/router/index.js
// — the same shape as People, Schedules and Attendance: a home, and its
// sections one step in. /finances is its home now.

export const financesRoutes = [
  {
    path: 'finances',
    meta: { capability: 'finances.view', app: 'finances', frame: 'app', art: 'finances' },
    children: [
      {
        path: '',
        name: 'FinancesHome',
        meta: { depth: 0 },
        component: () => import('./FinancesHome.vue'),
      },
      {
        // The book, a month at a time. Optional month; this one by default.
        // ?new=offering&date= opens a new Sunday offering already filled in.
        path: 'book/:month(\d{4}-\d{2})?',
        name: 'Finances',
        meta: { art: 'finances-book', title: 'Book', depth: 1 },
        component: () => import('./FinancesBook.vue'),
      },
      {
        path: 'statement/:month(\d{4}-\d{2})?',
        name: 'FinancesStatement',
        meta: { art: 'finances-statement', title: 'Statement', depth: 1 },
        component: () => import('./FinancesStatement.vue'),
      },
      {
        // ?set=opening opens the opening balance to fill in.
        path: 'accounts',
        name: 'FinancesAccounts',
        meta: { art: 'finances-accounts', title: 'Accounts', depth: 1 },
        component: () => import('./FinancesAccounts.vue'),
      },
      {
        path: 'months',
        name: 'FinancesMonths',
        meta: { art: 'finances-months', title: 'By month', depth: 1 },
        component: () => import('./FinancesMonths.vue'),
      },
    ],
  },
]
