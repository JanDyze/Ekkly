import { defineAsyncComponent } from 'vue'

// The Bible's story (see ../index.js): reading in your own translation, any
// chapter in two taps, a verse by its reference, and a verse by its words.
// The Scripture in it is the King James and the World English, quoted word
// for word (verses.js).

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'bible',
  scenes: [
    {
      caption: 'The Bible in your language',
      line: 'Tagalog or English, switched mid-chapter to compare a verse.',
      duration: 5000,
      scene: scene(() => import('./BibleTranslation.vue')),
    },
    {
      caption: 'Any chapter in two taps',
      line: 'The book, then the chapter, and you are reading.',
      duration: 4800,
      scene: scene(() => import('./BiblePicker.vue')),
    },
    {
      caption: 'Straight to the verse',
      line: 'Type Juan 3:16 or John 3:16, whichever you remember.',
      duration: 4600,
      scene: scene(() => import('./BibleReference.vue')),
    },
    {
      caption: 'Find a verse by its words',
      line: 'Half-remember a phrase, and all 66 books are searched.',
      duration: 5000,
      scene: scene(() => import('./BibleSearch.vue')),
    },
  ],
}
