// Sections of the Presentation app (src/apps/presentation), named
// `presentation-<section>`. Drawn beside the app rather than in
// make-app-icons.mjs, which hands each file here its kit and keeps whatever it
// returns. They are rooms of one app, not apps, and nothing sells them.
//
// The app's own drawing is a screen pulled down for the service, its words
// arriving with the line being shown in orange. So each room is a screen too,
// landscape where every other app's cards stand upright, and says what is on
// it: the services in a row to run, a song's words, a passage of Scripture.

export default ({ svg, splitTile, O3, LINE }) => ({
  // Services: the Sundays waiting in a row, each a date beside its line, and
  // the next one with the play mark that runs it.
  'presentation-services': svg(`
  ${splitTile(3, 9, 58, 46, 9, 'c')}
  <rect x="8" y="14" width="48" height="36" rx="4" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <rect class="a-pop" style="--i:${i}" x="12.5" y="${18.5 + i * 10.5}" width="8" height="7.5" rx="2" fill="${i === 0 ? 'url(#o)' : 'url(#b)'}"${i === 0 ? '' : ' opacity=".35"'}/>
  <rect class="a-line" style="--i:${i}" x="24" y="${20.5 + i * 10.5}" width="${[16, 19, 13][i]}" height="3.6" rx="1.8" fill="${LINE}"/>`
    )
    .join('')}
  <g class="a-pop" style="--i:3">
    <circle cx="48" cy="22.2" r="5.6" fill="url(#o)"/>
    <path d="M46.3 19.4c0-.7.8-1.1 1.4-.7l4 2.8c.5.4.5 1.1 0 1.5l-4 2.8c-.6.4-1.4 0-1.4-.7z" fill="#fff"/>
  </g>`),

  // Lyrics: a song's slide — the note it is sung to, and its words beside
  // it with the line being sung in orange, the way the presenter shows it.
  'presentation-lyrics': svg(`
  ${splitTile(3, 9, 58, 46, 9, 'c')}
  <rect x="8" y="14" width="48" height="36" rx="4" fill="#fff"/>
  <g class="a-pop" style="--i:0">
    <path d="M18.5 22.5l9-3v5l-9 3z" fill="url(#b)"/>
    <rect x="18.5" y="22.5" width="3.4" height="15.5" rx="1.2" fill="url(#b)"/>
    <ellipse cx="16.6" cy="38.6" rx="5" ry="4" transform="rotate(-20 16.6 38.6)" fill="url(#b)"/>
  </g>
  <rect class="a-line" style="--i:1" x="31" y="21.5" width="18" height="4" rx="2" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="31" y="30" width="20" height="4" rx="2" fill="url(#o)"/>
  <rect class="a-line" style="--i:3" x="31" y="38.5" width="13" height="4" rx="2" fill="${LINE}"/>`),

  // Readings: a passage up on the screen — its verse number in orange
  // leading the first line, the reference small and blue beneath — and the
  // ribbon of the Bible it came out of, hanging over the top.
  'presentation-readings': svg(`
  ${splitTile(3, 10, 58, 44, 9, 'c')}
  <rect x="8" y="15" width="48" height="34" rx="4" fill="#fff"/>
  <rect class="a-pop" style="--i:0" x="13" y="20.5" width="6" height="6" rx="1.8" fill="url(#o)"/>
  <rect class="a-line" style="--i:0" x="22" y="21.7" width="22" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="13" y="29.7" width="31" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:2" x="13" y="37.7" width="20" height="3.6" rx="1.8" fill="${LINE}"/>
  <rect class="a-line" style="--i:3" x="13" y="43.2" width="11" height="2.6" rx="1.3" fill="url(#b)"/>
  <path class="a-pop" style="--i:2" d="M45 4h8v20l-4-3.6-4 3.6z" fill="${O3}" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>`),
})
