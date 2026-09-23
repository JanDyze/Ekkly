// Starting values only. They are written into appSettings/church the first
// time an administrator opens the Church tab, and after that Firestore is the
// only source of truth — so a different congregation can rename everything
// without touching code. Nothing in the app reads these once the document
// exists; they are also the fallback while it is still loading.

export const DEFAULT_CHURCH = {
  // Short name: sidebar, sign-in screen, browser title, spreadsheet headers.
  // Rarely seen: an approved church starts with its own name in its settings,
  // and until those load the name on its public profile is used instead. These
  // used to be UEC's details, from when the app served that church alone.
  shortName: 'Church',
  // Legal name and branch: the letterhead on printed and exported documents,
  // and the subtitle under the short name on the public header.
  fullName: '',
  branch: '',
  // Base64 webp uploaded from Settings. Empty means "use the bundled logo" —
  // Ekkly's mark — which is what a new church and every fallback path renders.
  logo: '',
  // Optional dark-mode version. When empty, the main logo is reused.
  logoDark: '',

  // Everything from here down is the church describing itself, and all of it
  // used to live in the landing block below, because the public page was the
  // only thing that drew it. That was the wrong home: a church's mission is a
  // fact about the church that the page happens to publish, not a property of
  // the page — which is why it was editable under Settings > Public page and
  // nowhere under Settings > Church details. It is read from here now, and
  // withChurchDefaults falls back to the landing copy for a church that has
  // not opened the new editor yet, so nothing had to be migrated.
  //
  // The year the congregation began, and who it belongs to. Both only ever
  // appear where somebody asked for them, so both start empty.
  founded: '',
  affiliation: '',
  // Why the church is here. Starting values live in DEFAULT_LANDING, where
  // they always have, and reach these through the fallback.
  mission: '',
  vision: '',
  // What the church holds to be true, as [{ belief, reference }] — an article
  // and the scripture it rests on. A list rather than a paragraph because that
  // is how a church writes it: a dozen numbered articles, each standing on its
  // own. Nothing invented as a starting value; a church's doctrine is its own
  // words or it is nobody's.
  basisOfFaith: [],
  // What the church holds to, as [{ value, note }] — a short phrase and a
  // sentence saying what it means, the same shape as the discipleship path.
  // Nothing invented as a starting value: a core value a church did not write
  // is one it does not hold.
  values: [],
  // Where the church is and how to reach it.
  address: '',
  mapUrl: '',
  phone: '',
  email: '',
  facebook: '',
}

// The public page at "/" — what a visitor who is not signed in sees. Like the
// church identity above, these are only the starting values: everything here is
// editable under Settings > Public page, so the page never needs a code change.
// The parts a congregation cannot share honestly by default (service times,
// address, phone) start empty, and their sections stay hidden until filled in
// rather than showing invented details.
export const DEFAULT_LANDING = {
  // No switch to hide this page any more. A church's address is its own, and
  // "/" is what that address is for: a visitor who types it gets the church,
  // not a sign-in form for an app they have no account in. What a church does
  // control is what the page says — every field below — and the sections it
  // has nothing to put in stay hidden rather than showing invented details.
  //
  // English throughout, because a starting value is read by every church that
  // has not edited it yet and Ekkly is sold to all of them. These were Tagalog
  // while the app served one Manila-province congregation; published as another
  // church's own words, they were a language that church may not even use.
  // Every line here is editable, so a Tagalog congregation writes Tagalog in
  // the setup guide and loses nothing.
  //
  // No headline setting any more: the hero greets whoever is reading by name —
  // friend, brother, sister, or their own if they are signed in — and that is
  // not a line one congregation writes differently from another. This paragraph
  // sits under it and is still theirs to change.
  intro: 'Before you even arrive, there is a seat already waiting for you.',

  // The greeting at the top of the page rolls through the names somebody at the
  // door would actually use. Editable because a congregation will say it
  // differently — a Filipino church wants Ate, Kuya and Nanay in here, a
  // Visayan one Manong and Inday — and a church that finds one of these too
  // familiar should be able to drop it without a code change. A signed-in
  // member sees their own name instead.
  welcomeTerms: [
    // What a stranger at the door is called
    'Friend',
    'Neighbour',
    'Visitor',
    // The family you get at church rather than at birth
    'Brother',
    'Sister',
    // Warmer, for a church that talks that way
    'Beloved',
    'Kababayan',
  ],
  // What follows the name. Two versions: a stranger is being welcomed, a
  // member who has signed in is being welcomed back.
  welcomeLine: 'you are welcome here.',
  welcomeLineMember: 'welcome back!',

  // The verse the church gathers on, in the band under the hero. Empty hides
  // the band rather than leaving a coloured stripe with nothing in it.
  verse:
    'For where two or three gather in my name, there am I with them.',
  verseReference: 'Matthew 18:20',

  // Why the church is here. Either may be left empty; with both empty the
  // section goes.
  vision: 'A church that worships, stands together, and serves.',
  mission: 'To carry the Gospel, grow believers, and serve our neighbours.',

  // The discipleship process, as [{ stage, note }]. The page draws however
  // many stages are given a name.
  //
  // These used to be Punla, Puno and Prutas — the three UEC teaches by name.
  // That was fine while the app was UEC's alone and wrong the moment it was
  // sold: a church in Cebu opening its own address would have found another
  // congregation's framework published as its own. Know, grow, serve is the
  // shape almost every church would recognise, which is what a starting value
  // should be — something to edit in the setup guide, not a claim.
  path: [
    { stage: 'Know', note: 'Starting out with Christ.' },
    { stage: 'Grow', note: 'Putting down roots in the Word.' },
    { stage: 'Serve', note: 'Giving yourself to others.' },
  ],

  // The last word on the page, above the footer.
  closingTitle: 'There is a place for you here.',
  closingBody: 'We would be glad to meet you this week.',
  // Base64 webp uploaded from Settings. Empty means the bundled photo. This is
  // the one static picture in the hero arch — the hero no longer crossfades
  // through gallery photos, so nothing above the fold waits on the network.
  heroImage: '',
  // Whether the gallery feeds the public page at all. On, the "Life together"
  // strip fills itself from photographs picked at random across every
  // album — all of them lazy and below the fold; off, no gallery photo is
  // reachable from the public page.
  showPhotos: true,
  // The albums that stay behind the sign-in — the meeting minutes shot on
  // somebody's phone, the album that was only ever a test. Everything not
  // listed here is public, so this is the exception rather than the rule.
  hiddenAlbums: [],
  // Whether the floating "Upcoming" dock is fed at all. Titles and times
  // only: the endpoint never publishes a gathering's location, because a small
  // group meets at somebody's house. Off, the dock does not appear.
  showEvents: true,
  // Whether members' birthdays join that list.
  //
  // Off by default, and the only setting here that defaults to off: everything
  // else on this page is the church talking about itself, but a birthday is
  // somebody's personal information, and publishing a hundred of them to the
  // open internet is a decision a person should make rather than inherit. Only
  // the name they are called by and the day travel — never a surname, never a
  // year, so never an age.
  showBirthdays: false,
  // [{ name, when, note }] — rendered in the order they are added.
  services: [],
  aboutTitle: 'Who we are',
  about: '',
  address: '',
  mapUrl: '',
  phone: '',
  email: '',
  facebook: '',
}

/**
 * Stored settings over the starting values above. Exported because two callers
 * need the same merge: useAppSettings, reading Firestore as a signed-in member,
 * and usePublicSite, reading what the server publishes to a visitor.
 *
 * `services` is a list, so it is replaced wholesale rather than merged — an
 * admin who removes the last one means the section to disappear.
 */
export const withLandingDefaults = (landing) => ({
  ...DEFAULT_LANDING,
  ...(landing || {}),
  services: Array.isArray(landing?.services) ? landing.services : DEFAULT_LANDING.services,
  hiddenAlbums: Array.isArray(landing?.hiddenAlbums) ? landing.hiddenAlbums : [],
  // An admin who empties the name list means the greeting to stop rolling, not
  // to fall back to a list of names they deleted — so an array, even an empty
  // one, is taken at its word. Only a missing key gets the default.
  welcomeTerms: Array.isArray(landing?.welcomeTerms)
    ? landing.welcomeTerms
    : DEFAULT_LANDING.welcomeTerms,
  path: Array.isArray(landing?.path) ? landing.path : DEFAULT_LANDING.path,
})

/**
 * The identity fields that were stored in the landing block until v0.29.4.
 *
 * Read from `church` first and from `landing` only while the church has
 * nothing of its own to say, so a congregation that wrote its mission last
 * March still sees it without anything having to be migrated. The church
 * editor blanks the landing copy as it writes (saveChurchIdentity in
 * useAppSettings), so the fallback applies until somebody edits and then stops
 * — otherwise clearing a mission on purpose would put the old one back.
 */
export const MOVED_FROM_LANDING = [
  'mission',
  'vision',
  'address',
  'mapUrl',
  'phone',
  'email',
  'facebook',
]

export const withChurchDefaults = (church, landing) => {
  const merged = { ...DEFAULT_CHURCH, ...(church || {}) }
  // The defaulted landing block, so a church with no settings at all still
  // gets the starting mission the public page has always published, and a
  // church that deliberately emptied one keeps it empty.
  const previously = withLandingDefaults(landing)
  MOVED_FROM_LANDING.forEach((key) => {
    if (!String(merged[key] ?? '').trim()) merged[key] = previously[key] || ''
  })
  // Written whole, like the landing lists: an order is not something a merge
  // can express.
  merged.values = Array.isArray(church?.values) ? church.values : DEFAULT_CHURCH.values
  return merged
}

export const DEFAULT_CATEGORIES = {
  gallery: ['Worship', 'Outreach', 'Fellowship', 'Special Events', 'Minutes Photos'],
  links: ['Video', 'Social', 'Resource', 'Worship', 'Document', 'Official', 'Design'],
  songs: ['Praise', 'Worship', 'Hymnal'],
  eventTypes: [
    'worship',
    'prayer',
    'meeting',
    'fellowship',
    'outreach',
    'training',
    'celebration',
    'special',
  ],
}

/** The lists above are the selectable values; "All" is a filter affordance the
 *  views prepend themselves, so it is never stored or editable. */
export const withAllOption = (list = []) => ['All', ...list]
