// The ways the home of all apps can draw its five apps and More apps
// (src/components/home/HomeAppCards.vue). The church picks one for everyone in
// Settings > Home; anyone can pick their own in Preferences, which wins for
// them (useHomeCards).
//
// Stored by key, so a style can be renamed or redrawn without anyone's choice
// pointing at something else. A key nobody knows any more falls back to the
// default rather than drawing nothing.
export const HOME_CARD_STYLES = [
  {
    key: 'accent',
    name: 'Accent lines',
    note: 'Flat cards with a stripe of each app’s colour.',
  },
  {
    key: 'illustrated',
    name: 'Illustrated',
    note: 'Soft colour, the app’s drawing behind it, and a line on what it is for.',
  },
  {
    key: 'compact',
    name: 'Compact',
    note: 'Slim rows with the picture on the left. Quick to scan.',
  },
  {
    key: 'orbit',
    name: 'Orbit',
    note: 'The apps in a circle around More apps.',
  },
  {
    key: 'list',
    name: 'List',
    note: 'One app a row, with a line on what each is for.',
  },
  {
    key: 'masonry',
    name: 'Masonry',
    note: 'Tiles of two widths, alternating, with a line on each.',
  },
]

export const DEFAULT_HOME_CARDS = 'accent'

/** A stored key, or the default when it is missing or no longer known. */
export const homeCardStyle = (key) =>
  HOME_CARD_STYLES.some((style) => style.key === key) ? key : DEFAULT_HOME_CARDS

export const homeCardName = (key) => HOME_CARD_STYLES.find((style) => style.key === homeCardStyle(key)).name

// How the styles lay their cards out, shared by the home of all apps
// (HomeAppCards) and the sections inside an app (AppShortcuts), so a section
// grid is drawn the way the home is.

// Masonry alternates a wide tile and a narrow one, then the other way round.
export const MASONRY_SPANS = ['col-span-3', 'col-span-2', 'col-span-2', 'col-span-3', 'col-span-3', 'col-span-2']

// Orbit: the cards evenly round a circle, the first at the top. Placed by
// their corner, half a node's width (13%) back from the point on the circle,
// rather than shifted by half: the entrance animation owns the transform, and
// would undo a shift once it finished. The box is square, so the same
// percentage works both ways.
export const orbitPlace = (index, count) => {
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180)
  return { left: `${37 + 37 * Math.cos(angle)}%`, top: `${37 + 37 * Math.sin(angle)}%` }
}
