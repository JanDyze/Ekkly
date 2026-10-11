// Draws the mock photos: illustrated scenes of church life for wherever Ekkly
// has to show a photo that is not a church's own — the apps' commercials
// (src/components/appframe/stories/), above all the Gallery's and the small
// groups' covers. Drawn, not photographed, on purpose: nobody can mistake an
// illustration for a real person, a real church, or someone's real album, and
// there is no licence to keep track of.
//
//   node brand/ekkly/make-mock-photos.mjs src/assets/mock-photos
//
// Each is 4:3, flat and warm, in the manner of the home's picture (HomeScene):
// people as rounded shapes with no faces, in the skin tones of a Filipino
// congregation, in places a Filipino church gathers — a hall, a beach, a
// living room, a long table set with banana leaves.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [outDir] = process.argv.slice(2)
if (!outDir) throw new Error('Give the folder to write to.')
mkdirSync(outDir, { recursive: true })

const W = 400
const H = 300

// Skin, hair and clothes, given out in turn so a crowd is never a row of twins.
const SKIN = ['#c68a5e', '#a86f48', '#d9a27a', '#8d5a3b', '#e0b08c', '#b97b52']
const HAIR = ['#1e1612', '#2b1d16', '#3a2a20', '#140f0c', '#4a3426']
const SHIRT = ['#f19140', '#0270dc', '#09a4c6', '#fdc24b', '#e9e4da', '#d1495b', '#2e7d5b', '#7b5ea7', '#f4f1ea', '#355c7d']
const pick = (list, i) => list[((i % list.length) + list.length) % list.length]

/**
 * One person, seen from behind or in front, standing on `y` (their feet, or
 * where a seat cuts them off). `s` is their size; 1 is a grown-up in the
 * middle distance. No faces: a face drawn is a face someone recognises.
 */
const person = (x, y, s, i, { arms = '', robe = '', sit = false } = {}) => {
  const skin = pick(SKIN, i)
  const hair = pick(HAIR, i * 3 + 1)
  const cloth = robe || pick(SHIRT, i * 7 + 2)
  const head = 9 * s
  const body = (sit ? 26 : 38) * s
  const shoulders = 15 * s
  const top = y - body
  const raise =
    arms === 'up'
      ? `<path d="M${x - shoulders * 0.8} ${top + 6 * s} L${x - shoulders * 1.15} ${top - 22 * s}" stroke="${skin}" stroke-width="${4.2 * s}" stroke-linecap="round"/>
         <path d="M${x + shoulders * 0.8} ${top + 6 * s} L${x + shoulders * 1.15} ${top - 22 * s}" stroke="${skin}" stroke-width="${4.2 * s}" stroke-linecap="round"/>`
      : arms === 'one'
        ? `<path d="M${x + shoulders * 0.8} ${top + 6 * s} L${x + shoulders * 1.3} ${top - 20 * s}" stroke="${skin}" stroke-width="${4.2 * s}" stroke-linecap="round"/>`
        : ''
  return `
  <g>
    ${raise}
    <path d="M${x - shoulders} ${y} V${top + 9 * s} Q${x - shoulders} ${top} ${x - shoulders + 9 * s} ${top} H${x + shoulders - 9 * s} Q${x + shoulders} ${top} ${x + shoulders} ${top + 9 * s} V${y} Z" fill="${cloth}"/>
    <rect x="${x - 3.2 * s}" y="${top - 5 * s}" width="${6.4 * s}" height="${7 * s}" fill="${skin}"/>
    <circle cx="${x}" cy="${top - head * 1.05}" r="${head}" fill="${skin}"/>
    <path d="M${x - head} ${top - head * 0.95} A${head} ${head} 0 0 1 ${x + head} ${top - head * 0.95} Q${x} ${top - head * 1.45} ${x - head} ${top - head * 0.95} Z" fill="${hair}"/>
  </g>`
}

/** Someone seen from behind: the same person, their head all hair. */
const back = (x, y, s, i, opts) =>
  person(x, y, s, i, opts) +
  `<circle cx="${x}" cy="${y - (opts?.sit ? 26 : 38) * s - 9 * s * 1.05}" r="${9 * s}" fill="${pick(HAIR, i * 3 + 1)}"/>`

/** A row of people, from `x0` to `x1`, all the same size, each a little different. */
const row = (x0, x1, y, s, seed, draw = back, opts = {}) => {
  const n = Math.max(1, Math.round((x1 - x0) / (34 * s)))
  return Array.from({ length: n }, (_, k) => {
    const x = x0 + ((x1 - x0) * (k + 0.5)) / n + ((seed * 7 + k * 13) % 7) - 3
    const lift = ((seed + k * 5) % 3) * s
    return draw(x, y - lift, s * (0.94 + (((k + seed) % 3) * 0.04)), seed + k, typeof opts === 'function' ? opts(k) : opts)
  }).join('')
}

const svg = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}">
<defs>${defs}</defs>
${body}
</svg>
`

const sky = (id, stops) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
    .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
    .join('')}</linearGradient>`

const glow = (id, color, opacity = 0.8) =>
  `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`

/** Ekkly's window, as stained glass on a church's wall. */
const stained = (x, y, w, h) => {
  const r = w / 2
  const m = x + r
  return `
  <path d="M${x} ${y + r}A${r} ${r} 0 0 1 ${m - 1.5} ${y}V${y + h * 0.42}L${x} ${y + h * 0.46}Z" fill="#fdc24b"/>
  <path d="M${x + w} ${y + r}A${r} ${r} 0 0 0 ${m + 1.5} ${y}V${y + h * 0.42}L${x + w} ${y + h * 0.46}Z" fill="#f19140"/>
  <path d="M${x} ${y + h * 0.5}L${m - 1.5} ${y + h * 0.47}V${y + h}H${x}Z" fill="#0270dc"/>
  <path d="M${x + w} ${y + h * 0.5}L${m + 1.5} ${y + h * 0.47}V${y + h}H${x + w}Z" fill="#09a4c6"/>`
}

/* ------------------------------------------------------------- the scenes */

const SCENES = {
  // Sunday morning in the hall: the band on the platform under the window,
  // the congregation from the back rows, some hands raised.
  'sunday-service': svg(
    `
  <rect width="${W}" height="${H}" fill="url(#wall)"/>
  <rect y="190" width="${W}" height="110" fill="#b88a5c"/>
  <rect y="150" width="${W}" height="48" fill="#8c5a3c"/>
  <rect y="146" width="${W}" height="6" fill="#a46c48"/>
  <ellipse cx="200" cy="80" rx="150" ry="90" fill="url(#light)"/>
  ${stained(180, 26, 40, 70)}
  <rect x="198" y="100" width="4" height="40" fill="#e9dcc6"/><rect x="188" y="110" width="24" height="4" fill="#e9dcc6"/>
  ${person(110, 150, 0.62, 3)}${person(160, 150, 0.6, 8, { arms: 'one' })}${person(245, 150, 0.6, 5)}${person(292, 150, 0.62, 1)}
  <rect x="150" y="128" width="20" height="6" rx="2" fill="#5b3a26" transform="rotate(-25 160 131)"/>
  ${row(10, 390, 236, 1.05, 2, back, (k) => (k % 4 === 1 ? { arms: 'up' } : {}))}
  ${row(-10, 410, 300, 1.35, 6, back, (k) => (k % 5 === 2 ? { arms: 'up' } : {}))}`,
    sky('wall', [[0, '#f3e6d2'], [1, '#e2cdb0']]) + glow('light', '#fff5d6', 0.9)
  ),

  // Youth camp at dusk: tents on the hill, a fire, and the youth round it.
  'youth-camp': svg(
    `
  <rect width="${W}" height="${H}" fill="url(#dusk)"/>
  <circle cx="320" cy="96" r="22" fill="#ffd27a" opacity="0.9"/>
  <path d="M0 170 Q120 120 230 150 T400 140 V${H} H0Z" fill="#3b4a7a"/>
  <path d="M0 200 Q140 165 260 190 T400 185 V${H} H0Z" fill="#2c3a5f"/>
  <path d="M40 190 L70 150 L100 190Z" fill="#f19140"/><path d="M70 150 L76 190 H64Z" fill="#c9692b"/>
  <path d="M300 186 L336 142 L372 186Z" fill="#09a4c6"/><path d="M336 142 L343 186 H329Z" fill="#077f99"/>
  <rect y="230" width="${W}" height="70" fill="#1f2a44"/>
  <ellipse cx="200" cy="250" rx="140" ry="70" fill="url(#fire)"/>
  <path d="M186 262 L214 262 L208 268 L192 268Z" fill="#5b3a26"/>
  <path d="M200 228 C190 244 188 254 200 262 C212 254 210 244 200 228Z" fill="#fdc24b"/>
  <path d="M200 240 C195 249 195 255 200 260 C205 255 205 249 200 240Z" fill="#f19140"/>
  ${person(120, 270, 0.85, 4, { sit: true })}${person(150, 286, 0.95, 9, { sit: true })}${person(255, 286, 0.95, 2, { sit: true })}${person(285, 270, 0.85, 7, { sit: true })}
  ${row(60, 340, 312, 1.25, 11, back, { sit: true })}`,
    sky('dusk', [[0, '#6d64a8'], [0.5, '#c47c9a'], [1, '#f09b7a']]) + glow('fire', '#ffb36b', 0.65)
  ),

  // The choir in blue robes, two rows on the risers, the director's back.
  choir: svg(
    `
  <rect width="${W}" height="${H}" fill="#5a1f2e"/>
  <path d="M0 0 H60 Q50 150 70 300 H0Z" fill="#7a2a3e"/><path d="M400 0 H340 Q350 150 330 300 H400Z" fill="#7a2a3e"/>
  <ellipse cx="200" cy="140" rx="170" ry="120" fill="url(#spot)"/>
  <rect x="60" y="150" width="280" height="14" fill="#8c5a3c"/><rect x="50" y="200" width="300" height="14" fill="#a46c48"/>
  ${row(80, 320, 152, 0.85, 1, person, { robe: '#1d4e89' })}
  ${row(70, 330, 204, 0.95, 4, person, { robe: '#1f5fa8' })}
  <rect y="214" width="${W}" height="86" fill="#3a1520"/>
  ${back(200, 300, 1.5, 3, { arms: 'one' })}`,
    glow('spot', '#ffe9b8', 0.55)
  ),

  // A feeding outreach: volunteers in matching shirts hand out packs from a
  // table in the street.
  outreach: svg(
    `
  <rect width="${W}" height="${H}" fill="url(#day)"/>
  <rect x="0" y="70" width="120" height="120" fill="#e7d9c3"/><rect x="18" y="92" width="30" height="34" fill="#9cc7e0"/><rect x="66" y="92" width="30" height="34" fill="#9cc7e0"/>
  <rect x="280" y="60" width="120" height="130" fill="#d9c7ab"/><rect x="300" y="84" width="30" height="34" fill="#9cc7e0"/><rect x="350" y="84" width="30" height="34" fill="#9cc7e0"/>
  <path d="M120 80 H280 L260 60 H140Z" fill="#f19140"/><rect x="138" y="80" width="4" height="110" fill="#8d6e52"/><rect x="258" y="80" width="4" height="110" fill="#8d6e52"/>
  <rect y="186" width="${W}" height="114" fill="#cdb79a"/>
  ${person(160, 196, 0.85, 1, { robe: '#09a4c6' })}${person(200, 196, 0.85, 5, { robe: '#09a4c6' })}${person(240, 196, 0.85, 8, { robe: '#09a4c6' })}
  <rect x="120" y="190" width="160" height="10" fill="#f4f1ea"/><rect x="124" y="200" width="152" height="40" fill="#e9e4da"/>
  ${[136, 156, 176, 222, 242, 262].map((x, k) => `<rect x="${x - 8}" y="${176 - (k % 2) * 4}" width="16" height="16" rx="2" fill="${k % 3 ? '#fdc24b' : '#f4f1ea'}"/>`).join('')}
  ${row(30, 370, 300, 1.3, 7, back)}`,
    sky('day', [[0, '#9ecbea'], [1, '#e8f3f8']])
  ),

  // A small group at home: the sofa, the lamp, Bibles open on laps.
  'small-group': svg(
    `
  <rect width="${W}" height="${H}" fill="#efe3cf"/>
  <rect x="250" y="40" width="110" height="90" fill="#bfe0ef"/><rect x="250" y="40" width="110" height="90" fill="none" stroke="#fff" stroke-width="6"/><rect x="302" y="40" width="6" height="90" fill="#fff"/>
  <path d="M262 130 q10 -30 22 0z" fill="#2e7d5b"/><path d="M330 130 q12 -36 24 0z" fill="#3f9a6f"/>
  <rect x="40" y="70" width="6" height="110" fill="#5b3a26"/><path d="M22 70 h42 l-10 -30 h-22z" fill="#fdc24b"/>
  <ellipse cx="43" cy="80" rx="60" ry="50" fill="url(#lamp)"/>
  <rect y="210" width="${W}" height="90" fill="#c99b6e"/>
  <rect x="70" y="150" width="260" height="70" rx="16" fill="#355c7d"/><rect x="60" y="176" width="280" height="50" rx="14" fill="#2c4d69"/>
  ${person(130, 196, 0.95, 2, { sit: true })}${person(200, 196, 0.95, 6, { sit: true })}${person(270, 196, 0.95, 9, { sit: true })}
  ${[130, 200, 270].map((x) => `<rect x="${x - 12}" y="178" width="24" height="14" rx="2" fill="#f4f1ea"/><rect x="${x - 0.8}" y="178" width="1.6" height="14" fill="#c9b99f"/>`).join('')}
  ${back(80, 300, 1.35, 4, { sit: true })}${back(330, 300, 1.35, 11, { sit: true })}`,
    glow('lamp', '#fff1c4', 0.7)
  ),

  // Bible study round a table: open Bibles, mugs, a notebook, a pen.
  'bible-study': svg(
    `
  <rect width="${W}" height="${H}" fill="#e8dccb"/>
  <rect x="20" y="30" width="80" height="60" rx="4" fill="#d6c4a8"/><rect x="300" y="30" width="80" height="60" rx="4" fill="#d6c4a8"/>
  ${person(90, 170, 1, 3)}${person(160, 160, 0.95, 7)}${person(240, 160, 0.95, 1)}${person(310, 170, 1, 10)}
  <path d="M30 170 H370 L400 300 H0Z" fill="#9b6b45"/>
  <path d="M30 170 H370 L374 178 H26Z" fill="#b5835a"/>
  ${[[120, 210], [210, 200], [290, 214]].map(([x, y]) => `<path d="M${x - 30} ${y} L${x} ${y - 6} L${x + 30} ${y} L${x + 30} ${y + 26} L${x} ${y + 20} L${x - 30} ${y + 26}Z" fill="#f7f3ea"/><path d="M${x} ${y - 6} V${y + 20}" stroke="#d9cdb6" stroke-width="1.5"/>${[0, 1, 2].map((k) => `<rect x="${x - 25}" y="${y + 3 + k * 6}" width="20" height="2" rx="1" fill="#c9bea8"/><rect x="${x + 5}" y="${y + 3 + k * 6}" width="20" height="2" rx="1" fill="#c9bea8"/>`).join('')}`).join('')}
  <rect x="62" y="236" width="18" height="20" rx="3" fill="#f19140"/><rect x="330" y="232" width="18" height="20" rx="3" fill="#09a4c6"/>
  <rect x="170" y="250" width="50" height="34" rx="3" fill="#fdc24b" transform="rotate(-8 195 267)"/>`
  ),

  // A baptism in the sea: two in the water, the church on the shore.
  baptism: svg(
    `
  <rect width="${W}" height="${H}" fill="url(#sea-sky)"/>
  <circle cx="80" cy="70" r="26" fill="#fff4c9"/>
  <path d="M260 120 q20 -30 40 0 q20 -30 40 0" fill="none" stroke="#fff" stroke-width="2" opacity="0.7"/>
  <rect y="130" width="${W}" height="110" fill="url(#sea)"/>
  ${[150, 170, 190, 210].map((y, k) => `<path d="M${k * 30} ${y} q20 -6 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0" fill="none" stroke="#e6f6fb" stroke-width="1.5" opacity="0.5"/>`).join('')}
  ${person(180, 200, 1, 2, { robe: '#f4f1ea' })}${person(222, 202, 1.05, 6, { robe: '#e9e4da', arms: 'one' })}
  <rect x="150" y="182" width="110" height="24" fill="url(#sea)" opacity="0.92"/>
  <path d="M0 236 Q200 222 400 236 V${H} H0Z" fill="#ead7b0"/>
  ${row(10, 390, 300, 1.15, 5, back)}`,
    sky('sea-sky', [[0, '#8ccbea'], [1, '#e9f6fb']]) + sky('sea', [[0, '#3aa6c9'], [1, '#1b7493']])
  ),

  // Christmas: parol lanterns and lights over the hall, the church gathered
  // round the tree.
  christmas: svg(
    `
  <rect width="${W}" height="${H}" fill="url(#night)"/>
  <path d="M0 40 Q100 70 200 40 T400 40" fill="none" stroke="#3b3b5a" stroke-width="1.5"/>
  ${Array.from({ length: 16 }, (_, k) => `<circle cx="${12 + k * 25}" cy="${40 + Math.sin(k * 0.8) * 14 + 6}" r="3" fill="${pick(['#fdc24b', '#f19140', '#09a4c6', '#d1495b'], k)}"/>`).join('')}
  ${[[70, 90, '#d1495b'], [200, 70, '#fdc24b'], [330, 92, '#09a4c6']].map(([x, y, c]) => `<ellipse cx="${x}" cy="${y}" rx="34" ry="34" fill="url(#parol)"/><path d="M${x} ${y - 20} L${x + 6} ${y - 6} L${x + 20} ${y - 6} L${x + 9} ${y + 3} L${x + 13} ${y + 18} L${x} ${y + 9} L${x - 13} ${y + 18} L${x - 9} ${y + 3} L${x - 20} ${y - 6} L${x - 6} ${y - 6}Z" fill="${c}"/><path d="M${x - 4} ${y + 16} l-3 16 M${x + 4} ${y + 16} l3 16" stroke="${c}" stroke-width="2"/>`).join('')}
  <path d="M200 120 L240 210 H160Z" fill="#2e7d5b"/><path d="M200 150 L230 220 H170Z" fill="#256b4d"/><rect x="194" y="220" width="12" height="14" fill="#5b3a26"/>
  <rect y="230" width="${W}" height="70" fill="#2a2a44"/>
  ${row(-10, 410, 300, 1.25, 3, back, (k) => (k % 4 === 0 ? { arms: 'one' } : {}))}`,
    sky('night', [[0, '#11213a'], [1, '#2c3d5a']]) + glow('parol', '#fff1c4', 0.55)
  ),

  // Kids' church: little ones on the mat, the teacher and her board.
  'kids-church': svg(
    `
  <rect width="${W}" height="${H}" fill="#fdf3e1"/>
  <rect x="120" y="40" width="160" height="96" rx="6" fill="#f4f1ea" stroke="#d6c4a8" stroke-width="4"/>
  <path d="M150 120 q30 -40 60 0" fill="#2e7d5b"/><circle cx="240" cy="78" r="14" fill="#fdc24b"/><path d="M140 70 q10 -12 20 0 q10 -12 20 0" fill="none" stroke="#0270dc" stroke-width="3"/>
  ${[30, 64, 336, 370].map((x, k) => `<circle cx="${x}" cy="${40 + (k % 2) * 30}" r="10" fill="${pick(['#f19140', '#09a4c6', '#fdc24b', '#d1495b'], k)}"/><path d="M${x} ${50 + (k % 2) * 30} v30" stroke="#c9b99f" stroke-width="1.5"/>`).join('')}
  ${person(310, 200, 1.05, 6, { arms: 'one' })}
  <rect y="196" width="${W}" height="104" fill="#e9c38f"/>
  <rect x="20" y="220" width="360" height="80" rx="8" fill="#09a4c6" opacity="0.35"/>
  ${row(30, 370, 262, 0.75, 2, back, { sit: true })}
  ${row(10, 390, 300, 0.9, 9, back, { sit: true })}`
  ),

  // A boodle fight: rice and food along banana leaves down a long table, the
  // church eating with their hands on both sides.
  'fellowship-meal': svg(
    `
  <rect width="${W}" height="${H}" fill="#f1e2c4"/>
  <rect x="0" y="0" width="${W}" height="40" fill="#e6d2ad"/>
  ${Array.from({ length: 9 }, (_, k) => `<path d="M${k * 50} 0 l25 30 l25 -30" fill="${pick(['#f19140', '#09a4c6', '#fdc24b'], k)}" opacity="0.8"/>`).join('')}
  ${row(40, 360, 150, 0.9, 4, person)}
  <path d="M10 150 H390 L400 250 H0Z" fill="#8c5a3c"/>
  <path d="M30 160 H370 L382 236 H18Z" fill="#3f9a6f"/>
  ${Array.from({ length: 9 }, (_, k) => `<path d="M${30 + k * 40} 160 L${18 + k * 41.5} 236" stroke="#2e7d5b" stroke-width="1.2"/>`).join('')}
  <path d="M40 198 Q200 186 360 198" stroke="#f7f3ea" stroke-width="16" stroke-linecap="round" fill="none"/>
  ${[70, 120, 175, 230, 285, 335].map((x, k) => `<ellipse cx="${x}" cy="${183 + (k % 2) * 30}" rx="14" ry="7" fill="${pick(['#c9692b', '#d1495b', '#fdc24b', '#7b4a2a'], k)}"/>`).join('')}
  ${row(-10, 410, 300, 1.3, 8, back, { sit: true })}`
  ),
}

for (const [name, text] of Object.entries(SCENES)) writeFileSync(join(outDir, `${name}.svg`), text)
console.log('wrote', Object.keys(SCENES).length, 'mock photos')
