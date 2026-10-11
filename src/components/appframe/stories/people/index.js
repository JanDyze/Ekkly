import { defineAsyncComponent } from 'vue'

// People's story (see ../index.js): everyone in one place, a whole person, the
// birthdays, who serves where, and the whole roll brought in at once.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'members',
  scenes: [
    {
      caption: 'Everyone, in one place',
      line: 'Members and attendees, found as you type.',
      duration: 4800,
      scene: scene(() => import('./PeopleRoll.vue')),
    },
    {
      caption: 'A whole person, one tap away',
      line: 'Call or text, where they serve, their group and their family.',
      duration: 4600,
      scene: scene(() => import('./PeopleRecord.vue')),
    },
    {
      caption: 'Never miss a birthday',
      line: 'Today’s first, then the week, and how old each one turns.',
      duration: 4200,
      scene: scene(() => import('./PeopleBirthdays.vue')),
    },
    {
      caption: 'See who serves where',
      line: 'Every ministry by size, and who is not serving yet.',
      duration: 4600,
      scene: scene(() => import('./PeopleServing.vue')),
    },
    {
      caption: 'Bring the whole roll at once',
      line: 'Paste it from a spreadsheet, and everyone is on it.',
      duration: 5000,
      scene: scene(() => import('./PeopleImport.vue')),
    },
  ],
}
