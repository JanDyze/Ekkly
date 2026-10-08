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

// A mask that cuts a thin gap round whoever is in front, for the people
// standing behind them. A gap rather than a white outline, because it is the
// background that shows through and so it looks right on light and dark.
const gapMask = (id, ...figures) =>
  `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"><rect width="64" height="64" fill="#fff"/><g stroke="#000" stroke-width="4">${figures.join('')}</g></mask>`

// A check mark. \`i\` staggers it among others when it draws itself.
const check = (x, y, s, stroke, width = 2.6, i = 0) =>
  `<path class="a-draw" style="--i:${i}" pathLength="1" d="M${x} ${y + s * 0.5} l${s * 0.35} ${s * 0.38} l${s * 0.65} -${s * 0.8}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`

// A gear, as a circle with rounded teeth around it. Several shapes rather than
// one path so the teeth keep the rounded ends every other icon's parts have;
// a clipPath unions them, which is how the two-tone fill gets poured in.
const gearShape = (teeth = 8) =>
  `<circle cx="32" cy="32" r="20"/>` +
  Array.from(
    { length: teeth },
    (_, i) => `<rect x="27.5" y="4" width="9" height="16" rx="4" transform="rotate(${(360 / teeth) * i} 32 32)"/>`
  ).join('')

// Every moving part carries an \`a-…\` class, which AppArt.vue animates: once as
// an icon comes on, and again when it is pointed at or opened. Parts that
// already sit under an SVG transform move inside a group of their own, so the
// animation adds to the transform rather than replacing it.
const ICONS = {
  // Four people of different heights and colours standing on one line, as
  // a church does in a photo: the tallest first, then the child in front of
  // them, then the two either side.
  //
  // It was three matching silhouettes, which said "users" the way any admin
  // panel does. A church is every age and every kind, so no two of these are
  // the same size or the same colour. Each is cut back where someone stands
  // in front of them, so they read as people rather than one shape.
  //
  // They arrive rearranging themselves, the way a group sorts itself out for
  // the photo: each starts in a neighbour's place and they swap, the tall one
  // with the one on the left, then the child with the one on the right, with
  // a small hop as they pass. The gaps cut where someone stands in front move
  // with whoever is standing there (`--dx` on the cut as on the person), so
  // nobody shows a hole halfway across.
  members: svg(`
  ${gapMask('tall', `<g class="a-shuffle" style="--i:0;--dx:-14.5px">${person(27, 14, 7.4, 25, 58, '#000')}</g>`)}
  ${gapMask('child', `<g class="a-shuffle" style="--i:1;--dx:11.5px">${person(40.5, 35, 4.6, 16, 58, '#000')}</g>`)}
  <g mask="url(#tall)"><g class="a-shuffle" style="--i:0;--dx:14.5px">${person(12.5, 23, 5.6, 19, 58, 'url(#b)')}</g></g>
  <g mask="url(#child)"><g class="a-shuffle" style="--i:1;--dx:-11.5px">${person(52, 27, 5.4, 19, 58, 'url(#t)')}</g></g>
  <g mask="url(#child)">
    <g class="a-shuffle" style="--i:0;--dx:-14.5px">
      ${person(27, 14, 7.4, 25, 58, 'url(#o)')}
      <path d="M19.6 14a7.4 7.4 0 0 1 14.8 0" fill="url(#shine)"/>
    </g>
  </g>
  <g class="a-shuffle" style="--i:1;--dx:11.5px">${person(40.5, 35, 4.6, 16, 58, O1)}</g>`),

  // Three people, and the ring drawing itself around them.
  smallgroups: svg(`
  <path class="a-draw" style="--i:1" pathLength="1" d="M15.5 17.5A24 24 0 0 1 48.5 17.5" fill="none" stroke="url(#o)" stroke-width="4.5" stroke-linecap="round"/>
  <path class="a-draw" style="--i:0" pathLength="1" d="M14 48A24 24 0 0 1 11.2 23.5" fill="none" stroke="url(#b)" stroke-width="4.5" stroke-linecap="round"/>
  <path class="a-draw" style="--i:2" pathLength="1" d="M52.8 23.5A24 24 0 0 1 50 48" fill="none" stroke="url(#t)" stroke-width="4.5" stroke-linecap="round"/>
  <g class="a-pop">
    ${person(20.5, 32, 5, 16, 52, 'url(#b)')}
    ${person(43.5, 32, 5, 16, 52, 'url(#t)')}
    ${person(32, 28, 7, 23, 56, 'url(#o)')}
  </g>`),

  // A tally — the "tara" a head count is kept in on paper: four strokes on a
  // sheet and the fifth struck across them, with a person on the corner for
  // who is being counted. It is written as a tally is: one stroke at a time,
  // top to bottom, then a breath, then the strike across them last. The
  // strokes are flat blue because a gradient on a perfectly upright line
  // (no width to measure it across) is not drawn at all.
  //
  // It was a calendar with a day ticked, which was Events' calendar again, and
  // then four people standing as the strokes with the fifth struck through
  // them — which read as people being crossed off the roll, the opposite of
  // counting who came. The strike goes through marks now, never through
  // anyone.
  attendance: svg(`
  ${splitTile(4, 8, 54, 48, 10, 'c')}
  <rect x="9.5" y="14" width="43" height="36" rx="5" fill="#fff"/>
  ${[17, 24.5, 32, 39.5]
    .map((x, i) => `<path class="a-tally" style="--i:${i}" pathLength="1" d="M${x} 20V44" stroke="${B2}" stroke-width="4" stroke-linecap="round"/>`)
    .join('\n  ')}
  <path class="a-tally a-tally-strike" style="--i:4.4" pathLength="1" d="M12.5 39.5L45 24" stroke="url(#o)" stroke-width="4.5" stroke-linecap="round"/>
  <g class="a-pop">
    <circle cx="51" cy="49" r="11" fill="#fff"/>
    <circle cx="51" cy="49" r="8.6" fill="url(#t)"/>
    <circle cx="51" cy="46" r="2.8" fill="#fff"/>
    <path d="M45.8 54.5c.6-3.2 2.7-5 5.2-5s4.6 1.8 5.2 5z" fill="#fff"/>
  </g>`),

  // A calendar, and a star arriving on it.
  events: svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  <path class="a-star" d="M32 27.5l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6L32 44.9l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="url(#o)" stroke-linejoin="round"/>
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

  // A song sheet: its lines written, then the note dropping on.
  songs: svg(`
  ${splitTile(4, 6, 46, 50, 10, 'c')}
  <rect x="10" y="14" width="34" height="32" rx="4" fill="#fff"/>
  <circle cx="15.5" cy="21" r="2.2" fill="${O2}"/>
  <circle cx="15.5" cy="29" r="2.2" fill="${LINE}"/>
  <circle cx="15.5" cy="37" r="2.2" fill="${LINE}"/>
  <rect class="a-line" style="--i:0" x="20.5" y="19.2" width="19" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="20.5" y="27.2" width="15" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="20.5" y="35.2" width="11" height="3.6" rx="1.8" fill="${LINE}"/>
  <g transform="translate(-4 -1)">
    <g class="a-drop" style="--i:3" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke">
      <path d="M50 30.8l9-3.2v5.2l-6 2V52" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
      <circle cx="44.5" cy="52" r="7" fill="url(#o)"/>
      <path d="M48 31l11-3.8v5.2L51.5 35" fill="url(#o)" stroke="none"/>
      <rect x="48" y="31" width="4" height="21.5" fill="url(#o)" stroke="none"/>
    </g>
  </g>`),

  // A clock with people around it: the face, then four people arriving at
  // the quarters, each one's stretch of the frame drawing itself to the next.
  //
  // It was a roster card with a clock in its corner, which said the same thing
  // in two pieces. A schedule is people kept around the clock, so the frame is
  // made of them: the dots are where it joins up. The frame and the face are
  // rounded squares, like the tiles of the other icons, one inside the other.
  // The face is split orange over blue like the other tiles, with its hour
  // marks in white over both. The hands are drawn at twelve and four here; AppArt.vue turns them to the
  // time on the device (`clock-hour`, `clock-minute`).
  lineups: svg(`
  <g class="a-pop">
    ${splitTile(12, 12, 40, 40, 7, 'c')}
    ${Array.from({ length: 12 }, (_, h) => {
      // A mark for each hour, longer at the quarters. No minute marks: at
      // icon size they blur into a ring.
      const inner = h % 3 === 0 ? 13.4 : 14.4
      const a = ((h * 30 - 90) * Math.PI) / 180
      const [x1, y1, x2, y2] = [inner, 17.2].flatMap((r) => [32 + r * Math.cos(a), 32 + r * Math.sin(a)]).map((n) => n.toFixed(2))
      return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`
    }).join('')}
  </g>
  <g class="a-spin">
    <circle cx="32" cy="32" r="14" fill="none"/>
    <path class="clock-minute" d="M32 32V21.3" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
    <path class="clock-hour" d="M32 32V25.8" transform="rotate(120 32 32)" stroke="#fff" stroke-width="3.8" stroke-linecap="round"/>
    <circle cx="32" cy="32" r="2.7" fill="#fff"/>
  </g>
  ${(() => {
    // Four people, each 30% of the way along a side going clockwise, so they
    // sit off-centre like a pinwheel rather than squarely at the quarters, and
    // a stretch of the frame from each to the next, round the corner between
    // them. Each stretch is the top one turned a quarter at a time, and runs
    // in under both dots so the frame reads as one piece held together by
    // them.
    const H = 25
    const corner = 11
    const tuck = 4
    const lo = 32 - H
    const hi = 32 + H
    const along = lo + 2 * H * 0.3
    const quarter = `M${along + tuck} ${lo}H${hi - corner}A${corner} ${corner} 0 0 1 ${hi} ${lo + corner}V${Math.max(along - tuck, lo + corner)}`
    const fills = ['o', 'b', 'o', 't']
    const spots = [[along, lo], [hi, along], [64 - along, hi], [lo, 64 - along]]
    const sides = fills
      .map(
        (_, i) =>
          `<g transform="rotate(${i * 90} 32 32)"><path class="a-draw" style="--i:${i + 1}" pathLength="1" d="${quarter}" fill="none" stroke="url(#${fills[(i + 1) % fills.length]})" stroke-width="3.6" stroke-linecap="round"/></g>`
      )
      .join('\n  ')
    const dots = fills
      .map(
        (f, i) =>
          `<circle class="a-pop" style="--i:${i + 1}" cx="${spots[i][0]}" cy="${spots[i][1]}" r="6" fill="url(#${f})" stroke="#fff" stroke-width="1.6"/>`
      )
      .join('\n  ')
    return `${sides}\n  ${dots}`
  })()}`),

  // A Bible: the cross appearing, and the ribbon falling.
  bible: svg(`
  <rect x="8" y="5" width="46" height="54" rx="8" fill="url(#b)"/>
  <rect x="11" y="49" width="43" height="6" rx="1.5" fill="#fff"/>
  <clipPath id="c"><rect x="13" y="4" width="43" height="46" rx="7"/></clipPath>
  <g clip-path="url(#c)">
    <rect x="13" y="4" width="43" height="46" fill="${O3}"/>
    <path d="M13 4H56V36Z" fill="url(#o)"/>
    <rect x="13" y="4" width="43" height="46" fill="url(#shine)"/>
  </g>
  <g class="a-pop" style="--i:1">
    <rect x="31.5" y="12" width="6" height="29" rx="1" fill="#fff"/>
    <rect x="23.5" y="20" width="22" height="6" rx="1" fill="#fff"/>
  </g>
  <path class="a-ribbon" d="M41 48h8v14l-4-3.5-4 3.5z" fill="${O3}"/>`),

  // Minutes: the pencil writing, and the lines appearing behind it.
  minutes: svg(`
  ${splitTile(4, 5, 48, 52, 10, 'c')}
  <path d="M10 14a3 3 0 0 1 3-3h24l9 9v26a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#fff"/>
  <path d="M37 11v6.5a2.5 2.5 0 0 0 2.5 2.5H46" fill="#DCE3EE"/>
  <rect class="a-line" style="--i:0" x="16" y="22" width="20" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="16" y="29.5" width="24" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="16" y="37" width="16" height="3.6" rx="1.8" fill="${LINE}"/>
  <g transform="translate(-4 -3) rotate(45 46 44)">
    <g class="a-write">
      <rect x="41" y="22" width="10" height="30" rx="2" fill="url(#o)" stroke="#fff" stroke-width="2.4" paint-order="stroke"/>
      <path d="M41 52h10l-5 9z" fill="#FFD9A6" stroke="#fff" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>
      <path d="M44.4 58.3L46 61l1.6-2.7z" fill="${NAVY}"/>
      <rect x="41" y="22" width="10" height="5" rx="2" fill="${O3}"/>
    </g>
  </g>`),

  // Hands together in prayer, and the light coming out around them.
  prayer: svg(`
  <g stroke="${O1}" stroke-width="2.8" stroke-linecap="round">
    <path class="a-ray" style="--i:2" d="M32 3v6"/>
    <path class="a-ray" style="--i:1" d="M20 7l3 5"/>
    <path class="a-ray" style="--i:3" d="M44 7l-3 5"/>
    <path class="a-ray" style="--i:0" d="M11 17l5 3"/>
    <path class="a-ray" style="--i:4" d="M53 17l-5 3"/>
  </g>
  <g class="a-pop">
    <path d="M30.5 15c-2.8 0-4.4 2.4-5 5.5L20 43l-7.5 6.8L19 60l11.5-8.7c.7-.5 1-1.3 1-2.2V17.5c0-1.4-.4-2.5-1-2.5z" fill="url(#o)"/>
    <path d="M33.5 15c2.8 0 4.4 2.4 5 5.5L44 43l7.5 6.8L45 60l-11.5-8.7c-.7-.5-1-1.3-1-2.2V17.5c0-1.4.4-2.5 1-2.5z" fill="url(#o)"/>
    <path d="M33.5 15c2.8 0 4.4 2.4 5 5.5L44 43l7.5 6.8L45 60l-11.5-8.7c-.7-.5-1-1.3-1-2.2V17.5c0-1.4.4-2.5 1-2.5z" fill="${O3}" opacity=".35"/>
    <path d="M12.5 49.8L19 60l-5.5 3.5L6 53z" fill="url(#b)"/>
    <path d="M51.5 49.8L45 60l5.5 3.5L58 53z" fill="url(#b)"/>
  </g>`),

  // A photo: the hills settling and the sun rising over them.
  gallery: svg(`
  ${splitTile(5, 6, 54, 52, 11, 'c')}
  <clipPath id="p"><rect x="11" y="12" width="42" height="40" rx="5"/></clipPath>
  <g clip-path="url(#p)">
    <rect x="11" y="12" width="42" height="40" fill="url(#b)"/>
    <circle class="a-sun" cx="42" cy="22.5" r="5" fill="#fff"/>
    <g class="a-hills">
      <path d="M11 52L26 30l9 12 6-7 12 17z" fill="url(#t)"/>
      <path d="M26 30l9 12-9 10z" fill="#0B7F95" opacity=".55"/>
    </g>
  </g>`),

  // Two links clicking together, and the little flash of it.
  links: svg(`
  <g stroke="${O1}" stroke-width="2.8" stroke-linecap="round">
    <path class="a-ray" style="--i:0" d="M12 9l3 5"/>
    <path class="a-ray" style="--i:1" d="M5 17l5 3"/>
    <path class="a-ray" style="--i:2" d="M20 5l1 5.5"/>
  </g>
  <g transform="rotate(-45 32 32)">
    <g class="a-join-left">
      <rect x="3.5" y="24.5" width="31" height="15" rx="7.5" fill="none" stroke="url(#o)" stroke-width="7"/>
    </g>
    <g class="a-join-right">
      <rect x="29.5" y="24.5" width="31" height="15" rx="7.5" fill="none" stroke="url(#b)" stroke-width="7"/>
    </g>
    <g class="a-join-left">
      <path d="M29.5 32h5" stroke="url(#o)" stroke-width="7" stroke-linecap="round"/>
    </g>
  </g>`),

  // An envelope with a peso bill in it: the church's money, kept the way
  // most churches keep it — counted into envelopes. The flap stands open
  // behind the bill and the front pocket cuts a V across it. As the icon comes
  // on the bill rises out of the envelope with a little spring, and then its
  // peso sign writes itself.
  //
  // It was coins stacking with a peso in front, which said money the way a
  // bank does; then an offering box, which said giving and not the books.
  finances: svg(`
  <path d="M6 31L32 11l26 20z" fill="${B3}" stroke="${B3}" stroke-width="3" stroke-linejoin="round"/>
  <g class="a-rise">
    <rect x="13" y="9" width="38" height="29" rx="3.5" fill="#fff" stroke="#DCE3EE" stroke-width="1.6"/>
    <rect x="17" y="13" width="30" height="21" rx="2" fill="none" stroke="${T1}" stroke-width="1.4" opacity=".55"/>
    <path class="a-draw" style="--i:4" pathLength="1" d="M29.5 31V16.5h4.3a4.3 4.3 0 0 1 0 8.6h-4.3" fill="none" stroke="url(#t)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="a-draw" style="--i:6" pathLength="1" d="M26.5 19.6h11M26.5 22.4h11" stroke="${T2}" stroke-width="1.7" stroke-linecap="round"/>
  </g>
  <clipPath id="c"><path d="M6 31L32 46l26-15v24a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/></clipPath>
  <g clip-path="url(#c)">
    <rect x="6" y="28" width="52" height="31" fill="url(#b)"/>
    <path d="M18 28H58V54Z" fill="url(#o)"/>
    <rect x="6" y="28" width="52" height="31" fill="url(#shine)"/>
  </g>
  <path d="M6 31L32 46l26-15" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" opacity=".55"/>`),

  // A checklist, ticked one line after another.
  tasks: svg(`
  ${splitTile(5, 5, 54, 54, 11, 'c')}
  <rect x="12" y="12" width="40" height="40" rx="4" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `${check(15.5, 16 + i * 11.5, 7, B2, 2.8, i * 2)}
  <rect class="a-line" style="--i:${i * 2 + 1}" x="27" y="${19 + i * 11.5}" width="${i === 1 ? 16 : 20}" height="3.8" rx="1.9" fill="${LINE}"/>`
    )
    .join('')}`),

  // EKRIS: a blink, and something to say.
  ai: svg(`
  <path d="M12 40a20 20 0 0 1 40 0" fill="none" stroke="url(#b)" stroke-width="3.5" stroke-linecap="round"/>
  <rect x="7" y="34" width="9" height="15" rx="4.5" fill="url(#o)"/>
  <rect x="48" y="34" width="9" height="15" rx="4.5" fill="url(#o)"/>
  <rect x="13" y="24" width="38" height="33" rx="16.5" fill="#fff" stroke="#C9D8EE" stroke-width="1.8"/>
  <rect x="18" y="31" width="28" height="19" rx="9.5" fill="${NAVY}"/>
  <ellipse class="a-blink" cx="26.5" cy="40.5" rx="3.2" ry="4.2" fill="${B1}"/>
  <ellipse class="a-blink" cx="37.5" cy="40.5" rx="3.2" ry="4.2" fill="${B1}"/>
  <path d="M11.5 48.5c0 6.5 3.8 10 10 10h3" fill="none" stroke="url(#o)" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="25.5" cy="58.5" r="2.4" fill="${O3}"/>
  <g class="a-bubble">
    <path d="M40 4h18a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5h-9l-6 5v-5h-3a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5z" fill="#fff" stroke="${B2}" stroke-width="1.6"/>
    <circle class="a-dot" style="--i:0" cx="44.5" cy="13" r="1.9" fill="${NAVY}"/>
    <circle class="a-dot" style="--i:1" cx="50" cy="13" r="1.9" fill="${NAVY}"/>
    <circle class="a-dot" style="--i:2" cx="55.5" cy="13" r="1.9" fill="${NAVY}"/>
  </g>`),
  // The six below are pages rather than apps a church can buy, but they sit in
  // the same sidebar as the fourteen above, so they are drawn from the same
  // palette and with the same parts.

  // The week at a glance: three figures land, then the line climbs through them.
  dashboard: svg(`
  ${splitTile(4, 6, 56, 52, 11, 'c')}
  <rect x="9" y="11" width="46" height="42" rx="5" fill="#fff"/>
  <rect class="a-cell" style="--i:0" x="13.5" y="15.5" width="12" height="9" rx="2.5" fill="url(#b)"/>
  <rect class="a-cell" style="--i:1" x="26" y="15.5" width="12" height="9" rx="2.5" fill="url(#t)"/>
  <rect class="a-cell" style="--i:2" x="38.5" y="15.5" width="12" height="9" rx="2.5" fill="url(#o)"/>
  <path class="a-draw" style="--i:3" pathLength="1" d="M14 46l10-9 7 5 14-13" fill="none" stroke="url(#o)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle class="a-pop" style="--i:4" cx="45" cy="29" r="4" fill="${O3}" stroke="#fff" stroke-width="1.8"/>`),

  // A screen pulled down for the service, the words arriving on it, the line
  // being shown in the accent. It stands on one post where Schedules' board
  // stands on splayed legs, so the two don't read as one thing.
  presentation: svg(`
  <rect x="29.5" y="1" width="5" height="6" rx="2.5" fill="${O3}"/>
  ${splitTile(3, 5, 58, 41, 8, 'c')}
  <rect x="8" y="10" width="48" height="31" rx="3" fill="#fff"/>
  <rect class="a-line" style="--i:0" x="14" y="16" width="36" height="4.6" rx="2.3" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="18" y="26" width="28" height="4.6" rx="2.3" fill="url(#o)"/>
  <rect x="29.5" y="45" width="5" height="11" rx="2.5" fill="url(#b)"/>
  <rect x="19" y="55" width="26" height="5.5" rx="2.75" fill="${B3}"/>`),

  // The backlog: notes landing on the pile, one job done and one still open.
  todos: svg(`
  <g class="a-drop" style="--i:0">
    <rect x="7" y="16" width="38" height="38" rx="6" fill="url(#t)" transform="rotate(-11 26 35)"/>
  </g>
  <g class="a-drop" style="--i:1">
    <rect x="21" y="11" width="38" height="38" rx="6" fill="url(#b)" transform="rotate(9 40 30)"/>
  </g>
  <g class="a-pop" style="--i:2">
    <rect x="13" y="13" width="38" height="38" rx="6" fill="#fff" stroke="#C9D8EE" stroke-width="1.8"/>
    ${check(17.5, 18, 8, O2, 3, 2)}
    <rect class="a-line" style="--i:3" x="29" y="21.5" width="16" height="3.8" rx="1.9" fill="${LINE}"/>
    <rect x="18" y="31" width="8.5" height="8.5" rx="2.5" fill="none" stroke="${LINE}" stroke-width="2.4"/>
    <rect class="a-line" style="--i:4" x="31" y="33.5" width="13" height="3.8" rx="1.9" fill="${LINE}"/>
  </g>`),

  // A card with someone on it and the key that lets them in.
  accounts: svg(`
  ${splitTile(3, 9, 58, 46, 10, 'c')}
  <rect x="8" y="14" width="48" height="36" rx="5" fill="#fff"/>
  ${person(21, 26, 6.5, 20, 44, 'url(#b)')}
  <rect class="a-line" style="--i:0" x="35" y="22" width="16" height="4.2" rx="2.1" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="35" y="31" width="12" height="4.2" rx="2.1" fill="${LINE}"/>
  <g class="a-pop" style="--i:2">
    <g transform="rotate(-40 44 46)">
      <g stroke="#fff" stroke-width="2.8" paint-order="stroke">
        <rect x="44" y="43.2" width="19" height="5.6" rx="2.8" fill="url(#o)"/>
        <rect x="56.5" y="46" width="3.8" height="7" rx="1.9" fill="url(#o)"/>
        <circle cx="44" cy="46" r="9.5" fill="url(#o)"/>
      </g>
      <circle cx="44" cy="46" r="3.8" fill="#fff"/>
    </g>
  </g>`),

  // The record, read back: the lines written, then the glass held over them,
  // the two inside it the same lines seen larger.
  audit: svg(`
  ${splitTile(4, 4, 44, 50, 9, 'c')}
  <rect x="9" y="9" width="34" height="40" rx="4" fill="#fff"/>
  <rect class="a-line" style="--i:0" x="14" y="15" width="24" height="3.8" rx="1.9" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="14" y="23.5" width="18" height="3.8" rx="1.9" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="14" y="32" width="22" height="3.8" rx="1.9" fill="${LINE}"/>
  <g class="a-pop" style="--i:3">
    <path d="M50.5 48.5L60 58" stroke="url(#o)" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="42" cy="40" r="13" fill="#fff" fill-opacity=".92" stroke="url(#o)" stroke-width="5"/>
    <path d="M36 36.5h12M36 43.5h8" stroke="url(#b)" stroke-width="3" stroke-linecap="round"/>
  </g>`),

  // A gear, in the same two tones as everything else.
  // A gear, turning to a stop. The turn is on a group wrapping the clipped
  // fills rather than on the fills themselves: a transform inside the clip
  // would swirl the colours behind a gear that never moved.
  settings: svg(`
  <clipPath id="g">${gearShape()}</clipPath>
  <g class="a-spin">
    <g clip-path="url(#g)">
      <rect x="0" y="0" width="64" height="64" fill="url(#b)"/>
      <path d="M14 2H62V52Z" fill="url(#o)"/>
      <rect x="0" y="0" width="64" height="64" fill="url(#shine)"/>
    </g>
  </g>
  <g class="a-pop">
    <circle cx="32" cy="32" r="9" fill="#fff"/>
    <circle cx="32" cy="32" r="4.4" fill="url(#o)"/>
  </g>`),

  // Announcement videos, part of Events: the clapper comes down on a frame,
  // the play mark lands and the month's lines are written beside it.
  videos: svg(`
  <g class="a-drop" style="--i:0">
    <g transform="rotate(-9 6 20)">
      <rect x="5" y="9" width="54" height="10" rx="3" fill="${NAVY}"/>
      <path d="M14 9h7l-5.5 10h-7zM28 9h7l-5.5 10h-7zM42 9h7l-5.5 10h-7z" fill="#fff"/>
    </g>
  </g>
  ${splitTile(4, 21, 56, 37, 8, 'c')}
  <rect x="9" y="26" width="46" height="27" rx="4" fill="#fff"/>
  <path class="a-pop" style="--i:1" d="M16.5 32.2c0-1.5 1.6-2.4 2.9-1.6l9.6 5.9c1.2.7 1.2 2.5 0 3.2l-9.6 5.9c-1.3.8-2.9-.1-2.9-1.6z" fill="url(#o)"/>
  <rect class="a-line" style="--i:2" x="34" y="32" width="15" height="4.2" rx="2.1" fill="${LINE}"/>
  <rect class="a-line" style="--i:3" x="34" y="40.5" width="10" height="4.2" rx="2.1" fill="${LINE}"/>`),

  // ---- Sections of the People app (src/apps/people), drawn the same way as
  // the apps so the People home's tiles wear Ekkly's artwork too. Named
  // `people-<section>`; they are rooms of one app, not apps, and nothing
  // sells them.

  // The whole roll: six people in rows on a card, arriving one by one.
  'people-everyone': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  ${[0, 1]
    .map((r) =>
      [0, 1, 2]
        .map(
          (c) =>
            `<g class="a-pop" style="--i:${r * 3 + c}">${person(19 + c * 13, 20 + r * 16.5, 3.6, 11, 31.5 + r * 16.5, ['url(#o)', 'url(#b)', 'url(#t)'][(r + c) % 3])}</g>`
        )
        .join('')
    )
    .join('')}`),

  // A birthday: a two-tier cake, and its candles lighting.
  'people-birthdays': svg(`
  <clipPath id="c"><rect x="8" y="34" width="48" height="22" rx="6"/></clipPath>
  <g clip-path="url(#c)">
    <rect x="8" y="34" width="48" height="22" fill="url(#b)"/>
    <path d="M16 34H56V52Z" fill="url(#o)"/>
    <path d="M8 34H56V40c-4 0-4 4-8 4s-4-4-8-4-4 4-8 4-4-4-8-4-4 4-8 4-4-4-8-4z" fill="#fff"/>
    <rect x="8" y="34" width="48" height="22" fill="url(#shine)"/>
  </g>
  <rect x="15" y="22" width="34" height="14" rx="5" fill="url(#o)"/>
  <rect x="15" y="22" width="34" height="5" rx="2.5" fill="#fff"/>
  <circle cx="21" cy="27" r="2.4" fill="#fff"/>
  <circle cx="32" cy="27.6" r="3" fill="#fff"/>
  <circle cx="43" cy="27" r="2.4" fill="#fff"/>
  ${[22, 32, 42]
    .map(
      (x, i) => `
  <rect x="${x - 1.7}" y="14" width="3.4" height="9" rx="1.7" fill="url(#b)"/>
  <path class="a-pop" style="--i:${i}" d="M${x} 5.5c2 2.6 3 4.2 3 5.6a3 3 0 0 1-6 0c0-1.4 1-3 3-5.6z" fill="url(#o)"/>`
    )
    .join('')}`),

  // Ministries: the church, its door the arched window of the mark.
  'people-ministries': svg(`
  <rect x="29.6" y="2" width="4.8" height="13" rx="1.6" fill="${NAVY}"/>
  <rect x="26" y="5.2" width="12" height="4.4" rx="1.6" fill="${NAVY}"/>
  ${splitTile(10, 28, 44, 30, 6, 'c')}
  <path d="M8.5 31L32 13.5 55.5 31z" fill="url(#o)" stroke="url(#o)" stroke-width="5" stroke-linejoin="round"/>
  <path d="M8.5 31L32 13.5 55.5 31z" fill="url(#shine)"/>
  <g class="a-pop" style="--i:1">
    <path d="M26 58V46a6 6 0 0 1 12 0V58z" fill="#fff"/>
    <path d="M15 45v-3.5a3.5 3.5 0 0 1 7 0V45z" fill="#fff"/>
    <path d="M42 45v-3.5a3.5 3.5 0 0 1 7 0V45z" fill="#fff"/>
  </g>`),

  // The roll at a glance: a ring in three parts.
  'people-glance': svg(`
  <g transform="rotate(-90 32 32)">
    <g class="a-pop">
      <circle cx="32" cy="32" r="21" fill="none" stroke="url(#b)" stroke-width="12" pathLength="100" stroke-dasharray="46 54"/>
      <circle cx="32" cy="32" r="21" fill="none" stroke="url(#o)" stroke-width="12" pathLength="100" stroke-dasharray="29 71" stroke-dashoffset="-48.5"/>
      <circle cx="32" cy="32" r="21" fill="none" stroke="url(#t)" stroke-width="12" pathLength="100" stroke-dasharray="17 83" stroke-dashoffset="-80"/>
    </g>
  </g>
  <circle cx="32" cy="32" r="27" fill="none" stroke="url(#shine)" stroke-width="12"/>`),

  // Records to fill in: a clipboard, two rows ticked and the third still open.
  'people-missing': svg(`
  ${splitTile(9, 9, 46, 51, 9, 'c')}
  <rect x="14" y="17" width="36" height="38" rx="4" fill="#fff"/>
  <rect x="22" y="4" width="20" height="10" rx="4" fill="${NAVY}" stroke="#fff" stroke-width="1.5"/>
  ${[0, 1]
    .map(
      (i) => `
  <circle cx="21" cy="${26 + i * 10}" r="3.8" fill="url(#b)"/>
  ${check(18.9, 24 + i * 10, 4.2, '#fff', 1.7, i)}
  <rect class="a-line" style="--i:${i}" x="28" y="${24.2 + i * 10}" width="${16 - i * 3}" height="3.6" rx="1.8" fill="${LINE}"/>`
    )
    .join('')}
  <circle class="a-pop" style="--i:2" cx="21" cy="46" r="3.4" fill="none" stroke="url(#o)" stroke-width="2.2"/>
  <rect x="28" y="44.2" width="10" height="3.6" rx="1.8" fill="${LINE}"/>`),

  // Your own record: a name badge with you on it.
  'people-me': svg(`
  ${splitTile(12, 9, 40, 51, 9, 'c')}
  <rect x="26.5" y="13" width="11" height="3" rx="1.5" fill="#fff"/>
  <rect x="17" y="20" width="30" height="35" rx="4.5" fill="#fff"/>
  <g class="a-pop">${person(32, 29.5, 5.2, 17, 42.5, 'url(#o)')}</g>
  <rect class="a-line" style="--i:0" x="22" y="45.5" width="20" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="25.5" y="50.6" width="13" height="2.8" rx="1.4" fill="${LINE}"/>`),

  // ---- Sections of the Schedules app (src/apps/schedules), drawn the same
  // way, named `schedules-<section>`.

  // My turns: the calendar with you on a day, ticked.
  'schedules-mine': svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  <g class="a-pop">${person(30, 31.5, 4.6, 16, 48, 'url(#o)')}</g>
  <g class="a-pop" style="--i:1">
    <circle cx="44" cy="44" r="7" fill="url(#b)" stroke="#fff" stroke-width="2"/>
    ${check(40.6, 41.6, 6.6, '#fff', 2, 2)}
  </g>
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

  // The calendar: a month, with its Sundays picked out.
  'schedules-calendar': svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  ${[0, 1, 2, 3]
    .map((c) =>
      [0, 1]
        .map(
          (r) =>
            `<rect class="a-cell" style="--i:${r * 4 + c}" x="${14.5 + c * 9}" y="${28 + r * 11}" width="7" height="8" rx="2" fill="${c === 0 ? 'url(#o)' : 'url(#b)'}"${c === 0 ? '' : ' opacity=".35"'}/>`
        )
        .join('')
    )
    .join('')}
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

  // Who serves: how often each person is on, as bars with a face on each.
  'schedules-who': svg(`
  <rect class="a-cell" style="--i:0" x="7" y="32" width="14" height="26" rx="5" fill="url(#b)"/>
  <rect class="a-cell" style="--i:1" x="25" y="22" width="14" height="36" rx="5" fill="url(#o)"/>
  <rect class="a-cell" style="--i:2" x="43" y="38" width="14" height="20" rx="5" fill="url(#t)"/>
  <rect x="7" y="32" width="50" height="26" fill="url(#shine)" opacity=".6"/>
  <g class="a-pop" style="--i:3">
    <circle cx="14" cy="24" r="5" fill="url(#b)" stroke="#fff" stroke-width="2"/>
    <circle cx="32" cy="13" r="6" fill="url(#o)" stroke="#fff" stroke-width="2"/>
    <circle cx="50" cy="30" r="5" fill="url(#t)" stroke="#fff" stroke-width="2"/>
  </g>`),

  // Worship: the microphone on its stand.
  'schedules-worship': svg(`
  <path d="M17 27a15 15 0 0 0 30 0" fill="none" stroke="url(#b)" stroke-width="4.5" stroke-linecap="round"/>
  <rect x="29.5" y="41" width="5" height="11" rx="2" fill="url(#b)"/>
  <rect x="19" y="51" width="26" height="6" rx="3" fill="${NAVY}"/>
  <g class="a-pop">
    <rect x="23" y="4" width="18" height="30" rx="9" fill="url(#o)"/>
    <rect x="23" y="4" width="18" height="30" rx="9" fill="url(#shine)"/>
    <path d="M27 13h10M27 18.5h10M27 24h10" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/>
  </g>`),

  // Preaching: the book open, its lines on both pages.
  'schedules-preaching': svg(`
  <path d="M4 15c10-5 20-4 28 2v38c-8-6-18-7-28-2z" fill="url(#b)"/>
  <path d="M60 15c-10-5-20-4-28 2v38c8-6 18-7 28-2z" fill="url(#o)"/>
  <path d="M8.5 17.5c8-3.5 15.5-2.5 21.5 1.5v31c-6-4-13.5-5-21.5-2z" fill="#fff"/>
  <path d="M55.5 17.5c-8-3.5-15.5-2.5-21.5 1.5v31c6-4 13.5-5 21.5-2z" fill="#fff"/>
  <rect class="a-line" style="--i:0" x="12.5" y="24" width="13" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="12.5" y="31" width="10" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="12.5" y="38" width="12" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:3" x="38.5" y="24" width="13" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:4" x="38.5" y="31" width="11" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:5" x="38.5" y="38" width="8" height="3" rx="1.5" fill="${LINE}"/>`),

  // Ushers: the door, standing open.
  'schedules-ushers': svg(`
  ${splitTile(10, 4, 44, 56, 9, 'c')}
  <rect x="16" y="10" width="32" height="50" rx="3" fill="#fff"/>
  <g class="a-pop">
    <path d="M16 10L33 14.5V55.5L16 60z" fill="url(#o)"/>
    <path d="M16 10L33 14.5V55.5L16 60z" fill="url(#shine)"/>
    <circle cx="29" cy="36" r="2.2" fill="#fff"/>
  </g>`),

  // Welcome: a word said kindly — a speech bubble, a heart in it.
  'schedules-welcome': svg(`
  <clipPath id="c">
    <rect x="5" y="7" width="54" height="40" rx="13"/>
    <path d="M15 38L12 58L31 38z"/>
  </clipPath>
  <g clip-path="url(#c)">
    <rect x="0" y="0" width="64" height="64" fill="url(#b)"/>
    <path d="M14 7H59V40Z" fill="url(#o)"/>
    <rect x="0" y="0" width="64" height="64" fill="url(#shine)"/>
  </g>
  <path class="a-pop" d="M32 38c-8.5-5.6-12.5-9.6-12.5-14a6 6 0 0 1 12.5-2.4A6 6 0 0 1 44.5 24c0 4.4-4 8.4-12.5 14z" fill="#fff"/>`),

  // ---- Sections of the Attendance app (src/apps/attendance), named
  // `attendance-<section>`.

  // Gatherings: the list of them, each with its date and how full it was.
  'attendance-gatherings': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <rect class="a-cell" style="--i:${i}" x="14" y="${16.5 + i * 11.5}" width="8" height="8" rx="2.2" fill="url(#${['o', 'b', 't'][i]})"/>
  <rect class="a-line" style="--i:${i}" x="25.5" y="${18.7 + i * 11.5}" width="${13 - i * 2}" height="3.6" rx="1.8" fill="${LINE}"/>
  <circle cx="45" cy="${20.5 + i * 11.5}" r="3.6" fill="none" stroke="#DCE3EE" stroke-width="2.2"/>
  <path class="a-draw" style="--i:${i + 1}" pathLength="1" d="M45 ${16.9 + i * 11.5}a3.6 3.6 0 1 1 ${-3.6 + [3.2, 0.6, 2.4][i]} ${3.6 + [2.4, 3.4, 3.0][i]}" fill="none" stroke="url(#b)" stroke-width="2.2" stroke-linecap="round"/>`
    )
    .join('')}`),

  // To record: three people on a card, two ticked off and one still to mark.
  'attendance-record': svg(`
  ${splitTile(4, 8, 56, 48, 10, 'c')}
  <rect x="9.5" y="14" width="45" height="36" rx="5" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <g class="a-pop" style="--i:${i}">${person(19 + i * 13, 24, 4, 12, 37, 'url(#b)')}</g>`
    )
    .join('')}
  ${[0, 1]
    .map(
      (i) => `
  <circle cx="${19 + i * 13}" cy="43.5" r="3.8" fill="url(#o)"/>
  ${check(16.9 + i * 13, 41.4, 4.2, '#fff', 1.6, i + 3)}`
    )
    .join('')}
  <circle cx="45" cy="43.5" r="3.2" fill="none" stroke="${LINE}" stroke-width="1.8"/>`),

  // Not seen lately: "Tara!" — someone waving a friend back over, arm up and
  // the call in the air. The one waving is the full colour and in front, so
  // drawn flat (a section's tile) nothing see-through overlaps itself. An invitation, never a gap: the first drawing was a
  // faded person in a dashed ring with a clock, and it read as someone being
  // taken off the roll, which is the one thing this list is not for.
  'attendance-quiet': svg(`
  <g class="a-side a-left">${person(19, 25, 7, 22, 56, 'url(#o)')}</g>
  <g class="a-wave">
    <path d="M47.5 43L54 21" stroke="url(#b)" stroke-width="6.5" stroke-linecap="round"/>
    <circle cx="55" cy="17" r="5" fill="url(#b)"/>
  </g>
  ${person(39, 27, 8, 26, 58, 'url(#b)')}
  <path d="M39 27a8 8 0 0 1 8-8" fill="none" stroke="url(#shine)" stroke-width="3"/>
  <g stroke="${O1}" stroke-width="2.6" stroke-linecap="round" fill="none">
    <path class="a-ray" style="--i:0" d="M60.5 9.5a8 8 0 0 1 1.5 7"/>
    <path class="a-ray" style="--i:1" d="M57 5.5a12 12 0 0 1 6 4"/>
  </g>`),

  // By month: how many came, month after month, as columns on a card.
  'attendance-months': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  <rect class="a-cell" style="--i:0" x="15" y="34" width="7" height="13" rx="2" fill="url(#b)" opacity=".55"/>
  <rect class="a-cell" style="--i:1" x="24.5" y="28" width="7" height="19" rx="2" fill="url(#b)" opacity=".75"/>
  <rect class="a-cell" style="--i:2" x="34" y="31" width="7" height="16" rx="2" fill="url(#t)"/>
  <rect class="a-cell" style="--i:3" x="43.5" y="19" width="7" height="28" rx="2" fill="url(#o)"/>
  <rect x="13" y="47" width="39" height="2" rx="1" fill="#DCE3EE"/>`),

  // ---- Sections of the Events app (src/apps/events), named `events-<section>`.

  // The calendar: the month as a grid, a few of its days with something on.
  'events-calendar': svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  ${[0, 1, 2]
    .map((r) =>
      [0, 1, 2, 3]
        .map((c) => {
          const on = { '0,1': 'o', '1,3': 'b', '2,0': 't' }[`${r},${c}`]
          return `<rect class="a-cell" style="--i:${r * 4 + c}" x="${14.5 + c * 9}" y="${27.5 + r * 8}" width="7" height="6" rx="1.8" fill="${on ? `url(#${on})` : '#DCE3EE'}"/>`
        })
        .join('')
    )
    .join('')}
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

  // Coming up: what is on, in order, along a line.
  'events-upcoming': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  <rect x="17" y="17" width="2.4" height="30" rx="1.2" fill="#DCE3EE"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <circle class="a-pop" style="--i:${i}" cx="18.2" cy="${20 + i * 12}" r="3.8" fill="url(#${['o', 'b', 't'][i]})" stroke="#fff" stroke-width="1.6"/>
  <rect class="a-line" style="--i:${i}" x="25.5" y="${17 + i * 12}" width="${20 - i * 4}" height="3.4" rx="1.7" fill="${LINE}"/>
  <rect class="a-line" style="--i:${i}" x="25.5" y="${22.4 + i * 12}" width="${11 - i * 2}" height="2.6" rx="1.3" fill="#DCE3EE"/>`
    )
    .join('')}`),

  // Every week: a week's page, and the arrows going round it again.
  'events-weekly': svg(`
  <g class="a-spin">
    <path d="M12.5 26A21 21 0 0 1 49 17" fill="none" stroke="url(#b)" stroke-width="5" stroke-linecap="round"/>
    <path d="M51.5 38A21 21 0 0 1 15 47" fill="none" stroke="url(#o)" stroke-width="5" stroke-linecap="round"/>
    <path d="M44 11.5l6 5.6-7.6 3z" fill="url(#b)" stroke="url(#b)" stroke-width="2" stroke-linejoin="round"/>
    <path d="M20 52.5l-6-5.6 7.6-3z" fill="url(#o)" stroke="url(#o)" stroke-width="2" stroke-linejoin="round"/>
  </g>
  <g class="a-pop" style="--i:2">
    <rect x="21" y="22" width="22" height="21" rx="4" fill="#fff" stroke="#DCE3EE" stroke-width="1.6"/>
    <rect x="21" y="22" width="22" height="6" rx="3" fill="url(#t)"/>
    <rect x="21" y="25" width="22" height="3" fill="url(#t)"/>
    <rect x="25.5" y="32" width="5" height="4" rx="1.2" fill="url(#o)"/>
    <rect x="33.5" y="32" width="5" height="4" rx="1.2" fill="#DCE3EE"/>
  </g>`),

  // ---- Sections of the Finances app (src/apps/finances), named
  // `finances-<section>`. Money in is teal and money out orange, the same two
  // sides on every one of them.

  // The book: lines written in it, each marked in or out.
  'finances-book': svg(`
  <rect x="9" y="5" width="44" height="54" rx="7" fill="url(#b)"/>
  <rect x="9" y="5" width="44" height="54" rx="7" fill="url(#shine)"/>
  <rect x="15" y="10" width="34" height="44" rx="3.5" fill="#fff"/>
  <rect x="9" y="5" width="7" height="54" rx="3" fill="${NAVY}" opacity=".85"/>
  ${[0, 1, 2, 3]
    .map(
      (i) => `
  <circle class="a-cell" style="--i:${i}" cx="21.5" cy="${17 + i * 9.5}" r="2.6" fill="url(#${i % 2 ? 'o' : 't'})"/>
  <rect class="a-line" style="--i:${i}" x="26.5" y="${15.3 + i * 9.5}" width="${17 - (i % 2) * 5}" height="3.4" rx="1.7" fill="${LINE}"/>`
    )
    .join('')}`),

  // The statement: a sheet with its lines, and the total ruled off under them.
  'finances-statement': svg(`
  ${splitTile(10, 4, 44, 56, 9, 'c')}
  <rect x="15.5" y="10" width="33" height="44" rx="4" fill="#fff"/>
  <rect class="a-line" style="--i:0" x="20" y="16" width="16" height="3.4" rx="1.7" fill="url(#t)"/>
  <rect class="a-line" style="--i:1" x="20" y="23" width="24" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="20" y="29" width="20" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:3" x="20" y="35" width="22" height="3" rx="1.5" fill="${LINE}"/>
  <rect x="20" y="42" width="24" height="1.8" rx=".9" fill="${NAVY}"/>
  <rect x="20" y="45.2" width="24" height="1.8" rx=".9" fill="${NAVY}"/>
  <rect class="a-pop" style="--i:4" x="32" y="48.8" width="12" height="3.4" rx="1.7" fill="url(#o)"/>`),

  // Accounts: the bank, and the cash beside it.
  'finances-accounts': svg(`
  <path d="M5 23L28 9l23 14z" fill="url(#o)" stroke="url(#o)" stroke-width="4" stroke-linejoin="round"/>
  <path d="M5 23L28 9l23 14z" fill="url(#shine)"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${10 + i * 10}" y="27" width="6" height="20" rx="2" fill="url(#b)"/>`).join('')}
  <rect x="5" y="48" width="46" height="6" rx="3" fill="${NAVY}"/>
  <g class="a-pop">
    <circle cx="49" cy="45" r="12" fill="#fff"/>
    <circle cx="49" cy="45" r="9.5" fill="url(#t)"/>
    <circle cx="49" cy="45" r="6" fill="none" stroke="#fff" stroke-width="1.8" opacity=".85"/>
  </g>`),

  // By month: each month's in and out, side by side.
  'finances-months': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  ${[
    [26, 20],
    [22, 24],
    [30, 18],
  ]
    .map(
      ([income, out], i) => `
  <rect class="a-cell" style="--i:${i * 2}" x="${14 + i * 13}" y="${47 - income}" width="4.5" height="${income}" rx="1.6" fill="url(#t)"/>
  <rect class="a-cell" style="--i:${i * 2 + 1}" x="${19.5 + i * 13}" y="${47 - out}" width="4.5" height="${out}" rx="1.6" fill="url(#o)"/>`
    )
    .join('')}
  <rect x="13" y="47" width="39" height="2" rx="1" fill="#DCE3EE"/>`),

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
