// Sections of the Gallery app (src/apps/gallery), named `gallery-<section>`.
// Drawn beside the app rather than in make-app-icons.mjs, which hands each
// file here its kit and keeps whatever it returns. They are rooms of one app,
// not apps, and nothing sells them.
//
// The app's own drawing is a photo: a blue sky, teal hills and a white sun.
// Every room keeps that photo, small, so each reads as part of the gallery.

export default ({ svg, splitTile, NAVY, O3, LINE }) => {
  // The gallery's photo, in little: a sky, the sun, and the hills under it.
  // `id` names its clip, which has to be different for every photo in a
  // drawing.
  const photo = (id, x, y, w, h, r, sky = 'url(#b)', hills = 'url(#t)') => `
    <clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
    <g clip-path="url(#${id})">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${sky}"/>
      <circle cx="${x + w * 0.72}" cy="${y + h * 0.3}" r="${(Math.min(w, h) * 0.13).toFixed(2)}" fill="#fff"/>
      <path d="M${x} ${y + h}L${x + w * 0.36} ${y + h * 0.48}L${x + w * 0.58} ${y + h * 0.76}L${x + w * 0.72} ${y + h * 0.62}L${x + w} ${y + h}Z" fill="${hills}"/>
    </g>`

  // A print: the photo on a white card with a border, the way it comes out of
  // a printer or sits in an album.
  const print = (id, x, y, w, h, sky, hills) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#fff" stroke="#DCE3EE" stroke-width="1.6"/>
    ${photo(id, x + 3.5, y + 3.5, w - 7, h - 12, 2.5, sky, hills)}`

  return {
    // Albums: a stack of them, fanned, the newest on top as a print and the
    // two under it showing their coloured covers at either side.
    'gallery-albums': svg(`
  <g class="a-pop" style="--i:0"><g transform="rotate(-15 32 38)">
    <rect x="12" y="12" width="36" height="44" rx="5" fill="url(#o)"/>
    <rect x="12" y="12" width="36" height="44" rx="5" fill="url(#shine)"/>
  </g></g>
  <g class="a-pop" style="--i:1"><g transform="rotate(12 32 38)">
    <rect x="15" y="12" width="36" height="44" rx="5" fill="url(#t)"/>
    <rect x="15" y="12" width="36" height="44" rx="5" fill="url(#shine)"/>
  </g></g>
  <g class="a-pop" style="--i:2">
    ${print('p3', 13, 14, 38, 45)}
    <rect class="a-line" style="--i:3" x="19" y="51" width="16" height="3.2" rx="1.6" fill="${LINE}"/>
  </g>`),

    // Recent photos: a card of four photos arriving one by one, and the dot
    // that says some are new.
    'gallery-recent': svg(`
  ${splitTile(4, 8, 56, 50, 10, 'c')}
  <rect x="9.5" y="14" width="45" height="38.5" rx="5" fill="#fff"/>
  ${[0, 1, 2, 3]
    .map((i) => {
      const x = 13.5 + (i % 2) * 19
      const y = 17.5 + Math.floor(i / 2) * 16.5
      return `<g class="a-pop" style="--i:${i}">${photo(`r${i}`, x, y, 17, 14, 2.5, i % 3 ? 'url(#b)' : 'url(#o)', i % 3 ? 'url(#t)' : 'url(#b)')}</g>`
    })
    .join('')}
  <circle class="a-pop" style="--i:4" cx="53" cy="10" r="6.5" fill="${O3}" stroke="#fff" stroke-width="2.4"/>`),

    // By kind: a print with a tag tied to its corner, the kind written on it.
    'gallery-kinds': svg(`
  <g class="a-pop" style="--i:0"><g transform="rotate(-6 24 30)">${print('k1', 6, 9, 34, 42)}</g></g>
  <path d="M34.5 15c4 2 6.5 7 7.5 12" fill="none" stroke="${NAVY}" stroke-width="1.8" stroke-linecap="round"/>
  <g class="a-pop" style="--i:1">
    <g transform="rotate(28 44 38)">
      <path d="M37 29H56a3 3 0 0 1 3 3V44a3 3 0 0 1-3 3H37L30 38Z" fill="url(#o)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
      <circle cx="36.5" cy="38" r="2.4" fill="#fff"/>
      <rect x="42" y="35" width="12" height="2.8" rx="1.4" fill="#fff"/>
      <rect x="42" y="39.6" width="8" height="2.4" rx="1.2" fill="#fff" opacity=".8"/>
    </g>
  </g>`),

    // Needs photos: the camera, ready, and the plus of photos still to add.
    'gallery-waiting': svg(`
  <rect x="21" y="11" width="22" height="11" rx="3.5" fill="${NAVY}"/>
  <rect x="9" y="14" width="8" height="5.5" rx="2" fill="${O3}"/>
  ${splitTile(5, 18, 54, 39, 9, 'c')}
  <rect x="45.5" y="23.5" width="8" height="4.5" rx="1.8" fill="#fff" opacity=".9"/>
  <g class="a-pop" style="--i:0">
    <circle cx="31" cy="38.5" r="13" fill="#fff"/>
    <circle cx="31" cy="38.5" r="9.5" fill="${NAVY}"/>
    <circle cx="31" cy="38.5" r="6" fill="url(#b)"/>
    <circle cx="28.6" cy="36" r="1.9" fill="#fff" opacity=".85"/>
  </g>
  <g class="a-pop" style="--i:1">
    <circle cx="52" cy="13" r="8" fill="url(#t)" stroke="#fff" stroke-width="2.2"/>
    <path d="M52 9v8M48 13h8" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
  </g>`),
  }
}
