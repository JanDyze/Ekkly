# Ekkly

A church management app sold to many churches from one deployment. Each church
has its own address (`<id>.<root domain>`) and its own records under
`churches/{id}/` in Firestore. It started as the UEC church app at v0.22.0;
CHANGELOG.md has the history.

**Stack:** Vue 3 (`<script setup>`), Vite 7, Tailwind CSS 4, vue-router 4,
Firebase (Auth + Firestore), Vercel (static app + serverless routes in `api/`),
installable PWA.

## Commands

- `npm run dev` runs the app. On localhost, add `?church=<id>` to pick a church.
- `npm run dev:all` runs the app plus `server.js`, for the `api/` routes.
- `npm run build` regenerates icons, then builds. There are no tests and no
  linter, so a clean build is the check. Run it before saying a change works.
- `/commit` and `/deploy` are project skills. Use them instead of committing,
  versioning or deploying by hand.

## Read first

| Working on | Read |
|---|---|
| Any page, component, or visual change | [DESIGN.md](DESIGN.md) |
| Anything Ekkly's own: the mark, colours, type, artwork, voice | [BRAND.md](BRAND.md) |
| Churches, addresses, access, data layout, the platform console, apps & billing | [TENANCY.md](TENANCY.md) |
| Routes in `api/` | [ENDPOINTS.md](ENDPOINTS.md) |
| The Claude connector (`api/mcp.js`, `lib/mcp/`) | [MCP.md](MCP.md) |

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
  apps (`/home`, `src/views/Apps.vue`) and its All apps drawer lay their
  tiles out from it, and the top bar names the app you are in from it. There is no sidebar or bottom bar:
  every app is a screen of its own and the home is the way between them, the
  top bar's mark leading back to it. Don't add links anywhere else.
- **Access is by capability.** Capabilities are `<area>.view` and
  `<area>.manage`, and the areas are listed in `lib/capabilities.js`. A route
  sets `meta.capability` (or `meta.adminOnly`). A component hides what
  `usePermissions().canManage(area)` refuses rather than disabling it.
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
(`src/apps/people/`, the roll at `/members`, a record at `/members/:id`) the
fourth, Attendance (`src/apps/attendance/`, the recorder still at
`/attendance/record`) the fifth, Finances (`src/apps/finances/`, the book
at `/finances/book/:month`) the sixth, and Events (`src/apps/events/`, the
month grid at `/events/calendar`, `?date=` to open a day) the seventh. A
screen that scrolls itself, like that grid, uses `AppScreen`'s `fill` (and
`wide` for two panes side by side).

1. Put its screens in `src/apps/<app>/`, with a `routes.js` that the router
   spreads in under `AdminLayout`. The parent route sets
   `meta: { capability, app, frame: 'app' }`, and each screen sets
   `meta.depth`: 0 for the app's home, 1 for a section, 2 for a step further.
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
     artwork (`art`, drawn with the app icons by
     `brand/ekkly/make-app-icons.mjs` as `<app>-<section>`, and shown flat in
     the church's accent — only an app wears the glossy artwork on a plate,
     `level="app"`; see BRAND.md), a live line of
     what is true inside it, and a small preview of its data in the `aside`
     slot (faces, a date, a bar) rather than a count badge.
   Presentation and Videos still use the older `AppHero` with a waiting
   button (`AppActionsSheet`) and `SectionGlyph` tiles; move them to this when
   they are next touched. Every screen sits in `AppScreen`, which
   gives a section its back arrow and hide-on-scroll header; Ekkly's top bar
   shows only on the app's home. They live in `src/components/appframe/`.
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
