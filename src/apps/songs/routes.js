// The Songs app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as Minutes and People: a home, its sections one step in, and
// a song a step further.
//
// A song keeps the address it always had, /songs/:id, and its route name
// (SongDetails), which search and the connector's links use. The sections'
// fixed names sit beside :id, and the router tries a fixed path before a
// parameter, so no song is ever mistaken for one of them.
//
// The whole list keeps the name the page always had (SongList), so anything
// that asked for the song list by name still lands on a list rather than a
// launcher.
//
// The song itself is still a focus route: typing out a song needs the whole
// screen, the way recording attendance does, and it carries its own way back.

export const songsRoutes = [
  {
    path: 'songs',
    meta: { capability: 'songs.view', app: 'songs', frame: 'app', art: 'songs' },
    children: [
      {
        path: '',
        name: 'SongsHome',
        meta: { depth: 0 },
        component: () => import('./SongsHome.vue'),
      },
      {
        // ?q= opens it already searched.
        path: 'all',
        name: 'SongList',
        meta: { art: 'songs-all', title: 'All songs', depth: 1 },
        component: () => import('./SongsAll.vue'),
      },
      {
        // The Sundays are the schedules', so only someone who may see those.
        path: 'sundays',
        name: 'SongsSunday',
        meta: { art: 'songs-sunday', title: 'Sundays', depth: 1, capability: 'lineups.view' },
        component: () => import('./SongsSunday.vue'),
      },
      {
        // How often each is sung is read from the schedules too.
        path: 'sung',
        name: 'SongsSung',
        meta: { art: 'songs-sung', title: 'Most sung', depth: 1, capability: 'lineups.view' },
        component: () => import('./SongsSung.vue'),
      },
      {
        // Writing out the words is for whoever may edit songs.
        path: 'lyrics',
        name: 'SongsLyrics',
        meta: { art: 'songs-lyrics', title: 'Missing lyrics', depth: 1, capability: 'songs.manage' },
        component: () => import('./SongsLyrics.vue'),
      },
      {
        path: ':id',
        name: 'SongDetails',
        meta: { art: 'songs-all', depth: 2, focus: true },
        component: () => import('./SongDetails.vue'),
      },
    ],
  },
]
