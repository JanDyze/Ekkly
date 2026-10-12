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
   *   step: seconds between cards (1.1), unless each card has a line of
   *   voice, when it lands as its line begins
   */
  pile: {
    icons: (s) => s.cards.map((c) => iconSrc(c.icon)),
    draw(ctx, t, s, env) {
      const { W, area, c } = env
      ctx.fillStyle = c.soft
      ctx.fillRect(0, 0, W, env.H)

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
        const t0 = cardAt(s, i)
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
   *   each: seconds per app (1.6), unless each app has a line of voice,
   *   when it stays up for as long as its line is said
   *   after: a line once the row is full ('All in one app.')
   */
  apps: {
    art: (s) => s.apps.map((a) => `${ART}/${a.art}.svg`),
    draw(ctx, t, s, env) {
      const { W, area, assets } = env
      const c = GROUNDS[s.ground || 'soft']
      ctx.fillStyle = c.ground
      ctx.fillRect(0, 0, W, env.H)

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
        const [t0, t1] = appSpan(s, i)
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
        const done = appSpan(s, n - 1)[1]
        const ap = out(span(t, done + 0.05, done + 0.45))
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
        // With a voice, the line under the link arrives as it is said.
        const subAt = s.cues?.[1] ? s.cues[1].start - 0.1 : s.subAt ?? 1.9
        const up = out(span(t, subAt, subAt + 0.4))
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
        const at = lineAt(s, i)
        const p = out(span(t, at, at + 0.45))
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

// ------------------------------------------------------------------ the voice
//
// A voice reads each scene's lines: `voice: ['Line one.', 'Line two.']`, or
// `{ say, at }` where what is spoken has to be spelled differently from what
// is meant - a Tagalog line spelled for an English voice to say right. Lines
// in a scene follow one another; the scene grows to fit them, never cuts one
// off. A pile's cards land as their lines begin.
//
// The voice is Kokoro (Apache 2.0, so free to use in an ad), run in this same
// browser. It is slow - ten seconds or more a line - so each line is made once
// and kept beside the ad, in out/voice/, named by what is said and by whom; a
// line that has not changed is never made again.

const KOKORO = 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'
const KOKORO_MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX'

let speaker = null
const loadSpeaker = async () => {
  if (!speaker) {
    speaker = import(KOKORO).then(({ KokoroTTS }) => KokoroTTS.from_pretrained(KOKORO_MODEL, { dtype: 'q8', device: 'wasm' }))
  }
  return speaker
}

const hash = (text) => {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0).toString(16).padStart(8, '0')
}

// Curly quotes read as noise to the voice ("Sunday’s" came out as three
// made-up words), so it is handed straight ones.
const speakable = (text) =>
  String(text)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, ', ')

// 16-bit WAV, mono: what is kept on disk.
function wav(samples, rate) {
  const data = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const text = (at, s) => [...s].forEach((c, i) => data.setUint8(at + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  data.setUint32(4, 36 + samples.length * 2, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  data.setUint32(16, 16, true)
  data.setUint16(20, 1, true)
  data.setUint16(22, 1, true)
  data.setUint32(24, rate, true)
  data.setUint32(28, rate * 2, true)
  data.setUint16(32, 2, true)
  data.setUint16(34, 16, true)
  text(36, 'data')
  data.setUint32(40, samples.length * 2, true)
  samples.forEach((v, i) => data.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 0x7fff, true))
  return new Blob([data.buffer], { type: 'audio/wav' })
}

// The voice leaves a breath of silence either end; the timing is ours to set,
// so it is trimmed to a few hundredths of a second.
function trim(samples, rate) {
  const floor = 0.01
  let a = samples.findIndex((v) => Math.abs(v) > floor)
  if (a < 0) return samples
  let b = samples.length - 1
  while (b > a && Math.abs(samples[b]) < floor) b--
  a = Math.max(0, a - Math.round(rate * 0.04))
  b = Math.min(samples.length, b + Math.round(rate * 0.08))
  return samples.slice(a, b)
}

const decoder = new OfflineAudioContext(1, 1, 48000)

async function voiceLine(say, { voice, speed, keptOnly }) {
  const folder = location.pathname.replace(/[^/]*$/, '')
  const name = `${voice}-${hash(`${voice}|${speed}|${say}`)}.wav`
  const kept = await fetch(`${folder}out/voice/${name}`)
  if (kept.ok) {
    const bytes = await kept.arrayBuffer()
    // A still needs only how long each line is, and decoding audio never
    // finishes under the frozen clock of a headless screenshot, so it is read
    // off the file's own header instead: 16-bit mono, at the rate it states.
    if (keptOnly) return { duration: (bytes.byteLength - 44) / (2 * new DataView(bytes).getUint32(24, true)) }
    return decoder.decodeAudioData(bytes)
  }
  if (keptOnly) throw new Error(`No voice kept for: ${say}`)

  const tts = await loadSpeaker()
  const made = await tts.generate(speakable(say), { voice, speed })
  const samples = trim(made.audio, made.sampling_rate)
  const file = wav(samples, made.sampling_rate)
  // Kept by the render server; a page opened some other way just makes it again.
  await fetch(`/__voice?path=${encodeURIComponent(`${folder.slice(1)}out/voice/${name}`)}`, { method: 'POST', body: file }).catch(() => {})
  return decoder.decodeAudioData(await file.arrayBuffer())
}

// Lays each scene's lines out in time and stretches the scene to hold them.
async function cueVoices(scenes, opts, status) {
  let made = 0
  const total = scenes.reduce((n, s) => n + (s.voice?.length || 0), 0)
  for (const s of scenes) {
    if (!s.voice?.length) continue
    s.cues = []
    let at = s.voiceAt ?? 0.3
    for (const line of s.voice) {
      const { say, at: wanted } = typeof line === 'string' ? { say: line } : line
      status(`Voice ${++made} of ${total}`)
      const buffer = await voiceLine(say, opts)
      const start = Math.max(at, wanted ?? 0)
      s.cues.push({ start, end: start + buffer.duration, buffer })
      at = start + buffer.duration + (s.voiceGap ?? 0.3)
    }
    s.dur = Math.max(s.dur, s.cues.at(-1).end + (s.tail ?? 0.6))
  }
}

// ------------------------------------------------------------------ the sound
//
// Every sound is drawn here rather than recorded, like the app's own music
// (src/utils/video/music.js), so there is nothing to license: a card set
// down, the panes lighting as a rising chord, an app arriving and settling
// into its row, the link being typed. Each scene type says when its sounds
// fall; they follow what is on screen, never the other way round.

const RATE = 48000

const noise = (ctx, seconds) => {
  const buffer = ctx.createBuffer(1, Math.ceil(RATE * seconds), RATE)
  const data = buffer.getChannelData(0)
  let seed = 7
  for (let i = 0; i < data.length; i++) {
    seed = (seed * 16807) % 2147483647
    data[i] = (seed / 2147483647) * 2 - 1
  }
  return buffer
}

const envelope = (ctx, out, t, peak, attack, decay) => {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  g.connect(out)
  return g
}

const SFX = {
  // A card set down on a table: a short low thump with a little paper in it.
  thud(ctx, out, t) {
    const n = ctx.createBufferSource()
    n.buffer = noise(ctx, 0.12)
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 900
    n.connect(lp).connect(envelope(ctx, out, t, 0.32, 0.004, 0.09))
    n.start(t)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(70, t + 0.1)
    o.connect(envelope(ctx, out, t, 0.3, 0.004, 0.12))
    o.start(t)
    o.stop(t + 0.2)
  },
  // The cards sliding off: air, falling in pitch.
  whoosh(ctx, out, t, length = 0.6) {
    const n = ctx.createBufferSource()
    n.buffer = noise(ctx, length + 0.1)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 0.9
    bp.frequency.setValueAtTime(2400, t)
    bp.frequency.exponentialRampToValueAtTime(300, t + length)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + length * 0.35)
    g.gain.exponentialRampToValueAtTime(0.0001, t + length)
    n.connect(bp).connect(g).connect(out)
    n.start(t)
  },
  // A bell-like note: a fundamental and two quiet partials.
  chime(ctx, out, t, freq, peak = 0.1) {
    for (const [ratio, level] of [
      [1, 1],
      [2, 0.28],
      [3.01, 0.1],
    ]) {
      const o = ctx.createOscillator()
      o.frequency.value = freq * ratio
      o.connect(envelope(ctx, out, t, peak * level, 0.005, 1.4 / ratio))
      o.start(t)
      o.stop(t + 1.6)
    }
  },
  // An app arriving.
  pop(ctx, out, t) {
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(420, t)
    o.frequency.exponentialRampToValueAtTime(880, t + 0.06)
    o.connect(envelope(ctx, out, t, 0.16, 0.004, 0.11))
    o.start(t)
    o.stop(t + 0.2)
  },
  // The same app settling into its place in the row.
  tock(ctx, out, t) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(1100, t)
    o.frequency.exponentialRampToValueAtTime(700, t + 0.04)
    o.connect(envelope(ctx, out, t, 0.08, 0.002, 0.07))
    o.start(t)
    o.stop(t + 0.12)
  },
  // One key of the link being typed.
  key(ctx, out, t) {
    const n = ctx.createBufferSource()
    n.buffer = noise(ctx, 0.03)
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 2500
    n.connect(hp).connect(envelope(ctx, out, t, 0.07, 0.001, 0.02))
    n.start(t)
  },
  // A big line arriving: a soft low swell, felt more than heard.
  swell(ctx, out, t) {
    for (const f of [220, 330]) {
      const o = ctx.createOscillator()
      o.frequency.value = f
      o.connect(envelope(ctx, out, t, 0.035, 0.25, 1.1))
      o.start(t)
      o.stop(t + 1.5)
    }
  },
}

// C, E, G and the C above: the four panes, lit in order.
const PANE_NOTES = [523.25, 659.25, 783.99, 1046.5]

// When an app is up, from arriving to settling in the row. Given a line of
// voice each, an app arrives just before its line and stays until the next
// one's, the last until the scene ends; otherwise every app gets `each`.
function appSpan(s, i) {
  const n = s.apps.length
  if (s.cues?.length === n) {
    const t0 = Math.max(0, s.cues[i].start - 0.3)
    // The last stays to the end of the scene, unless a line is to follow the
    // row (`after`), when it settles soon after its own line to make room.
    const last = s.after ? s.cues[i].end + 0.4 : s.dur - 0.15
    const t1 = i + 1 < n ? Math.max(t0 + 0.8, s.cues[i + 1].start - 0.3) : Math.max(t0 + 0.8, last)
    return [t0, t1]
  }
  const each = s.each ?? 1.6
  return [i * each, (i + 1) * each]
}

// A big line arrives as it is said, when the voice says each one.
function lineAt(s, i) {
  if (s.cues?.length === s.lines.length) return Math.max(0, s.cues[i].start - 0.1)
  return 0.15 + i * (s.step ?? 0.7)
}

// A pile's card lands as its line begins, when it has one.
function cardAt(s, i) {
  if (s.cues?.length === s.cards.length) return Math.max(0, s.cues[i].start - 0.2)
  return 0.15 + i * (s.step ?? 1.1)
}

// When each scene type makes its sounds, in seconds into the scene.
const SOUNDS = {
  pile: (s, play) => {
    s.cards.forEach((_, i) => play('thud', cardAt(s, i) + 0.28))
    play('whoosh', s.dur - 0.55)
  },
  mark: (s, play) => PANE_NOTES.forEach((f, i) => play('chime', 0.15 + i * 0.12, f)),
  apps: (s, play) => {
    s.apps.forEach((_, i) => {
      const [t0, t1] = appSpan(s, i)
      play('pop', t0)
      play('tock', t1 - 0.02)
    })
    if (s.after) play('chime', appSpan(s, s.apps.length - 1)[1] + 0.05, 783.99, 0.07)
  },
  link: (s, play) => {
    for (let k = 0; k < s.host.length; k++) play('key', 0.6 + k * 0.07)
  },
  lines: (s, play) => s.lines.forEach((_, i) => play('swell', lineAt(s, i))),
  close: (s, play) => {
    PANE_NOTES.forEach((f, i) => play('chime', 0.05 + i * 0.12, f, 0.08))
    play('pop', 1.1)
  },
}

/**
 * The whole soundtrack, as one stereo AudioBuffer: music under everything,
 * turned down while the voice speaks, the sounds, and the voice on top.
 */
async function score(items, duration, { music = 'morning', musicLevel = 0.32 } = {}) {
  const ctx = new OfflineAudioContext(2, Math.ceil(RATE * duration), RATE)
  // Kept from clipping when a chime, a thud and the voice land together.
  const master = ctx.createDynamicsCompressor()
  master.threshold.value = -10
  master.ratio.value = 4
  master.connect(ctx.destination)

  if (music !== 'none') {
    const { renderMusic } = await import('/src/utils/video/music.js')
    const track = await renderMusic({ track: music, seconds: duration })
    if (track) {
      const src = ctx.createBufferSource()
      src.buffer = track
      const g = ctx.createGain()
      g.gain.setValueAtTime(musicLevel, 0)
      // Down under every line of voice, and up again after it.
      for (const s of items) {
        for (const cue of s.cues || []) {
          const a = s.start + cue.start
          const b = s.start + cue.end
          g.gain.setValueAtTime(musicLevel, Math.max(0, a - 0.25))
          g.gain.linearRampToValueAtTime(musicLevel * 0.4, a)
          g.gain.setValueAtTime(musicLevel * 0.4, b)
          g.gain.linearRampToValueAtTime(musicLevel, b + 0.4)
        }
      }
      g.gain.setValueAtTime(musicLevel, Math.max(0, duration - 1.6))
      g.gain.linearRampToValueAtTime(0.0001, duration)
      src.connect(g).connect(master)
      src.start(0)
    }
  }

  const sfx = ctx.createGain()
  sfx.connect(master)
  for (const s of items) {
    SOUNDS[s.type]?.(s, (name, at, ...args) => {
      const t = s.start + at
      if (t >= 0 && t < duration) SFX[name](ctx, sfx, t, ...args)
    })
  }

  const voice = ctx.createGain()
  voice.gain.value = 1.15
  voice.connect(master)
  for (const s of items) {
    for (const cue of s.cues || []) {
      const src = ctx.createBufferSource()
      src.buffer = cue.buffer
      src.connect(voice)
      src.start(s.start + cue.start)
    }
  }

  return ctx.startRendering()
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

/**
 * Plays, holds a moment, or records the video.
 *   voice: 'af_heart' - which of Kokoro's voices reads the lines
 *   speed: 1          - how fast it reads
 *   music: 'morning'  - a track from src/utils/video/music.js, or 'none'
 */
export async function film({ size = 'reel', scenes, fps = 30, voice = 'af_heart', speed = 1, music = 'morning' }) {
  const frame = SIZES[size]
  const W = frame.width
  const H = frame.height
  const top = frame.top + 60
  const bottom = H - frame.bottom - 40
  const area = { top, bottom, mid: (top + bottom) / 2 }

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  const status = document.createElement('p')
  document.body.appendChild(status)
  const say = (text) => (status.textContent = text)

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

  const params = new URLSearchParams(location.search)
  const still = params.has('t')
  // The voice decides how long each scene is, so even a still picture waits
  // on it - but only on the lines already kept; a still never makes one, and
  // without them it is timed as if there were no voice at all.
  const lengths = scenes.map((s) => s.dur)
  try {
    await cueVoices(scenes, { voice, speed, keptOnly: still }, say)
  } catch (error) {
    if (!still) throw error
    scenes.forEach((s, i) => {
      s.dur = lengths[i]
      delete s.cues
    })
  }
  const items = timeline(scenes)
  const duration = items.reduce((a, s) => a + s.dur, 0)

  const layer = document.createElement('canvas')
  layer.width = W
  layer.height = H
  const draw = (t) => {
    const i = Math.max(0, items.findLastIndex((s) => s.start <= t))
    const s = items[i]
    const local = t - s.start
    // The scene before, held at its end, under this one fading in.
    if (i > 0 && local < FADE) {
      const prev = items[i - 1]
      ctx.globalAlpha = 1
      SCENES[prev.type].draw(ctx, t - prev.start, prev, env)
      ctx.save()
      ctx.globalAlpha = inOut(local / FADE)
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

  if (still) {
    draw(Number(params.get('t')))
    say('')
    document.body.dataset.ready = '1'
    return
  }

  say('Mixing the sound')
  const sound = await score(items, duration, { music })
  if (params.has('record')) return record({ canvas, draw, duration, fps, sound, status })

  // Watching: silent and looping until clicked, because a browser will not
  // play sound before then; a click plays it from the top with the sound,
  // and another stops it.
  say('Click to play with sound')
  let audio = null
  let player = null
  let startedAt = 0
  canvas.addEventListener('click', () => {
    if (player) {
      player.stop()
      return
    }
    audio ||= new AudioContext()
    player = audio.createBufferSource()
    player.buffer = sound
    player.connect(audio.destination)
    startedAt = audio.currentTime + 0.05
    player.start(startedAt)
    player.onended = () => {
      player = null
      say('Click to play with sound')
    }
    say('')
  })
  const begun = performance.now()
  const tick = () => {
    const t = player ? Math.max(0, audio.currentTime - startedAt) : ((performance.now() - begun) / 1000) % duration
    draw(Math.min(t, duration - 1 / fps))
    requestAnimationFrame(tick)
  }
  tick()
}

// ------------------------------------------------------------------ encoding

async function report(path, body) {
  await fetch(path, { method: 'POST', body })
}

// AAC first: what Meta and every phone take. Opus only if this browser
// cannot write AAC.
async function pickAudio(sampleRate, numberOfChannels) {
  for (const choice of [
    { codec: 'mp4a.40.2', mux: 'aac' },
    { codec: 'opus', mux: 'opus' },
  ]) {
    const config = { codec: choice.codec, sampleRate, numberOfChannels, bitrate: 192_000 }
    const { supported } = await AudioEncoder.isConfigSupported(config).catch(() => ({ supported: false }))
    if (supported) return { ...choice, config }
  }
  return null
}

async function record({ canvas, draw, duration, fps, sound, status }) {
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
    const audio = sound ? await pickAudio(sound.sampleRate, sound.numberOfChannels) : null
    if (sound && !audio) throw new Error('This browser cannot encode AAC or Opus audio')

    const target = new ArrayBufferTarget()
    const muxer = new Muxer({
      target,
      video: { codec: chosen.mux, width: W, height: H },
      ...(audio ? { audio: { codec: audio.mux, sampleRate: sound.sampleRate, numberOfChannels: sound.numberOfChannels } } : {}),
      fastStart: 'in-memory',
    })
    let failed = null

    // The sound first, in blocks of 1024 samples, planar as the encoder wants.
    if (audio) {
      status.textContent = 'Encoding the sound'
      const encoder = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => (failed = e) })
      encoder.configure(audio.config)
      const channels = [...Array(sound.numberOfChannels)].map((_, c) => sound.getChannelData(c))
      const block = 1024
      for (let at = 0; at < sound.length; at += block) {
        const n = Math.min(block, sound.length - at)
        const data = new Float32Array(n * channels.length)
        channels.forEach((ch, c) => data.set(ch.subarray(at, at + n), c * n))
        const piece = new AudioData({
          format: 'f32-planar',
          sampleRate: sound.sampleRate,
          numberOfFrames: n,
          numberOfChannels: channels.length,
          timestamp: Math.round((at / sound.sampleRate) * 1e6),
          data,
        })
        encoder.encode(piece)
        piece.close()
        if (encoder.encodeQueueSize > 32) await new Promise((r) => encoder.addEventListener('dequeue', r, { once: true }))
      }
      await encoder.flush()
      if (failed) throw failed
    }

    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (e) => (failed = e),
    })
    encoder.configure(chosen.config)
    const frames = Math.round(duration * fps)
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
    const codecs = audio ? `${chosen.codec}, ${audio.codec}` : chosen.codec
    await report(`/__video?codec=${encodeURIComponent(codecs)}&seconds=${duration.toFixed(1)}`, target.buffer)
  } catch (error) {
    await report('/__video-error', String(error?.stack || error))
  }
}
