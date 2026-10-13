// Pictures for the home's Today cards (src/views/Apps.vue), named
// `today-<kind>`: for a card about something with no face or photo of its own
// — a list of tasks, a gathering nobody counted, Sunday's songs — so it is
// drawn as what it is about, in Ekkly's colours, rather than as a plain icon.
// Drawn beside the apps rather than in make-app-icons.mjs, which hands each
// file here its kit and keeps whatever it returns.
//
// Each is a white card (or the clipboard a count is kept on) for the thing
// itself, with a round badge on its corner that says what about it needs
// you: a clock for something late or due, a question for something not yet
// chosen, a person for a head count, a key for an account to link.

export default ({ svg, splitTile, person, check, O3, LINE, NAVY }) => {
  // A quaver, as the Songs app draws it, with a white edge where it overlaps.
  const note = (x, y, s, fill) => `
    <g stroke="#fff" stroke-width="${2.2 / s}" stroke-linejoin="round" paint-order="stroke" transform="translate(${x} ${y}) scale(${s})">
      <ellipse cx="0" cy="0" rx="6.2" ry="5" transform="rotate(-20)" fill="${fill}"/>
      <rect x="3.6" y="-15.5" width="3.2" height="16" rx="1.2" fill="${fill}" stroke="none"/>
      <path d="M5.2 -15.5l7 3.2v4.6l-7-3z" fill="${fill}" stroke="none"/>
    </g>`

  // The round badge on a card's corner, ringed in white so it stands off it.
  const badge = (fill, inside, i = 2) => `
  <g class="a-pop" style="--i:${i}">
    <circle cx="46" cy="46" r="12" fill="${fill}" stroke="#fff" stroke-width="2.4"/>
    <circle cx="46" cy="46" r="12" fill="url(#shine)"/>
    ${inside}
  </g>`

  // A clock's face and hands, for the badge.
  const clock = `
    <circle cx="46" cy="46" r="7.6" fill="#fff"/>
    <path d="M46 41.6V46l3.2 2" fill="none" stroke="${NAVY}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`

  // A checklist on a white card: boxes and the grey lines of their names,
  // `done` of them ticked.
  const checklist = (done) => `
  ${splitTile(4, 4, 46, 50, 10, 'c')}
  <rect x="9" y="10" width="36" height="38" rx="4.5" fill="#fff"/>
  ${[0, 1, 2]
    .map(
      (i) => `
  <rect x="14" y="${16 + i * 10}" width="7" height="7" rx="2" fill="${i < done ? 'url(#b)' : '#fff'}" stroke="${i < done ? 'none' : '#C9D3E2'}" stroke-width="1.6"/>
  ${i < done ? check(15.2, 17.4 + i * 10, 4.6, '#fff', 1.8, i) : ''}
  <rect class="a-line" style="--i:${i}" x="25" y="${17.8 + i * 10}" width="${[15, 12, 9][i]}" height="3.4" rx="1.7" fill="${LINE}"/>`
    )
    .join('')}`

  return {
    // Sunday's songs not chosen yet: the song sheet, its rows still empty,
    // and a question on its corner.
    'today-songs': svg(`
  ${splitTile(4, 4, 46, 50, 10, 'c')}
  <rect x="9" y="10" width="36" height="38" rx="4.5" fill="#fff"/>
  ${note(16, 22, 0.62, 'url(#b)')}
  <rect class="a-line" style="--i:0" x="24" y="15.5" width="15" height="3.4" rx="1.7" fill="${LINE}"/>
  <rect x="14" y="29" width="25" height="3.4" rx="1.7" fill="#DCE3EE"/>
  <rect x="14" y="36" width="18" height="3.4" rx="1.7" fill="#DCE3EE"/>
  ${badge('url(#o)', `
    <path d="M42.6 42.6a3.5 3.5 0 1 1 5 3.2c-1.1.5-1.6 1.2-1.6 2.4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="46" cy="52.2" r="1.7" fill="#fff"/>`)}`),

    // Tasks overdue: the list, nothing ticked, and a red alarm clock ringing.
    'today-overdue': svg(`
  ${checklist(0)}
  ${badge(O3, `
    <circle cx="38.6" cy="35.4" r="3.2" fill="${O3}" stroke="#fff" stroke-width="1.6"/>
    <circle cx="53.4" cy="35.4" r="3.2" fill="${O3}" stroke="#fff" stroke-width="1.6"/>
    ${clock}`)}`),

    // Tasks due today: the list, one already ticked, and a blue clock.
    'today-due': svg(`
  ${checklist(1)}
  ${badge('url(#b)', clock)}`),

    // Gatherings still to count: the clipboard the count is kept on, its
    // tally begun, and a person on its corner for the heads not yet counted.
    'today-count': svg(`
  <rect x="7" y="9" width="40" height="47" rx="6" fill="url(#b)"/>
  <rect x="7" y="9" width="40" height="47" rx="6" fill="url(#shine)"/>
  <rect x="11.5" y="14" width="31" height="37" rx="3.5" fill="#fff"/>
  <rect x="19" y="5.5" width="16" height="8" rx="3" fill="url(#o)" stroke="#fff" stroke-width="1.6"/>
  <g class="a-pop" style="--i:0" stroke="${NAVY}" stroke-width="2.2" stroke-linecap="round">
    <path d="M17 21v11M21.5 21v11M26 21v11M30.5 21v11"/>
    <path d="M15 30.5l18-7.5" stroke="url(#o)"/>
  </g>
  <rect class="a-line" style="--i:1" x="16" y="38" width="20" height="3.4" rx="1.7" fill="${LINE}"/>
  ${badge('url(#t)', person(46, 42.5, 3.1, 11, 52.5, '#fff'))}`),

    // Accounts to link: the record on the roll someone says is theirs, and
    // the key that would let them in.
    'today-claims': svg(`
  ${splitTile(4, 4, 46, 50, 10, 'c')}
  <rect x="9" y="10" width="36" height="38" rx="4.5" fill="#fff"/>
  <circle cx="20" cy="22" r="6" fill="url(#b)"/>
  <path d="M11.5 38c0-5.6 3.8-9.4 8.5-9.4s8.5 3.8 8.5 9.4z" fill="url(#b)"/>
  <rect class="a-line" style="--i:0" x="31" y="18" width="10" height="3.4" rx="1.7" fill="${LINE}"/>
  <rect class="a-line" style="--i:1" x="31" y="25" width="7" height="3.4" rx="1.7" fill="#DCE3EE"/>
  ${badge('url(#o)', `
    <circle cx="42.6" cy="44.4" r="3.4" fill="none" stroke="#fff" stroke-width="2.4"/>
    <path d="M45.2 46.6l6.2 5.2M49.2 50.1l-1.8 2.1M51.4 51.8l-1.6 1.9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`)}`),
  }
}
