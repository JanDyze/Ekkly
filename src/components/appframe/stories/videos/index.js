import { defineAsyncComponent } from 'vue'

// Videos' story (see ../index.js): the month already a video, watched before
// it is posted, a look of the church's own, a change of plan it keeps up
// with, and the file shared.

const scene = (load) => defineAsyncComponent(load)

export default {
  art: 'videos',
  scenes: [
    {
      caption: 'Your month, already a video',
      line: 'Every event on the calendar becomes a card, on its own.',
      duration: 4200,
      scene: scene(() => import('./VideosReady.vue')),
    },
    {
      caption: 'Watch it before you post',
      line: 'Each card over its photo, in your colour, with music.',
      duration: 4400,
      scene: scene(() => import('./VideosPlay.vue')),
    },
    {
      caption: 'A look of your own',
      line: 'Choose it once, and every month’s video follows.',
      duration: 4200,
      scene: scene(() => import('./VideosLook.vue')),
    },
    {
      caption: 'Plans change, so does the video',
      line: 'Move an event, and its card says Postponed by itself.',
      duration: 4400,
      scene: scene(() => import('./VideosChange.vue')),
    },
    {
      caption: 'Post it in a tap',
      line: 'Make the file, then share it to Facebook or Messenger.',
      duration: 4800,
      scene: scene(() => import('./VideosShare.vue')),
    },
  ],
}
