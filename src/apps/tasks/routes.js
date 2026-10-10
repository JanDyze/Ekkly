// The Tasks app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as People and Finances: a home, and its sections one step
// in. /tasks is its home now.
//
// The whole list keeps the name the page always had (Tasks), so a link made
// before the app — a search result, the home's "tasks you owe" — still lands
// on a list rather than a launcher. Every list is the one screen (TasksList),
// told by its route which tasks it is about.

export const tasksRoutes = [
  {
    path: 'tasks',
    meta: { capability: 'tasks.view', app: 'tasks', frame: 'app', art: 'tasks' },
    children: [
      {
        path: '',
        name: 'TasksHome',
        meta: { depth: 0 },
        component: () => import('./TasksHome.vue'),
      },
      {
        path: 'mine',
        name: 'TasksMine',
        meta: { art: 'tasks-mine', title: 'Mine', depth: 1 },
        component: () => import('./TasksList.vue'),
      },
      {
        // ?q= opens it already searched — "unassigned", from the home's card.
        path: 'all',
        name: 'Tasks',
        meta: { art: 'tasks-everyone', title: 'Everyone’s', depth: 1 },
        component: () => import('./TasksList.vue'),
      },
      {
        path: 'ministries',
        name: 'TasksMinistries',
        meta: { art: 'tasks-ministries', title: 'By ministry', depth: 1 },
        component: () => import('./TasksMinistries.vue'),
      },
      {
        // The open tasks filed under no ministry.
        path: 'no-ministry',
        name: 'TasksUnfiled',
        meta: { art: 'tasks-ministries', depth: 2 },
        component: () => import('./TasksList.vue'),
      },
      {
        // One ministry's tasks.
        path: 'ministries/:name',
        name: 'TasksMinistry',
        meta: { art: 'tasks-ministries', depth: 2 },
        component: () => import('./TasksList.vue'),
      },
      {
        path: 'done',
        name: 'TasksDone',
        meta: { art: 'tasks-done', title: 'Done', depth: 1 },
        component: () => import('./TasksList.vue'),
      },
    ],
  },
]
