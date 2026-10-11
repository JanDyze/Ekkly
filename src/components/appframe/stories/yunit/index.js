import { defineAsyncComponent } from 'vue'

// YUNIT's story (see ../index.js): meeting him, a question asked as it would
// be said, a change that waits for Confirm, and the figures without digging.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'ai',
  scenes: [
    {
      caption: 'An assistant who knows your church',
      line: 'Ask about the church, or tell him what to change.',
      duration: 4200,
      scene: scene(() => import('./YunitMeet.vue')),
    },
    {
      caption: 'Ask the way you talk',
      line: 'Taglish is fine. He looks it up and answers with cards.',
      duration: 4800,
      scene: scene(() => import('./YunitAsk.vue')),
    },
    {
      caption: 'Nothing changes until you confirm',
      line: 'He writes the change as a card, and waits for Confirm.',
      duration: 5000,
      scene: scene(() => import('./YunitConfirm.vue')),
    },
    {
      caption: 'Numbers without the digging',
      line: 'Attendance and totals, read straight from your church’s records.',
      duration: 4800,
      scene: scene(() => import('./YunitNumbers.vue')),
    },
  ],
}
