// Sections of the Videos app (src/apps/videos), named `videos-<section>`.
// Each month's video is a calendar page, its binder rings across the top, so
// the two months read as months before they read as videos; how they look
// and sound is the one room that is not a month.

export default ({ svg, splitTile, O3, B2, LINE }) => {
  // The rings a calendar page hangs from, as the Events app's calendar has.
  const rings = (left, right, y) => `
  <rect x="${left}" y="${y}" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="${right}" y="${y}" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`

  // A play mark: a triangle with its corners rounded, pointing right.
  const play = (x, y, h, fill) =>
    `<path d="M${x} ${y + 1.6}c0-1.3 1.4-2.1 2.5-1.4l${h * 0.62} ${h * 0.4 - 1}c1.1.7 1.1 2.1 0 2.8l-${h * 0.62} ${h * 0.4 - 1}c-1.1.7-2.5-.1-2.5-1.4z" fill="${fill}"/>`

  return {
    // This month: the month's page, playing — the play mark landing on it and
    // the bar under it running along.
    'videos-month': svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="22" width="43" height="30.5" rx="4.5" fill="#fff"/>
  <g class="a-pop" style="--i:0">
    <circle cx="32" cy="34.5" r="8.6" fill="url(#o)"/>
    <circle cx="32" cy="34.5" r="8.6" fill="url(#shine)"/>
    ${play(29.2, 29.6, 10, '#fff')}
  </g>
  <rect x="16" y="46" width="32" height="2.8" rx="1.4" fill="#DCE3EE"/>
  <rect class="a-line" style="--i:1" x="16" y="46" width="13" height="2.8" rx="1.4" fill="url(#b)"/>
  ${rings(17, 41.5, 5)}`),

    // Next month: the page after this one, coming forward over it, with the
    // skip-ahead mark on it.
    'videos-next': svg(`
  <rect x="4" y="10" width="40" height="34" rx="8" fill="url(#b)"/>
  <rect x="4" y="10" width="40" height="34" rx="8" fill="url(#shine)"/>
  <rect x="8.5" y="18.5" width="31" height="21" rx="3.5" fill="#fff"/>
  ${rings(9.5, 21.5, 4)}
  <g class="a-pop" style="--i:0">
    ${splitTile(16, 21, 44, 38, 9, 'c')}
    <rect x="21" y="30" width="34" height="24" rx="4" fill="#fff"/>
    ${rings(25.5, 45, 15.5)}
  </g>
  <g class="a-pop" style="--i:1">
    ${play(29.5, 34.6, 14, 'url(#o)')}
    <rect x="40.6" y="35.2" width="3.8" height="13.6" rx="1.9" fill="${B2}"/>
  </g>`),

    // Look and sound: the colours to choose from on a card, the music under
    // them as it plays, and a note sung out over its corner.
    'videos-look': svg(`
  ${splitTile(4, 8, 46, 42, 9, 'c')}
  <rect x="9" y="13" width="36" height="32" rx="4.5" fill="#fff"/>
  ${['o', 'b', 't']
    .map((f, i) => `<circle class="a-pop" style="--i:${i}" cx="${17 + i * 10}" cy="21.5" r="4.2" fill="url(#${f})"/>`)
    .join('')}
  ${[5, 9, 13, 7, 11, 5]
    .map(
      (h, i) =>
        `<rect class="a-pop" style="--i:${3 + i * 0.5}" x="${14.6 + i * 4.4}" y="${36.5 - h / 2}" width="2.6" height="${h}" rx="1.3" fill="${i % 2 ? LINE : 'url(#b)'}"/>`
    )
    .join('')}
  <g class="a-pop" style="--i:5">
    <path d="M51.2 25.5h3.6v24.2h-3.6z" fill="url(#o)" stroke="#fff" stroke-width="2.4" paint-order="stroke" stroke-linejoin="round"/>
    <ellipse cx="47.4" cy="51.6" rx="6.2" ry="4.7" transform="rotate(-22 47.4 51.6)" fill="url(#o)" stroke="#fff" stroke-width="2.4" paint-order="stroke"/>
    <path d="M54.8 25.5c4.2 1.4 7.2 4.4 6.6 10-1.4-3.2-3.6-4.4-6.6-4.8z" fill="${O3}" stroke="#fff" stroke-width="1.8" paint-order="stroke" stroke-linejoin="round"/>
    <path d="M51.2 25.5h3.6v24.2h-3.6z" fill="url(#o)"/>
    <ellipse cx="47.4" cy="51.6" rx="6.2" ry="4.7" transform="rotate(-22 47.4 51.6)" fill="url(#o)"/>
    <ellipse cx="47.4" cy="51.6" rx="6.2" ry="4.7" transform="rotate(-22 47.4 51.6)" fill="url(#shine)"/>
  </g>`),
  }
}
