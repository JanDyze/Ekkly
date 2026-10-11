import { defineAsyncComponent } from 'vue'

// Minutes' story (see ../index.js): notes typed during the meeting, YUNIT
// writing them up, the commitments put on the To-do list, and every decision
// found again by searching for it.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'minutes',
  scenes: [
    {
      caption: 'Notes typed as you meet',
      line: 'Under each agenda item, with names pulled off the roster.',
      duration: 5000,
      scene: scene(() => import('./MinutesNotes.vue')),
    },
    {
      caption: 'YUNIT writes the minutes',
      line: 'Rough notes in, proper minutes out, ready to file.',
      duration: 5000,
      scene: scene(() => import('./MinutesYunit.vue')),
    },
    {
      caption: 'Every promise on a list',
      line: 'Each action item becomes a task for whoever said yes.',
      duration: 4600,
      scene: scene(() => import('./MinutesTasks.vue')),
    },
    {
      caption: 'Find what was decided',
      line: 'Every meeting’s decisions in one search, not twenty files.',
      duration: 4600,
      scene: scene(() => import('./MinutesDecided.vue')),
    },
  ],
}
