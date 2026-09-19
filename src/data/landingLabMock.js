// The model behind the landing-page prototype at /landing-lab.
//
// A PROTOTYPE. Nothing here is stored, nothing reads Firestore, and no church's
// real settings can be touched from it — it exists so the shape of "let a
// church build its own page" can be looked at and argued with before any of it
// is built for real. Delete this file, LandingLab.vue and LabPreview.vue and
// the app is exactly as it was.
//
// The idea being tested: a church's page is a stack of sections it chooses,
// orders and fills in, rather than one fixed layout with the words swapped.
// Today's Landing.vue is the second thing — every church gets the same page in
// the same order, and a church with no discipleship process still has a gap
// where one goes.
//
// Every section type declares its own fields, so the editor is written once and
// a new section type costs a few lines here rather than a new form.

import heroCover from '../assets/hero-cover.webp'
import churchPhoto from '../assets/church.jpg'
import coverPhoto from '../assets/cover.jpg'
import stagePunla from '../assets/stage-punla.webp'
import stagePuno from '../assets/stage-puno.webp'
import stagePrutas from '../assets/stage-prutas.webp'

/** Stand-ins for a real picture library, so the prototype needs no uploads. */
export const STOCK = [
  { id: 'hero', label: 'Arch', src: heroCover },
  { id: 'church', label: 'Building', src: churchPhoto },
  { id: 'cover', label: 'Congregation', src: coverPhoto },
  { id: 'punla', label: 'Seed', src: stagePunla },
  { id: 'puno', label: 'Tree', src: stagePuno },
  { id: 'prutas', label: 'Fruit', src: stagePrutas },
]

/**
 * Colours a church picks from, rather than types.
 *
 * The real thing would seed this from the church's logo — that already works,
 * see brandColoursFrom in src/utils/logoUtils.js. A fixed list is enough to
 * judge whether choosing from swatches is the right interaction.
 */
export const PALETTE = [
  { name: 'Deep blue', hex: '#1d4ed8' },
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Forest', hex: '#15803d' },
  { name: 'Maroon', hex: '#9f1239' },
  { name: 'Plum', hex: '#6d28d9' },
  { name: 'Amber', hex: '#b45309' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Ink', hex: '#0f172a' },
]

export const FONTS = [
  { id: 'serif', name: 'Serif', stack: 'ui-serif, Georgia, Cambria, serif' },
  { id: 'sans', name: 'Sans', stack: 'ui-sans-serif, system-ui, sans-serif' },
]

export const HERO_STYLES = [
  { id: 'arch', name: 'Arch' },
  { id: 'full', name: 'Full photo' },
  { id: 'split', name: 'Split' },
  { id: 'plain', name: 'No photo' },
]

export const PAPERS = [
  { id: 'warm', name: 'Warm paper', bg: '#faf8f4', ink: '#292524', muted: '#78716c' },
  { id: 'white', name: 'White', bg: '#ffffff', ink: '#18181b', muted: '#71717a' },
  { id: 'dark', name: 'Dark', bg: '#0b1220', ink: '#f4f4f5', muted: '#a1a1aa' },
]

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

/** A fresh section of a given type, for the Add menu. */
export const blankSection = (type) => {
  const seeds = {
    verse: { text: '', reference: '', fill: 'Accent' },
    about: { title: 'Who we are', body: '', image: 'church', layout: 'Photo right' },
    services: { title: 'When we gather', items: [{ name: '', when: '', note: '' }] },
    path: { title: 'How we grow', items: [{ stage: '', note: '', image: 'punla' }] },
    gallery: { title: 'Life together', picks: ['cover', 'church', 'hero'] },
    leaders: { title: 'Our leaders', items: [{ name: '', role: '' }] },
    events: { title: "What's on", count: '3' },
    contact: { title: 'Where to find us', address: '', phone: '', facebook: '' },
    invite: { title: '', body: '', cta: 'Join us Sunday' },
  }
  return { id: `${type}-${Math.random().toString(36).slice(2, 8)}`, type, on: true, ...seeds[type] }
}

/**
 * A believable church, so the prototype can be judged on how it reads rather
 * than on lorem ipsum. Invented: there is no Living Light.
 */
export const MOCK = () => ({
  name: 'Living Light',
  branch: 'Calapan',
  logo: 'uec',
  theme: { accent: '#0f766e', font: 'serif', paper: 'warm' },
  hero: {
    style: 'arch',
    image: 'hero',
    greeting: 'Friend,',
    headline: 'you are welcome here.',
    sub: 'Before you even arrive, there is a seat already waiting for you.',
    cta: 'When we gather',
  },
  sections: [
    {
      id: 'verse-1',
      type: 'verse',
      on: true,
      text: 'For where two or three gather in my name, there am I with them.',
      reference: 'Matthew 18:20',
      fill: 'Accent',
    },
    {
      id: 'services-1',
      type: 'services',
      on: true,
      title: 'When we gather',
      items: [
        { name: 'Sunday Worship', when: 'Sundays, 9:00 AM', note: "Kids' church at the same time" },
        { name: 'Prayer Meeting', when: 'Wednesdays, 7:00 PM', note: '' },
        { name: 'Youth Night', when: 'Saturdays, 4:00 PM', note: 'For 13 and up' },
      ],
    },
    {
      id: 'about-1',
      type: 'about',
      on: true,
      title: 'Who we are',
      body: 'We started in 1998 in a small front room in Canubing. These days there are about three hundred of us on a Sunday — families, students, and anyone looking for somewhere their faith can live.',
      image: 'church',
      layout: 'Photo right',
    },
    {
      id: 'path-1',
      type: 'path',
      on: true,
      title: 'How we grow',
      items: [
        { stage: 'Know', note: 'Starting out with Christ.', image: 'punla' },
        { stage: 'Grow', note: 'Putting down roots in the Word.', image: 'puno' },
        { stage: 'Serve', note: 'Giving yourself to others.', image: 'prutas' },
      ],
    },
    {
      id: 'gallery-1',
      type: 'gallery',
      on: true,
      title: 'Life together',
      picks: ['cover', 'church', 'hero', 'puno'],
    },
    { id: 'events-1', type: 'events', on: true, title: "What's on", count: '3' },
    {
      id: 'leaders-1',
      type: 'leaders',
      on: false,
      title: 'Our leaders',
      items: [
        { name: 'Ptr. Ramon Dela Cruz', role: 'Senior Pastor' },
        { name: 'Liza Santos', role: "Kids' Church" },
      ],
    },
    {
      id: 'contact-1',
      type: 'contact',
      on: true,
      title: 'Where to find us',
      address: '12 Rizal Street, Canubing II, Calapan City, Oriental Mindoro',
      phone: '0917 123 4567',
      facebook: 'facebook.com/livinglight',
    },
    {
      id: 'invite-1',
      type: 'invite',
      on: true,
      title: 'There is a place for you here.',
      body: 'We would be glad to meet you this week.',
      cta: 'Join us Sunday',
    },
  ],
})

/** Mock calendar entries, so the "What's on" section has something to draw. */
export const MOCK_EVENTS = [
  { title: 'Baptism Sunday', when: 'Sun, Sep 21' },
  { title: 'Youth Camp', when: 'Sat, Sep 27' },
  { title: 'Thanksgiving Service', when: 'Sun, Oct 5' },
  { title: "Leaders' Meeting", when: 'Tue, Oct 7' },
  { title: 'Christmas Practice', when: 'Sat, Oct 11' },
]
