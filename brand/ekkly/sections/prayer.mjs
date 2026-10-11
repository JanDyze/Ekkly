// The sections of the Prayer app (src/apps/prayer), named `prayer-<section>`
// and drawn with the same kit as the apps (brand/ekkly/make-app-icons.mjs).
// They are rooms of one app, not apps, and nothing sells them.
//
// A heart runs through all four: it is what a concern is, somebody cared
// for. Each room then says what is being done with it — prayed down a list
// this week, kept on week after week, answered, written down for good — so
// the four never read as one drawing four times.

export default ({ svg, splitTile, check, NAVY, LINE }) => {
  // A heart `w` wide, its middle at (cx, cy), drawn from the one in
  // Schedules' welcome bubble so the hearts across Ekkly are the same shape.
  const heart = (cx, cy, w) => {
    const s = w / 25
    const p = (x, y) => `${(cx + x * s).toFixed(2)} ${(cy + y * s).toFixed(2)}`
    const r = (6 * s).toFixed(2)
    return `M${p(0, 10)}C${p(-8.5, 4.4)} ${p(-12.5, 0.4)} ${p(-12.5, -4)}A${r} ${r} 0 0 1 ${p(0, -6.4)}A${r} ${r} 0 0 1 ${p(12.5, -4)}C${p(12.5, 0.4)} ${p(8.5, 4.4)} ${p(0, 10)}Z`
  }

  // A heart in the two tones of every tile: blue below the diagonal, orange
  // above it, and the shine over both. The diagonal runs across the heart's
  // own box, as it runs across a tile's.
  const splitHeart = (id, cx, cy, w) => {
    const left = cx - w / 2
    const top = cy - w * 0.47
    const h = w * 0.88
    return `
  <clipPath id="${id}"><path d="${heart(cx, cy, w)}"/></clipPath>
  <g clip-path="url(#${id})">
    <rect x="${left}" y="${top}" width="${w}" height="${h}" fill="url(#b)"/>
    <path d="M${left + w * 0.18} ${top}H${left + w}V${top + h * 0.72}Z" fill="url(#o)"/>
    <rect x="${left}" y="${top}" width="${w}" height="${h}" fill="url(#shine)"/>
  </g>`
  }

  return {
    // Praying now: this week's prayer list, a heart beside each name, the
    // way a prayer meeting goes down it one need at a time.
    'prayer-now': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <path class="a-pop" style="--i:${i}" d="${heart(18, 20.5 + i * 11.5, 9.5)}" fill="url(#${['o', 'b', 't'][i]})"/>
  <rect class="a-line" style="--i:${i}" x="26" y="${18.4 + i * 11.5}" width="${22 - i * 4}" height="3.6" rx="1.8" fill="${LINE}"/>`
    )
    .join('')}`),

    // Ongoing: a heart with the arrows going round it — a need the church
    // keeps praying for, week after week, rather than one that has passed.
    'prayer-ongoing': svg(`
  <path class="a-draw" style="--i:0" pathLength="1" d="M10.5 27A22 22 0 0 1 47.5 15" fill="none" stroke="url(#b)" stroke-width="5" stroke-linecap="round"/>
  <path class="a-draw" style="--i:1" pathLength="1" d="M53.5 37A22 22 0 0 1 16.5 49" fill="none" stroke="url(#o)" stroke-width="5" stroke-linecap="round"/>
  <path class="a-pop" style="--i:3" d="M42.5 9.5l7 5.2-7.8 3.6z" fill="url(#b)" stroke="url(#b)" stroke-width="2.4" stroke-linejoin="round"/>
  <path class="a-pop" style="--i:4" d="M21.5 54.5l-7-5.2 7.8-3.6z" fill="url(#o)" stroke="url(#o)" stroke-width="2.4" stroke-linejoin="round"/>
  <g class="a-pop" style="--i:2">${splitHeart('h', 32, 32.5, 27)}</g>`),

    // Answered: the heart, and a tick drawing itself across it — what was
    // asked for, given. Worth thanking God for out loud.
    'prayer-answered': svg(`
  <g class="a-pop" style="--i:0">${splitHeart('h', 32, 33, 52)}</g>
  ${check(20.5, 19, 23, '#fff', 5, 2)}`),

    // Every concern: the church's prayer journal, a heart on its cover and
    // its ribbon hanging out of the pages — everything ever asked, kept.
    'prayer-all': svg(`
  <rect x="14" y="8" width="42" height="50" rx="6" fill="#fff" stroke="#DCE3EE" stroke-width="1.6"/>
  <clipPath id="c"><rect x="8" y="4" width="44" height="51" rx="7"/></clipPath>
  <g clip-path="url(#c)">
    <rect x="8" y="4" width="44" height="51" fill="url(#b)"/>
    <path d="M20 4H52V42Z" fill="url(#o)"/>
    <rect x="8" y="4" width="44" height="51" fill="url(#shine)"/>
  </g>
  <rect x="8" y="4" width="8" height="51" rx="4" fill="${NAVY}" opacity=".85"/>
  <path class="a-pop" style="--i:1" d="${heart(34, 29, 22)}" fill="#fff"/>
  <path class="a-pop" style="--i:2" d="M40.5 53h7v10l-3.5-3-3.5 3z" fill="url(#t)"/>`),
  }
}
