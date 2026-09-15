// A QR code for https://ekkly.online in Ekkly's own look: the four panes of the
// mark as four quadrants of the code, rounded modules and eyes, and the mark
// itself in the middle on a white tile.
//
// From the project root, with the two QR packages fetched for the run only:
//
//   npm i --no-save qrcode@1 jsqr@1
//   node brand/ekkly/build-qr.mjs public/brand-qr public/ekkly-mark.svg node_modules/sharp
//
// It reads its own output back at several sizes, blurred too, and says so if
// any fail. Serve the results at /qr (src/views/QrCode.vue).
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createRequire } from 'node:module'
import QRCode from 'qrcode'
import jsQR from 'jsqr'

const [outDir, markPath, sharpPath] = process.argv.slice(2)
const sharp = createRequire(import.meta.url)(sharpPath)

const URL_TO_OPEN = 'https://ekkly.online'

// The mark's panes, each taken dark enough to read as "dark" to a scanner:
// the mark's own yellow is far too pale against white to be scanned.
const PANES = {
  tl: { light: '#f7b63b', ink: '#b86e0a' }, // yellow
  tr: { light: '#f19140', ink: '#c4501c' }, // orange
  bl: { light: '#48bcf0', ink: '#0260c2' }, // blue
  br: { light: '#14aaae', ink: '#03738f' }, // teal
}

// Highest error correction: a quarter of the code can be covered and it still
// reads, which is what lets the mark sit in the middle.
const qr = QRCode.create(URL_TO_OPEN, { errorCorrectionLevel: 'H' })
const n = qr.modules.size
const dark = (r, c) => qr.modules.get(r, c)

const CELL = 20
const QUIET = 4 // modules of white around the code, as the standard asks
const size = (n + QUIET * 2) * CELL
const at = (i) => (i + QUIET) * CELL

// The three finder eyes, 7×7 at three corners. Drawn as shapes of their own.
const EYES = [
  { r: 0, c: 0, pane: 'tl' },
  { r: 0, c: n - 7, pane: 'tr' },
  { r: n - 7, c: 0, pane: 'bl' },
]
const inEye = (r, c) => EYES.some((e) => r >= e.r && r < e.r + 7 && c >= e.c && c < e.c + 7)

// The mark's tile in the middle, and the modules it clears.
const LOGO_MODULES = Math.round(n * 0.24) | 1 // odd, so it centres on a module
const logoStart = Math.floor((n - LOGO_MODULES) / 2)
const inLogo = (r, c) => r >= logoStart && r < logoStart + LOGO_MODULES && c >= logoStart && c < logoStart + LOGO_MODULES

const paneOf = (r, c) => {
  const top = r < n / 2
  const left = c < n / 2
  return top ? (left ? 'tl' : 'tr') : left ? 'bl' : 'br'
}

/* -------------------------------------------------------------- modules */

// Each dark module is a rounded square a hair smaller than its cell, so the
// code reads as dots of glass rather than a grid of pixels. Not much smaller:
// at 92% the white gaps between neighbours broke the code for decoders at high
// resolution, while 96% reads at every size tried, blurred included.
const DOT = CELL * Number(process.env.DOT || 0.96)
const ROUND = DOT * Number(process.env.ROUND ?? 0.3)
const dots = { tl: [], tr: [], bl: [], br: [] }
for (let r = 0; r < n; r++) {
  for (let c = 0; c < n; c++) {
    if (!dark(r, c) || inEye(r, c) || inLogo(r, c)) continue
    const x = at(c) + (CELL - DOT) / 2
    const y = at(r) + (CELL - DOT) / 2
    dots[paneOf(r, c)].push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${DOT.toFixed(1)}" height="${DOT.toFixed(1)}" rx="${ROUND.toFixed(1)}"/>`)
  }
}

// Two colours blended in plain hex, so the SVG opens in print tools too, which
// do not know CSS colour functions.
const mix = (a, b, t) =>
  '#' +
  [1, 3, 5]
    .map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0'))
    .join('')

// Each quadrant a gentle gradient from its ink towards a touch of its light
// shade, the way light moves across a pane — never so light it stops scanning.
const gradients = Object.entries(PANES)
  .map(
    ([key, { light, ink }]) => `
    <linearGradient id="g-${key}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${ink}"/>
      <stop offset="1" stop-color="${mix(ink, light, 0.18)}"/>
    </linearGradient>`
  )
  .join('')

/* ----------------------------------------------------------------- eyes */

const eye = ({ r, c, pane }) => {
  const x = at(c)
  const y = at(r)
  const outer = 7 * CELL
  const ring = CELL
  const R = Number(process.env.EYE ?? 2.2)
  const r2 = Math.max(0.01, R - 0.9)
  const { ink } = PANES[pane]
  return `
  <g>
    <path fill="${ink}" fill-rule="evenodd" d="
      M${x + R * CELL},${y} h${outer - 2 * R * CELL} a${R * CELL},${R * CELL} 0 0 1 ${R * CELL},${R * CELL} v${outer - 2 * R * CELL} a${R * CELL},${R * CELL} 0 0 1 -${R * CELL},${R * CELL} h-${outer - 2 * R * CELL} a${R * CELL},${R * CELL} 0 0 1 -${R * CELL},-${R * CELL} v-${outer - 2 * R * CELL} a${R * CELL},${R * CELL} 0 0 1 ${R * CELL},-${R * CELL}z
      M${x + ring + r2 * CELL},${y + ring} h${outer - 2 * ring - 2 * r2 * CELL} a${r2 * CELL},${r2 * CELL} 0 0 1 ${r2 * CELL},${r2 * CELL} v${outer - 2 * ring - 2 * r2 * CELL} a${r2 * CELL},${r2 * CELL} 0 0 1 -${r2 * CELL},${r2 * CELL} h-${outer - 2 * ring - 2 * r2 * CELL} a${r2 * CELL},${r2 * CELL} 0 0 1 -${r2 * CELL},-${r2 * CELL} v-${outer - 2 * ring - 2 * r2 * CELL} a${r2 * CELL},${r2 * CELL} 0 0 1 ${r2 * CELL},-${r2 * CELL}z"/>
    <rect x="${x + 2 * CELL}" y="${y + 2 * CELL}" width="${3 * CELL}" height="${3 * CELL}" rx="${Math.max(0, R - 1.1) * CELL}" fill="${ink}"/>
  </g>`
}

/* ------------------------------------------------------------------ mark */

// The mark's own SVG, ids prefixed so they cannot clash, scaled into the tile.
const markSvg = readFileSync(markPath, 'utf8')
const markInner = markSvg
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<title>[\s\S]*?<\/title>/, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/id="(\w+)"/g, 'id="mark-$1"')
  .replace(/url\(#(\w+)\)/g, 'url(#mark-$1)')

const tileSize = LOGO_MODULES * CELL
const tileX = at(logoStart)
const tilePad = tileSize * 0.14
const markSize = tileSize - tilePad * 2
// The mark's viewBox is 90 wide starting at 10.5, 9.
const markScale = markSize / 90
const logo = `
  <rect x="${tileX + CELL * 0.35}" y="${tileX + CELL * 0.35}" width="${tileSize - CELL * 0.7}" height="${tileSize - CELL * 0.7}" rx="${tileSize * 0.24}" fill="#ffffff"/>
  <g transform="translate(${tileX + tilePad} ${tileX + tilePad}) scale(${markScale}) translate(-10.5 -9)">${markInner}</g>`

/* ------------------------------------------------------------------ build */

const qrSvg = (withBackground = true) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <title>ekkly.online</title>
  <defs>${gradients}</defs>
  ${withBackground ? `<rect width="${size}" height="${size}" rx="${CELL * 3}" fill="#ffffff"/>` : ''}
  ${Object.entries(dots)
    .map(([key, list]) => `<g fill="url(#g-${key})">${list.join('')}</g>`)
    .join('\n  ')}
  ${EYES.map(eye).join('')}
  ${logo}
</svg>`

// A card for print and sharing: the code, and the address under it.
const cardW = size + CELL * 4
const cardH = size + CELL * 16
const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cardW} ${cardH}" width="${cardW}" height="${cardH}">
  <defs>
    <linearGradient id="card-bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${PANES.tl.light}"/>
      <stop offset="0.33" stop-color="${PANES.tr.light}"/>
      <stop offset="0.66" stop-color="${PANES.br.light}"/>
      <stop offset="1" stop-color="#0270dc"/>
    </linearGradient>
  </defs>
  <rect width="${cardW}" height="${cardH}" rx="${CELL * 3}" fill="#ffffff"/>
  <svg x="${CELL * 2}" y="${CELL * 2}" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${qrSvg(false).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</svg>
  <text x="${cardW / 2}" y="${size + CELL * 7.6}" text-anchor="middle" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="${CELL * 3.2}" font-weight="700" fill="#0f172a" letter-spacing="-1">ekkly.online</text>
  <text x="${cardW / 2}" y="${size + CELL * 10.6}" text-anchor="middle" font-family="'Segoe UI', Arial, sans-serif" font-size="${CELL * 1.5}" fill="#64748b">Scan to open your church’s app</text>
  <rect x="${cardW / 2 - CELL * 6}" y="${size + CELL * 12.6}" width="${CELL * 12}" height="${CELL * 0.5}" rx="${CELL * 0.25}" fill="url(#card-bar)"/>
</svg>`

const svg = qrSvg()
writeFileSync(join(outDir, 'ekkly-online-qr.svg'), svg)
writeFileSync(join(outDir, 'ekkly-online-qr-card.svg'), cardSvg)

await sharp(Buffer.from(svg), { density: 144 }).resize(2048, 2048).png().toFile(join(outDir, 'ekkly-online-qr.png'))
await sharp(Buffer.from(cardSvg), { density: 144 })
  .resize(1600, Math.round((1600 * cardH) / cardW))
  .png()
  .toFile(join(outDir, 'ekkly-online-qr-card.png'))

/* ----------------------------------------------------------------- check */

// Read it back the way a phone would, big and small, before calling it done.
for (const [px, blur] of [[2048, 0], [1024, 0], [600, 0], [400, 0], [240, 0], [160, 0], [600, 2], [400, 1.5]]) {
  let image = sharp(join(outDir, 'ekkly-online-qr.png')).resize(px, px)
  if (blur) image = image.blur(blur)
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const found = jsQR(new Uint8ClampedArray(data), info.width, info.height)
  console.log(`${px}px${blur ? ` blurred ${blur}` : ''}: ${found ? `reads "${found.data}"` : 'DID NOT READ'}`)
}
const card = await sharp(join(outDir, 'ekkly-online-qr-card.png')).resize(500).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const cardFound = jsQR(new Uint8ClampedArray(card.data), card.info.width, card.info.height)
console.log(`card at 500px: ${cardFound ? `reads "${cardFound.data}"` : 'DID NOT READ'}`)
console.log(`version ${qr.version}, ${n}×${n} modules, logo covers ${LOGO_MODULES}×${LOGO_MODULES}`)
