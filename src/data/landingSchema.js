// The vocabulary a public page is described in, and the two things described
// with it: today's settings screen, and the section stack the prototype at
// /landing-lab is testing.
//
// One file because they are the same question asked twice. Today every church
// gets the same page with its words swapped, and the fields below are that
// page's; the lab asks whether a church should instead stack sections it
// chooses and orders, and SECTION_TYPES is that. Either way a field is data —
// a key, a label, a kind — and one editor renders it, so a new field costs a
// line here rather than a block of markup in two places.
//
// The kinds:
//
//   text      one line
//   textarea  several lines (`rows` to say how many)
//   words     a list of plain words, edited as one comma-separated line
//   choice    one of `options`
//   list      rows of its own `item` fields (`addLabel`, `emptyText`)
//   image     one of a fixed set of pictures  — lab only, for now
//   gallery   several of them                 — lab only, for now
//
// A field may also carry `placeholder`, `hint` (a line under it), and `half`
// (pair it with the next `half` field on one row, where there is room).
//
// FieldList.vue renders the first five. The lab still draws its own controls
// for `image` and `gallery`, because those pick from a stand-in photo library
// that only the prototype has; when the stack becomes real they collapse into
// FieldList with a real picture picker behind them.

/**
 * What each kind of section is called, and what it asks for.
 *
 * `fields` drives the whole editor. Types:
 *   text · textarea · image · choice · list (rows of its own `item` fields)
 */
export const SECTION_TYPES = {
  verse: {
    label: 'Verse',
    blurb: 'One line of Scripture, across a band.',
    fields: [
      { key: 'text', label: 'Verse', type: 'textarea' },
      { key: 'reference', label: 'Reference', type: 'text' },
      { key: 'fill', label: 'Band', type: 'choice', options: ['Accent', 'Quiet'] },
    ],
  },
  about: {
    label: 'About us',
    blurb: 'Who you are, in a paragraph or two.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Words', type: 'textarea' },
      { key: 'image', label: 'Photo', type: 'image' },
      { key: 'layout', label: 'Layout', type: 'choice', options: ['Photo right', 'Photo left', 'No photo'] },
    ],
  },
  services: {
    label: 'Service times',
    blurb: 'When you meet. Usually the first thing anyone wants.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      {
        key: 'items',
        label: 'Times',
        type: 'list',
        addLabel: 'Add a service',
        item: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'when', label: 'When', type: 'text' },
          { key: 'note', label: 'Note', type: 'text' },
        ],
      },
    ],
  },
  path: {
    label: 'Our process',
    blurb: 'The stages you take somebody through.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      {
        key: 'items',
        label: 'Stages',
        type: 'list',
        addLabel: 'Add a stage',
        item: [
          { key: 'stage', label: 'Stage', type: 'text' },
          { key: 'note', label: 'Note', type: 'text' },
          { key: 'image', label: 'Art', type: 'image' },
        ],
      },
    ],
  },
  gallery: {
    label: 'Photos',
    blurb: 'A strip of church life.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'picks', label: 'Photos', type: 'gallery' },
    ],
  },
  leaders: {
    label: 'Leaders',
    blurb: 'Who people will meet.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      {
        key: 'items',
        label: 'People',
        type: 'list',
        addLabel: 'Add a person',
        item: [
          { key: 'name', label: 'Name', type: 'text' },
          { key: 'role', label: 'Role', type: 'text' },
        ],
      },
    ],
  },
  events: {
    label: "What's on",
    blurb: 'Pulled from your calendar. Titles and times only.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'count', label: 'How many', type: 'choice', options: ['3', '5', 'All'] },
    ],
  },
  contact: {
    label: 'Find us',
    blurb: 'Where you meet and how to reach you.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'facebook', label: 'Facebook', type: 'text' },
    ],
  },
  invite: {
    label: 'Come along',
    blurb: 'The last word on the page.',
    fields: [
      { key: 'title', label: 'Heading', type: 'text' },
      { key: 'body', label: 'Words', type: 'text' },
      { key: 'cta', label: 'Button', type: 'text' },
    ],
  },
}

/**
 * Today's public page, as the settings screen asks for it.
 *
 * Three steps in the order the page itself reads. Nothing here is required: a
 * church with no verse chosen, or no service times yet, has a page that leaves
 * those sections out rather than showing them empty.
 *
 * What is deliberately absent: the hero photo, the three switches and the album
 * picker. Each is one tap with nothing to type beside it, so each saves where
 * it stands on the card rather than behind an editor you have to finish — the
 * rule the church's logo already follows. And the mission, the address and the
 * rest of the church's own words belong to the church (DEFAULT_CHURCH), not to
 * this page, which only draws them.
 */
export const SETTINGS_STEPS = [
  {
    key: 'welcome',
    label: 'Welcome',
    title: 'How the page greets a visitor',
    fields: [
      {
        key: 'welcomeTerms',
        label: 'Names to greet a visitor by',
        type: 'words',
        placeholder: 'Friend, Neighbour, Ate, Kuya',
        hint: 'Separated by commas. The greeting rolls through them; a signed-in member sees their own name instead. Leave it empty to stop it rolling.',
      },
      {
        key: 'welcomeLine',
        label: "After a visitor's name",
        type: 'text',
        placeholder: 'you are welcome here.',
        half: true,
      },
      {
        key: 'welcomeLineMember',
        label: "After a member's name",
        type: 'text',
        placeholder: 'welcome back!',
        half: true,
      },
      {
        key: 'intro',
        label: 'Opening words',
        type: 'textarea',
        rows: 2,
        placeholder: 'Before you even arrive, there is a seat already waiting for you.',
        hint: 'The paragraph under the greeting.',
      },
      {
        key: 'verse',
        label: 'The verse you gather on',
        type: 'textarea',
        rows: 2,
        placeholder: 'For where two or three gather in my name, there am I with them.',
        hint: 'A band of colour under the welcome. Empty hides the band.',
      },
      { key: 'verseReference', label: 'Reference', type: 'text', placeholder: 'Matthew 18:20' },
    ],
  },
  {
    key: 'about',
    label: 'About',
    title: 'What the church is about',
    fields: [
      {
        key: 'path',
        label: 'How someone grows here',
        type: 'list',
        addLabel: 'Add a stage',
        emptyText: 'No stages yet. The section stays off the page until there is one.',
        hint: 'Drawn as a rail a visitor can walk, one stage at a time.',
        item: [
          { key: 'stage', label: 'Stage', type: 'text', placeholder: 'Know' },
          { key: 'note', label: 'Meaning', type: 'text', placeholder: 'Starting out with Christ — optional' },
        ],
      },
      { key: 'aboutTitle', label: 'Heading', type: 'text', placeholder: 'Who we are' },
      {
        key: 'about',
        label: 'In your own words',
        type: 'textarea',
        rows: 5,
        placeholder: 'How you would introduce the church to somebody at the door',
        hint: 'Empty leaves the section off the page.',
      },
    ],
  },
  {
    key: 'visiting',
    label: 'Visiting',
    title: 'When you meet, and the last word',
    fields: [
      {
        key: 'services',
        label: 'When you gather',
        type: 'list',
        addLabel: 'Add a gathering',
        emptyText: 'None yet. The section stays off the page until there is one.',
        hint: 'Never where you meet — only what and when. An address belongs in Church details, where it is published once.',
        item: [
          { key: 'name', label: 'Name', type: 'text', placeholder: 'Sunday Worship' },
          { key: 'when', label: 'When', type: 'text', placeholder: 'Every Sunday, 9:00 AM' },
          { key: 'note', label: 'Note', type: 'text', placeholder: 'What to expect — optional' },
        ],
      },
      {
        key: 'closingTitle',
        label: 'The last word',
        type: 'text',
        placeholder: 'There is a place for you here.',
      },
      {
        key: 'closingBody',
        label: 'Under it',
        type: 'textarea',
        rows: 2,
        placeholder: 'We would be glad to meet you this week.',
      },
    ],
  },
]

/** Every field the settings screen owns, flat — what a draft is built from. */
export const SETTINGS_FIELDS = SETTINGS_STEPS.flatMap((step) => step.fields)

/** A blank row for a `list` field, with every one of its keys present. */
export const blankRow = (field) =>
  Object.fromEntries(field.item.map((sub) => [sub.key, '']))
