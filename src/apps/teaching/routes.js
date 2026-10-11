// The Teaching app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as People and Minutes: a launcher home, its sections one step
// in, a Sunday's message or a class a step further, and a lesson a step past
// that (it is opened from a class as often as from the library).
//
// Teaching holds what is prepared ahead for a Sunday and taught to somebody:
// the message, Sunday school, and the lesson plans both are taught from.
// The message is the same sermon record Schedules' preaching sheet writes, so
// a sermon here and the preaching team's Sunday there are one thing.

export const teachingRoutes = [
  {
    path: 'teaching',
    meta: { capability: 'teaching.view', app: 'teaching', frame: 'app', art: 'teaching' },
    children: [
      {
        path: '',
        name: 'TeachingHome',
        meta: { depth: 0 },
        component: () => import('./TeachingHome.vue'),
      },
      {
        path: 'sermons',
        name: 'TeachingSermons',
        meta: { art: 'teaching-sermons', title: 'Sermons', depth: 1 },
        component: () => import('./TeachingSermons.vue'),
      },
      {
        path: 'sermons/:date(\\d{4}-\\d{2}-\\d{2})',
        name: 'TeachingSermon',
        meta: { art: 'teaching-sermons', depth: 2 },
        component: () => import('./TeachingSermon.vue'),
      },
      {
        path: 'sunday-school',
        name: 'TeachingSchool',
        meta: { art: 'teaching-school', title: 'Sunday school', depth: 1 },
        component: () => import('./TeachingSchool.vue'),
      },
      {
        path: 'sunday-school/:classId',
        name: 'TeachingClass',
        meta: { art: 'teaching-school', depth: 2 },
        component: () => import('./TeachingClass.vue'),
      },
      {
        path: 'plans',
        name: 'TeachingPlans',
        meta: { art: 'teaching-plans', title: 'Lesson plans', depth: 1 },
        component: () => import('./TeachingPlans.vue'),
      },
      {
        path: 'calendar',
        name: 'TeachingCalendar',
        meta: { art: 'teaching-calendar', title: 'What’s taught', depth: 1 },
        component: () => import('./TeachingCalendar.vue'),
      },
      {
        path: 'lessons/:id',
        name: 'TeachingLesson',
        meta: { art: 'teaching-plans', depth: 3 },
        component: () => import('./TeachingLesson.vue'),
      },
    ],
  },
]
