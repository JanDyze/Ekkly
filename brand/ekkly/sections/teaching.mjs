// The Teaching app (src/apps/teaching) and its sections, named `teaching` and
// `teaching-<section>`, drawn with the same kit as the other apps
// (brand/ekkly/make-app-icons.mjs).
//
// Teaching is what is prepared ahead and taught: so the app is a board on an
// easel with its lesson writing itself up, and a teacher in front of it. Each
// room then keeps something of a classroom — the preacher's notes on the
// lectern, a child's crayon drawing, the binder of plans, the calendar with
// the week's lesson on it — so the five never read as one drawing five times.
// Schedules' preaching room is an open Bible; the sermons here are notes on a
// lectern, so the two are never mistaken for each other.

export default ({ svg, splitTile, person, gapMask, check, O1, O3, B2, LINE }) => {
  // A small open book, the two pages blue and orange, for a lesson on a page.
  const book = (x, y, w) => {
    const s = w / 30
    const p = (px, py) => `${(x + px * s).toFixed(2)} ${(y + py * s).toFixed(2)}`
    return `
    <path d="M${p(0, 2)}c${5 * s} ${-2.5 * s} ${10 * s} ${-2 * s} ${15 * s} ${1.5 * s}v${17 * s}c${-5 * s} ${-3.5 * s} ${-10 * s} ${-4 * s} ${-15 * s} ${-1.5 * s}z" fill="url(#b)"/>
    <path d="M${p(30, 2)}c${-5 * s} ${-2.5 * s} ${-10 * s} ${-2 * s} ${-15 * s} ${1.5 * s}v${17 * s}c${5 * s} ${-3.5 * s} ${10 * s} ${-4 * s} ${15 * s} ${-1.5 * s}z" fill="url(#o)"/>`
  }

  return {
    // The app: a board on its easel, the lesson writing itself up on it, and
    // the teacher stepping in front of it. The board is the two tones of every
    // tile; the legs are blue rather than navy, which would vanish on a dark
    // page.
    teaching: svg(`
  ${gapMask('teacher', person(15, 36, 5.6, 19, 62, '#000'))}
  <g mask="url(#teacher)">
    <path d="M24 46L17 60M44 46L51 60M34 46V60" stroke="${B2}" stroke-width="3.6" stroke-linecap="round"/>
    ${splitTile(10, 4, 50, 42, 8, 'c')}
    <rect x="15" y="9" width="40" height="32" rx="4" fill="#fff"/>
    <rect class="a-line" style="--i:0" x="20" y="15" width="22" height="3.6" rx="1.8" fill="${LINE}"/>
    <rect class="a-line" style="--i:1" x="20" y="22.5" width="28" height="3.6" rx="1.8" fill="${LINE}"/>
    <rect class="a-line" style="--i:2" x="20" y="30" width="16" height="3.6" rx="1.8" fill="${LINE}"/>
    ${check(40, 27, 9, B2, 2.8, 3)}
  </g>
  <g class="a-pop" style="--i:1">${person(15, 36, 5.6, 19, 62, 'url(#o)')}</g>`),

    // Sermons: the preacher's notes on the lectern, their lines coming up one
    // by one.
    'teaching-sermons': svg(`
  <path d="M22 34h20l-3 26H25z" fill="url(#b)"/>
  <path d="M22 34h20l-3 26H25z" fill="url(#shine)"/>
  <rect x="17" y="57" width="30" height="5" rx="2.5" fill="url(#t)"/>
  <path d="M6 22h52l-6 14H12z" fill="url(#o)"/>
  <path d="M6 22h52l-6 14H12z" fill="url(#shine)"/>
  <g class="a-pop" style="--i:0">
    <rect x="15" y="4" width="34" height="24" rx="3" fill="#fff" stroke="#DCE3EE" stroke-width="1.4" transform="rotate(-4 32 16)"/>
  </g>
  <g transform="rotate(-4 32 16)">
    <rect class="a-line" style="--i:1" x="20" y="9" width="18" height="3.2" rx="1.6" fill="${LINE}"/>
    <rect class="a-line" style="--i:2" x="20" y="15" width="24" height="3.2" rx="1.6" fill="${LINE}"/>
    <rect class="a-line" style="--i:3" x="20" y="21" width="13" height="3.2" rx="1.6" fill="${O3}"/>
  </g>`),

    // Sunday school: a child's drawing — a heart in crayon and a little sun on
    // the paper — and the crayon still lying across it.
    'teaching-school': svg(`
  ${splitTile(4, 6, 50, 48, 10, 'c')}
  <rect x="9.5" y="12" width="39" height="36" rx="4" fill="#fff"/>
  <path class="a-draw" style="--i:0" pathLength="1" d="M29 41c-7-4.6-12-8.5-12-13.6a6 6 0 0 1 12-1.4a6 6 0 0 1 12 1.4c0 5.1-5 9-12 13.6z" fill="none" stroke="${O3}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle class="a-pop" style="--i:1" cx="17" cy="19" r="3.2" fill="${O1}"/>
  <g class="a-pop" style="--i:2">
    <g transform="rotate(-40 47 47)">
      <rect x="40" y="33" width="9" height="26" rx="2" fill="url(#b)" stroke="#fff" stroke-width="2.2" paint-order="stroke"/>
      <path d="M40 33l4.5-7 4.5 7z" fill="${B2}" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" paint-order="stroke"/>
      <rect x="40" y="39" width="9" height="3" fill="#fff" opacity=".7"/>
      <rect x="40" y="50" width="9" height="3" fill="#fff" opacity=".7"/>
    </g>
  </g>`),

    // Lesson plans: the binder they are kept in, a coloured tab for each
    // series down its edge, and the top plan ticked off as it is planned.
    'teaching-plans': svg(`
  <rect class="a-pop" style="--i:0" x="47" y="12" width="11" height="10" rx="3" fill="url(#o)"/>
  <rect class="a-pop" style="--i:1" x="47" y="25" width="11" height="10" rx="3" fill="url(#t)"/>
  <rect class="a-pop" style="--i:2" x="47" y="38" width="11" height="10" rx="3" fill="${O1}"/>
  ${splitTile(4, 5, 48, 54, 9, 'c')}
  <rect x="13" y="10" width="34" height="44" rx="4" fill="#fff"/>
  ${[16, 28, 40].map((y) => `<circle cx="9" cy="${y}" r="2.6" fill="#fff"/>`).join('')}
  ${check(17, 15, 7, B2, 2.4, 0)}
  <rect class="a-line" style="--i:1" x="27" y="17" width="15" height="3.4" rx="1.7" fill="${LINE}"/>
  ${check(17, 26, 7, B2, 2.4, 2)}
  <rect class="a-line" style="--i:3" x="27" y="28" width="12" height="3.4" rx="1.7" fill="${LINE}"/>
  <rect x="17.4" y="38" width="6" height="6" rx="1.6" fill="none" stroke="${LINE}" stroke-width="1.8"/>
  <rect class="a-line" style="--i:4" x="27" y="39.3" width="14" height="3.4" rx="1.7" fill="${LINE}"/>`),

    // What's taught: the calendar page for the coming Sunday, with the week's
    // lesson — an open book — set down on it.
    'teaching-calendar': svg(`
  ${splitTile(5, 11, 54, 47, 10, 'c')}
  <rect x="10.5" y="24" width="43" height="28.5" rx="4.5" fill="#fff"/>
  <rect class="a-line" style="--i:0" x="15" y="29" width="11" height="3.4" rx="1.7" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="15" y="36" width="8" height="3.4" rx="1.7" fill="${LINE}"/>
  <g class="a-pop" style="--i:2">${book(26, 30, 24)}</g>
  <rect x="17" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>
  <rect x="41.5" y="5" width="5.5" height="12" rx="2.75" fill="${O3}" stroke="#fff" stroke-width="1.5"/>`),
  }
}
