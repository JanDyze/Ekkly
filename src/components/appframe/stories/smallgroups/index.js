import { defineAsyncComponent } from 'vue'

// Small groups' story (see ../index.js): every group at a glance, tonight's
// meeting logged as people arrive, the form in Tagalog, the members in no
// group yet, and every session with how many came.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'smallgroups',
  scenes: [
    {
      caption: 'Every group at a glance',
      line: 'Who leads it, when it meets, and how many are in it.',
      duration: 4400,
      scene: scene(() => import('./SgGroups.vue')),
    },
    {
      caption: 'Tick who came, tonight',
      line: 'Mark each one present and the form keeps the count.',
      duration: 4800,
      scene: scene(() => import('./SgAttendance.vue')),
    },
    {
      caption: 'In Tagalog or English',
      line: 'One tap turns the whole form, and its printout, Tagalog.',
      duration: 4800,
      scene: scene(() => import('./SgLanguage.vue')),
    },
    {
      caption: 'See who has no group',
      line: 'Members in no group yet, by age, ready to invite.',
      duration: 4400,
      scene: scene(() => import('./SgUnplaced.vue')),
    },
    {
      caption: 'Every meeting, counted',
      line: 'Each session by month, what was taught and who came.',
      duration: 4600,
      scene: scene(() => import('./SgSessions.vue')),
    },
  ],
}
