import { defineAsyncComponent } from 'vue'

// Inventory's story (see ../index.js): a photo with its background taken out,
// everything the church owns in one list, lending something with a day to
// bring it back, seeing what is late and taking it back, and the broken
// things nobody forgets.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'inventory',
  scenes: [
    {
      caption: 'Snap it, and it stands on its own',
      line: 'The background comes off on the phone, right after the photo.',
      duration: 5000,
      scene: scene(() => import('./InventoryShoot.vue')),
    },
    {
      caption: 'Everything the church owns',
      line: 'Each thing with its picture and where it is kept, found as you type.',
      duration: 4600,
      scene: scene(() => import('./InventoryShelf.vue')),
    },
    {
      caption: 'Lent, with a day to bring it back',
      line: 'Who has it, how many and until when, in three taps.',
      duration: 5000,
      scene: scene(() => import('./InventoryLend.vue')),
    },
    {
      caption: 'Know what is out, and what is late',
      line: 'Late first, then what is due this week. One tap when it is back.',
      duration: 4600,
      scene: scene(() => import('./InventoryBack.vue')),
    },
    {
      caption: 'Nothing broken is forgotten',
      line: 'What is wrong with it, and how long it has waited.',
      duration: 4400,
      scene: scene(() => import('./InventoryFix.vue')),
    },
  ],
}
