import { defineAsyncComponent } from 'vue'

// Links' story (see ../index.js): every link the church hands out, sorted;
// a new one kept with its address checked; and one handed on in a tap.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'links',
  scenes: [
    {
      caption: 'Every link, in one place',
      line: 'Livestream, giving, song sheets — sorted, and filtered in a tap.',
      duration: 4600,
      scene: scene(() => import('./LinksList.vue')),
    },
    {
      caption: 'Save a link, checked',
      line: 'It reads the address back, so a typo shows now.',
      duration: 5000,
      scene: scene(() => import('./LinksAdd.vue')),
    },
    {
      caption: 'Share it in a tap',
      line: 'Copy the livestream link straight into the group chat.',
      duration: 4200,
      scene: scene(() => import('./LinksCopy.vue')),
    },
  ],
}
