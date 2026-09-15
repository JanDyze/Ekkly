// Draws Ekkly's app icons as SVG, redrawn from the icon sheet the brand began with: glossy
// two-tone shapes in the mark's orange and blue, split on a diagonal, with
// white cards inside. One file per app, 64×64, transparent.
//
//   node brand/ekkly/make-app-icons.mjs src/assets/app-icons
//
// Optionally, a contact sheet to judge them side by side, on light and dark:
//
//   node brand/ekkly/make-app-icons.mjs src/assets/app-icons /tmp/sheet node_modules/sharp
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const [outDir, sheetPath, sharpPath] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

// The palette, shared by every icon.
const O1 = '#FFB21E' // warm orange
const O2 = '#FF7417'
const O3 = '#EC4319' // red orange
const B1 = '#3D9DFF' // light blue
const B2 = '#1467E8'
const B3 = '#0A4FC4' // deep blue
const T1 = '#2BD4C0' // teal
const T2 = '#0B93AB'
const LINE = '#8E9CB3' // grey text lines on a card
const NAVY = '#0B2A6B'

const defs = `
  <defs>
    <linearGradient id="o" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${O1}"/><stop offset=".5" stop-color="${O2}"/><stop offset="1" stop-color="${O3}"/>
    </linearGradient>
    <linearGradient id="b" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${B1}"/><stop offset=".55" stop-color="${B2}"/><stop offset="1" stop-color="${B3}"/>
    </linearGradient>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${T1}"/><stop offset="1" stop-color="${T2}"/>
    </linearGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>`

const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${defs}\n${body}\n</svg>\n`

// A rounded square, blue below the diagonal and orange above it — the frame of
// the card-like icons.
const splitTile = (x, y, w, h, r, id) => `
  <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
  <g clip-path="url(#${id})">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#b)"/>
    <path d="M${x + w * 0.18} ${y} H${x + w} V${y + h * 0.72} Z" fill="url(#o)"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#shine)"/>
  </g>`

// A person: a head and rounded shoulders.
const person = (cx, headY, headR, shoulderW, bottom, fill) => `
  <circle cx="${cx}" cy="${headY}" r="${headR}" fill="${fill}"/>
  <path d="M${cx - shoulderW / 2} ${bottom} C${cx - shoulderW / 2} ${headY + headR * 2.2} ${cx - shoulderW * 0.28} ${headY + headR * 1.55} ${cx} ${headY + headR * 1.55} C${cx + shoulderW * 0.28} ${headY + headR * 1.55} ${cx + shoulderW / 2} ${headY + headR * 2.2} ${cx + shoulderW / 2} ${bottom} Z" fill="${fill}"/>`

const check = (x, y, s, stroke, width = 2.6) =>
  `<path d="M${x} ${y + s * 0.5} l${s * 0.35} ${s * 0.38} l${s * 0.65} -${s * 0.8}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

const ICONS = {
  // Three people, the middle one in front.
  members: svg(`
  ${person(14, 22, 6.5, 22, 50, 'url(#b)')}
  ${person(50, 22, 6.5, 22, 50, 'url(#b)')}
  ${person(32, 17, 9.5, 32, 55, 'url(#o)')}
  <path d="M22.5 17a9.5 9.5 0 0 1 19 0" fill="url(#shine)"/>`),

  // Three people inside a ring.
  smallgroups: svg(`
  <path d="M15.5 17.5A24 24 0 0 1 48.5 17.5" fill="none" stroke="url(#o)" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M11.2 23.5A24 24 0 0 0 14 48" fill="none" stroke="url(#b)" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M52.8 23.5A24 24 0 0 1 50 48" fill="none" stroke="url(#t)" stroke-width="4.5" stroke-linecap="round"/>
  ${person(20.5, 32, 5, 16, 52, 'url(#b)')}
  ${person(43.5, 32, 5, 16, 52, 'url(#t)')}
  ${person(32, 28, 7, 23, 56, 'url(#o)')}`),

  // A calendar with a day checked off.
  attendance: svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  ${[0, 1, 2].map((c) => [0, 1].map((r) => (c === 2 && r === 1 ? '' : `<rect x="${15 + c * 12}" y="${28 + r * 11}" width="9.5" height="8.5" rx="2" fill="url(#b)"/>`)).join('')).join('')}
  <rect x="39" y="39" width="9.5" height="8.5" rx="2" fill="url(#o)"/>
  ${check(40.8, 39.6, 6, '#fff', 2)}
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

  // A calendar with a star on it.
  events: svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  <path d="M32 27.5l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6L32 44.9l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="url(#o)" stroke-linejoin="round"/>
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

  // A song sheet with a note.
  songs: svg(`
  ${splitTile(4, 6, 46, 50, 10, 'c')}
  <rect x="10" y="14" width="34" height="32" rx="4" fill="#fff"/>
  <circle cx="15.5" cy="21" r="2.2" fill="${O2}"/>
  <circle cx="15.5" cy="29" r="2.2" fill="${LINE}"/>
  <circle cx="15.5" cy="37" r="2.2" fill="${LINE}"/>
  <rect x="20.5" y="19.2" width="19" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect x="20.5" y="27.2" width="15" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect x="20.5" y="35.2" width="11" height="3.6" rx="1.8" fill="${LINE}"/>
  <g transform="translate(-4 -1)" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke">
    <path d="M50 30.8l9-3.2v5.2l-6 2V52" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <circle cx="44.5" cy="52" r="7" fill="url(#o)"/>
    <path d="M48 31l11-3.8v5.2L51.5 35" fill="url(#o)" stroke="none"/>
    <rect x="48" y="31" width="4" height="21.5" fill="url(#o)" stroke="none"/>
  </g>`),

  // A presentation board on its stand.
  lineups: svg(`
  <path d="M32 44L20 61M32 44L44 61" stroke="url(#b)" stroke-width="3.8" stroke-linecap="round"/>
  <path d="M32 44V61" stroke="url(#o)" stroke-width="3.8" stroke-linecap="round"/>
  <rect x="29.5" y="3" width="5" height="7" rx="2" fill="${O3}"/>
  <rect x="4" y="8" width="56" height="7" rx="3.5" fill="url(#o)"/>
  <rect x="8" y="14" width="48" height="29" fill="#fff"/>
  <rect x="4" y="42" width="56" height="5.5" rx="2.75" fill="url(#b)"/>
  <rect x="13" y="19" width="6" height="5" rx="1.5" fill="url(#b)"/>
  <rect x="13" y="26.5" width="6" height="5" rx="1.5" fill="url(#b)"/>
  <rect x="13" y="34" width="6" height="5" rx="1.5" fill="url(#b)"/>
  <rect x="22" y="19" width="14" height="5" rx="2.5" fill="url(#o)"/>
  <rect x="26" y="26.5" width="22" height="5" rx="2.5" fill="url(#b)"/>
  <rect x="34" y="34" width="17" height="5" rx="2.5" fill="url(#t)"/>`),

  // A Bible with a cross and a ribbon.
  bible: svg(`
  <rect x="8" y="5" width="46" height="54" rx="8" fill="url(#b)"/>
  <rect x="11" y="49" width="43" height="6" rx="1.5" fill="#fff"/>
  <clipPath id="c"><rect x="13" y="4" width="43" height="46" rx="7"/></clipPath>
  <g clip-path="url(#c)">
    <rect x="13" y="4" width="43" height="46" fill="${O3}"/>
    <path d="M13 4H56V36Z" fill="url(#o)"/>
    <rect x="13" y="4" width="43" height="46" fill="url(#shine)"/>
  </g>
  <rect x="31.5" y="12" width="6" height="29" rx="1" fill="#fff"/>
  <rect x="23.5" y="20" width="22" height="6" rx="1" fill="#fff"/>
  <path d="M41 48h8v14l-4-3.5-4 3.5z" fill="${O3}"/>`),

  // Minutes: a written page and a pencil.
  minutes: svg(`
  ${splitTile(4, 5, 48, 52, 10, 'c')}
  <path d="M10 14a3 3 0 0 1 3-3h24l9 9v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#fff"/>
  <path d="M37 11v6.5a2.5 2.5 0 0 0 2.5 2.5H46" fill="#DCE3EE"/>
  <rect x="16" y="22" width="20" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect x="16" y="29.5" width="24" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect x="16" y="37" width="16" height="3.6" rx="1.8" fill="${LINE}"/>
  <g transform="translate(-4 -3) rotate(45 46 44)">
    <rect x="41" y="22" width="10" height="30" rx="2" fill="url(#o)" stroke="#fff" stroke-width="2.4" paint-order="stroke"/>
    <path d="M41 52h10l-5 9z" fill="#FFD9A6" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
    <path d="M44.4 58.3L46 61l1.6-2.7z" fill="${NAVY}"/>
    <rect x="41" y="22" width="10" height="5" rx="2" fill="${O3}"/>
  </g>`),

  // Hands together in prayer, with a little light.
  prayer: svg(`
  <g stroke="${O1}" stroke-width="2.8" stroke-linecap="round">
    <path d="M32 3v6M20 7l3 5M44 7l-3 5M11 17l5 3M53 17l-5 3"/>
  </g>
  <path d="M30.5 15c-2.8 0-4.4 2.4-5 5.5L20 43l-7.5 6.8L19 60l11.5-8.7c.7-.5 1-1.3 1-2.2V17.5c0-1.4-.4-2.5-1-2.5z" fill="url(#o)"/>
  <path d="M33.5 15c2.8 0 4.4 2.4 5 5.5L44 43l7.5 6.8L45 60l-11.5-8.7c-.7-.5-1-1.3-1-2.2V17.5c0-1.4.4-2.5 1-2.5z" fill="url(#o)"/>
  <path d="M33.5 15c2.8 0 4.4 2.4 5 5.5L44 43l7.5 6.8L45 60l-11.5-8.7c-.7-.5-1-1.3-1-2.2V17.5c0-1.4.4-2.5 1-2.5z" fill="${O3}" opacity=".35"/>
  <path d="M12.5 49.8L19 60l-5.5 3.5L6 53z" fill="url(#b)"/>
  <path d="M51.5 49.8L45 60l5.5 3.5L58 53z" fill="url(#b)"/>`),

  // A photo: a sun over hills.
  gallery: svg(`
  ${splitTile(5, 6, 54, 52, 11, 'c')}
  <clipPath id="p"><rect x="11" y="12" width="42" height="40" rx="5"/></clipPath>
  <g clip-path="url(#p)">
    <rect x="11" y="12" width="42" height="40" fill="url(#b)"/>
    <path d="M11 52L26 30l9 12 6-7 12 17z" fill="url(#t)"/>
    <path d="M26 30l9 12-9 10z" fill="#0B7F95" opacity=".55"/>
    <circle cx="42" cy="22.5" r="5" fill="#fff"/>
  </g>`),

  // Two chain links, one just clicked in.
  links: svg(`
  <g stroke="${O1}" stroke-width="2.8" stroke-linecap="round">
    <path d="M12 9l3 5M5 17l5 3M20 5l1 5.5"/>
  </g>
  <g transform="rotate(-45 32 32)">
    <rect x="3.5" y="24.5" width="31" height="15" rx="7.5" fill="none" stroke="url(#o)" stroke-width="7"/>
    <rect x="29.5" y="24.5" width="31" height="15" rx="7.5" fill="none" stroke="url(#b)" stroke-width="7"/>
    <path d="M29.5 32h5" stroke="url(#o)" stroke-width="7" stroke-linecap="round"/>
  </g>`),

  // Stacks of coins and a peso.
  finances: svg(`
  <g>
    <ellipse cx="17" cy="51" rx="13" ry="5" fill="${B3}"/>
    <rect x="4" y="38" width="26" height="13" fill="url(#b)"/>
    <ellipse cx="17" cy="45" rx="13" ry="5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>
    <ellipse cx="17" cy="38" rx="13" ry="5" fill="${B1}"/>
  </g>
  <g>
    <rect x="18" y="12" width="26" height="12" fill="url(#o)"/>
    <ellipse cx="31" cy="24" rx="13" ry="5" fill="${O3}"/>
    <ellipse cx="31" cy="18" rx="13" ry="5" fill="none" stroke="#fff" stroke-width="1.6" opacity=".7"/>
    <ellipse cx="31" cy="12" rx="13" ry="5" fill="${O1}"/>
  </g>
  <circle cx="44" cy="43" r="17.5" fill="url(#o)" stroke="#fff" stroke-width="2.6"/>
  <circle cx="44" cy="43" r="17.5" fill="url(#shine)"/>
  <path d="M39.5 53V33h6.2a6 6 0 0 1 0 12h-6.2" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M35.5 37.3h15M35.5 41h15" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`),

  // A checklist.
  tasks: svg(`
  ${splitTile(5, 5, 54, 54, 11, 'c')}
  <rect x="12" y="12" width="40" height="40" rx="4" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `${check(15.5, 16 + i * 11.5, 7, B2, 2.8)}
  <rect x="27" y="${19 + i * 11.5}" width="${i === 1 ? 16 : 20}" height="3.8" rx="1.9" fill="${LINE}"/>`
    )
    .join('')}`),

  // EKRIS: a friendly assistant with a headset and something to say.
  ai: svg(`
  <path d="M12 40a20 20 0 0 1 40 0" fill="none" stroke="url(#b)" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="7" y="34" width="9" height="15" rx="4.5" fill="url(#o)"/>
  <rect x="48" y="34" width="9" height="15" rx="4.5" fill="url(#o)"/>
  <rect x="13" y="24" width="38" height="33" rx="16.5" fill="#fff" stroke="#C9D8EE" stroke-width="1.8"/>
  <rect x="18" y="31" width="28" height="19" rx="9.5" fill="${NAVY}"/>
  <ellipse cx="26.5" cy="40.5" rx="3.2" ry="4.2" fill="${B1}"/>
  <ellipse cx="37.5" cy="40.5" rx="3.2" ry="4.2" fill="${B1}"/>
  <path d="M11.5 48.5c0 6.5 3.8 10 10 10h3" fill="none" stroke="url(#o)" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="25.5" cy="58.5" r="2.4" fill="${O3}"/>
  <path d="M40 4h18a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-9l-6 5v-5h-3a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5z" fill="#fff" stroke="${B2}" stroke-width="1.6"/>
  <circle cx="44.5" cy="13" r="1.9" fill="${NAVY}"/>
  <circle cx="50" cy="13" r="1.9" fill="${NAVY}"/>
  <circle cx="55.5" cy="13" r="1.9" fill="${NAVY}"/>`),
}

for (const [key, text] of Object.entries(ICONS)) writeFileSync(join(outDir, `${key}.svg`), text)
console.log('wrote', Object.keys(ICONS).length, 'icons')

// A contact sheet, to compare with the original.
if (sheetPath && sharpPath) {
  const sharp = createRequire(import.meta.url)(sharpPath)
  const keys = Object.keys(ICONS)
  const cell = 220
  const cols = 7
  const rows = Math.ceil(keys.length / cols)
  const tiles = await Promise.all(keys.map((k) => sharp(Buffer.from(ICONS[k])).resize(160, 160).png().toBuffer()))
  const composite = tiles.map((input, i) => ({ input, left: (i % cols) * cell + 30, top: Math.floor(i / cols) * cell + 30 }))
  for (const [bg, suffix] of [[{ r: 255, g: 255, b: 255 }, 'light'], [{ r: 15, g: 23, b: 42 }, 'dark']]) {
    await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: bg } })
      .composite(composite)
      .png()
      .toFile(`${sheetPath}-${suffix}.png`)
  }
  console.log('sheets written')
}
