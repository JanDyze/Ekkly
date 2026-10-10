// The colour of the soft circle each app's artwork sits in on the home, by
// the artwork's key.
//
// Each is taken from the app's own drawing (BRAND.md, "The app artwork's
// palette"), so the circle reads as the picture's own light rather than a
// colour put behind it. They are Ekkly's colours, fixed like the artwork, and
// never the church's: the church's colour is the day card's above them, and a
// circle in it would only repeat that six times.
const BLUE = '#1467e8'
const ORANGE = '#ff7417'
const AMBER = '#ffb21e'
const RED = '#ec4319'
const TEAL = '#0b93ab'
const NAVY = '#0b2a6b'

export const APP_HUES = {
  tasks: BLUE,
  members: BLUE,
  smallgroups: TEAL,
  attendance: RED,
  events: ORANGE,
  songs: TEAL,
  lineups: ORANGE,
  presentation: BLUE,
  bible: AMBER,
  minutes: TEAL,
  prayer: ORANGE,
  gallery: TEAL,
  videos: RED,
  links: BLUE,
  finances: AMBER,
  ai: BLUE,
  todos: TEAL,
  accounts: NAVY,
  audit: NAVY,
  settings: NAVY,
}

/**
 * The colours a section's card takes inside an app, given out in this order
 * down the grid. Sections used to share the church's one accent and wear
 * their drawing flat in it, which made an app's home a page of one colour;
 * each now gets its own, from the same palette as the apps, and the order
 * keeps any two neighbours (side by side, or one above the other in two
 * columns) apart.
 */
export const SECTION_HUES = [BLUE, ORANGE, TEAL, AMBER, RED]
export const sectionHue = (index) => SECTION_HUES[index % SECTION_HUES.length]

/** The circle's colour for an app, or a quiet grey for anything unlisted. */
export const hueOf = (key) => APP_HUES[key] || '#64748b'
