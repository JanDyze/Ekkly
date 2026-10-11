import { defineAsyncComponent } from 'vue'

// The Gallery's story (see ../index.js): every gathering's album, a Sunday's
// photos put up at once, a photo on the whole screen, and the newest photos
// from everywhere. Its pictures are drawings standing in for photos
// (photos.js), never a church's own.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'gallery',
  scenes: [
    {
      caption: 'Every gathering, in pictures',
      line: 'Albums month by month, each under its own cover.',
      duration: 4200,
      scene: scene(() => import('./GalleryAlbums.vue')),
    },
    {
      caption: 'Put up a whole Sunday',
      line: 'Pick the photos, and watch them land one by one.',
      duration: 5000,
      scene: scene(() => import('./GalleryUpload.vue')),
    },
    {
      caption: 'Every photo, full screen',
      line: 'Swipe through, share a link, save it, or make it the cover.',
      duration: 4800,
      scene: scene(() => import('./GalleryLightbox.vue')),
    },
    {
      caption: 'See what is new',
      line: 'The newest photos from every album, the new ones counted.',
      duration: 4200,
      scene: scene(() => import('./GalleryRecent.vue')),
    },
  ],
}
