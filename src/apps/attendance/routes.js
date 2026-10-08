// The Attendance app's screens, mounted under AdminLayout by
// src/router/index.js — the same shape as People and Schedules: a home, its
// sections one step in, and recording a gathering a step further.
//
// It keeps the addresses it always had: /attendance is its home now, and
// /attendance/record is still the recorder, which Schedules' ushers open.

export const attendanceRoutes = [
  {
    path: 'attendance',
    meta: { capability: 'attendance.view', app: 'attendance', frame: 'app' },
    children: [
      {
        path: '',
        name: 'AttendanceHome',
        meta: { depth: 0 },
        component: () => import('./AttendanceHome.vue'),
      },
      {
        // Every gathering, month by month. The name is the one the page always
        // had, which Schedules' ushers fall back to.
        path: 'gatherings',
        name: 'Attendance',
        meta: { depth: 1 },
        component: () => import('./AttendanceGatherings.vue'),
      },
      {
        // What is still to be counted is for whoever counts it.
        path: 'to-record',
        name: 'AttendanceOwed',
        meta: { depth: 1, capability: 'attendance.manage' },
        component: () => import('./AttendanceOwed.vue'),
      },
      {
        path: 'quiet',
        name: 'AttendanceQuiet',
        meta: { depth: 1 },
        component: () => import('./AttendanceQuiet.vue'),
      },
      {
        path: 'months',
        name: 'AttendanceMonths',
        meta: { depth: 1 },
        component: () => import('./AttendanceMonths.vue'),
      },
      {
        // Recording is a screen of its own: a swipe deck and a hundred names
        // need every pixel, and it carries its own way back. ?key= a
        // gathering, ?id= an existing record, neither = a one-off.
        path: 'record',
        name: 'RecordAttendance',
        meta: { depth: 2, capability: 'attendance.manage' },
        component: () => import('./AttendanceRecorder.vue'),
      },
    ],
  },
]
