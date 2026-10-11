import { defineAsyncComponent } from 'vue'

// Songs' story (see ../index.js): a song found by a line of it, each leader's
// key, a song brought in from YouTube, the words split into sections for the
// slides, and what the church sings most.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'songs',
  scenes: [
    {
      caption: 'Find a song by any line',
      line: 'Type the words you remember; the lyrics are searched too.',
      duration: 4600,
      scene: scene(() => import('./SongSearch.vue')),
    },
    {
      caption: 'Every leader’s key, kept',
      line: 'The key each song leader sings it in, beside the recording.',
      duration: 4400,
      scene: scene(() => import('./SongKeys.vue')),
    },
    {
      caption: 'Not on the list? Add it',
      line: 'Search YouTube from the same box, and add it from there.',
      duration: 5000,
      scene: scene(() => import('./SongYoutube.vue')),
    },
    {
      caption: 'Words ready for the slides',
      line: 'Verses and chorus found, and the order they are sung.',
      duration: 4800,
      scene: scene(() => import('./SongSections.vue')),
    },
    {
      caption: 'See what you sing most',
      line: 'How often each is sung, and the ones resting too long.',
      duration: 4400,
      scene: scene(() => import('./SongSung.vue')),
    },
  ],
}
