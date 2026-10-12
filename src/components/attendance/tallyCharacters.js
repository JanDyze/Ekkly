// The people who fill the tally counter's room (TallyCrowd.vue), as simple as
// a person can be drawn: a round head over a rounded body, no arms, no legs,
// each one flat colour.
//
// Nothing more, because the room is the count made visible, not a cast of
// characters to look at one by one. What tells them apart is only their
// build - a bigger or smaller head, a broader or narrower body, a grown-up or
// a child - and their colour.
//
// They are made, not drawn one by one: each is built from those choices, fixed
// by its number, so the same twenty-four turn up every time. Colour is chosen
// apart from shape (TallyCrowd.vue), so any of them can come in any colour.
//
// Every one stands 24 wide with its foot on 44 and is drawn in one CSS colour
// the person brings with them, --fill.

// The colours they come in: Ekkly's own four, and enough besides that a full
// room looks like a box of sweets rather than a uniform.
export const COLOURS = [
  '#fdc24b',
  '#f19140',
  '#09a4c6',
  '#0270dc',
  '#f472b6',
  '#34d399',
  '#a78bfa',
  '#fb7185',
  '#2dd4bf',
]

// A small seeded random, so a number always builds the same one.
export const rand = (n) => {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296
}
export const pick = (list, n) => list[Math.floor(rand(n) * list.length)]

const f = (n) => Math.round(n * 100) / 100

// Most are grown-ups; some are children, shorter all over.
const SIZES = [1, 1, 1, 1, 0.8, 0.66]

const build = (n) => {
  const r = (k) => rand(n * 31 + k)
  const bodyW = 15 + r(1) * 7
  const bodyH = 16 + r(2) * 6
  const head = 5.2 + r(3) * 1.6
  const grown = pick(SIZES, n * 31 + 4)

  // The body: shoulders rounded right over, the foot only softened, the way
  // a person is drawn on a sign.
  const x0 = 12 - bodyW / 2
  const top = 44 - bodyH
  const shoulder = Math.min(bodyW / 2, 6.5)
  const body = `<path d="M${f(x0)} 44V${f(top + shoulder)}A${f(shoulder)} ${f(shoulder)} 0 0 1 ${f(x0 + shoulder)} ${f(top)}H${f(x0 + bodyW - shoulder)}A${f(shoulder)} ${f(shoulder)} 0 0 1 ${f(x0 + bodyW)} ${f(top + shoulder)}V44Z"/>`
  // The head, with a small gap over the shoulders so it reads as a head.
  const headY = top - 1.2 - head
  const svg = `<g fill="var(--fill)"${grown === 1 ? '' : ` transform="translate(12 44) scale(${grown}) translate(-12 -44)"`}>${body}<circle cx="12" cy="${f(headY)}" r="${f(head)}"/></g>`
  return { id: `c${n}`, svg }
}

/** The twenty-four, built once. */
export const CHARACTERS = Array.from({ length: 24 }, (_, n) => build(n))
