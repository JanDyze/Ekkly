// Sections of the Songs app (src/apps/songs), named `songs-<section>`. Drawn
// beside the app rather than in make-app-icons.mjs, which hands each file here
// its kit and keeps whatever it returns. They are rooms of one app, not apps,
// and nothing sells them.
//
// The app's own drawing is a song sheet with a note dropping onto it, so each
// room keeps something of that: the note, or the sheet's grey lines.

export default ({ svg, splitTile, O3, LINE }) => {
  // A quaver: a round head, its stem, and the flag. `fill` is the head and
  // stem; drawn with a white edge so it reads where it overlaps a card.
  const note = (x, y, s, fill) => `
    <g stroke="#fff" stroke-width="${2.2 / s}" stroke-linejoin="round" paint-order="stroke" transform="translate(${x} ${y}) scale(${s})">
      <path d="M5.2 -14.5V0" fill="none" stroke="#fff" stroke-width="${5 / s}" stroke-linecap="round"/>
      <path d="M5.2 -15.5l7 3.2v4.6l-7-3z" fill="none" stroke="#fff" stroke-width="${5 / s}" stroke-linejoin="round"/>
      <ellipse cx="0" cy="0" rx="6.2" ry="5" transform="rotate(-20)" fill="${fill}"/>
      <rect x="3.6" y="-15.5" width="3.2" height="16" rx="1.2" fill="${fill}" stroke="none"/>
      <path d="M5.2 -15.5l7 3.2v4.6l-7-3z" fill="${fill}" stroke="none"/>
    </g>`

  return {
    // All songs: the song list itself — a card of rows, each with the little
    // picture of its recording and a line for its title.
    'songs-all': svg(`
  ${splitTile(4, 6, 56, 52, 10, 'c')}
  <rect x="9.5" y="12" width="45" height="40" rx="5" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <g class="a-pop" style="--i:${i}">
    <rect x="14" y="${16 + i * 11.5}" width="11" height="8.5" rx="2.2" fill="url(#${['o', 'b', 't'][i]})"/>
    <path d="M18.3 ${18 + i * 11.5}v4.5l3.8-2.25z" fill="#fff"/>
  </g>
  <rect class="a-line" style="--i:${i}" x="29" y="${18.5 + i * 11.5}" width="${[19, 15, 11][i]}" height="3.6" rx="1.8" fill="${LINE}"/>`
    )
    .join('')}`),

    // Sundays: the calendar page for the coming Sunday, its rings at the top,
    // with the note set down on it — what is sung that day.
    'songs-sunday': svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  <rect x="15" y="29" width="13" height="10" rx="2.5" fill="url(#b)"/>
  <rect class="a-line" style="--i:0" x="15" y="43" width="14" height="3.4" rx="1.7" fill="${LINE}"/>
  <g class="a-pop" style="--i:1">${note(39, 46, 1.25, 'url(#o)')}</g>
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),

    // Most sung: how often each song is sung, as bars, and the note riding
    // the tallest.
    'songs-sung': svg(`
  ${[
    [6, 36, 22, 'b'],
    [25, 26, 32, 'o'],
    [44, 42, 16, 't'],
  ]
    .map(
      ([x, y, h, fill], i) => `
  <g class="a-pop" style="--i:${i}">
    <rect x="${x}" y="${y}" width="14" height="${h}" rx="5" fill="url(#${fill})"/>
    <rect x="${x}" y="${y}" width="14" height="${h}" rx="5" fill="url(#shine)"/>
  </g>`
    )
    .join('')}
  <g class="a-pop" style="--i:3">${note(29, 18, 1.05, 'url(#b)')}</g>`),

    // Missing lyrics: a song sheet headed by its note, its words not yet
    // written — empty rows, the caret where typing starts, and the round plus
    // that adds them. Not the app's own sheet with its note on the corner,
    // which this would otherwise be mistaken for.
    'songs-lyrics': svg(`
  ${splitTile(4, 5, 50, 52, 10, 'c')}
  <rect x="9.5" y="11" width="39" height="40" rx="4.5" fill="#fff"/>
  ${note(16, 23.5, 0.62, 'url(#b)')}
  <rect class="a-line" style="--i:0" x="24" y="16.5" width="19" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect x="17" y="30" width="26" height="3.6" rx="1.8" fill="#DCE3EE"/>
  <rect x="14" y="37.5" width="29" height="3.6" rx="1.8" fill="#DCE3EE"/>
  <rect x="14" y="45" width="17" height="3.6" rx="1.8" fill="#DCE3EE"/>
  <rect class="a-pop" style="--i:1" x="13.6" y="28" width="2.6" height="7.6" rx="1.3" fill="url(#o)"/>
  <g class="a-pop" style="--i:2">
    <circle cx="49" cy="50" r="10" fill="url(#o)" stroke="#fff" stroke-width="2.4" paint-order="stroke"/>
    <circle cx="49" cy="50" r="10" fill="url(#shine)"/>
    <path d="M49 44.5v11M43.5 50h11" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
  </g>`),
  }
}
