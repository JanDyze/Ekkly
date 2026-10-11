// The Inventory app's screens, mounted under AdminLayout by src/router/index.js —
// the same shape as People and Minutes: a launcher home, its sections one step
// in, and an item a step further.
//
// An item is /inventory/:id. The sections' fixed names sit beside :id, and the
// router tries a fixed path before a parameter, so no item is ever mistaken
// for one of them.
//
// Adding and editing an item are screens, not sheets: the camera, the cut-out
// and the photo as taken side by side need the whole of a phone's screen, and
// a sheet over a list would leave them a strip.

export const inventoryRoutes = [
  {
    path: 'inventory',
    meta: { capability: 'inventory.view', app: 'inventory', frame: 'app', art: 'inventory' },
    children: [
      {
        path: '',
        name: 'InventoryHome',
        meta: { depth: 0 },
        component: () => import('./InventoryHome.vue'),
      },
      {
        // ?q= opens it already searched.
        path: 'all',
        name: 'InventoryAll',
        meta: { art: 'inventory-all', title: 'All items', depth: 1 },
        component: () => import('./InventoryAll.vue'),
      },
      {
        path: 'borrowed',
        name: 'InventoryBorrowed',
        meta: { art: 'inventory-borrowed', title: 'Borrowed', depth: 1 },
        component: () => import('./InventoryBorrowed.vue'),
      },
      {
        path: 'repair',
        name: 'InventoryRepair',
        meta: { art: 'inventory-repair', title: 'Needs repair', depth: 1 },
        component: () => import('./InventoryRepair.vue'),
      },
      {
        path: 'places',
        name: 'InventoryPlaces',
        meta: { art: 'inventory-places', title: 'Places', depth: 1 },
        component: () => import('./InventoryPlaces.vue'),
      },
      {
        // What is kept in one place; '-' for the things with no place set.
        path: 'places/:place',
        name: 'InventoryPlace',
        meta: { art: 'inventory-places', depth: 2 },
        component: () => import('./InventoryPlace.vue'),
      },
      {
        // A walk round with the phone, photographing what has no picture: for
        // whoever may change the records.
        path: 'to-photograph',
        name: 'InventoryPhotos',
        meta: { art: 'inventory-photos', title: 'To photograph', depth: 1, capability: 'inventory.manage' },
        component: () => import('./InventoryPhotos.vue'),
      },
      {
        path: 'add',
        name: 'InventoryAdd',
        meta: { art: 'inventory-all', depth: 2, capability: 'inventory.manage' },
        component: () => import('./InventoryEdit.vue'),
      },
      {
        path: ':id',
        name: 'InventoryItem',
        meta: { art: 'inventory-all', depth: 2 },
        component: () => import('./InventoryItem.vue'),
      },
      {
        path: ':id/edit',
        name: 'InventoryEdit',
        meta: { art: 'inventory-all', depth: 3, capability: 'inventory.manage' },
        component: () => import('./InventoryEdit.vue'),
      },
    ],
  },
]
