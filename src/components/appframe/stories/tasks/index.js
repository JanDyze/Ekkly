import { defineAsyncComponent } from 'vue'

// Tasks' story (see ../index.js): a task in one line, ticked off, what is
// late, handed to someone, and each ministry's list.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'tasks',
  scenes: [
    {
      caption: 'Write it down in one line',
      line: 'Type a task, press Add, and it is on the list.',
      duration: 4400,
      scene: scene(() => import('./TasksQuickAdd.vue')),
    },
    {
      caption: 'Tick it off on the way out',
      line: 'One tap marks it done, with the name of who did it.',
      duration: 4400,
      scene: scene(() => import('./TasksTick.vue')),
    },
    {
      caption: 'Late ones never hide',
      line: 'Overdue comes first, in red, and the search finds just those.',
      duration: 4400,
      scene: scene(() => import('./TasksLate.vue')),
    },
    {
      caption: 'Hand it to the right person',
      line: 'Pick who, when and which ministry, and it is on their list.',
      duration: 4600,
      scene: scene(() => import('./TasksAssign.vue')),
    },
    {
      caption: 'Every ministry’s list, apart',
      line: 'What each ministry has open, and how much is late.',
      duration: 4000,
      scene: scene(() => import('./TasksMinistries.vue')),
    },
  ],
}
