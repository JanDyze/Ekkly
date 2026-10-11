import { defineAsyncComponent } from 'vue'

// Presentation's story (see ../index.js): Sunday's run sheet already filled
// in, a reading looked up, the words on the wall slide by slide, songs with
// no words caught before Sunday, and a clear screen for the prayer.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'presentation',
  scenes: [
    {
      caption: 'Sunday’s run sheet, already filled',
      line: 'The worship team’s songs and the preacher’s readings, in order.',
      duration: 4400,
      scene: scene(() => import('./PresentRunSheet.vue')),
    },
    {
      caption: 'Readings looked up, not typed',
      line: 'Type the reference, and the verse comes from the Bible.',
      duration: 4600,
      scene: scene(() => import('./PresentReading.vue')),
    },
    {
      caption: 'The words on the wall',
      line: 'Press Next as they sing, and the screen follows, slide by slide.',
      duration: 4400,
      scene: scene(() => import('./PresentLyrics.vue')),
    },
    {
      caption: 'No blank screen mid-song',
      line: 'Songs with no words yet are flagged before Sunday.',
      duration: 4400,
      scene: scene(() => import('./PresentWords.vue')),
    },
    {
      caption: 'A clear screen for prayer',
      line: 'Blank it in one press, and bring back the same slide.',
      duration: 4600,
      scene: scene(() => import('./PresentBlank.vue')),
    },
  ],
}
