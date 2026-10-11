import { defineAsyncComponent } from 'vue'

// Teaching's story (see ../index.js): this Sunday's message and every class
// at a glance, the preacher's notes written ahead, a lesson laid out for the
// teacher, a good plan taught again, and the sermon and the lessons side by
// side.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'teaching',
  scenes: [
    {
      caption: 'Sunday, ready before Sunday',
      line: 'The message and every class, and which are ready.',
      duration: 4600,
      scene: scene(() => import('./TeachingSunday.vue')),
    },
    {
      caption: 'Write the message ahead',
      line: 'The title, the passage and the outline, for the screen too.',
      duration: 5200,
      scene: scene(() => import('./TeachingNotes.vue')),
    },
    {
      caption: 'A lesson a teacher can follow',
      line: 'What it is for, the memory verse, what to bring.',
      duration: 4800,
      scene: scene(() => import('./TeachingLesson.vue')),
    },
    {
      caption: 'Teach a good lesson again',
      line: 'Find last year’s plan and put it on a class’s Sunday.',
      duration: 5000,
      scene: scene(() => import('./TeachingReuse.vue')),
    },
    {
      caption: 'The sermon and the lessons together',
      line: 'Sunday by Sunday, so the children hear what the church hears.',
      duration: 4600,
      scene: scene(() => import('./TeachingWeeks.vue')),
    },
  ],
}
