// The made-up congregation of the front door's Sunday: what each of them
// looks like, picked from a few short palettes by a seeded random number, so
// the same people sit in the same seats on every visit.

const SKIN = ['#f3cfb1', '#e7b48f', '#d39a72', '#b97d55', '#8d5a3b', '#f6dcc6']
const HAIR = ['#2b1d16', '#3d2a1e', '#1b1b1f', '#5a3b25', '#2b1d16', '#8d8a86', '#6b4226', '#1b1b1f']
// Ekkly's four among ordinary Sunday clothes, so the room has its colour
// without being dressed in a uniform.
const SHIRT = ['#0270dc', '#09a4c6', '#f19140', '#fdc24b', '#ebe5d8', '#5b6b8a', '#c65d4f', '#3f8f6b', '#8b6bb8', '#2f3a52', '#f4f1ea', '#d98aa0']
const LEGS = ['#2f3a52', '#3b4252', '#5b6b8a', '#45372c']
const STYLES = ['short', 'short', 'long', 'bun', 'short', 'long', 'bald']

/** A small, fast, seeded random number generator (mulberry32). */
export const seeded = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pick = (random, list) => list[Math.floor(random() * list.length)]

export const lookFrom = (random) => ({
  skin: pick(random, SKIN),
  hair: pick(random, HAIR),
  shirt: pick(random, SHIRT),
  legs: pick(random, LEGS),
  style: pick(random, STYLES),
})

// The people with a part to play, by name, so each is the same person
// wherever they appear.
export const CAST = {
  usher: { skin: '#d39a72', hair: '#1b1b1f', shirt: '#0270dc', legs: '#2f3a52', style: 'short' },
  singer: { skin: '#e7b48f', hair: '#3d2a1e', shirt: '#f19140', legs: '#2f3a52', style: 'long' },
  guitar: { skin: '#b97d55', hair: '#1b1b1f', shirt: '#09a4c6', legs: '#3b4252', style: 'short' },
  keys: { skin: '#f3cfb1', hair: '#5a3b25', shirt: '#ebe5d8', legs: '#45372c', style: 'bun' },
  drums: { skin: '#8d5a3b', hair: '#1b1b1f', shirt: '#2f3a52', legs: '#2f3a52', style: 'short' },
  preacher: { skin: '#d39a72', hair: '#8d8a86', shirt: '#5b6b8a', legs: '#2f3a52', style: 'short' },
  // The family walking up to the door in the morning, and out of it at night.
  mum: { skin: '#e7b48f', hair: '#2b1d16', shirt: '#fdc24b', legs: '#5b6b8a', style: 'long' },
  dad: { skin: '#d39a72', hair: '#1b1b1f', shirt: '#0270dc', legs: '#2f3a52', style: 'short' },
  child: { skin: '#e7b48f', hair: '#3d2a1e', shirt: '#f19140', legs: '#3b4252', style: 'bun' },
}
