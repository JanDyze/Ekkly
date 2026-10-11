// The inside of a church, as the ground every app's screens stand on: the home
// of all apps stands outside under the sky (HomeScene), and opening an app is
// going in. Three of Ekkly's windows high on the back wall, their light falling
// across the room, and the pews at the foot either side of the aisle.
//
// It is a ground, never the thing to look at — the screens are lists and cards
// and they come first — so everything is drawn barely there: the glass a tint,
// the light a breath, the pews a shade off the floor. It follows the app's
// theme rather than the time of day, because the cards and words over it do,
// and a ground that disagreed with them is what made the home's verse vanish.
//
// Drawn as two background images on the screen (AppScreen), not as elements:
// a scrolling element's background stays put while its content scrolls, so
// the room holds still under a moving list, and it costs no layout at all.
// The windows sit at the top at a fixed width, so a wide screen does not blow
// them up; the pews run the full width of the foot.

// Ekkly's four, the mark's own panes (BRAND.md): warm above, cool below.
const AMBER = '#fdc24b'
const ORANGE = '#f19140'
const CYAN = '#09a4c6'
const BLUE = '#0270dc'

/** One of Ekkly's windows: an arch, four panes round a curved cross. */
const windowAt = (x, y, w, h, glass) => {
  const r = w / 2
  const mid = x + r
  const gap = w * 0.08
  const bar = y + r + h * 0.04
  const left = mid - gap / 2
  const right = mid + gap / 2
  return `
    <path d="M${x} ${bar}V${y + r}A${r} ${r} 0 0 1 ${left} ${y + 0.5}V${bar - h * 0.08}C${left} ${bar - h * 0.03} ${x + w * 0.3} ${bar} ${x} ${bar + 2}Z" fill="${AMBER}" fill-opacity="${glass}"/>
    <path d="M${x + w} ${bar}V${y + r}A${r} ${r} 0 0 0 ${right} ${y + 0.5}V${bar - h * 0.08}C${right} ${bar - h * 0.03} ${x + w * 0.7} ${bar} ${x + w} ${bar + 2}Z" fill="${ORANGE}" fill-opacity="${glass}"/>
    <path d="M${x} ${bar + 6}C${x + w * 0.2} ${bar + 2} ${x + w * 0.35} ${bar + 1} ${left - 4} ${bar + 2}Q${left} ${bar + 3} ${left} ${bar + 8}V${y + h}H${x}Z" fill="${BLUE}" fill-opacity="${glass}"/>
    <path d="M${x + w} ${bar + 6}C${x + w * 0.8} ${bar + 2} ${x + w * 0.65} ${bar + 1} ${right + 4} ${bar + 2}Q${right} ${bar + 3} ${right} ${bar + 8}V${y + h}H${x + w}Z" fill="${CYAN}" fill-opacity="${glass}"/>`
}

/** The light a window lets in, falling away from it and fading as it goes. */
const beamFrom = (x, y, w, h, id) => `
    <path d="M${x} ${y + h}L${x + w} ${y + h}L${x + w * 1.9} 420L${x - w * 0.9} 420Z" fill="url(#${id})"/>`

const windows = ({ glass, light, lightOpacity }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 420">
  <defs>
    <linearGradient id="fall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${light}" stop-opacity="${lightOpacity}"/>
      <stop offset="1" stop-color="${light}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  ${beamFrom(50, 90, 46, 170, 'fall')}
  ${beamFrom(162, 40, 76, 250, 'fall')}
  ${beamFrom(304, 90, 46, 170, 'fall')}
  ${windowAt(50, 90, 46, 170, glass * 0.8)}
  ${windowAt(162, 40, 76, 250, glass)}
  ${windowAt(304, 90, 46, 170, glass * 0.8)}
</svg>`

/**
 * The pews, either side of the aisle, nearer rows wider and lower, all
 * leaning toward the far end of the room.
 */
const pews = ({ wood }) => {
  // [top, height, inset from the wall]: the far rows first, small and drawn
  // in from the walls, the nearest last, wide and tall at the foot.
  const rows = [
    [24, 12, 66],
    [44, 15, 52],
    [68, 18, 36],
    [96, 22, 18],
    [126, 26, 0],
  ]
  const side = (top, height, inset, flip) => {
    const outer = flip ? 400 - inset : inset
    const inner = flip ? 218 + (64 - inset) * 0.35 : 182 - (64 - inset) * 0.35
    const [a, b] = flip ? [inner, outer] : [outer, inner]
    return `<rect x="${a}" y="${top}" width="${b - a}" height="${height}" rx="${height / 2.6}" fill="${wood}"/>`
  }
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax slice">
  ${rows.map(([top, height, inset]) => side(top, height, inset, false) + side(top, height, inset, true)).join('\n  ')}
</svg>`
}

const url = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}")`

/** The room by day, on the light theme's grey. */
const LIGHT = {
  windows: url(windows({ glass: 0.13, light: AMBER, lightOpacity: 0.09 })),
  pews: url(pews({ wood: 'rgb(17 24 39 / 0.035)' })),
}

/** The room by lamplight, on the dark theme's near-black. */
const DARK = {
  windows: url(windows({ glass: 0.15, light: '#7db2ff', lightOpacity: 0.06 })),
  pews: url(pews({ wood: 'rgb(255 255 255 / 0.03)' })),
}

/**
 * The custom properties AppScreen sets on itself; its own style turns them
 * into the background for whichever theme is on.
 */
export const interiorVars = {
  '--interior-windows': LIGHT.windows,
  '--interior-pews': LIGHT.pews,
  '--interior-windows-dark': DARK.windows,
  '--interior-pews-dark': DARK.pews,
}
