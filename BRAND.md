# Brand

What is Ekkly's own, as opposed to what belongs to the church using it.

[DESIGN.md](DESIGN.md) says how a page is built. This says what it should look
like it came from. When the two disagree, DESIGN.md wins on layout and this
wins on identity.

## The rule everything else follows

Ekkly is sold to many churches, and each one re-colours the app it rents. So
almost nothing in the product is allowed to be Ekkly's colour — `primary` is
whatever a church chose that morning. Identity therefore lives in the things a
church **doesn't** get to change: the mark, the wordmark, the shape of a
window, the app artwork, and the way the app talks.

| Surface | Whose identity |
|---|---|
| A signed-in page, any church | **The church's.** Tokens only. Ekkly is the structure, not the colour |
| The front door (`PlatformHome`, `/pricing`, `/start`, `/privacy`, `/terms`) | **Ekkly's**, coloured by the platform's accent token |
| The mark, the wordmark, the boot screen, the app artwork, the favicon | **Ekkly's**, fixed, never re-coloured |

A church's colours beat the platform's, which beat the built-in ones
([TENANCY.md](TENANCY.md)). That cascade is for *tokens*. The mark is not a
token and does not take part in it.

## The mark

[public/ekkly-mark.svg](public/ekkly-mark.svg), traced from
[brand/ekkly-logo.png](brand/ekkly-logo.png).

Four panes of glass. The cross between them is not drawn — it is the ground
showing through, and it is a *curved* cross: the top panes' lower edges sweep
up to meet the upright, the bottom panes rise in a gentle arch, so the crossbar
is a hairline at the sides and opens wide where it meets the centre. The
outline is an arched window: half-round on top, square-shouldered below.

It is a window and a cross at once. That is the whole idea, and it is why the
window is the motif rather than, say, a building or a steeple.

- Never recolour it, never put it in a single flat colour, never outline it.
- On a coloured ground it goes on a white tile (`chip` on `PlatformLogo`) —
  two of its four panes disappear against blue otherwise.
- It appears at: the favicon, the boot screen ([index.html](index.html), panes
  lighting 0.12s apart), `PlatformLogo`, and the hero chip for a church's own
  link. A church's own logo replaces it the moment one loads.

## The wordmark

[PlatformLogo.vue](src/components/common/PlatformLogo.vue) — mark, then the
name, `gap-2.5`.

| | |
|---|---|
| Face | Poppins 500, loaded in [index.html](index.html) |
| Fallback | `'Avenir Next', Avenir, 'Segoe UI', system-ui, sans-serif` |
| Tracking | `-0.02em` |
| Colour | `#0f1c4d` on light, white on dark; white on a coloured ground (`tone="light"`) |

The name is `branding.name` from the console, not a literal — a platform rename
carries everywhere. Don't hardcode "Ekkly" in a UI string; use
`usePlatformConfig().branding.name`.

## Colour

### Ekkly's four

The mark's panes, clockwise from top-left. These are the only fixed colours in
the product.

| | Hex | Pane |
|---|---|---|
| Amber | `#fdc24b` | top-left |
| Orange | `#f19140` | top-right |
| Cyan | `#09a4c6` | bottom-right |
| Blue | `#0270dc` | bottom-left |

Warm above, cool below. That relationship is the palette — not the four values
in isolation. If you spend the palette anywhere, spend it as warm-over-cool.

Do **not** mix these out of `primary` to make them follow a re-colour. It was
tried: an accent and a fixed hue interpolate through whatever lies between
them, and a teal platform produced sage green. They stay fixed, the way the
mark stays fixed.

### The accent (a customer's, not Ekkly's)

Tokens in [src/style.css](src/style.css), rewritten at runtime by
[useBrandTheme.js](src/composables/useBrandTheme.js).

| Token | Built-in default |
|---|---|
| `primary` | `#1d64d8` |
| `primary-light` | `#5b9dff` (and `primary` on a dark page) |
| `primary-hover` | `#174fae` (derived: `primary` mixed 78% toward black; 82% toward white in dark) |

Never a hex in a class. Scoped CSS uses `var(--color-primary)`. See
[DESIGN.md → Colour](DESIGN.md#colour) for the light/dark table, tints, red and
amber.

### The app artwork's palette

[brand/ekkly/make-app-icons.mjs](brand/ekkly/make-app-icons.mjs) draws the 20
icons in [src/assets/app-icons/](src/assets/app-icons/) from a fixed ramp:
orange `#FFB21E → #FF7417 → #EC4319`, blue `#3D9DFF → #1467E8 → #0A4FC4`, teal
`#2BD4C0 → #0B93AB`, card lines `#8E9CB3`, navy `#0B2A6B`. Glossy two-tone
shapes split on a diagonal, white cards inside, 64×64, transparent.

Fourteen are the apps a church can buy, and the front door shows those. The
other six — dashboard, presentation, todos, accounts, audit, settings — are
pages rather than apps, drawn so the church's sidebar can wear artwork the
whole way down ([src/data/navigation.js](src/data/navigation.js)).

Edit the generator and re-run it. Never hand-edit an icon in
`src/assets/app-icons/`.

## Type

| Use | Face |
|---|---|
| Everything, by default | `system-ui, Avenir, Helvetica, Arial, sans-serif` ([src/style.css](src/style.css)) |
| Everything, where one was chosen | The platform's or the church's pick from `BRAND_FONTS` ([lib/platformDefaults.js](lib/platformDefaults.js)) |
| The wordmark only | Poppins 500 |
| Discipleship stage names only | Silkscreen, via `.font-pixel` |

The face is a brand setting, not a constant: the console sets what every church
starts with, and a church can choose its own in Settings → Colours and type.
The list is short and fixed — seven faces that hold up at row-title size on a
phone — so no choice can make the app unreadable. The wordmark stays Poppins
whatever a church picks; it is the mark, not the page.

Ekkly buys no display face for headings. A heading is the app's sans at weight
and size — `font-black` on the front door, `font-semibold` in the app. Scales:
[type.js](src/components/frontdoor/type.js) for the front door,
[DESIGN.md → Type and icons](DESIGN.md#type-and-icons) for the app.

Silkscreen exists because a church's own discipleship poster sets those stage
names in 8-bit type. It is not a brand face — don't reach for it.

## Icons

Phosphor, line weight, imported from the generated
[src/icons](src/icons/index.js) (`import { Bell } from '../icons'`, then
`npm run build:icons`). Append `Fill` for solid. Never import an icon library
directly.

An icon says what a thing *does*. Nothing wears a sparkle or a wand to mean
"this part is clever" — EKRIS writes minutes up, so it wears a pencil, and it
answers questions, so it wears a speech bubble.

## Shape and motion

- **The window is the motif.** The arch is the mark's own outline. The front
  door's last call opens out of one (`.arch-frame` / `.arch-window` in
  [PlatformHome.vue](src/views/PlatformHome.vue)). Anything decorative has to
  earn its place by being a church's — the window, the mark, the app artwork.
- **Radii:** `rounded-lg` for buttons, cards and inputs in the app;
  `rounded-xl` for the front door's tall calls to action; `rounded-full` only
  for pills, avatars and the FAB.
- **Motion shows something happening.** Nothing idles: no breathing, no
  bobbing, no button that lifts or grows under the pointer. Everything has a
  finished state for `prefers-reduced-motion`.

## Voice

Plain, warm and specific — written for a church volunteer, not a developer.

- Sentence case for headings, buttons and messages. Title Case only for page
  names in navigation.
- Errors say what failed and what to do: "Could not add that task. Please try
  again." Never "Failed to…" or "An error occurred".
- Confirmations name the thing: `Delete "Youth camp"?`, never "Are you sure?".
- Say **link**, not address, for a church's `<id>.<domain>` — to most people an
  address is a street.
- A CHANGELOG entry is written for the church, not for developers.

## What Ekkly is not

The front door deliberately refuses the standard SaaS look, because those
effects are what every product's home page is made of and a church can tell.
None of the following, anywhere:

blurred circles of colour behind a hero · a dot grid · light that follows the
pointer · a badge-shaped chip above a headline · a gradient clipped to a word ·
frosted panels · a coloured halo under a button · a sheen crossing one · a
section that fades and rises into view on scroll · a sparkle or wand icon
meaning "AI".

A call to action is the flat accent at the radius above. A heading is ink.

## Files

| | |
|---|---|
| [public/ekkly-mark.svg](public/ekkly-mark.svg) | The mark |
| [public/ekkly-mark-round.svg](public/ekkly-mark-round.svg) | The mark as a round window, for the app's bottom bar only. Keep its panes in step with the arch |
| [brand/ekkly-logo.png](brand/ekkly-logo.png) | What it was traced from |
| [brand/ekkly/make-app-icons.mjs](brand/ekkly/make-app-icons.mjs) | Draws the app artwork |
| [brand/ekkly/build-qr.mjs](brand/ekkly/build-qr.mjs) | The branded QR card in [public/brand-qr/](public/brand-qr/) |
| [brand/uec/](brand/uec/) | The original UEC identity, kept as history — not Ekkly's |
| [src/assets/hero-bg-light.webp](src/assets/hero-bg-light.webp), [hero-bg-dark.webp](src/assets/hero-bg-dark.webp) | The front door's window, one per theme. Each levelled so its wall is the page's ground |
| [src/assets/app-icons/](src/assets/app-icons/) | Generated. Don't hand-edit |
| [src/icons/index.js](src/icons/index.js) | Generated. Don't hand-edit |
