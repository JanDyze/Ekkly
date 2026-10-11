import { defineAsyncComponent } from 'vue'

// Events' story (see ../index.js): what is on next and the week ahead, the
// month on one grid, a gathering added, a change of plan told to everyone,
// and the week's regular gatherings.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'events',
  scenes: [
    {
      caption: 'Know what is on next',
      line: 'The next gathering, and the whole week ahead at a glance.',
      duration: 4400,
      scene: scene(() => import('./EvNext.vue')),
    },
    {
      caption: 'Your month on one grid',
      line: 'Services, events, holidays and birthdays, a tap per day.',
      duration: 4600,
      scene: scene(() => import('./EvCalendar.vue')),
    },
    {
      caption: 'Add an event in seconds',
      line: 'Name it, pick the day, and say who it is for.',
      duration: 4800,
      scene: scene(() => import('./EvAdd.vue')),
    },
    {
      caption: 'Tell everyone plans changed',
      line: 'Mark it postponed, and it leads the app for everyone.',
      duration: 5000,
      scene: scene(() => import('./EvChange.vue')),
    },
    {
      caption: 'Every week, laid out',
      line: 'When you meet, day by day: the first thing newcomers ask.',
      duration: 4200,
      scene: scene(() => import('./EvWeekly.vue')),
    },
  ],
}
