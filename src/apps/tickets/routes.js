// The Tickets app, mounted under AdminLayout by src/router/index.js.
//
// One screen, not a launcher (TicketsBoard). Every other app's home is a deck
// of cards over its sections' tiles; Tickets began that way and read as
// cluttered — a deck, four tiles and a side list stood between someone and
// the one thing they came to do, which is say something or read the answer.
// So it is an inbox: a way to send one, the tickets, and the one open beside
// them on a desktop.
//
// It was the To-do page, the administrators' own backlog at /todo, which
// still leads here. Anyone can send a ticket, so it has no capability. Bugs
// and ideas are answered by Ekkly from the platform's console
// (TicketsAdmin); the rest by the church's administrators here.
//
// ?open=<id> opens one ticket; ?add=1 opens the form, ?add=<kind> already
// set to a kind. The addresses the app's sections once had lead here too.

export const ticketsRoutes = [
  {
    path: 'tickets',
    meta: { frame: 'app', art: 'tickets' },
    children: [
      {
        path: '',
        name: 'Tickets',
        meta: { depth: 0 },
        component: () => import('./TicketsBoard.vue'),
      },
      { path: ':old(mine|inbox|closed)', redirect: (to) => ({ path: '/tickets', query: to.query }) },
    ],
  },
]
