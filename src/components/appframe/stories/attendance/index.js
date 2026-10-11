import { defineAsyncComponent } from 'vue'

// Attendance's story (see ../index.js): the room counted as it fills, the
// swipe deck for a long roll, every gathering with how full it was, the people
// gone quiet, and how many the church saw in a month.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'attendance',
  scenes: [
    {
      caption: 'Count the room as it fills',
      line: 'Tick each name as they arrive, and the ring fills.',
      duration: 4800,
      scene: scene(() => import('./AttRoll.vue')),
    },
    {
      caption: 'Or swipe through the roll',
      line: 'Right for present, left to come back to latecomers.',
      duration: 4800,
      scene: scene(() => import('./AttSwipe.vue')),
    },
    {
      caption: 'See how full each one was',
      line: 'Services, meetings and events, each with its turnout.',
      duration: 4400,
      scene: scene(() => import('./AttGatherings.vue')),
    },
    {
      caption: 'Invite back the ones missed',
      line: 'Who has not been seen in three weeks, longest first.',
      duration: 4400,
      scene: scene(() => import('./AttQuiet.vue')),
    },
    {
      caption: 'See everyone you reached',
      line: 'Everyone seen this month, each person counted once.',
      duration: 4600,
      scene: scene(() => import('./AttReach.vue')),
    },
  ],
}
