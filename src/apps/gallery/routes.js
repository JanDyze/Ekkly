// The Gallery app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as Minutes and People: a home, its sections one step in, an
// album a step further, and a photo in it one more.
//
// Every address the gallery ever handed out still lands. /gallery is the home
// now, which the menu and the notification settings point at; an album is
// still /gallery/:id, which a new album's notification links to; and a photo
// is still /gallery/:id/v/:photoId, which Share copies. /gallery/all was once
// the list of albums, and goes to it. The sections' fixed names sit beside :id,
// and the router tries a fixed path before a parameter, so no album is ever
// mistaken for one of them.
//
// The album and its photo are one screen (GalleryAlbum): the photo opens over
// the album's grid, so going from one to the other keeps the grid and its
// photos where they are rather than loading them again.

export const galleryRoutes = [
  {
    path: 'gallery',
    meta: { capability: 'gallery.view', app: 'gallery', frame: 'app', art: 'gallery' },
    children: [
      {
        path: '',
        name: 'GalleryHome',
        meta: { depth: 0 },
        component: () => import('./GalleryHome.vue'),
      },
      {
        // Every album with photos in it, month by month. It keeps the name the
        // page always had, so a link to { name: 'Gallery' } still lands on the
        // albums rather than a launcher.
        path: 'albums',
        name: 'Gallery',
        meta: { art: 'gallery-albums', title: 'Albums', depth: 1 },
        component: () => import('./GalleryAlbums.vue'),
      },
      {
        path: 'all',
        redirect: { name: 'Gallery' },
      },
      {
        path: 'recent',
        name: 'GalleryRecent',
        meta: { art: 'gallery-recent', title: 'Recent photos', depth: 1 },
        component: () => import('./GalleryRecent.vue'),
      },
      {
        path: 'kinds',
        name: 'GalleryKinds',
        meta: { art: 'gallery-kinds', title: 'By kind', depth: 1 },
        component: () => import('./GalleryKinds.vue'),
      },
      {
        // One kind's albums: the albums screen, told which kind by its route.
        path: 'kinds/:kind',
        name: 'GalleryKind',
        meta: { art: 'gallery-kinds', depth: 2 },
        component: () => import('./GalleryAlbums.vue'),
      },
      {
        // Putting photos up is for whoever may manage the gallery.
        path: 'waiting',
        name: 'GalleryWaiting',
        meta: { art: 'gallery-waiting', title: 'Needs photos', depth: 1, capability: 'gallery.manage' },
        component: () => import('./GalleryWaiting.vue'),
      },
      {
        path: ':id',
        name: 'GalleryAlbum',
        meta: { art: 'gallery-albums', depth: 2 },
        component: () => import('./GalleryAlbum.vue'),
        props: true,
      },
      {
        // A photo's address with the photo left off is its album.
        path: ':id/v',
        redirect: (to) => ({ name: 'GalleryAlbum', params: { id: to.params.id } }),
      },
      {
        path: ':id/v/:photoId',
        name: 'GalleryPhoto',
        meta: { art: 'gallery-albums', depth: 3 },
        component: () => import('./GalleryAlbum.vue'),
        props: true,
      },
    ],
  },
]
