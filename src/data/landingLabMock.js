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
