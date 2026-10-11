import { defineAsyncComponent } from 'vue'

// Prayer Concerns' story (see ../index.js): a request kept in seconds, the
// church's list by month, an answered prayer marked, and a request found
// again. Every concern in it is made up and written gently (cast.js).

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'prayer',
  scenes: [
    {
      caption: 'Write a request down',
      line: 'Who it is for, what they asked, how urgent.',
      duration: 5200,
      scene: scene(() => import('./PrayerAdd.vue')),
    },
    {
      caption: 'Pray for each other by name',
      line: 'The urgent ones first, then every request by month.',
      duration: 4400,
      scene: scene(() => import('./PrayerList.vue')),
    },
    {
      caption: 'Give thanks for answers',
      line: 'Mark a prayer answered, with a note of how.',
      duration: 4800,
      scene: scene(() => import('./PrayerAnswered.vue')),
    },
    {
      caption: 'Find any request again',
      line: 'A name, a word, or “ongoing” — it narrows as you type.',
      duration: 4200,
      scene: scene(() => import('./PrayerSearch.vue')),
    },
  ],
}
