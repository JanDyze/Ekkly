// Ekkly's video ads, drawn on a canvas from a list of scenes.
//
//   import { film } from '/marketing/templates/video.js'
//   film({ size: 'reel', scenes: [{ type: 'lines', dur: 3, lines: ['…'] }, …] })
//
// Open the page to watch it loop; ?t=12.5 holds one moment (a cover picture);
// `node marketing/scripts/render.mjs video <page>` turns it into an MP4.
//
// Drawn rather than recorded from the page because a recording runs in real
// time and drops frames when the machine is busy. Here every frame is drawn at
// its own moment and handed to the browser's encoder, so a 30-second video is
// exactly 900 frames however long they take, and needs nothing installed:
// the Chrome that renders the still ads encodes the video too.
//
// The scene types are the few things an Ekkly video says: a pile of the
// church's chores (pile), the mark lighting pane by pane (mark), apps arriving
// one at a time into one place (apps), a church's own link (link), a few big
// lines (lines) and the ask (close). A new video is a new list of these.

const PHOSPHOR = '/node_modules/@phosphor-icons/core/assets'
const ART = '/src/assets/app-icons'
const MUXER = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/+esm'

// The same colours as ad.css. A light ground and the wordmark's navy; the
// accent is the front door's default, never a church's.
const GROUNDS = {
  light: { ground: '#ffffff', ink: '#0f1c4d', muted: '#56617f', soft: '#f3f5fa', line: '#e3e7f0', accent: '#1d64d8', card: '#ffffff' },
  soft: { ground: '#f3f5fa', ink: '#0f1c4d', muted: '#56617f', soft: '#e9edf6', line: '#dde2ee', accent: '#1d64d8', card: '#ffffff' },
  night: { ground: '#0f1c4d', ink: '#ffffff', muted: '#b9c3dc', soft: '#18275e', line: '#24356f', accent: '#5b9dff', card: '#18275e' },
}
const PANES = ['#fdc24b', '#f19140', '#0270dc', '#09a4c6']

// Where the platform's own bars sit. A reel's caption and buttons cover the
// bottom 670px; a story's reply box the bottom 340px.
const SIZES = {
  reel: { width: 1080, height: 1920, top: 250, bottom: 670 },
  story: { width: 1080, height: 1920, top: 250, bottom: 340 },
  feed: { width: 1080, height: 1350, top: 0, bottom: 0 },
  square: { width: 1080, height: 1080, top: 0, bottom: 0 },
}

const FADE = 0.3
const PAD = 88

// ------------------------------------------------------------------ easing

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const span = (t, a, b) => clamp((t - a) / (b - a))
const out = (p) => 1 - (1 - p) ** 3
const inOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2)
// A small overshoot, for something set down rather than slid in.
const settle = (p) => {
  const c = 1.2
  return 1 + (c + 1) * (p - 1) ** 3 + c * (p - 1) ** 2
}
const lerp = (a, b, p) => a + (b - a) * p

// ------------------------------------------------------------------ assets

const images = new Map()
const loadImage = (src) => {
  if (!images.has(src)) {
    images.set(
      src,
      new Promise((done, fail) => {
        const img = new Image()
        img.onload = () => done(img)
        img.onerror = () => fail(new Error('Could not load ' + src))
        img.src = src
      })
    )
  }
  return images.get(src)
}

const iconSrc = (name, weight = 'bold') => `${PHOSPHOR}/${weight}/${weight === 'regular' ? name : `${name}-${weight}`}.svg`

// Phosphor's files are black; an icon takes a colour by being drawn into a
// canvas of its own and filled where it is opaque.
const tinted = new Map()
function icon(ctx, assets, name, x, y, size, color, weight = 'bold') {
  const img = assets.get(iconSrc(name, weight))
  if (!img) return
  const key = `${name}|${weight}|${size}|${color}`
  if (!tinted.has(key)) {
    const c = document.createElement('canvas')
    c.width = c.height = Math.ceil(size)
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0, size, size)
    g.globalCompositeOperation = 'source-in'
    g.fillStyle = color
    g.fillRect(0, 0, size, size)
    tinted.set(key, c)
  }
  ctx.drawImage(tinted.get(key), x - size / 2, y - size / 2, size, size)
}

// The mark as four images, one pane each, so the panes can light one after
// another the way the boot screen's do. Cut from the real file rather than
// redrawn, so it cannot drift from the mark.
async function loadPanes() {
  const svg = await (await fetch('/public/ekkly-mark.svg')).text()
  const head = svg.match(/<svg[^>]*>/)[0]
  const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)[0]
  const groups = svg.match(/<g clip-path[\s\S]*?<\/g>/g)
  return Promise.all(
    groups.map((group) => {
      const one = `${head}${defs}${group}</svg>`
      return loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(one))
    })
  )
}

// ------------------------------------------------------------------ drawing

function font(ctx, size, weight = 900, face = 'Inter') {
  ctx.font = `${weight} ${size}px ${face}`
  // Big type is set tight, as the still ads' headlines are.
  ctx.letterSpacing = `${(size >= 80 ? -0.035 : size >= 50 ? -0.02 : -0.01) * size}px`
}

function wrapAt(ctx, text, width) {
  const lines = []
  for (const para of String(text).split('\n')) {
    let line = ''
    for (const word of para.split(' ')) {
      const next = line ? `${line} ${word}` : word
      if (line && ctx.measureText(next).width > width) {
        lines.push(line)
        line = word
      } else line = next
    }
    lines.push(line)
  }
  return lines
}

// Balanced, like text-wrap: balance - the narrowest measure that still takes
// no more lines, so a two-line headline is two even lines rather than a long
// one and a straggler.
function wrap(ctx, text, width) {
  const lines = wrapAt(ctx, text, width)
  if (lines.length < 2) return lines
  let lo = width / 2
  let hi = width
  while (hi - lo > 4) {
    const mid = (lo + hi) / 2
    if (wrapAt(ctx, text, mid).length > lines.length) lo = mid
    else hi = mid
  }
  return wrapAt(ctx, text, hi)
}

/** Sets text and returns its height. `align` is left or center. */
function words(ctx, text, { x, y, size, weight = 900, color, width, lh = 1.05, align = 'left', face = 'Inter' }) {
  font(ctx, size, weight, face)
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  const lines = wrap(ctx, text, width)
  lines.forEach((line, i) => ctx.fillText(line, x, y + size * 0.8 + i * size * lh))
  return lines.length * size * lh
}

function measure(ctx, text, { size, weight = 900, width, lh = 1.05, face = 'Inter' }) {
  font(ctx, size, weight, face)
  return wrap(ctx, text, width).length * size * lh
}

function rounded(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

// An app's artwork on a raised white plate, like an icon on a phone.
function plate(ctx, img, cx, cy, size, { alpha = 1, scale = 1, shadow = true } = {}) {
  const s = size * scale
  ctx.save()
  ctx.globalAlpha *= alpha
  if (shadow) {
    ctx.shadowColor = 'rgba(15, 28, 77, 0.14)'
    ctx.shadowBlur = s * 0.16
    ctx.shadowOffsetY = s * 0.07
  }
  ctx.fillStyle = '#ffffff'
  rounded(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.25)
  ctx.fill()
  ctx.restore()
  if (img) {
    ctx.save()
    ctx.globalAlpha *= alpha
    const a = s * 0.72
    ctx.drawImage(img, cx - a / 2, cy - a / 2, a, a)
    ctx.restore()
  }
}

// The mark, its panes lighting 0.12s apart from `t0`. On a coloured ground it
// sits on a white tile, or two of its panes vanish (BRAND.md).
function mark(ctx, panes, cx, cy, size, t, t0 = 0, { tile = false } = {}) {
  if (tile) {
    const p = out(span(t, t0 - 0.15, t0 + 0.2))
    const s = size * 1.32
    ctx.save()
    ctx.globalAlpha *= p
    ctx.fillStyle = '#ffffff'
    rounded(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.24)
    ctx.fill()
    ctx.restore()
  }
  panes.forEach((img, i) => {
    const p = span(t, t0 + i * 0.12, t0 + i * 0.12 + 0.35)
    if (!p) return
    ctx.save()
    ctx.globalAlpha *= out(p)
    const s = size * lerp(0.92, 1, out(p))
    ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s)
    ctx.restore()
  })
}

function wordmark(ctx, x, y, size, color, align = 'left') {
  font(ctx, size, 500, 'Poppins')
  ctx.letterSpacing = `${-0.02 * size}px`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText('Ekkly', x, y)
}

// Warm over cool, the mark's own order: a divider, never a backdrop.
function paneRule(ctx, cx, y, w = 120, h = 18) {
  const gap = 4
  const cw = (w - gap) / 2
  const ch = (h - gap) / 2
  const order = [PANES[0], PANES[1], PANES[2], PANES[3]]
  order.forEach((c, i) => {
    ctx.fillStyle = c
    rounded(ctx, cx - w / 2 + (i % 2) * (cw + gap), y + Math.floor(i / 2) * (ch + gap), cw, ch, 3)
    ctx.fill()
  })
}

// ------------------------------------------------------------------ scenes
//
// Each draws its whole frame - ground and all - for a moment `t` seconds into
// itself. `t` runs past the scene's length while the next one fades in over
// it, so every scene must hold its last state rather than vanish.

const SCENES = {
  /*
   * The chores, as cards dropped on a table one at a time, a little askew.
   * In the last half-second they fall away: that is the mess clearing.
   *   cards: [{ icon: 'chats-circle', text: 'The roster in a group chat' }]
   *   step: seconds between cards (1.1)
   */
  pile: {
    icons: (s) => s.cards.map((c) => iconSrc(c.icon)),
    draw(ctx, t, s, env) {
      const { W, area, c } = env
      ctx.fillStyle = c.soft
      ctx.fillRect(0, 0, W, env.H)

      const step = s.step ?? 1.1
      const cardW = W - PAD * 2
      const textW = cardW - 64 - 120 - 40
      const heights = s.cards.map((card) => Math.max(150, measure(ctx, card.text, { size: 58, weight: 800, width: textW, lh: 1.12 }) + 76))
      const gap = 34
      const total = heights.reduce((a, b) => a + b, 0) + gap * (heights.length - 1)
      let y = area.mid - total / 2
      const leave = s.dur - 0.55

      s.cards.forEach((card, i) => {
        const h = heights[i]
        const top = y
        y += h + gap
        const t0 = 0.15 + i * step
        const p = span(t, t0, t0 + 0.5)
        if (!p) return
        const tilt = ((i % 2 ? 1 : -1) * (2.2 + (i % 3) * 0.6) * Math.PI) / 180
        const shift = (i % 2 ? 1 : -1) * 18
        // Falling away: later cards go first, each a beat after the last.
        const f = span(t, leave + (s.cards.length - 1 - i) * 0.07, leave + (s.cards.length - 1 - i) * 0.07 + 0.45)
        const drop = f ** 2 * (env.H * 0.9)

        ctx.save()
        ctx.globalAlpha = out(p) * (1 - f * 0.6)
        ctx.translate(W / 2 + shift, top + h / 2 + lerp(-70, 0, settle(p)) + drop)
        ctx.rotate(tilt * lerp(2.2, 1, out(p)) + f * tilt * 3)
        ctx.shadowColor = 'rgba(15, 28, 77, 0.12)'
        ctx.shadowBlur = 40
        ctx.shadowOffsetY = 16
        ctx.fillStyle = c.card
        rounded(ctx, -cardW / 2, -h / 2, cardW, h, 36)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.strokeStyle = c.line
        ctx.lineWidth = 2
        ctx.stroke()

        const chip = 120
        const chipX = -cardW / 2 + 40
        ctx.fillStyle = card.warm === false ? '#e8f0fd' : '#fdf0e2'
        rounded(ctx, chipX, -chip / 2, chip, chip, 30)
        ctx.fill()
        icon(ctx, env.assets, card.icon, chipX + chip / 2, 0, 66, card.warm === false ? c.accent : '#d9692b')
        const th = measure(ctx, card.text, { size: 58, weight: 800, width: textW, lh: 1.12 })
        words(ctx, card.text, { x: chipX + chip + 40, y: -th / 2, size: 58, weight: 800, color: c.ink, width: textW, lh: 1.12 })
        ctx.restore()
      })
    },
  },

  /*
   * The mark lighting, the name, then a line or two under it.
   *   lines: ['Your church’s records,', 'in one app.']
   */
  mark: {
    draw(ctx, t, s, env) {
      const { W, area } = env
      const c = GROUNDS[s.ground || 'light']
      ctx.fillStyle = c.ground
      ctx.fillRect(0, 0, W, env.H)

      const size = 300
      const text = s.lines.join(' ')
      const textH = measure(ctx, text, { size: 96, width: W - PAD * 2 })
      const total = size + 60 + 130 + 70 + textH
      const top = area.mid - total / 2

      mark(ctx, env.panes, W / 2, top + size / 2, size, t, 0.15, { tile: s.ground === 'night' })

      const wp = out(span(t, 0.75, 1.15))
      ctx.save()
      ctx.globalAlpha = wp
      wordmark(ctx, W / 2, top + size + 60 + 65 + lerp(24, 0, wp), 130, c.ink, 'center')
      ctx.restore()

      const lp = out(span(t, 1.3, 1.75))
      ctx.save()
      ctx.globalAlpha = lp
      words(ctx, text, { x: W / 2, y: top + size + 60 + 130 + 70 + lerp(30, 0, lp), size: 96, color: c.ink, width: W - PAD * 2, align: 'center' })
      ctx.restore()
    },
  },

  /*
   * One app after another: its artwork large, its name and what it changes
   * for the church, then it drops into a row along the foot - every app
   * landing in the same place is the point.
   *   apps: [{ art: 'members', name: 'People', line: 'Everyone’s details, one tap away' }]
   *   each: seconds per app (1.6)
   *   after: a line once the row is full ('All in one app.')
   */
  apps: {
    art: (s) => s.apps.map((a) => `${ART}/${a.art}.svg`),
    draw(ctx, t, s, env) {
      const { W, area, assets } = env
      const c = GROUNDS[s.ground || 'soft']
      ctx.fillStyle = c.ground
      ctx.fillRect(0, 0, W, env.H)

      const each = s.each ?? 1.6
      const n = s.apps.length
      const big = 260
      const lineW = W - PAD * 2
      const textH = Math.max(...s.apps.map((a) => measure(ctx, a.line, { size: 92, width: lineW })))
      const slot = Math.min(120, (W - PAD * 2 - (n - 1) * 20) / n)
      const blockH = big + 56 + 52 + 26 + textH + 80 + slot
      const top = area.mid - blockH / 2
      const bigY = top + big / 2
      const nameY = top + big + 56
      const lineY = nameY + 52 + 26
      const rowY = lineY + textH + 80 + slot / 2
      const rowX = (i) => W / 2 - ((n - 1) * (slot + 20)) / 2 + i * (slot + 20)

      // The row's empty places, waiting.
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = c.soft
        rounded(ctx, rowX(i) - slot / 2, rowY - slot / 2, slot, slot, slot * 0.25)
        ctx.fill()
      }

      const fly = 0.42
      s.apps.forEach((app, i) => {
        const img = assets.get(`${ART}/${app.art}.svg`)
        const t0 = i * each
        const t1 = t0 + each
        const local = t - t0
        if (local < 0) return

        // In the row once it has flown there.
        const fp = span(t, t1 - fly, t1)
        if (fp >= 1) {
          plate(ctx, img, rowX(i), rowY, slot, { shadow: false })
          return
        }

        const ip = settle(span(local, 0, 0.4))
        const ap = out(span(local, 0, 0.3))
        if (fp > 0) {
          // On its way down: from the big plate to its place in the row.
          const e = inOut(fp)
          plate(ctx, img, lerp(W / 2, rowX(i), e), lerp(bigY, rowY, e), lerp(big, slot, e), { shadow: fp < 0.8 })
        } else {
          plate(ctx, img, W / 2, bigY, big, { scale: lerp(0.86, 1, ip), alpha: ap })
        }

        // The words go as the plate leaves.
        const wa = ap * (1 - out(span(t, t1 - fly, t1 - fly + 0.2)))
        if (wa > 0) {
          ctx.save()
          ctx.globalAlpha = wa
          font(ctx, 46, 700)
          ctx.fillStyle = c.accent
          ctx.textAlign = 'center'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText(app.name, W / 2, nameY + 40 + lerp(16, 0, ap))
          const h = measure(ctx, app.line, { size: 92, width: lineW })
          words(ctx, app.line, { x: W / 2, y: lineY + (textH - h) / 2 + lerp(20, 0, ap), size: 92, color: c.ink, width: lineW, align: 'center' })
          ctx.restore()
        }
      })

      // Once every app is in the row, the line that says what the row means.
      if (s.after) {
        const ap = out(span(t, n * each + 0.05, n * each + 0.45))
        if (ap > 0) {
          ctx.save()
          ctx.globalAlpha = ap
          const h = measure(ctx, s.after, { size: 110, width: lineW })
          words(ctx, s.after, { x: W / 2, y: top + (big + 56 + 52 + 26 + textH - h) / 2 + lerp(24, 0, ap), size: 110, color: c.ink, width: lineW, align: 'center' })
          ctx.restore()
        }
      }
    },
  },

  /*
   * A church's own link, typed out, in the colour it chose - which changes,
   * because every church picks its own.
   *   title: 'Its own link. Its own colours.'
   *   host: 'yourchurch'   sub: 'Opens in any phone’s browser.'
   */
  link: {
    icons: () => [iconSrc('lock-simple')],
    draw(ctx, t, s, env) {
      const { W, area } = env
      const c = GROUNDS[s.ground || 'light']
      ctx.fillStyle = c.ground
      ctx.fillRect(0, 0, W, env.H)

      // Accents a church might choose. Not Ekkly's: these are what the app
      // turns into, which is the point being made.
      const accents = s.accents || ['#1d64d8', '#0f7b5c', '#a4262c', '#6a3fb5', '#c25e00']
      const titleH = measure(ctx, s.title, { size: 110, width: W - PAD * 2 })
      const barH = 136
      const subH = s.sub ? measure(ctx, s.sub, { size: 50, weight: 500, width: W - PAD * 2, lh: 1.25 }) : 0
      const total = titleH + 80 + barH + 70 + 64 + (s.sub ? 80 + subH : 0)
      const top = area.mid - total / 2

      const tp = out(span(t, 0.1, 0.5))
      ctx.save()
      ctx.globalAlpha = tp
      words(ctx, s.title, { x: W / 2, y: top + lerp(24, 0, tp), size: 110, color: c.ink, width: W - PAD * 2, align: 'center' })
      ctx.restore()

      // Which accent: one per beat once the link is typed.
      const typed = span(t, 0.6, 0.6 + s.host.length * 0.07)
      const cycle = Math.max(0, Math.floor((t - 0.6 - s.host.length * 0.07 - 0.3) / 0.55))
      const which = typed < 1 ? 0 : Math.min(accents.length - 1, cycle)
      const accent = accents[which]

      const barY = top + titleH + 80
      const barW = W - PAD * 2
      const bp = out(span(t, 0.35, 0.7))
      ctx.save()
      ctx.globalAlpha = bp
      ctx.fillStyle = c.card
      ctx.shadowColor = 'rgba(15, 28, 77, 0.1)'
      ctx.shadowBlur = 36
      ctx.shadowOffsetY = 12
      rounded(ctx, PAD, barY, barW, barH, barH / 2)
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.strokeStyle = c.line
      ctx.lineWidth = 2
      ctx.stroke()
      icon(ctx, env.assets, 'lock-simple', PAD + 76, barY + barH / 2, 46, c.muted)

      const host = s.host.slice(0, Math.round(typed * s.host.length))
      font(ctx, 58, 700)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      let x = PAD + 128
      ctx.fillStyle = accent
      ctx.fillText(host, x, barY + barH / 2 + 2)
      x += ctx.measureText(host).width
      if (typed >= 1) {
        ctx.globalAlpha = bp * out(span(t, 0.6 + s.host.length * 0.07, 0.6 + s.host.length * 0.07 + 0.2))
        ctx.fillStyle = c.ink
        ctx.fillText(s.domain || '.ekkly.online', x, barY + barH / 2 + 2)
      } else if (Math.floor(t * 4) % 2 === 0 || typed > 0) {
        ctx.fillStyle = accent
        ctx.fillRect(x + 4, barY + barH / 2 - 32, 5, 64)
      }
      ctx.restore()

      // The swatches, the chosen one ringed.
      const sy = barY + barH + 70 + 32
      const sp = out(span(t, 0.6 + s.host.length * 0.07, 0.6 + s.host.length * 0.07 + 0.35))
      accents.forEach((a, i) => {
        const sx = W / 2 + (i - (accents.length - 1) / 2) * 104
        ctx.save()
        ctx.globalAlpha = sp
        if (i === which) {
          ctx.strokeStyle = a
          ctx.lineWidth = 6
          ctx.beginPath()
          ctx.arc(sx, sy, 44, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.fillStyle = a
        ctx.beginPath()
        ctx.arc(sx, sy, 32, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      if (s.sub) {
        const up = out(span(t, s.subAt ?? 1.9, (s.subAt ?? 1.9) + 0.4))
        ctx.save()
        ctx.globalAlpha = up
        words(ctx, s.sub, { x: W / 2, y: sy + 32 + 80 + lerp(20, 0, up), size: 50, weight: 500, color: c.muted, width: W - PAD * 2, lh: 1.25, align: 'center' })
        ctx.restore()
      }
    },
  },

  /*
   * A few big lines, one after another. A line can be { text, accent: true }.
   *   lines: ['Less time on the lists.', { text: 'More for the ministry.', accent: true }]
   */
  lines: {
    draw(ctx, t, s, env) {
      const { W, area } = env
      const c = GROUNDS[s.ground || 'night']
      ctx.fillStyle = c.ground
      ctx.fillRect(0, 0, W, env.H)

      const size = s.size || 124
      const items = s.lines.map((l) => (typeof l === 'string' ? { text: l } : l))
      const hs = items.map((l) => measure(ctx, l.text, { size, width: W - PAD * 2 }))
      const gap = size * 0.5
      const kickerH = s.kicker ? 46 + 40 : 0
      const total = kickerH + hs.reduce((a, b) => a + b, 0) + gap * (items.length - 1)
      let y = area.mid - total / 2
      const step = s.step ?? 0.7

      if (s.kicker) {
        const kp = out(span(t, 0.05, 0.4))
        ctx.save()
        ctx.globalAlpha = kp
        font(ctx, 46, 700)
        ctx.fillStyle = c.muted
        ctx.textAlign = s.align === 'center' ? 'center' : 'left'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(s.kicker, s.align === 'center' ? W / 2 : PAD, y + 38)
        ctx.restore()
        y += kickerH
      }

      items.forEach((l, i) => {
        const p = out(span(t, 0.15 + i * step, 0.15 + i * step + 0.45))
        ctx.save()
        ctx.globalAlpha = p
        words(ctx, l.text, {
          x: s.align === 'center' ? W / 2 : PAD,
          y: y + lerp(36, 0, p),
          size,
          color: l.accent ? c.accent : c.ink,
          width: W - PAD * 2,
          align: s.align === 'center' ? 'center' : 'left',
        })
        ctx.restore()
        y += hs[i] + gap
      })
    },
  },

  /*
   * The ask: the wordmark, a headline, the button and the link.
   *   title: 'Ask for your church.'   cta: 'Free for a month'   link: 'ekkly.online'
   */
  close: {
    draw(ctx, t, s, env) {
      const { W, area } = env
      const c = GROUNDS[s.ground || 'night']
      ctx.fillStyle = c.ground
      ctx.fillRect(0, 0, W, env.H)

      const markSize = 150
      const titleH = measure(ctx, s.title, { size: 128, width: W - PAD * 2 })
      const subH = s.sub ? measure(ctx, s.sub, { size: 50, weight: 500, width: W - PAD * 2, lh: 1.25 }) + 50 : 0
      const total = markSize * 1.32 + 90 + titleH + 50 + subH + 140 + (s.link ? 60 + 54 : 0)
      const top = area.mid - total / 2

      const tile = s.ground !== 'light'
      const brandY = top + (markSize * 1.32) / 2
      font(ctx, 120, 500, 'Poppins')
      const nameW = ctx.measureText('Ekkly').width
      const brandW = markSize * 1.32 + 40 + nameW
      const bx = W / 2 - brandW / 2
      mark(ctx, env.panes, bx + (markSize * 1.32) / 2, brandY, markSize, t, 0.05, { tile })
      const np = out(span(t, 0.45, 0.8))
      ctx.save()
      ctx.globalAlpha = np
      wordmark(ctx, bx + markSize * 1.32 + 40 + lerp(-16, 0, np), brandY + 6, 120, c.ink)
      ctx.restore()

      let y = top + markSize * 1.32 + 90
      const tp = out(span(t, 0.6, 1.0))
      ctx.save()
      ctx.globalAlpha = tp
      words(ctx, s.title, { x: W / 2, y: y + lerp(30, 0, tp), size: 128, color: c.ink, width: W - PAD * 2, align: 'center' })
      ctx.restore()
      y += titleH + 50

      if (s.sub) {
        const sp = out(span(t, 0.85, 1.25))
        ctx.save()
        ctx.globalAlpha = sp
        words(ctx, s.sub, { x: W / 2, y: y + lerp(20, 0, sp), size: 50, weight: 500, color: c.muted, width: W - PAD * 2, lh: 1.25, align: 'center' })
        ctx.restore()
        y += subH
      }

      // The button: the flat accent, no halo, no sheen.
      const bp = out(span(t, 1.1, 1.45))
      font(ctx, 52, 700)
      const bw = ctx.measureText(s.cta).width + 120
      ctx.save()
      ctx.globalAlpha = bp
      ctx.fillStyle = c.accent
      rounded(ctx, W / 2 - bw / 2, y + lerp(20, 0, bp), bw, 140, 30)
      ctx.fill()
      ctx.fillStyle = s.ground === 'light' ? '#ffffff' : c.ground
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(s.cta, W / 2, y + 72 + lerp(20, 0, bp))
      ctx.restore()
      y += 140 + 60

      if (s.link) {
        const lp = out(span(t, 1.3, 1.65))
        ctx.save()
        ctx.globalAlpha = lp
        font(ctx, 54, 600)
        ctx.fillStyle = c.muted
        ctx.textAlign = 'center'
        ctx.textBaseline = 'alphabetic'
        ctx.fillText(s.link, W / 2, y + 44)
        ctx.restore()
      }
    },
  },
}

// ------------------------------------------------------------------ the film

function timeline(scenes) {
  let at = 0
  return scenes.map((s) => {
    const item = { ...s, start: at }
    at += s.dur
    return item
  })
}

export async function film({ size = 'reel', scenes, fps = 30 }) {
  const frame = SIZES[size]
  const W = frame.width
  const H = frame.height
  const top = frame.top + 60
  const bottom = H - frame.bottom - 40
  const area = { top, bottom, mid: (top + bottom) / 2 }
  const items = timeline(scenes)
  const duration = items.reduce((a, s) => a + s.dur, 0)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  await Promise.all(['500', '600', '700', '800', '900'].map((w) => document.fonts.load(`${w} 64px Inter`)))
  await document.fonts.load('500 64px Poppins')

  const sources = new Set()
  for (const s of scenes) {
    const type = SCENES[s.type]
    if (!type) throw new Error('No scene called ' + s.type)
    type.icons?.(s).forEach((src) => sources.add(src))
    type.art?.(s).forEach((src) => sources.add(src))
  }
  const assets = new Map()
  await Promise.all([...sources].map(async (src) => assets.set(src, await loadImage(src))))
  const panes = await loadPanes()
  const env = { W, H, area, assets, panes, c: GROUNDS.soft }

  const draw = (t) => {
    const i = Math.max(0, items.findLastIndex((s) => s.start <= t))
    const s = items[i]
    const local = t - s.start
    // The scene before, held at its end, under this one fading in.
    if (i > 0 && local < FADE) {
      const prev = items[i - 1]
      ctx.globalAlpha = 1
      SCENES[prev.type].draw(ctx, t - prev.start, prev, env)
      ctx.globalAlpha = 1
      ctx.save()
      const p = inOut(local / FADE)
      ctx.globalAlpha = p
      // Drawn into its own layer so its alpha covers the whole frame at once.
      layer.getContext('2d').clearRect(0, 0, W, H)
      SCENES[s.type].draw(layer.getContext('2d'), local, s, env)
      ctx.drawImage(layer, 0, 0)
      ctx.restore()
    } else {
      ctx.globalAlpha = 1
      SCENES[s.type].draw(ctx, local, s, env)
    }
  }
  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H

  const params = new URLSearchParams(location.search)
  if (params.has('record')) return record({ canvas, draw, duration, fps, out: params.get('record') })
  if (params.has('t')) {
    draw(Number(params.get('t')))
    document.body.dataset.ready = '1'
    return
  }

  // Watching: it loops, and a click pauses it on the frame showing.
  let paused = false
  let offset = 0
  const begun = performance.now()
  canvas.addEventListener('click', () => {
    paused = !paused
    if (!paused) offset = (performance.now() - begun) / 1000 - pausedAt
  })
  let pausedAt = 0
  const tick = () => {
    if (!paused) {
      pausedAt = ((performance.now() - begun) / 1000 - offset) % duration
      draw(pausedAt)
    }
    requestAnimationFrame(tick)
  }
  tick()
}

// ------------------------------------------------------------------ encoding

async function report(path, body) {
  await fetch(path, { method: 'POST', body })
}

async function record({ canvas, draw, duration, fps, out }) {
  try {
    const { Muxer, ArrayBufferTarget } = await import(MUXER)
    const W = canvas.width
    const H = canvas.height
    // H.264 first, because it is what Meta and every phone take; VP9 only if
    // this Chrome cannot write H.264.
    const choices = [
      { codec: 'avc1.640028', mux: 'avc' },
      { codec: 'avc1.4d0028', mux: 'avc' },
      { codec: 'avc1.42e028', mux: 'avc' },
      { codec: 'vp09.00.40.08', mux: 'vp9' },
    ]
    let chosen = null
    for (const choice of choices) {
      const config = { codec: choice.codec, width: W, height: H, bitrate: 12_000_000, framerate: fps, ...(choice.mux === 'avc' ? { avc: { format: 'avc' } } : {}) }
      const { supported } = await VideoEncoder.isConfigSupported(config).catch(() => ({ supported: false }))
      if (supported) {
        chosen = { ...choice, config }
        break
      }
    }
    if (!chosen) throw new Error('This browser cannot encode H.264 or VP9 video')

    const target = new ArrayBufferTarget()
    const muxer = new Muxer({ target, video: { codec: chosen.mux, width: W, height: H }, fastStart: 'in-memory' })
    let failed = null
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => (failed = e),
    })
    encoder.configure(chosen.config)

    const frames = Math.round(duration * fps)
    const status = document.createElement('p')
    document.body.appendChild(status)
    for (let i = 0; i < frames; i++) {
      if (failed) throw failed
      draw(i / fps)
      const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) })
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 })
      frame.close()
      while (encoder.encodeQueueSize > 6) await new Promise((r) => encoder.addEventListener('dequeue', r, { once: true }))
      if (i % fps === 0) status.textContent = `${i} / ${frames}`
    }
    await encoder.flush()
    if (failed) throw failed
    muxer.finalize()
    await report(`/__video?out=${encodeURIComponent(out)}&codec=${chosen.codec}`, target.buffer)
  } catch (error) {
    await report('/__video-error', String(error?.stack || error))
  }
}
