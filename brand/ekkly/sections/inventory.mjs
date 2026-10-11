// The Inventory app (src/apps/inventory): its own drawing, `inventory`, and its
// rooms, named `inventory-<section>`. Drawn beside the app rather than in
// make-app-icons.mjs, which hands each file here its kit and keeps whatever
// it returns. The app is sold like the others; its rooms are not.
//
// The app is a box opened, its flaps up and a tag coming out of it: what the
// church keeps, labelled. Each room keeps something of that — the box, or its
// tag.

export default ({ svg, splitTile, person, check, B3, LINE, NAVY }) => {
  // A small box seen from the front, its lid a shade deeper. `fill` is the
  // gradient's id. Used on the shelves and wherever a thing has to be shown.
  const box = (x, y, w, h, fill) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.18}" fill="url(#${fill})"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.18}" fill="url(#shine)"/>
    <rect x="${x + w * 0.38}" y="${y}" width="${w * 0.24}" height="${h * 0.45}" fill="#fff" opacity=".55"/>`

  return {
    // The box, open: its flaps up, the inside dark, a label on its front with
    // two lines writing themselves, and a price-tag-shaped label popping up
    // out of it — the thing in the box, written down.
    inventory: svg(`
  <path d="M14 27L19.5 17.5H44.5L50 27Z" fill="${NAVY}"/>
  <g class="a-pop" style="--i:1">
    <path d="M24.5 23V11.5L32.25 4l7.75 7.5V23z" fill="#fff" stroke="#DCE3EE" stroke-width="1.6" stroke-linejoin="round"/>
    <circle cx="32.25" cy="11" r="2.2" fill="url(#o)"/>
    <rect x="28" y="16.5" width="8.5" height="2.6" rx="1.3" fill="${LINE}"/>
  </g>
  <path d="M8 27L2.5 15.5L20 13L25 27Z" fill="url(#o)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M56 27L61.5 15.5L44 13L39 27Z" fill="url(#t)" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/>
  ${splitTile(7, 25, 50, 34, 6, 'c')}
  <rect x="18" y="35" width="28" height="15" rx="3" fill="#fff"/>
  <rect class="a-line" style="--i:2" x="22" y="39.5" width="16" height="3" rx="1.5" fill="${LINE}"/>
  <rect class="a-line" style="--i:3" x="22" y="44.5" width="11" height="2.6" rx="1.3" fill="#DCE3EE"/>`),

    // All items: the storeroom's shelves, a box of each colour arriving on
    // them one after another.
    'inventory-all': svg(`
  ${splitTile(4, 4, 56, 56, 10, 'c')}
  <rect x="9.5" y="9.5" width="45" height="45" rx="5" fill="#fff"/>
  <rect x="9.5" y="30" width="45" height="2.6" fill="#DCE3EE"/>
  <rect x="9.5" y="51.5" width="45" height="3" fill="#DCE3EE"/>
  <g class="a-pop" style="--i:0">${box(14, 16, 13, 14, 'o')}</g>
  <g class="a-pop" style="--i:1">${box(30, 20, 10, 10, 't')}</g>
  <g class="a-pop" style="--i:2">${box(14, 41, 10, 10.5, 'b')}</g>
  <g class="a-pop" style="--i:3">${box(27, 36, 15, 15.5, 'o')}</g>
  <g class="a-pop" style="--i:4">${box(44, 43, 7, 8.5, 't')}</g>`),

    // Borrowed: a box going out to somebody, the arrow drawing itself from
    // the shelf to them.
    'inventory-borrowed': svg(`
  <g class="a-pop" style="--i:0">${box(4, 32, 24, 24, 'o')}</g>
  <path class="a-draw" style="--i:1" pathLength="1" d="M15 27C17 12 34 7 43 15" fill="none" stroke="url(#b)" stroke-width="4" stroke-linecap="round"/>
  <path class="a-pop" style="--i:2" d="M38.5 9.5l7.5 3.8-3.6 7.4" fill="none" stroke="${B3}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <g class="a-pop" style="--i:3">${person(47, 33, 6.5, 22, 58, 'url(#t)')}</g>`),

    // Needs repair: the box with a crack across its label, and the wrench
    // laid over it.
    'inventory-repair': svg(`
  ${splitTile(4, 16, 46, 42, 8, 'c')}
  <rect x="10" y="26" width="34" height="22" rx="3" fill="#fff"/>
  <path class="a-draw" style="--i:0" pathLength="1" d="M15 31l6 5-3 4 7 4" fill="none" stroke="${LINE}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
  <mask id="wrench" maskUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">
    <rect width="64" height="64" fill="#fff"/>
    <rect x="41" y="2" width="6" height="11" rx="1.5" fill="#000" transform="rotate(45 44 22)"/>
  </mask>
  <g class="a-pop" style="--i:1">
    <g mask="url(#wrench)">
      <g transform="rotate(45 44 22)" stroke="#fff" stroke-width="2.4" paint-order="stroke">
        <circle cx="44" cy="12" r="9.5" fill="url(#o)"/>
        <rect x="40.5" y="18" width="7" height="34" rx="3.5" fill="url(#o)"/>
      </g>
      <g transform="rotate(45 44 22)">
        <circle cx="44" cy="12" r="9.5" fill="url(#o)"/>
        <rect x="40.5" y="18" width="7" height="34" rx="3.5" fill="url(#o)"/>
        <rect x="40.5" y="18" width="7" height="34" rx="3.5" fill="url(#shine)"/>
      </g>
    </g>
  </g>`),

    // Places: where things are kept — a room's plan, its shelves as cells,
    // and the pin dropping onto one of them.
    'inventory-places': svg(`
  ${splitTile(4, 14, 56, 44, 9, 'c')}
  <rect x="9.5" y="19.5" width="45" height="33" rx="4.5" fill="#fff"/>
  <rect class="a-cell" style="--i:0" x="13.5" y="23.5" width="16" height="9" rx="2" fill="#DCE3EE"/>
  <rect class="a-cell" style="--i:1" x="13.5" y="36" width="16" height="12.5" rx="2" fill="#DCE3EE"/>
  <rect class="a-cell" style="--i:2" x="33.5" y="36" width="17" height="12.5" rx="2" fill="url(#t)" opacity=".35"/>
  <g class="a-pop" style="--i:3">
    <path d="M42 41.5c-6.5-7.2-10-12.4-10-17a10 10 0 0 1 20 0c0 4.6-3.5 9.8-10 17z" fill="url(#o)" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
    <circle cx="42" cy="24.5" r="3.8" fill="#fff"/>
  </g>`),

    // To photograph: the camera, a box in its lens, and the tick once it is
    // taken.
    'inventory-photos': svg(`
  <rect x="17" y="11" width="16" height="9" rx="3" fill="${B3}"/>
  ${splitTile(4, 16, 56, 40, 9, 'c')}
  <circle cx="30" cy="36" r="13" fill="#fff"/>
  <circle cx="30" cy="36" r="9.5" fill="#DCE3EE"/>
  <g class="a-pop" style="--i:0">${box(24.5, 30.5, 11, 11, 'o')}</g>
  <circle cx="50.5" cy="24" r="2.6" fill="#fff" opacity=".9"/>
  <g class="a-pop" style="--i:1">
    <circle cx="51" cy="48" r="9" fill="url(#t)" stroke="#fff" stroke-width="2.2"/>
    ${check(46.6, 44.2, 8.4, '#fff', 2.4, 2)}
  </g>`),
  }
}
