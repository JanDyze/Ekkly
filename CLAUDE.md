# Ekkly

A church management app sold to many churches from one deployment. Each church
has its own address (`<id>.<root domain>`) and its own records under
`churches/{id}/` in Firestore. It started as the UEC church app at v0.22.0;
CHANGELOG.md has the history.

**What it is for:** a tool that takes the redundant, messy work off a
church — the lists kept twice, the spreadsheets, the notes nobody can find —
so its people have more time for the ministry itself. Ekkly is itself a
ministry, built to glorify God and exalt Jesus by freeing a church's people
to share the gospel, make disciples and worship. It is never a
replacement for a person's job or a ministry: it does not shepherd, pray,
preach, welcome or decide. Nothing it says, and no card it shows, should
suggest otherwise (BRAND.md, "What Ekkly is for").

**Stack:** Vue 3 (`<script setup>`), Vite 7, Tailwind CSS 4, vue-router 4,
Firebase (Auth + Firestore), Vercel (static app + serverless routes in `api/`),
installable PWA.

## Commands

- `npm run dev` runs the app, and serves most `api/` routes itself
  (`DEV_API_ROUTES` in `vite.config.js`, `/api/platform` included; never
  `/api/notify` or `/api/email`). On localhost, add `?church=<id>` to pick a
  church.
- **Try things against the emulators, not the live project.** `npm run
  emulators` (Firebase's auth and Firestore emulators; needs Java 21 or
  later), then `npm run seed:emulator` once (a whole sample church, "sample",
  with a test account per ministry, password `test1234`), then `npm run
  dev:emulator` and `/login?church=sample`. The emulators enforce
  `firestore.rules`. `npm run dev` reads the live project, whose daily reads
  are shared by every church: opening every screen as every role there once
  spent a day's reads in an hour and stopped every church's app until
  midnight Pacific.
- `npm run dev:all` does not work and is not needed: `server.js` is a
  leftover from the church app, saved as UTF-16 so Node cannot read it, and
  nothing calls it.
- `npm run build` regenerates icons, then builds. There are no tests and no
  linter, so a clean build is the check. Run it before saying a change works.
- `/commit` and `/deploy` are project skills. Use them instead of committing,
  versioning or deploying by hand.
- `node scripts/tickets.mjs` lists every church's open bugs and ideas, each
  with the page it was sent from (Alt+T on any page sends one, as
  `useQuickTicket`). `show <id>`, `set <id> kind=… where=… status=…` and
  `answer <id> "…"` read, re-file and answer one; the header says more.
- `node scripts/seed-test-accounts.mjs --church <id> --write` makes an
  email-and-password account for every ministry with permissions, plus an
  administrator, a plain member and an outsider (`<key>@<id>.test`), each
  with a task of its own. Sign in with them from the folded "Sign in with a
  test account" link under the Google button, which shows only under
  `npm run dev` (or a build with `VITE_TEST_SIGN_IN=true`); Email/Password
  must be on in Firebase. `--remove --write` takes them all out.
- `node scripts/seed-mock-data.mjs --church <id> --write` fills every app
  with marked mock records (people, events, songs, prayer, minutes, a year
  of the books, inventory, small groups, teaching, follow-up, join
  requests); `--remove --write` takes out exactly those. Run
  `seed-lineups.mjs` after it for rosters.
- `/ad`, `/ad-plan` and `/ad-results` make, plan and learn from the Facebook
  and Instagram ads in `marketing/`. Ads never bump the app version.

## Read first

| Working on | Read |
|---|---|
| Any page, component, or visual change | [DESIGN.md](DESIGN.md) |
| Anything Ekkly's own: the mark, colours, type, artwork, voice | [BRAND.md](BRAND.md) |
| Churches, addresses, access, data layout, the platform console, apps & billing | [TENANCY.md](TENANCY.md) |
| Routes in `api/` | [ENDPOINTS.md](ENDPOINTS.md) |
| The Claude connector (`api/mcp.js`, `lib/mcp/`) | [MCP.md](MCP.md) |
| Ads and posts for the Facebook page and Instagram | [marketing/CLAUDE.md](marketing/CLAUDE.md) |

## Rules the code depends on

- **Firestore goes through `src/api/firestore.js`.** It places every path
  inside the current church and commits an audit entry with every write.
  `vite.config.js` fails the build if any other file imports
  `firebase/firestore`. Server code scopes through `lib/tenant.js`.
- **Data flows view → composable → service.**
  `src/api/<thing>Service.js` normalises documents and does the writes;
  `src/composables/use<Things>.js` holds one shared, ref-counted live listener
  (see `useTasks.js`). Views never touch Firestore.
- **Navigation has one source: `src/data/navigation.js`.** The home of all
  apps (`/home`, `src/views/Apps.vue`) and its All apps page (`/apps`) lay their
  tiles out from it, and the top bar names the app you are in from it. There is no sidebar:
  every app is a screen of its own and the home is the way between them, the
  top bar's mark leading back to it. (On a desktop the home lays its own
  tiles down its left side; that column is the home's, not a sidebar on
  every page.) A bottom bar (`src/components/BottomBar.vue`)
  shows on phones only for whoever turns it on in Preferences (`useBottomBar`):
  the first four apps on their home either side of Ekkly's round mark, which
  opens the All apps page. Simple view (Preferences, `useSimpleView`) is the
  one place with a sidebar, as most systems have: `SimpleSidebar` lists every
  app from this same list, and the open app's sections under it. Don't add
  links anywhere else. The one
  exception is a page marked `account: true` (Settings): it is not an app, so
  the app lists leave it out and it opens from the avatar's drawer instead.
- **Access is by capability.** Capabilities are `<area>.view` and
  `<area>.manage`, and the areas are listed in `lib/capabilities.js`. A route
  sets `meta.capability` (or `meta.adminOnly`). A screen of someone's own
  things sets `meta.mine` and opens without the app's capability ("My
  tasks": being given a task is reason enough to see it). A component hides what
  `usePermissions().canManage(area)` refuses rather than disabling it.
  The database rules enforce the same capabilities, read from `caps` on the
  account's access document (`lib/caps.js`; TENANCY.md, "Roles are enforced
  by the database too"). A new collection that holds anything sensitive gets
  a `match` of its own in `firestore.rules` and is added to the catch-all's
  exclusions; a service write that changes what someone may see calls
  `syncCapabilities()`. Contact details go through `lib/memberPrivate.js`.
- **Icons come from `src/icons`, which is generated.** Import any Phosphor name
  (`import { Bell } from '../icons'`) and run `npm run build:icons`. Append
  `Fill` for the solid weight. Don't edit `src/icons/index.js` or import an
  icon library (`@heroicons/vue` is installed but unused).
- **Schedules is planned by teams** (`src/data/scheduleTeams.js`): every role
  belongs to Worship, Preaching, Ushers or Welcome, and each team's planners
  (`worship.manage`, `preaching.manage`, `ushers.manage`,
  `consolidation.manage`) change only their part of a Sunday. A team's save
  goes through `mergeTeamEdit` onto the live Sunday, never a stale copy.
  Those areas belong to the lineups app through `app` in
  `lib/capabilities.js`; a new sub-area does the same rather than becoming an
  app of its own.
- **Every page belongs to an app** that a church can switch off
  (`lib/apps.js`). A capability's area is its app, so `can()` covers most
  pages. A page with no capability names its app with `app:` on its nav item
  and `meta.app` on its route. Claude connector tools list their app in
  `TOOL_APPS` in `lib/mcp/tools.js`.
- **Platform writes go through `/api/platform` actions** (`lib/platform/*.js`),
  each logged to `platformLog`. The browser never writes `platform`,
  `subscription`, `payments` or `usage`.
- **`api/` is full.** It holds 12 functions, Vercel Hobby's limit. Add an
  action to an existing route instead of a new file.
- **Colours and the typeface are tokens:** `primary`, `primary-hover`,
  `primary-light`, and the root font. Never put hex values in classes, and
  never name a face outside `BRAND_FONTS` (`lib/platformDefaults.js`). The
  platform and each church can change what the tokens are (`useBrandTheme`),
  so a hard-coded value is one that won't follow.
- **Bible translations ship as files where they can.** Each out-of-copyright
  one is a folder of 66 JSON files under `public/bible/<id>/`, and
  `src/data/bibleBooks.js` is generated from whatever is installed — neither
  is edited by hand. Add one with `node scripts/fetch-bible.mjs <id>`; the
  Tagalog comes from a scrape through `scripts/sync-bible.mjs`.
- **A licensed translation is a different thing** (`lib/bibleRemote.js`). The
  ESV and NIV may not be stored, so they are fetched a chapter at a time
  through the `scripture` action on `/api/song-lookup`, appear only where
  their key is set, and give up offline reading and phrase search. Their
  copyright notice must stay under the text. Check the licence before
  enabling either — see `.env.example`.

## Adding a page

1. Create `src/views/Things.vue`.
2. Add a route in `src/router/index.js` under the `AdminLayout` children, with
   `meta.capability`.
3. Add an entry in `src/data/navigation.js`: name, path, icon, capability,
   and a one-sentence description.
4. If it needs its own permission, add an area to `lib/capabilities.js`. If a
   church should be able to buy it separately, add it to `APPS` in
   `lib/apps.js` too, under the same key.
5. Create `src/api/thingsService.js` and `src/composables/useThings.js`.
6. Put its components in `src/components/things/`, built as described in
   DESIGN.md.
7. Check it at phone width, in dark mode, and as someone without manage
   rights. Then run `npm run build`.

## Adding an app

An app can be an app of its own inside Ekkly: under Ekkly's top bar (which
names it and leads back out to the home of all apps), with the people rail
stepped aside, it navigates itself. This is where every app is going; a page
not yet made into one still opens under the top bar, whose mark leads home. Schedules (`src/apps/schedules/`) is the
first one and the pattern to copy; Presentation (`src/apps/presentation/`) is
the second, Videos (`src/apps/videos/`, announcement videos drawn on a
canvas from the calendar, engine in `src/utils/video/`) the third, People
(`src/apps/people/`, at `/people`, a record at `/people/:id`; the old `/members` addresses redirect there) the
fourth, Attendance (`src/apps/attendance/`, the recorder still at
`/attendance/record`) the fifth, Finances (`src/apps/finances/`, the book
at `/finances/book/:month`) the sixth, Events (`src/apps/events/`, the
month grid at `/events/calendar`, `?date=` to open a day) the seventh, Tasks
(`src/apps/tasks/`, every list one screen, `TasksList`, told by its route
which tasks; `?q=` opens one already searched) the eighth, Minutes
(`src/apps/minutes/`, a meeting still at `/minutes/:id` as a focus route;
action items and decisions are read out of the write-ups) the ninth,
Small groups (`src/apps/smallgroups/`, a group at `/small-groups/:id`, a
session under it) the tenth, Prayer (`src/apps/prayer/`, still at
`/prayer-concerns`; every list one screen, `PrayerList`) the eleventh, Songs
(`src/apps/songs/`, a song still at `/songs/:id` as a focus route) the
twelfth, and the Gallery (`src/apps/gallery/`, an album at `/gallery/:id`, a
photo at `/gallery/:id/v/:photoId`, the addresses share links carry) the
thirteenth, and Teaching (`src/apps/teaching/`: sermon notes on the same
`sermons` record Schedules' preaching sheet plans, Sunday school classes,
and lessons, a lesson with no date being a plan to reuse) the fourteenth, and
Inventory (`src/apps/inventory/`, a thing at `/inventory/:id`; its photo's
background is taken out on the phone by a self-hosted Apache-2.0 model,
`public/models/u2netp/`, in a worker, `src/utils/removeBackground.js`) the
fifteenth, and Tickets (`src/apps/tickets/`: anyone sends a bug, a
suggestion, praise, a complaint or a question and reads the answer; no
capability and no app, so it is never switched off; `/todo` still leads
here) the sixteenth. Tickets is the one app whose home is not a launcher:
the deck and section tiles read as clutter in front of a feedback inbox, so
it is one screen (`TicketsBoard`), the kinds as buttons to start from, then
the tickets, a ticket reading beside the list on a desktop as a
conversation. Who answers depends on the kind (`lib/tickets.js`,
`handledBy`): a church's administrators answer questions, complaints and
praise there; bugs and ideas are Ekkly's, worked on a board in the platform
console (`TicketsAdmin`, through `/api/platform`).
People is the standard the rest are measured against. A
screen that scrolls itself, like that grid, uses `AppScreen`'s `fill` (and
`wide` for two panes side by side).

1. Put its screens in `src/apps/<app>/`, with a `routes.js` that the router
   spreads in under `AdminLayout`. The parent route sets
   `meta: { capability, app, frame: 'app', art }` (`art` is the app's
   drawing), and each screen sets `meta.depth`: 0 for the app's home, 1 for a
   section, 2 for a step further. A section also sets `meta.art` to its
   tile's drawing (a step further borrows its section's); `AppScreen` shows
   it beside the header's title.
2. The home is a launcher, built the way People's and Schedules' are:
   - `AppHeroDeck` first: whatever matters gets a `DeckCard` of its own, most
     important on top, in a swipeable, looping deck. A card has to be
     something someone would act on this week, earned from the church's own
     habits rather than a rule of thumb — see `useFinanceOverview.js` for the
     reasoning written down, including the cards deliberately left out. Each card but the last
     can be put away for the session. The last is the one that is always
     true (People's roll, Schedules' next Sunday) and the richest: the
     church's colour, the app's artwork on a white tile, faces along its foot.
   - Then the sections as `AppShortcut` tiles, two across, each with its own
     artwork (`art`, drawn as `<app>-<section>` in a file of the app's own,
     `brand/ekkly/sections/<app>.mjs`, which `make-app-icons.mjs` picks up
     and hands its drawing kit; run it to regenerate), and shown in full
     colour on the same card as the home's apps, each in a colour of its own
     from `SECTION_HUES`; see BRAND.md), and its name. Nothing else, unless
     something behind it is waiting on you: then a `badge` with how many
     (`urgent` when it is overdue). Totals, faces, dates and charts are what
     the section shows once opened, and the deck already says what matters,
     so a tile that repeats them only makes the grid slower to read.
   Every app's home is built this way now, Presentation and Videos included
   (the older `AppHero`, `AppActionsSheet` and `SectionGlyph` are no longer
   on any home), and through one component, `AppHome`: hand it the deck's
   `cards` and its `#card` slot, and the `doors`. Hand it `stats` too (the
   app's figures, each opening what it counts) and, where the app has a page
   that adds one, an `action`: in simple view `AppHome` is a plain
   dashboard of those and the same cards (`SimpleAppHome`). On a desktop it lays them
   out as the home of all apps is laid out: the always-true card and the
   sections down the left, the other cards as the phone's own in Needs
   attention and Good to know, and in a third column the app's `#side`, one
   live list from inside it in an `AppSidePanel` (Schedules' next line-up,
   Tasks' open tasks). People is trying the next step on its own first
   (`src/apps/people/PeopleDesk.vue`): on a desktop its home stops copying
   the home of all apps, with the roll card and what needs you as tiles to act
   on along the top, and the sections as columns of their own content between
   rules, not cards. A person's record has a desktop layout of its own too
   (`PersonDesk`), and its sections are tables (`DeskTable`) where a phone
   has lists. Copy those to the other apps once they are settled. One screen, the page never
   scrolling; a list holding more scrolls inside its panel. A card the side
   list already says is left off the desktop's deck (`wide`). A section on a
   desktop stands beside the app's rail (`AppRail`, drawn by `AppScreen`):
   the way home to the app and every section, read off the app's routes —
   any screen at `depth: 1` with a `meta.title` and `meta.art` is on it.
   A section never looks like a phone on a desktop: give its `AppScreen`
   `desk`, so its lists are cards across the width, and lay out what is
   more than a list for the width (a `DeskTable`, or two columns), as
   DESIGN.md describes under `frame: 'app'`. Every screen sits in `AppScreen`, which gives a section its
   header that stays put while only the content under it scrolls (the way back up is the top bar's mark), shows the section's artwork in full
   colour beside its title, and stands the app's home inside a church
   (`churchInterior.js`: windows, light, pews, all barely there; a section
   stands on plain ground, so its rows are all there is to read). Ekkly's top
   bar stays over every screen of an app, with the trail of how deep you
   are (`useTrail`). They live in `src/components/appframe/`.
   - Last, its commercial: holding the app's tile anywhere (the home, the All
     apps page, the bottom bar) plays a story of what it does (`AppPeek`). It
     is a folder in `src/components/appframe/stories/<app>/` with an
     `index.js` exporting `{ art, scenes }`, found by a glob, so nothing else
     is edited; copy `stories/people/`. Made-up people only, nothing may
     overflow the 300×460 screen at any moment, and where a scene shows a
     photo it uses the drawn ones in `src/assets/mock-photos/`
     (`brand/ekkly/make-mock-photos.mjs`).
3. Data still flows view → composable → service. An app's summary of its own
   data goes in one composable (`useScheduleOverview.js`), so its hero and
   tiles cannot disagree.
4. It keeps one entry in `src/data/navigation.js`. Its sections are its own
   tiles, not navigation entries.

## How code is written here

- Comments explain *why*, in full sentences, above the code they're about.
  Keep existing comments when editing nearby.
- New files use single quotes, no semicolons, and 2-space indent. When editing
  an existing file, match its style.
- Headings, buttons and messages use sentence case ("New task", "Could not
  save that task. Please try again."). Page names in navigation use Title Case.
- A user-facing change gets a CHANGELOG entry written for the church, not for
  developers. `/commit` writes it.
