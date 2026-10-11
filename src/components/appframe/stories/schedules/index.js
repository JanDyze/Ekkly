import { defineAsyncComponent } from 'vue'

// Schedules' story (see ../index.js): your own turns, a role filled from the
// people who can do it, the songs and their keys, the ushers' Sunday
// checklist, and a month published for everyone.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'lineups',
  scenes: [
    {
      caption: 'Know when you are on',
      line: 'Your next turn first, then every Sunday you serve.',
      duration: 4400,
      scene: scene(() => import('./SchMine.vue')),
    },
    {
      caption: 'Fill a role in two taps',
      line: 'Pick from who can do it; anyone doubled up is flagged.',
      duration: 4800,
      scene: scene(() => import('./SchFill.vue')),
    },
    {
      caption: 'Songs and keys, in order',
      line: 'The worship team picks the songs, each in its key.',
      duration: 4400,
      scene: scene(() => import('./SchSongs.vue')),
    },
    {
      caption: 'Every Sunday job, ticked',
      line: 'The ushers’ checklist, ticked off as each one is done.',
      duration: 4600,
      scene: scene(() => import('./SchUshers.vue')),
    },
    {
      caption: 'Publish when it is ready',
      line: 'A draft is the planners’ alone; publish, and all can see.',
      duration: 4600,
      scene: scene(() => import('./SchPublish.vue')),
    },
  ],
}
