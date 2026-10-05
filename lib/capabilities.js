// Every area of the app that can be granted to a ministry tag. Capability keys
// are `<area>.view` and `<area>.manage`; manage always implies view (resolved
// in usePermissions), so a role never has to be given both.
//
// Most areas are an app of their own (lib/apps.js), under the same key. The
// Schedules teams are not: Worship, Preaching, Ushers and Welcome are parts of
// the Schedules & Presentation app, each planned by its own people — the
// pastor plans the preaching without being able to change the songs. `app`
// names the app such an area belongs to, so switching the app off switches
// them off with it. `viewable: false` is an area there is nothing separate to
// grant seeing: anyone who can see Schedules sees every team in it.

export const AREAS = [
  { key: 'dashboard', label: 'Dashboard', manageable: false },
  { key: 'events', label: 'Events' },
  { key: 'songs', label: 'Song list' },
  // Labelled Schedules since lineups grew into them. The key stays `lineups`:
  // rolePermissions documents store these strings, and renaming the key would
  // quietly revoke the page from everyone it had been granted to.
  { key: 'lineups', label: 'Schedules' },
  { key: 'worship', label: 'Worship team', app: 'lineups', viewable: false },
  { key: 'preaching', label: 'Preaching', app: 'lineups', viewable: false },
  { key: 'ushers', label: 'Ushers', app: 'lineups', viewable: false },
  // Follow-up notes are about people who have just started coming, so seeing
  // them is granted on its own rather than coming with Schedules.
  { key: 'consolidation', label: 'Welcome & follow-up', app: 'lineups' },
  { key: 'links', label: 'Links' },
  { key: 'gallery', label: 'Gallery' },
  { key: 'members', label: 'Members' },
  { key: 'smallgroups', label: 'Small groups' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'minutes', label: 'Minutes' },
  { key: 'finances', label: 'Finances' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'prayer', label: 'Prayer concerns' },
]

export const viewCap = (area) => `${area}.view`
export const manageCap = (area) => `${area}.manage`

/** Every grantable capability, in the order the Settings grid renders them. */
export const ALL_CAPABILITIES = AREAS.flatMap((area) => [
  ...(area.viewable === false ? [] : [viewCap(area.key)]),
  ...(area.manageable === false ? [] : [manageCap(area.key)]),
])

/** The app an area belongs to, when it is part of another app rather than one of its own. */
export const parentAppOf = (area) => AREAS.find((a) => a.key === area)?.app || null

// What a signed-in account gets before any tag is applied: the things a member
// would look up about their own church, all read-only. Anything touching other
// people's details — the directory, attendance, giving, minutes — is withheld
// until a tag grants it.
export const BASELINE_CAPABILITIES = [
  'dashboard.view',
  'events.view',
  'songs.view',
  'lineups.view',
  'links.view',
  'gallery.view',
]

export const areaLabel = (key) => AREAS.find((a) => a.key === key)?.label || key
