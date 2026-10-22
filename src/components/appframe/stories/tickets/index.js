import { defineAsyncComponent } from 'vue'

// Tickets' story (see ../index.js): feedback sent in a sentence, the answer
// coming back to whoever sent it, and what a church's administrators see:
// theirs to answer, and Ekkly's to see.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'tickets',
  scenes: [
    {
      caption: 'Tell us in a sentence',
      line: 'A bug, an idea, or something you love — pick one and send.',
      duration: 5200,
      scene: scene(() => import('./TicketsSend.vue')),
    },
    {
      caption: 'Hear back',
      line: 'See it picked up and done, and read the answer.',
      duration: 4400,
      scene: scene(() => import('./TicketsAnswer.vue')),
    },
    {
      caption: 'Your church answers its own',
      line: 'Questions and complaints to answer first; bugs go to Ekkly.',
      duration: 4000,
      scene: scene(() => import('./TicketsInbox.vue')),
    },
  ],
}
