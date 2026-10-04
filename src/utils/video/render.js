// Draws an announcement video, one moment at a time, onto a 2D canvas.
//
// Nothing here plays anything. `buildVideo` lays every scene out once and
// hands back `draw(ctx, t)`, which paints the frame at `t` seconds. The
// studio's preview calls it on every animation frame and the recorder calls it
// while a MediaRecorder listens, so what is watched in the app is exactly what
// gets posted.
//
// All sizes are worked out in `u`, a hundredth of the shorter side, so the
// same layout holds on a wide projector frame and a tall phone one.

/* ------------------------------------------------------------- the options */

export const ASPECTS = [
  { key: 'wide', label: 'Wide', ratio: '16:9', width: 1920, height: 1080, hint: 'The projector, YouTube and Facebook' },
  { key: 'tall', label: 'Tall', ratio: '9:16', width: 1080, height: 1920, hint: 'Reels, Stories and TikTok' },
  { key: 'square', label: 'Square', ratio: '1:1', width: 1080, height: 1080, hint: 'A post in the feed' },
  { key: 'portrait', label: 'Portrait', ratio: '4:5', width: 1080, height: 1350, hint: 'A post that fills more of a phone' },
]

export const LOOKS = [
  { key: 'bold', label: 'Bold', hint: 'The church’s colour, edge to edge' },
  { key: 'light', label: 'Light', hint: 'White, with the colour in the type' },
  { key: 'night', label: 'Night', hint: 'Dark, with the colour glowing through' },
  { key: 'dawn', label: 'Dawn', hint: 'The colour warming into morning light' },
]

export const TRANSITIONS = [
  { key: 'slide', label: 'Slide' },
  { key: 'fade', label: 'Fade' },
  { key: 'rise', label: 'Rise' },
  { key: 'zoom', label: 'Zoom' },
]

export const DEFAULT_STYLE = {
  aspect: 'wide',
  look: 'bold',
  // Empty means the church's own accent, read when the video is drawn, so a
  // church that changes its colour changes its videos with it.
  accent: '',
  font: 'church',
  transition: 'slide',
  seconds: 6,
  showLogo: true,
  showProgress: true,
  // The video's own photos. A card with no photo of its own takes the next
  // one, so a handful of pictures carries a whole month without repeating
  // side by side.
  backgrounds: [],
}

/** The video's photo pool, reading the single `background` older settings kept. */
export const backgroundsOf = (style) => {
  const list = Array.isArray(style?.backgrounds) ? style.backgrounds.filter(Boolean) : []
  return list.length ? list : style?.background ? [style.background] : []
}

export const aspectOf = (key) => ASPECTS.find((a) => a.key === key) || ASPECTS[0]

// How long two scenes overlap while one hands over to the next.
const HANDOVER = 0.7

/* --------------------------------------------------------------- colour */

const hexToRgb = (hex) => {
  let h = String(hex || '').trim().replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const n = parseInt(h, 16)
  if (!/^[0-9a-f]{6}$/i.test(h) || Number.isNaN(n)) return [29, 100, 216]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const rgba = ([r, g, b], a = 1) => `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

const WHITE = [255, 255, 255]
const INK = [15, 23, 42]
const BLACK = [0, 0, 0]
const NIGHT = [8, 12, 26]
const MORNING = [255, 176, 96]

/** Every colour a look needs, from the one accent. */
const paletteFor = (look, accentHex) => {
  const a = hexToRgb(accentHex)
  if (look === 'light') {
    return {
      ground: [mix(WHITE, a, 0.03), mix(WHITE, a, 0.12)],
      text: INK,
      muted: mix(INK, WHITE, 0.38),
      accent: a,
      onAccent: WHITE,
      chip: a,
      chipText: WHITE,
      motif: a,
      motifAlpha: 0.09,
      line: rgba(INK, 0.1),
      overlay: 0.76,
    }
  }
  if (look === 'night') {
    const glow = mix(a, WHITE, 0.35)
    return {
      ground: [mix(NIGHT, a, 0.06), mix(NIGHT, a, 0.32)],
      text: WHITE,
      muted: mix(WHITE, NIGHT, 0.3),
      accent: glow,
      onAccent: NIGHT,
      chip: glow,
      chipText: NIGHT,
      motif: glow,
      motifAlpha: 0.14,
      line: rgba(WHITE, 0.12),
      overlay: 0.68,
    }
  }
  if (look === 'dawn') {
    return {
      ground: [mix(a, BLACK, 0.2), mix(a, BLACK, 0.5)],
      glow: MORNING,
      text: WHITE,
      muted: mix(WHITE, a, 0.22),
      accent: WHITE,
      onAccent: mix(a, BLACK, 0.2),
      chip: WHITE,
      chipText: mix(a, BLACK, 0.2),
      motif: mix(MORNING, WHITE, 0.4),
      motifAlpha: 0.16,
      line: rgba(WHITE, 0.18),
      overlay: 0.6,
    }
  }
  return {
    ground: [mix(a, BLACK, 0.04), mix(a, BLACK, 0.38)],
    text: WHITE,
    muted: mix(WHITE, a, 0.25),
    accent: WHITE,
    onAccent: a,
    chip: WHITE,
    chipText: a,
    motif: WHITE,
    motifAlpha: 0.09,
    line: rgba(WHITE, 0.16),
    overlay: 0.64,
  }
}

/* ----------------------------------------------------------------- motion */

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v))
const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3)
const easeInOut = (t) => {
  const x = clamp(t)
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/* ------------------------------------------------------------------ text */

let measurer = null
const measureCtx = () => {
  if (!measurer) measurer = document.createElement('canvas').getContext('2d')
  return measurer
}

const fontOf = (weight, size, stack) => `${weight} ${Math.round(size)}px ${stack}`

/** Breaks a paragraph into lines no wider than `width`, words kept whole where they fit. */
const wrap = (ctx, text, width) => {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  words.forEach((word) => {
    const attempt = line ? `${line} ${word}` : word
    if (ctx.measureText(attempt).width <= width || !line) {
      line = attempt
    } else {
      lines.push(line)
      line = word
    }
    // A single word wider than the column is broken where it overflows.
    while (ctx.measureText(line).width > width && line.length > 1) {
      let cut = line.length - 1
      while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > width) cut--
      lines.push(line.slice(0, cut))
      line = line.slice(cut)
    }
  })
  if (line) lines.push(line)
  return lines
}

const ellipsize = (ctx, text, width) => {
  if (ctx.measureText(text).width <= width) return text
  let cut = text.length
  while (cut > 1 && ctx.measureText(`${text.slice(0, cut)}…`).width > width) cut--
  return `${text.slice(0, cut).trimEnd()}…`
}

/**
 * The largest size, from `max` down to `min`, at which the text fits in
 * `maxLines`; at the smallest size, whatever is left over is cut with an
 * ellipsis rather than spilling off the card.
 */
const fitText = (text, { weight, max, min, width, maxLines, stack, spacing = 0 }) => {
  const ctx = measureCtx()
  let size = max
  let lines = []
  while (size >= min) {
    ctx.font = fontOf(weight, size, stack)
    setSpacing(ctx, spacing * size)
    lines = wrap(ctx, text, width)
    if (lines.length <= maxLines) break
    size = Math.floor(size * 0.92)
  }
  if (lines.length > maxLines) {
    size = min
    ctx.font = fontOf(weight, size, stack)
    setSpacing(ctx, spacing * size)
    lines = wrap(ctx, text, width)
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = ellipsize(ctx, `${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, width)
    lines = kept
  }
  setSpacing(ctx, 0)
  return { size, lines, font: fontOf(weight, size, stack) }
}

const hasSpacing = () => 'letterSpacing' in measureCtx()
const setSpacing = (ctx, px) => {
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${px}px`
}

const lineWidth = (font, text, spacing = 0) => {
  const ctx = measureCtx()
  ctx.font = font
  setSpacing(ctx, spacing)
  const width = ctx.measureText(text).width
  setSpacing(ctx, 0)
  return width
}

/* ---------------------------------------------------------------- blocks */
// A laid-out scene is a list of blocks, each drawn at a fixed place. `k` is
// its beat in the scene's entrance: blocks arrive one after another.

const textBlock = (k, fitted, x, y, color, { align = 'left', lineHeight = 1.12, spacing = 0, width = 0 } = {}) => ({
  type: 'text',
  k,
  lines: fitted.lines,
  font: fitted.font,
  size: fitted.size,
  x,
  y,
  color,
  align,
  lineHeight,
  spacing: spacing * fitted.size,
  width,
  height: fitted.lines.length * fitted.size * lineHeight,
})

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

const dateParts = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return { day: String(d), month: MONTHS_SHORT[m - 1], weekday: DAYS_SHORT[date.getDay()] }
}

/** Shifts every block down by `dy` — for centring a column once it is measured. */
const shift = (blocks, dy) => blocks.forEach((b) => (b.y += dy))

const layoutTitle = (scene, frame) => {
  const { W, H, u, stack, assets, style } = frame
  const blocks = []
  const width = W - frame.padX * 2
  const tall = H > W
  let y = 0
  let k = 0

  if (style.showLogo && assets.logo) {
    const ratio = assets.logo.width / assets.logo.height || 1
    let h = (tall ? 17 : 15) * u
    let w = h * ratio
    if (w > width * 0.6) {
      w = width * 0.6
      h = w / ratio
    }
    blocks.push({ type: 'image', k: k++, img: assets.logo, x: (W - w) / 2, y, w, h, contain: true })
    y += h + 4.5 * u
  }
  if (scene.eyebrow) {
    const f = fitText(scene.eyebrow.toUpperCase(), { weight: 700, max: 3 * u, min: 2.2 * u, width, maxLines: 1, stack, spacing: 0.14 })
    blocks.push(textBlock(k++, f, W / 2, y, 'muted', { align: 'center', spacing: 0.14 }))
    y += f.size * 1.12 + 2.2 * u
  }
  if (scene.title) {
    const f = fitText(scene.title, { weight: 800, max: (tall ? 13 : 12.5) * u, min: 6 * u, width, maxLines: tall ? 3 : 2, stack, spacing: -0.02 })
    blocks.push(textBlock(k++, f, W / 2, y, 'text', { align: 'center', lineHeight: 1.04, spacing: -0.02 }))
    y += blocks.at(-1).height + 3 * u
  }
  if (scene.body) {
    const f = fitText(scene.body, { weight: 500, max: 3.8 * u, min: 2.8 * u, width: Math.min(width, 120 * u), maxLines: 3, stack })
    blocks.push(textBlock(k++, f, W / 2, y, 'muted', { align: 'center', lineHeight: 1.3 }))
    y += blocks.at(-1).height + 4.5 * u
  }
  if (scene.footer) {
    const size = 2.9 * u
    const font = fontOf(700, size, stack)
    const w = lineWidth(font, scene.footer) + size * 2.4
    blocks.push({ type: 'pill', k: k++, text: scene.footer, font, size, x: (W - w) / 2, y, w, h: size * 2.3, outline: true })
    y += size * 2.3
  }
  shift(blocks, (H - y) / 2)
  return blocks
}

const dateBadge = (k, parts, x, y, w, h, stack) => ({ type: 'badge', k, parts, x, y, w, h, stack })

const layoutFeature = (scene, frame) => {
  const { W, H, u, stack, assets } = frame
  const blocks = []
  const tall = H > W * 1.1
  const wide = W > H * 1.2
  const parts = dateParts(scene.date)
  const image = scene.image ? assets.images[scene.image] : null
  let x = frame.padX
  let width = W - frame.padX * 2
  let k = 0
  let y = 0

  // On a wide frame the date stands beside the words and a picture takes the
  // right side; on anything taller they stack.
  if (wide && image) {
    const iw = width * 0.4
    blocks.push({ type: 'image', k: 0, img: image, x: W - frame.padX - iw, y: frame.padY, w: iw, h: H - frame.padY * 2, radius: 2.4 * u, still: true })
    width -= iw + 6 * u
  }
  if (!wide && image) {
    const ih = Math.min(H * (tall ? 0.3 : 0.32), width * 0.62)
    blocks.push({ type: 'image', k: k++, img: image, x, y, w: width, h: ih, radius: 2.4 * u })
    y += ih + 5 * u
  }

  if (parts && wide) {
    const bw = 25 * u
    const bh = 30 * u
    blocks.push(dateBadge(k++, parts, x, 0, bw, bh, stack))
    x += bw + 6.5 * u
    width -= bw + 6.5 * u
  } else if (parts && !image) {
    const bw = (tall ? 23 : 20) * u
    const bh = bw * 1.15
    blocks.push(dateBadge(k++, parts, x, y, bw, bh, stack))
    y += bh + 5 * u
  }

  const column = []
  let cy = 0
  if (scene.eyebrow) {
    const size = 3 * u
    const font = fontOf(700, size, stack)
    const text = ellipsize(measure(font), scene.eyebrow.toUpperCase(), width - size * 2.4)
    const w = lineWidth(font, text, hasSpacing() ? size * 0.12 : 0) + size * 2.4
    column.push({ type: 'pill', k: k++, text, font, size, x, y: cy, w, h: size * 2.3, spacing: size * 0.12 })
    cy += size * 2.3 + 3 * u
  }
  if (scene.title) {
    const f = fitText(scene.title, { weight: 800, max: (tall ? 9.5 : 8.6) * u, min: 4.8 * u, width, maxLines: tall ? 4 : 3, stack, spacing: -0.015 })
    column.push(textBlock(k++, f, x, cy, 'text', { lineHeight: 1.06, spacing: -0.015 }))
    cy += column.at(-1).height + 2.8 * u
  }
  if (scene.when) {
    const f = fitText(scene.when, { weight: 700, max: 3.6 * u, min: 2.6 * u, width, maxLines: 2, stack })
    column.push(textBlock(k++, f, x, cy, 'accent', { lineHeight: 1.25 }))
    cy += column.at(-1).height + 1 * u
  }
  if (scene.where) {
    const f = fitText(scene.where, { weight: 500, max: 3.3 * u, min: 2.5 * u, width, maxLines: 2, stack })
    column.push(textBlock(k++, f, x, cy, 'muted', { lineHeight: 1.25 }))
    cy += column.at(-1).height
  }
  if (scene.body) {
    cy += 3 * u
    const f = fitText(scene.body, { weight: 400, max: 3.3 * u, min: 2.5 * u, width: Math.min(width, 110 * u), maxLines: tall ? 6 : 4, stack })
    column.push(textBlock(k++, f, x, cy, 'muted', { lineHeight: 1.36 }))
    cy += column.at(-1).height
  }

  if (wide) {
    // The badge and the words centred on each other, and both on the frame.
    const badge = blocks.find((b) => b.type === 'badge')
    const total = Math.max(cy, badge?.h || 0)
    const top = (H - total) / 2
    shift(column, top + (total - cy) / 2)
    if (badge) badge.y = top + (total - badge.h) / 2
    return [...blocks, ...column]
  }

  shift(column, y)
  const all = [...blocks, ...column]
  shift(all, (H - (y + cy)) / 2)
  return all
}

const measure = (font) => {
  const ctx = measureCtx()
  ctx.font = font
  return ctx
}

/** "Ana Reyes" -> "AR", for a face with no picture. */
const initialsOf = (name) =>
  String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

const layoutList = (scene, frame) => {
  const { W, H, u, stack } = frame
  const blocks = []
  const x = frame.padX
  const width = W - frame.padX * 2
  let y = 0
  let k = 0

  if (scene.eyebrow) {
    const size = 3 * u
    const font = fontOf(700, size, stack)
    const text = scene.eyebrow.toUpperCase()
    const w = lineWidth(font, text, hasSpacing() ? size * 0.12 : 0) + size * 2.4
    blocks.push({ type: 'pill', k: k++, text, font, size, x, y, w, h: size * 2.3, spacing: size * 0.12 })
    y += size * 2.3 + 3 * u
  }
  if (scene.title) {
    const f = fitText(scene.title, { weight: 800, max: 8.4 * u, min: 4.6 * u, width, maxLines: 2, stack, spacing: -0.015 })
    blocks.push(textBlock(k++, f, x, y, 'text', { lineHeight: 1.06, spacing: -0.015 }))
    y += blocks.at(-1).height + 4.5 * u
  }

  const rows = scene.rows || []
  const labelSize = 4.4 * u
  const valueSize = 3.3 * u
  const rowH = labelSize * 1.25 + valueSize * 1.3 + 3.4 * u
  const room = H - frame.padY * 2 - y - (frame.style.showProgress ? 3 * u : 0)
  const columns = W > H * 1.2 && rows.length > Math.floor(room / rowH) ? 2 : 1
  const perColumn = Math.max(1, Math.floor(room / rowH))
  const capacity = perColumn * columns
  const shown = rows.length > capacity ? rows.slice(0, capacity - 1) : rows
  const extra = rows.length - shown.length
  const colGap = 5 * u
  const colW = (width - colGap * (columns - 1)) / columns

  const labelFont = fontOf(700, labelSize, stack)
  const valueFont = fontOf(500, valueSize, stack)
  // Rows about people or groups carry a picture: a face for a birthday or a
  // preacher, a group's cover. The circle stands where the accent bar would.
  const faces = rows.some((row) => row.photo !== undefined)
  const face = labelSize * 1.25 + valueSize * 1.3
  const indent = faces ? face + 2.6 * u : 3.2 * u
  const items = extra > 0 ? [...shown, { label: `and ${extra} more`, value: '', more: true }] : shown

  items.forEach((row, i) => {
    const col = Math.floor(i / perColumn)
    const r = i % perColumn
    const rx = x + col * (colW + colGap)
    const ry = y + r * rowH
    const inner = colW - indent
    const value = [row.value, row.detail].filter(Boolean).join(' · ')
    blocks.push({
      type: 'row',
      k: k + i * 0.55,
      x: rx,
      y: ry,
      w: colW,
      h: rowH - 2.2 * u,
      label: ellipsize(measure(labelFont), row.label || '', inner),
      value: value ? ellipsize(measure(valueFont), value, inner) : '',
      labelFont,
      valueFont,
      labelSize,
      valueSize,
      more: Boolean(row.more),
      u,
      indent,
      face: faces && !row.more ? face : 0,
      photo: row.photo ? frame.assets.images[row.photo] || null : null,
      initials: initialsOf(row.label),
      stack,
    })
  })
  const usedRows = Math.min(items.length, perColumn)
  y += usedRows * rowH - 2.2 * u

  // Short lists sit in the middle of the frame; long ones start at the top.
  shift(blocks, Math.max(frame.padY, (H - y) / 2))
  return blocks
}

/**
 * One person, one Sunday or one group, given the frame: the picture large, and
 * the words beside it on a wide frame or under it, centred, on a tall one.
 */
const layoutPerson = (scene, frame) => {
  const { W, H, u, stack, assets } = frame
  const wide = W > H * 1.2
  const img = scene.photo ? assets.images[scene.photo] || null : null
  const blocks = []
  const column = []
  let k = 0
  let width = W - frame.padX * 2
  let x = frame.padX
  let d

  if (wide) {
    d = Math.min(H - frame.padY * 2 - 8 * u, 60 * u)
    blocks.push({ type: 'portrait', k: k++, x, y: (H - d) / 2, d, img, initials: initialsOf(scene.title), square: scene.square, stack, u })
    x += d + 7 * u
    width -= d + 7 * u
  } else {
    d = Math.min(width * 0.62, H * (H > W * 1.1 ? 0.34 : 0.4))
    blocks.push({ type: 'portrait', k: k++, x: (W - d) / 2, y: 0, d, img, initials: initialsOf(scene.title), square: scene.square, stack, u })
  }

  const align = wide ? 'left' : 'center'
  const at = wide ? x : W / 2
  let cy = 0
  if (scene.eyebrow) {
    const size = 3 * u
    const font = fontOf(700, size, stack)
    const text = ellipsize(measure(font), scene.eyebrow.toUpperCase(), width - size * 2.4)
    const w = lineWidth(font, text, hasSpacing() ? size * 0.12 : 0) + size * 2.4
    column.push({ type: 'pill', k: k++, text, font, size, x: wide ? x : (W - w) / 2, y: cy, w, h: size * 2.3, spacing: size * 0.12 })
    cy += size * 2.3 + 2.8 * u
  }
  if (scene.title) {
    const f = fitText(scene.title, { weight: 800, max: (wide ? 9.5 : 10) * u, min: 5 * u, width, maxLines: wide ? 3 : 2, stack, spacing: -0.015 })
    column.push(textBlock(k++, f, at, cy, 'text', { align, lineHeight: 1.05, spacing: -0.015 }))
    cy += column.at(-1).height + 2.4 * u
  }
  if (scene.when) {
    const f = fitText(scene.when, { weight: 700, max: 3.8 * u, min: 2.6 * u, width, maxLines: 2, stack })
    column.push(textBlock(k++, f, at, cy, 'accent', { align, lineHeight: 1.25 }))
    cy += column.at(-1).height + 1 * u
  }
  if (scene.where) {
    const f = fitText(scene.where, { weight: 500, max: 3.3 * u, min: 2.5 * u, width, maxLines: 2, stack })
    column.push(textBlock(k++, f, at, cy, 'muted', { align, lineHeight: 1.25 }))
    cy += column.at(-1).height
  }
  if (scene.body) {
    cy += 2.6 * u
    const f = fitText(scene.body, { weight: 400, max: 3.2 * u, min: 2.5 * u, width: Math.min(width, 110 * u), maxLines: 3, stack })
    column.push(textBlock(k++, f, at, cy, 'muted', { align, lineHeight: 1.36 }))
    cy += column.at(-1).height
  }

  if (wide) {
    shift(column, (H - cy) / 2)
    return [...blocks, ...column]
  }
  const gap = 5 * u
  shift(column, d + gap)
  const all = [...blocks, ...column]
  shift(all, (H - (d + gap + cy)) / 2)
  return all
}

/* ---------------------------------------------------------------- drawing */

const roundRect = (ctx, x, y, w, h, r) => {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

/** An image filling a box, cropped from the middle, drifting in slowly. */
const drawCover = (ctx, img, x, y, w, h, zoom = 1) => {
  // An SVG face can arrive with no size of its own; it scales to anything.
  const iw = img.naturalWidth || img.width || 0
  const ih = img.naturalHeight || img.height || 0
  if (!iw || !ih) {
    ctx.drawImage(img, x, y, w, h)
    return
  }
  const ratio = Math.max(w / iw, h / ih) * zoom
  const sw = w / ratio
  const sh = h / ratio
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h)
}

const colorOf = (pal, key, alpha = 1) => rgba(pal[key] || pal.text, alpha)

const drawBlock = (ctx, b, pal, p) => {
  if (b.type === 'text') {
    ctx.font = b.font
    ctx.fillStyle = colorOf(pal, b.color)
    ctx.textAlign = b.align
    ctx.textBaseline = 'top'
    setSpacing(ctx, b.spacing || 0)
    b.lines.forEach((line, i) => ctx.fillText(line, b.x, b.y + i * b.size * b.lineHeight + b.size * 0.04))
    setSpacing(ctx, 0)
    return
  }
  if (b.type === 'pill') {
    roundRect(ctx, b.x, b.y, b.w, b.h, b.h / 2)
    if (b.outline) {
      ctx.lineWidth = Math.max(2, b.size * 0.1)
      ctx.strokeStyle = colorOf(pal, 'text', 0.45)
      ctx.stroke()
      ctx.fillStyle = colorOf(pal, 'text')
    } else {
      ctx.fillStyle = rgba(pal.chip)
      ctx.fill()
      ctx.fillStyle = rgba(pal.chipText)
    }
    ctx.font = b.font
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    setSpacing(ctx, b.spacing || 0)
    ctx.fillText(b.text, b.x + b.size * 1.2, b.y + b.h / 2 + b.size * 0.06)
    setSpacing(ctx, 0)
    return
  }
  if (b.type === 'badge') {
    const { x, y, w, h, parts, stack } = b
    roundRect(ctx, x, y, w, h, w * 0.14)
    ctx.fillStyle = rgba(pal.chip)
    ctx.fill()
    // The tear-off strip across the top, as on a wall calendar.
    ctx.save()
    roundRect(ctx, x, y, w, h, w * 0.14)
    ctx.clip()
    ctx.fillStyle = rgba(pal.chipText, 0.14)
    ctx.fillRect(x, y, w, h * 0.27)
    ctx.restore()
    ctx.fillStyle = rgba(pal.chipText)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = fontOf(800, h * 0.12, stack)
    setSpacing(ctx, h * 0.015)
    ctx.fillText(parts.weekday, x + w / 2, y + h * 0.14)
    setSpacing(ctx, 0)
    ctx.font = fontOf(800, h * 0.44, stack)
    ctx.fillText(parts.day, x + w / 2, y + h * 0.56)
    ctx.font = fontOf(700, h * 0.12, stack)
    setSpacing(ctx, h * 0.015)
    ctx.fillText(parts.month, x + w / 2, y + h * 0.85)
    setSpacing(ctx, 0)
    return
  }
  if (b.type === 'image') {
    ctx.save()
    if (b.contain) {
      ctx.drawImage(b.img, b.x, b.y, b.w, b.h)
    } else {
      roundRect(ctx, b.x, b.y, b.w, b.h, b.radius || 0)
      ctx.clip()
      drawCover(ctx, b.img, b.x, b.y, b.w, b.h, 1.06 - 0.06 * p)
    }
    ctx.restore()
    return
  }
  if (b.type === 'portrait') {
    const { x, y, d, u } = b
    const shape = () => {
      if (b.square) roundRect(ctx, x, y, d, d, d * 0.14)
      else {
        ctx.beginPath()
        ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
      }
    }
    ctx.save()
    shape()
    ctx.fillStyle = rgba(pal.chip)
    ctx.fill()
    if (b.img) {
      ctx.clip()
      drawCover(ctx, b.img, x, y, d, d, 1.08 - 0.08 * p)
    } else {
      ctx.fillStyle = rgba(pal.chipText)
      ctx.font = fontOf(800, d * 0.34, b.stack)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(b.initials, x + d / 2, y + d / 2 + d * 0.02)
    }
    ctx.restore()
    shape()
    ctx.lineWidth = 1.1 * u
    ctx.strokeStyle = rgba(pal.chip, 0.95)
    ctx.stroke()
    return
  }
  if (b.type === 'row') {
    const { u } = b
    if (b.face) {
      const r = b.face / 2
      const cx = b.x + r
      const cy = b.y + r
      ctx.save()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = rgba(pal.chip)
      ctx.fill()
      if (b.photo) {
        ctx.clip()
        drawCover(ctx, b.photo, b.x, b.y, b.face, b.face)
      } else {
        ctx.fillStyle = rgba(pal.chipText)
        ctx.font = fontOf(800, r * 0.8, b.stack)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(b.initials, cx, cy + r * 0.05)
      }
      ctx.restore()
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.lineWidth = u * 0.35
      ctx.strokeStyle = rgba(pal.chip, 0.9)
      ctx.stroke()
    } else {
      ctx.fillStyle = b.more ? colorOf(pal, 'muted', 0.6) : rgba(pal.accent)
      roundRect(ctx, b.x, b.y + u * 0.3, u * 0.8, b.h - u * 0.6, u * 0.4)
      ctx.fill()
    }
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.font = b.labelFont
    ctx.fillStyle = colorOf(pal, b.more ? 'muted' : 'text')
    const textY = b.face ? b.y + (b.face - (b.labelSize * 1.32 + b.valueSize)) / 2 : b.y
    ctx.fillText(b.label, b.x + b.indent, b.value ? textY : b.face ? b.y + (b.face - b.labelSize) / 2 : b.y)
    if (b.value) {
      ctx.font = b.valueFont
      ctx.fillStyle = colorOf(pal, 'muted')
      ctx.fillText(b.value, b.x + b.indent, textY + b.labelSize * 1.32)
    }
  }
}

/**
 * `photos` are the cards' background pictures on screen at this moment, each
 * `{ img, alpha, zoom }`, oldest first, so the next card's picture fades in
 * over the last one's.
 */
const drawBackground = (ctx, frame, pal, t, photos = []) => {
  const { W, H, u } = frame
  const g = ctx.createLinearGradient(0, 0, W * 0.6, H)
  g.addColorStop(0, rgba(pal.ground[0]))
  g.addColorStop(1, rgba(pal.ground[1]))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  if (photos.length) {
    photos.forEach((photo) => {
      ctx.save()
      ctx.globalAlpha = clamp(photo.alpha)
      drawCover(ctx, photo.img, 0, 0, W, H, photo.zoom)
      ctx.restore()
    })
    // The look's own colour over the photographs, strong enough that the
    // words read on any picture, and only as strong as the photos are present.
    ctx.save()
    ctx.globalAlpha = clamp(photos.reduce((sum, p) => sum + p.alpha, 0))
    const veil = ctx.createLinearGradient(0, 0, W * 0.4, H)
    veil.addColorStop(0, rgba(pal.ground[0], pal.overlay))
    veil.addColorStop(1, rgba(pal.ground[1], Math.min(0.95, pal.overlay + 0.1)))
    ctx.fillStyle = veil
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  // Dawn's morning light, rising from the bottom corner and breathing slowly.
  if (pal.glow) {
    const r = Math.max(W, H) * (0.95 + 0.05 * Math.sin(t / 5))
    const light = ctx.createRadialGradient(W * 0.08, H * 1.02, 0, W * 0.08, H * 1.02, r)
    light.addColorStop(0, rgba(pal.glow, 0.75))
    light.addColorStop(0.45, rgba(pal.glow, 0.28))
    light.addColorStop(1, rgba(pal.glow, 0))
    ctx.fillStyle = light
    ctx.fillRect(0, 0, W, H)
  }

  // Rings widening slowly out of the top corner, each fading as it grows, so
  // the ground is never quite still between cards and never busy either.
  const cx = W * 0.92
  const cy = H * 0.1
  const step = Math.max(W, H) * 0.16
  ctx.lineWidth = 1.1 * u
  for (let i = 0; i < 6; i++) {
    const phase = (i + t * 0.07) % 6
    const r = step * (0.5 + phase)
    ctx.strokeStyle = rgba(pal.motif, pal.motifAlpha * (1 - phase / 6))
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
  }
}

/** The corner logo on every card but the first and last, which carry it large. */
const drawCornerLogo = (ctx, frame, alpha) => {
  const { assets, u, W, style } = frame
  if (!style.showLogo || !assets.logo || alpha <= 0) return
  const h = 6.5 * u
  const w = h * (assets.logo.width / assets.logo.height || 1)
  ctx.save()
  ctx.globalAlpha = alpha * 0.92
  ctx.drawImage(assets.logo, W - frame.padX - Math.min(w, 22 * u), frame.padY * 0.55, Math.min(w, 22 * u), h)
  ctx.restore()
}

const drawProgress = (ctx, frame, pal, entries, t) => {
  const { W, H, u } = frame
  const n = entries.length
  if (n < 2) return
  const gap = 0.8 * u
  const x0 = frame.padX
  const w = (W - frame.padX * 2 - gap * (n - 1)) / n
  const y = H - frame.padY * 0.55
  const h = 0.55 * u
  entries.forEach((entry, i) => {
    const x = x0 + i * (w + gap)
    const done = clamp((t - entry.start) / (entry.end - entry.start - (i < n - 1 ? HANDOVER : 0)))
    roundRect(ctx, x, y, w, h, h / 2)
    ctx.fillStyle = colorOf(pal, 'text', 0.22)
    ctx.fill()
    if (done > 0) {
      roundRect(ctx, x, y, Math.max(h, w * done), h, h / 2)
      ctx.fillStyle = colorOf(pal, 'text', 0.9)
      ctx.fill()
    }
  })
}

/**
 * How much of a scene is on screen at `t`, from 0 to 1. A card leaving clears
 * in the first half of the handover and the next arrives in the second, so the
 * two sets of words are never read on top of each other.
 */
const visibility = (entry, t, isFirst, isLast) => {
  const local = t - entry.start
  const d = entry.end - entry.start
  const arriving = isFirst ? 1 : clamp((local - HANDOVER * 0.4) / (HANDOVER * 0.6))
  const leaving = isLast ? 1 : 1 - clamp((local - (d - HANDOVER)) / (HANDOVER * 0.5))
  return Math.min(arriving, leaving)
}

/** One scene at its own local time, arriving and leaving as its transition says. */
const drawScene = (ctx, frame, pal, entry, t, isFirst, isLast) => {
  const local = t - entry.start
  const d = entry.end - entry.start
  const inP = isFirst ? 1 : easeOut((local - HANDOVER * 0.4) / (HANDOVER * 0.6))
  const outP = isLast ? 0 : easeInOut((local - (d - HANDOVER)) / (HANDOVER * 0.5))
  const { W, H, u, style } = frame
  const kind = style.transition
  const delay = isFirst ? 0.1 : HANDOVER * 0.4

  ctx.save()
  const alpha = visibility(entry, t, isFirst, isLast)
  if (kind === 'slide') {
    ctx.translate((1 - inP) * W * 0.1 - outP * W * 0.1, 0)
  } else if (kind === 'zoom') {
    const s = 1 + (1 - inP) * 0.08 - outP * 0.06
    ctx.translate(W / 2, H / 2)
    ctx.scale(s, s)
    ctx.translate(-W / 2, -H / 2)
  } else if (kind === 'rise') {
    ctx.translate(0, -outP * 6 * u)
  }
  ctx.globalAlpha = clamp(alpha)

  const lift = kind === 'rise' ? 8 * u : kind === 'fade' ? 1.5 * u : 3.5 * u
  entry.blocks.forEach((block) => {
    const p = block.still ? 1 : easeOut((local - delay - block.k * 0.09) / 0.6)
    if (p <= 0) return
    ctx.save()
    ctx.globalAlpha = clamp(alpha) * p
    ctx.translate(0, (1 - p) * lift)
    drawBlock(ctx, block, pal, easeOut(local / d))
    ctx.restore()
  })
  ctx.restore()
}

/* ---------------------------------------------------------------- the video */

/**
 * Lays out every scene for one frame size and returns the video.
 *
 * `scenes` are already filtered to the ones being shown, each with `seconds`.
 * `assets` are loaded images: `logo`, `background`, and `images` by URL.
 */
export const buildVideo = ({ scenes, style, palette: accent, stack, assets }) => {
  const aspect = aspectOf(style.aspect)
  const W = aspect.width
  const H = aspect.height
  const u = Math.min(W, H) / 100
  const frame = {
    W,
    H,
    u,
    padX: (W > H ? 9 : 8) * u,
    padY: (W > H ? 8 : 9) * u,
    stack,
    style,
    assets: { logo: assets.logo || null, images: assets.images || {} },
  }
  const pool = (assets.backgrounds || (assets.background ? [assets.background] : [])).filter(Boolean)
  const pal = paletteFor(style.look, accent)

  let cursor = 0
  const entries = scenes.map((scene, i) => {
    const seconds = Math.max(2, Number(scene.seconds) || 6)
    const start = cursor
    const end = start + seconds
    cursor = end - (i < scenes.length - 1 ? HANDOVER : 0)
    const layout =
      scene.layout === 'title'
        ? layoutTitle
        : scene.layout === 'list'
          ? layoutList
          : scene.layout === 'person'
            ? layoutPerson
            : layoutFeature
    return { scene, start, end, blocks: layout(scene, frame) }
  })

  // Each card's background: its own photo, none if it asked for none, and
  // otherwise the next of the video's photos in turn.
  let turn = 0
  const nextFromPool = () => (pool.length ? pool[turn++ % pool.length] : null)
  entries.forEach((entry) => {
    const own = entry.scene.background
    if (own === 'none') entry.photo = null
    else if (own) entry.photo = frame.assets.images[own] || nextFromPool()
    else entry.photo = nextFromPool()
  })

  /** The background photos on screen at `t`, crossfading at each handover. */
  const photosAt = (t) => {
    const photos = []
    entries.forEach((entry, i) => {
      if (!entry.photo || t < entry.start || t > entry.end) return
      const local = t - entry.start
      const d = entry.end - entry.start
      const arrive = i === 0 ? 1 : easeInOut(local / HANDOVER)
      // A photo fades out only into a card without one; into another photo it
      // stays put underneath while the next fades in over it.
      const next = entries[i + 1]
      const leave = !next || next.photo ? 1 : 1 - easeInOut((local - (d - HANDOVER)) / HANDOVER)
      photos.push({ img: entry.photo, alpha: arrive * leave, zoom: 1.12 - 0.08 * clamp(local / d) })
    })
    return photos
  }

  const duration = entries.length ? entries.at(-1).end : 0

  const draw = (ctx, time) => {
    const t = clamp(time, 0, duration)
    ctx.save()
    drawBackground(ctx, frame, pal, t, photosAt(t))
    // The corner logo stays put through every handover, and gives way only
    // to the opening and closing cards, which carry it large.
    let titleShown = 0
    entries.forEach((entry, i) => {
      if (t < entry.start || t > entry.end) return
      if (entry.scene.layout === 'title') {
        titleShown = Math.max(titleShown, visibility(entry, t, i === 0, i === entries.length - 1))
      }
      drawScene(ctx, frame, pal, entry, t, i === 0, i === entries.length - 1)
    })
    drawCornerLogo(ctx, frame, 1 - titleShown)
    if (style.showProgress) drawProgress(ctx, frame, pal, entries, t)

    // In from black and out to it, as a video posted on its own should.
    const fade = Math.max(1 - t / 0.45, (t - (duration - 0.8)) / 0.8)
    if (fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${clamp(fade)})`
      ctx.fillRect(0, 0, W, H)
    }
    ctx.restore()
  }

  /** Where each scene begins, for jumping to it. */
  const startOf = (id) => {
    const entry = entries.find((e) => e.scene.id === id)
    return entry ? entry.start + (entry === entries[0] ? 0 : HANDOVER) : 0
  }

  const sceneAt = (time) => {
    for (let i = entries.length - 1; i >= 0; i--) if (time >= entries[i].start) return entries[i].scene
    return entries[0]?.scene || null
  }

  return { width: W, height: H, duration, draw, startOf, sceneAt, entries }
}
