// The made-up congregation of the front door's Sunday: what each of them
// looks like, picked from a few short palettes by a seeded random number, so
// the same people sit in the same seats on every visit.

const SKIN = ['#eac7aa', '#dcae8c', '#c99470', '#a8754f', '#7f5238', '#efd5bf']
const HAIR = ['#2b1d16', '#3d2a1e', '#1b1b1f', '#5a3b25', '#6b3f24', '#8d8a86', '#8a5a32', '#1b1b1f', '#7a3b22', '#2b1d16', '#b9b4ab']
// What people wear to church, in the colours clothes really come in: navy,
// teal, white, sky blue, sage, brown, maroon, rust. Natural rather than the
// toy brights that made the room look like a nursery.
const SHIRT = ['#2f4a73', '#3f7f8c', '#f2efe8', '#6d93b8', '#5f8a6a', '#8a5a4a', '#3b3f52', '#b58a5a', '#7a4f63', '#4d6fa0', '#d9d2c3', '#2d6b5f', '#c96f4a', '#1f2a3d']
const LEGS = ['#2f3743', '#3b4252', '#4b5160', '#54493f', '#6a6e78']
const STYLES = ['short', 'short', 'long', 'bun', 'short', 'bob', 'bald', 'curly', 'ponytail', 'long', 'short', 'bob']

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
  // What shows at the neck from behind: a plain neckline, a shirt collar, or
  // a hood lying at the back of the neck.
  neck: pick(random, ['crew', 'crew', 'collar', 'hood']),
})

// The people with a part to play, by name, so each is the same person
// wherever they appear. Beside how they look, each may have something painted
// on (`pattern`, `collar`), glasses, or something in hand (`holding`).
export const CAST = {
  usher: { skin: '#c99470', hair: '#1f1d1f', shirt: '#2f3743', legs: '#3b4252', style: 'short', pattern: 'badge', holding: 'phone', collar: '#e8e4dc' },
  singer: { skin: '#dcae8c', hair: '#3a2a20', shirt: '#9a6a55', legs: '#3b4252', style: 'long', holding: 'mic' },
  guitar: { skin: '#a8754f', hair: '#1f1d1f', shirt: '#4f6e72', legs: '#2f3743', style: 'short' },
  keys: { skin: '#eac7aa', hair: '#54392a', shirt: '#ddd6c8', legs: '#54493f', style: 'bun' },
  drums: { skin: '#7f5238', hair: '#1f1d1f', shirt: '#2f3743', legs: '#2f3743', style: 'curly' },
  // The pastor in what any of the church might wear on a Sunday, a
  // button-up shirt and trousers: no clerical collar, robe or stole, as the
  // churches Ekkly is for are not led by priests. The Bible is open on the
  // pulpit, so the hands are free.
  preacher: { skin: '#c99470', hair: '#bdb8b0', shirt: '#7b8fa6', legs: '#3b4252', style: 'bald', pattern: 'buttons', collar: '#6a7d94', glasses: true },
  // The family walking up to the door in the morning, and out of it at night,
  // with what they wear (`wear`) and carry (`carries`), dressed as on the
  // cover art (References/"A Sunday at Ekkly Church.png").
  mum: { skin: '#f0c9a6', hair: '#453d3a', shirt: '#e5c694', legs: '#f0c9a6', shoes: '#3a3634', style: 'long', pattern: 'dress', wear: 'coat', carries: 'bag' },
  dad: { skin: '#d9a77f', hair: '#383536', shirt: '#2b7991', legs: '#24435f', shoes: '#554943', style: 'short' },
  child: { skin: '#e2b08a', hair: '#5a3b25', shirt: '#1b7a89', legs: '#6f635a', shoes: '#3a3634', style: 'short', carries: 'backpack', pack: '#1393e5' },
}
