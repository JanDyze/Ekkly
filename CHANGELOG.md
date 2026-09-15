# Changelog

The version lives in `package.json` and reaches the app as `__APP_VERSION__`
(see `vite.config.js`); the foot of the Settings page shows it.

While the app is pre-1.0 the module set is still moving — finances has been out
and is back — so **breaking changes ride on a minor bump**. 1.0.0 is for when
the modules a church depends on stop being added and removed.

Dates are the commit dates of the work, not tag dates: versions 0.1.0 through
0.6.0 are reconstructed from history, which had no tags. Tag them retroactively
with `git tag -a v0.6.0 <sha>` if it ever matters; the shas are listed here.

## [0.26.2] — 2026-09-15

Light and dark on the front door.

### Added

- **A light and dark switch** in the front door's header, on every page.

### Changed

- **Switching to light mode now says "And then there was light"**, everywhere
  the switch is, and the line wraps on a narrow phone instead of running off
  the screen.

## [0.26.1] — 2026-09-15

The tour's chips suit the app artwork.

### Changed

- **The chosen chip is tinted with the accent** rather than black or white, and
  the rest are light grey, so artwork that is partly white stays visible.
- **The time left in a scene runs round the chip's rounded edge** instead of
  along its bottom.

## [0.26.0] — 2026-09-15

The front door is several short pages instead of one long one, and says
"link" where it used to say "address".

### Added

- **Pricing** (`/pricing`): the plan builder and every question about paying.
- **Get started** (`/start`): signing in, asking for a church, and checking on
  the request, at a link someone can come back to. It shows the plan built on
  the way and fills in the church named in the welcome and the apps picked.
- **Privacy** (`/privacy`) and **Terms** (`/terms`), linked from every page's
  footer.
- **Swipe between apps** in What's inside on a phone.

### Changed

- **The home page is shorter:** a short word about price with the plan so far
  replaces the plan builder, four questions instead of five, and the sign-up
  form is on Get started. About a screen less on a computer, two on a phone.
- **"Your church's own link"** replaces "address" in the tour, the hero, How it
  works and the request form.
- **The tour's dates follow today**, so "This Sunday" is always a Sunday. One
  sample church, Grace Fellowship, runs through every scene; home screens and
  the app list wear the app artwork; notes beside the computer no longer cover
  what they describe.
- **What's inside's open app** sits on soft grey so white icons show, and has
  one button: "Add to my plan", then "See my plan", with "In your plan" beside it.

## [0.25.4] — 2026-09-15

Looking through the apps is easier to do one after another.

### Changed

- **What's inside steps from app to app** with previous and next arrows, on a
  phone too, where the row of apps that scrolled sideways is now "4 of 14".
- **Adding an app to your plan keeps it open** and says "In your plan", with
  "See my plan" for anyone who wants to go down and look. Apps already in the
  plan say so when opened.

## [0.25.3] — 2026-09-15

The tour matches the rest of the front door.

### Changed

- **The tour's chips wear the app artwork** — Attendance, Song List, Schedules
  & Presentation, Minutes and EKRIS, the Ekkly mark for your address, and a
  little folder of apps for "and more" — and each plays its animation as its
  scene comes on.
- **Phone and computer are just icons** under the tour, with their names kept
  for screen readers and as a tooltip.

## [0.25.2] — 2026-09-15

The front door's app icons move.

### Changed

- **Each app's icon plays a short animation** as it lights up in What's
  inside, and again when pointed at, when its app opens, or when it joins the
  plan in Pricing: people step out, a ring draws itself, a day is checked off,
  a star lands, a song's lines are written and its note drops on, the Bible's
  ribbon falls, a pencil writes, light opens around praying hands, the sun
  rises, links click together, coins stack, a list is ticked, and EKRIS blinks
  and has something to say. Once each time, never looping, and not at all for
  anyone who asks for less motion.

## [0.25.1] — 2026-09-15

The front door's apps get pictures of their own.

### Changed

- **App icons on the front door** are Ekkly's own artwork now — glossy
  pictures in the mark's orange and blue, one per app — in What's inside, in an
  app's details and in Pricing. They glow once they light up, and in Pricing
  an app not in the plan stays greyed. Drawn as SVG, so they stay sharp at any
  size; `brand/ekkly/make-app-icons.mjs` draws them.

## [0.25.0] — 2026-09-15

Paying by card, a person to talk to on the front door, and a front door that
asks a new church who it is — lightly.

### Added

- **Pay by card.** Settings → Apps & plan has a card form: monthly, or yearly
  for the price of ten months. PayMongo charges it on its own, each charge is
  recorded as a payment and moves the paid-through date on, and a church still
  in its free month keeps it. Changing apps charges the new total from the next
  cycle; removing the card stops future charges and keeps the time paid for.
  The card number goes from the browser straight to PayMongo. Needs
  `PAYMONGO_SECRET_KEY`, `VITE_PAYMONGO_PUBLIC_KEY` and
  `PAYMONGO_WEBHOOK_SECRET` (see .env.example); **not yet tried against
  PayMongo with real keys.**
- **A chat bubble on the front door.** It says when the person who runs Ekkly
  is online — signed in with any Ekkly tab open — and opens to suggested
  questions, Call, Email, Messenger and a conversation. Visitors write first
  and are asked where to reply afterwards; "Seen" shows once it has been read,
  and a reply that arrives while the bubble is closed is previewed beside it.
  Replies come from the new **Live chat** section of the console; a message
  left while away is emailed. Who answers, the name shown, a phone and a
  Messenger link are set in Name & front door.
- **A welcome on a first visit.** Which church are you with, and may we reach
  out? One field, an optional second, then thanks; skippable at every step,
  shown once, and brought back any time with "Say hello, we'll reach out" in
  the hero. The answers are listed in Console → Front door as "Churches that
  said hello", with a tap to email or call, and emailed when a way to reach
  them is left.
- **Prices.** Every app has a starting price until the console sets its own —
  ₱1 for now, while payments are tried; the launch prices are written beside
  them in `lib/apps.js`. Pricing on the front door switches between monthly
  and yearly, and says the first month is free.
- **`/qr`**, Ekkly's QR code for ekkly.online in the mark's four colours,
  with the address under it or on its own, to download as PNG or SVG.
  `brand/ekkly/build-qr.mjs` makes it and checks it scans.

### Changed

- **The assistant is EKRIS** — Ekklesia Knowledge Retrieval & Intelligence
  System — everywhere it was Klysia or "AI assist", the app included.
- **What's inside** is laid out like a phone's home screen: an icon and a name
  for each app, lighting up as the section scrolls into view. Tapping one shows
  what it does for a church in a line and three wins, with its price and a
  button that adds it to the plan below. One screen tall on a desktop.
- **The front door reads as one piece.** Every section heading shares one type
  scale; "Why churches choose it" is gone; app descriptions are a few words
  each; the tour shows sample churches with logos of their own; sections light
  as they are scrolled past rather than fading in.
- **Colours arrive with the page.** A church's or the platform's colours, and
  dark mode, are remembered and applied before anything is drawn, so a page no
  longer opens in the built-in blue and changes a second later.
- **The page behind a popup or drawer holds still**, everywhere — including
  the chat on a phone, a minute's drawers and the Bible's picker.
- On a phone the chat fills the screen above the keyboard, never pops the
  keyboard up by itself, and its fields no longer make iOS zoom in.
- The What's new window shows only in a church's app, not on the front door.
- `npm run dev` reloads what an API route imports from `lib/` when it
  changes, instead of serving the version it loaded first.

### Removed

- "Curious? Type your church's name." from the hero, and with it the names
  tried: their card and count in Console → Front door, and the visitor id the
  page kept for them. The cookie question now asks only to count visits.
  Names already stored in `frontDoorTries` are no longer read.

## [0.25.0] — 2026-09-15

Paying by card, a person to talk to on the front door, and a front door that
asks a new church who it is — lightly.

### Added

- **Pay by card.** Settings → Apps & plan has a card form: monthly, or yearly
  for the price of ten months. PayMongo charges it on its own, each charge is
  recorded as a payment and moves the paid-through date on, and a church still
  in its free month keeps it. Changing apps charges the new total from the next
  cycle; removing the card stops future charges and keeps the time paid for.
  The card number goes from the browser straight to PayMongo. Needs
  `PAYMONGO_SECRET_KEY`, `VITE_PAYMONGO_PUBLIC_KEY` and
  `PAYMONGO_WEBHOOK_SECRET` (see .env.example); **not yet tried against
  PayMongo with real keys.**
- **A chat bubble on the front door.** It says when the person who runs Ekkly
  is online — signed in with any Ekkly tab open — and opens to suggested
  questions, Call, Email, Messenger and a conversation. Visitors write first
  and are asked where to reply afterwards; "Seen" shows once it has been read,
  and a reply that arrives while the bubble is closed is previewed beside it.
  Replies come from the new **Live chat** section of the console; a message
  left while away is emailed. Who answers, the name shown, a phone and a
  Messenger link are set in Name & front door.
- **A welcome on a first visit.** Which church are you with, and may we reach
  out? One field, an optional second, then thanks; skippable at every step,
  shown once, and brought back any time with "Say hello, we'll reach out" in
  the hero. The answers are listed in Console → Front door as "Churches that
  said hello", with a tap to email or call, and emailed when a way to reach
  them is left.
- **Prices.** Every app has a starting price until the console sets its own —
  ₱1 for now, while payments are tried; the launch prices are written beside
  them in `lib/apps.js`. Pricing on the front door switches between monthly
  and yearly, and says the first month is free.
- **`/qr`**, Ekkly's QR code for ekkly.online in the mark's four colours,
  with the address under it or on its own, to download as PNG or SVG.
  `brand/ekkly/build-qr.mjs` makes it and checks it scans.

### Changed

- **The assistant is EKRIS** — Ekklesia Knowledge Retrieval & Intelligence
  System — everywhere it was Klysia or "AI assist", the app included.
- **What's inside** is laid out like a phone's home screen: an icon and a name
  for each app, lighting up as the section scrolls into view. Tapping one shows
  what it does for a church in a line and three wins, with its price and a
  button that adds it to the plan below. One screen tall on a desktop.
- **The front door reads as one piece.** Every section heading shares one type
  scale; "Why churches choose it" is gone; app descriptions are a few words
  each; the tour shows sample churches with logos of their own; sections light
  as they are scrolled past rather than fading in.
- **Colours arrive with the page.** A church's or the platform's colours, and
  dark mode, are remembered and applied before anything is drawn, so a page no
  longer opens in the built-in blue and changes a second later.
- **The page behind a popup or drawer holds still**, everywhere — including
  the chat on a phone, a minute's drawers and the Bible's picker.
- On a phone the chat fills the screen above the keyboard, never pops the
  keyboard up by itself, and its fields no longer make iOS zoom in.
- The What's new window shows only in a church's app, not on the front door.
- `npm run dev` reloads what an API route imports from `lib/` when it
  changes, instead of serving the version it loaded first.

### Removed

- "Curious? Type your church's name." from the hero, and with it the names
  tried: their card and count in Console → Front door, and the visitor id the
  page kept for them. The cookie question now asks only to count visits.
  Names already stored in `frontDoorTries` are no longer read.

## [0.24.1] — 2026-09-15

The front door starts counting, with the visitor's permission.

### Added

- **Console → Front door.** Visits, names tried and calls to action pressed
  for the last 30 days, and the list of church names visitors typed into the
  hero — each one a church that got as far as wondering what its address would
  look like. The names are kept once the visitor stops typing, so a name is one
  row and not one per keystroke.
- **A question before any of that.** The front door asks before it counts
  anything, says exactly what it keeps, and takes no for an answer: refuse and
  nothing is ever sent. The answer is remembered on that device, along with a
  random id that exists only so the same person typing the same name twice is
  one row. Nothing follows anyone to another site.
- `frontDoorDays` and `frontDoorTries`, written only by `/api/platform` — its
  first action that anyone at all may call, and deliberately narrow: three
  kinds of signal, short fields, and row ids worked out from what was sent
  rather than a new document each time.

## [0.24.0] — 2026-09-15

The app becomes Ekkly, and its front door becomes a demonstration. Until now
the product wore UEC's name, logo and teal wherever a church had not chosen its
own; it now starts as Ekkly, in Ekkly's blue, and UEC is a church like any
other. The front door shows what the app does by playing it rather than
describing it.

### Added

- **Ekkly's mark and wordmark.** `public/ekkly-mark.svg`, the four-pane window,
  with `AnimatedMark.vue` (the panes light in turn, with a glint across the
  glass) and `PlatformLogo.vue` (the mark plus whatever the console calls the
  platform). `index.html` lights the same window pane by pane while the app's
  code downloads, in plain SVG and CSS so it shows before anything has loaded.
- **A front door that plays the app.** The hero at `/` is a device running a
  short scene for each of the things Ekkly does — a church getting its own
  address and colour, Sunday's head count going in, a lineup and its reminders,
  Present putting lyrics, a Bible passage and a PowerPoint slide on the
  projector, minutes writing themselves, and Klysia answering from the church's
  records — every one of them first on a phone, then on a computer, then a last
  scene for the apps the tour did not reach. Built in
  `src/components/frontdoor/`; DESIGN.md describes how it fits together.
- **"Curious? Type your church's name."** in the hero. It sends nothing and
  claims nothing about whether the address is free: it shows the address that
  name would have, puts the name on the device in the tour, and carries it into
  the request form if the visitor takes it up.

### Changed

- **The built-in colour is Ekkly's blue** (`#1d64d8`, and `#5b9dff` on a dark
  page) rather than UEC's teal. A church that chose its own colours keeps them;
  a church that never did changes appearance.
- **Emails are drawn in the church's own accent** instead of one fixed blue,
  resolved the same way the app resolves it: the church's, then the platform's,
  then Ekkly's.
- **The front door follows the platform's colour.** The light behind the hero,
  the headline and the steps were fixed to the mark's four colours; they are
  tokens now, so re-colouring Ekkly in the console re-colours its front door.
- **UEC's brand lives in `brand/uec/`** with a note on how to put it back on
  UEC's own church, rather than sitting in `src/assets` as the app's default.
- The installed app's icons, its title and its theme colour are Ekkly's.
  (Unchanged: the manifest is still one for all churches — see TENANCY.md.)
- README describes the product instead of the Vue template it started from.

## [0.23.0] — 2026-09-14

A console for running the platform, and churches that pay only for what they
use. Everything a platform administrator did by hand — Firestore edits,
scripts, environment variables — now has a screen at `/platform`, and a church
can switch apps on and off to keep its bill down.

### Added
- **The platform console** at `/platform`, laid out like church Settings: church
  requests, churches, apps and prices, support requests, new church defaults,
  name and front door, colours, AI, platform admins, and an activity log of
  everything done from it. See "The platform console" in `TENANCY.md`.
- **A page for each church** (`/platform/churches/:id`): rename it, change its
  timezone, see its people, accounts and last activity, switch its apps on and
  off (and lock one off), set its billing, record payments, connect its own
  domains, and close or reopen it.
- **Apps a church pays for.** Every page belongs to an app with a monthly price
  (`lib/apps.js`). An app that is off disappears from the sidebar, bottom bar,
  home page, dashboard and Claude connector, and its routes redirect home;
  nothing in it is deleted. A church's administrators choose their apps under
  **Settings → Apps & plan**, which also shows the bill and what has been paid.
- **Billing, tracked.** A status, a paid-through date, an optional agreed price
  and a list of payments per church. Recording a payment moves the date on.
  Payment is still taken outside the app.
- **Support requests.** A church's administrators ask for a new app, a change,
  a fix, or send feedback from Settings; the platform answers with a status and
  a reply they see there.
- **Colours.** The platform chooses the accent every church starts with, and a
  church can choose its own under **Settings → Colours**, with a light and dark
  preview and a warning when text would be hard to read.
- **The platform's name and front-door wording** are edited in the console
  instead of set in `VITE_PLATFORM_NAME`, which is now only the fallback.
- **AI settings.** Which Claude model writes up minutes, looks up songs and lays
  out lyrics, and a switch that stops all AI calls at once. Each church's AI
  calls are counted per month.
- **Custom domains from the console.** Connecting one maps it to the church,
  authorises it for Google sign-in, adds it to the Vercel project when
  `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` are set, and shows the DNS record
  the church has to add.
- **Platform admins from the console.** The first still comes from
  `scripts/make-platform-admin.mjs`; the last one cannot be removed.
- **New church defaults**: timezone, public page, starting apps, trial length,
  and starter ministries and tags, applied when a request is approved.
- `CLAUDE.md` and `DESIGN.md`: the rules the code depends on, and the house
  style every page follows.

### Changed
- **Breaking:** deploy `firestore.rules` with this release. It adds the
  platform's collections and makes each church's `subscription`, `payments` and
  `usage` readable but not writable from the app. Until it is deployed the app
  uses the built-in name and colours.
- AI features need both the platform's AI switch and the church's AI assist app.
  A church with no apps chosen yet has every app, AI included, as before.
- The sidebar, confirmation buttons and image cropper use the accent colour
  tokens instead of fixed hex values, so they follow a church's colours.
- Settings shows the platform's name and version at its foot instead of
  "UEC Church".

## [0.22.0] — 2026-09-14

One app for many churches. A single deployment now serves any number of
congregations, each at an address of its own (`uec.church.app`), each with its
own records, people and settings, and none able to see another's. Signing in
with Google no longer lets anyone in by itself: a church lets people in. See
`TENANCY.md` for how it fits together and how to set it up.

### Added
- **Churches.** The address decides which church a page is: `<id>.<root domain>`,
  or a domain a church brings (mapped in `domains`). Every record lives under
  `churches/{id}/`, and `src/api/firestore.js` places every read and write the
  app makes inside the current church — no service writes the prefix itself, so
  none can forget it. The API routes do the same through `lib/tenant.js`.
- **Asking for a church.** The platform's front door (`church.app`,
  `app.church.app`) is where a congregation's leader signs in and asks for one.
  Platform administrators approve at `/platform`, which creates the church in
  one transaction, makes the person who asked its first administrator, and adds
  the church's address to Firebase's authorised sign-in domains.
  `scripts/make-platform-admin.mjs` makes the first platform administrator.
- **Asking to join.** Somebody signed in but not in the church lands on
  `/join` and asks. Administrators let them in — or decline — from the top of
  Accounts, and the waiting page opens the app by itself the moment they do.
  Accounts can also remove somebody from the church.
- **A Claude connector link per church**, made by the church's administrator
  under Settings → Claude connector, with writing on or off. Only a hash of the
  token is kept; making a new link retires the old one.
- **`scripts/migrate-to-tenancy.mjs`** copies a single-church project into a
  church on the shared one — accounts with their uids, every collection,
  access for everyone who had it — without touching the original.
- **Testing on one address.** On localhost and `*.vercel.app`, `?church=<id>`
  picks the church for the tab and `?church=` opens the front door, with a small
  badge saying which is showing. Real addresses ignore it.

### Changed
- **Breaking:** Firestore's rules now require an access document in the church
  for every read and write under it, where any signed-in account could read and
  write everything before. Administrators are appointed by administrators.
  Deploy `firestore.rules` with this release.
- **Breaking:** the data layout moved from top-level collections to
  `churches/{id}/…`. A project from before this release has to be migrated.
- `/api/notify` now requires a signed-in member of the church it rings; it
  answered anyone before. The other routes that spent money or read the church
  (song lookup, YouTube search, minutes enhancement, lyrics, photo storage)
  moved from "any signed-in account" to "a member of this church".
- The daily email job runs for every open church in its own timezone, and links
  point at each church's own address.
- The Accounts refresh reads only the church's own accounts from Firebase Auth,
  no longer every account in the project.
- Photos are stored under a folder per church, and a church can only delete its
  own.
- The push worker takes the Firebase config from the environment instead of
  naming a project of its own.

### Removed
- **Breaking:** `MCP_TOKEN` is no longer how the connector is switched on. It
  still works, opening `MCP_CHURCH_ID`, so an existing connector survives the
  move; new links come from Settings.

## [0.21.0] — 2026-09-13

The backlog, cleared: twenty tickets off the To-do list in one go. Every change
made in the app is now written down with the name of whoever made it, worship
lineups grew into schedules for everyone who serves, and the pages that had
each drifted into their own colours and their own summary block were brought
back into one house style.

### Added
- **An audit log.** Every write the app makes — a person added, a task ticked,
  a Sunday called off — is committed in the same batch as an entry saying who
  made it, when, to what, and which fields were written. Same batch on purpose:
  a log written on a second round trip has a hole in it wherever a phone lost
  signal between the two. Administration → Audit log reads it back, grouped by
  day, with one search bar over names, places, verbs and field names. The
  connector's writes are logged too, as "Claude (MCP connector)". Nothing about
  it is optional: `vite.config.js` refuses to build if a file imports
  `firebase/firestore` around the wrapper that writes the entries.
- **`firestore.rules` in the repo.** What the rules should be once the log is
  live: everything else keeps the access it has, while an entry can only be
  written as yourself, is stamped by the server, and can never be edited or
  deleted. Deploy it by hand — the rules live in the console today.
- **Schedules, in place of worship lineups.** A Sunday is no longer just a song
  leader and a band: it lists everyone serving, with roles an administrator can
  add, rename, reorder and tie to a ministry so the right people are offered
  first. Songs stay where they were. Old lineups, links and permissions keep
  working, and `get_lineup` reports the roles as well.
- **Ministries and tags can carry a picture.** An icon from the app's own set,
  or a photograph — the choir's logo, the youth group's badge — chosen in
  Settings and shown wherever the chip appears.
- **An album for every gathering.** Past services and events have a gallery
  album waiting without anyone creating one. An album with no photographs is a
  single line to tap rather than a card with a placeholder in it.
- **Recurring events choose whether they appear on profiles.** Off unless asked
  for: fifty-two Sundays a year on every profile was the page's whole height.
- **A new person starts tagged First Timer**, which is what almost every new
  person is; the rare regular has the tag taken off instead.
- **Tickets can be edited.** Tapping a ticket's words on the To-do page opens it
  in the same drawer it was written in.

### Changed
- **Settings is a list of places rather than a strip of tabs.** Eight tabs
  scrolled sideways on a phone, so half of what Settings could do sat off the
  edge of the screen. Now every section is visible at once, grouped, each
  saying where it stands — "3 on the calendar", "2 requests waiting" — with the
  section in the URL so back, refresh and a shared link all work. Recurring
  events moved into a component of its own.
- **The Events page follows the People page**: slimmer headers, one accent
  colour, plain rows under sticky headings, and sheets and buttons that match.
- **The Gallery page follows it too**, with a full-screen photo viewer you
  swipe through.
- **Cancelled and postponed gatherings are red**, on the calendar, the
  dashboard and the attendance list, instead of the amber that read as a
  warning rather than an absence.
- **Summaries are gone from the top of People, Attendance, Accounts and
  Events.** What stays on Attendance is the part that asks for something: the
  gatherings still to record, and the people not seen in weeks.
- **Attendance is the app's colour.** Each row still carries its gathering's
  colour on a stripe and a badge; the turnout bars and figures no longer make a
  month of services a rainbow.
- **A person's attendance is a grid.** A row per gathering, a column per month,
  a small square per date — green for came, red for did not. A Sunday with an
  occasion on it, Grandparents' Day or Communion, sits on the Sunday service's
  row rather than starting one of its own. Tap a square for the date.
- **A profile says each thing once.** The tiles under the name repeated the
  sections below them and are gone; sex is the sign beside the name; the
  birthday is one line, with "in 5 days" added when it is close.
- **Exporting people asks what the sheet is for** — a contact list, birthdays,
  who serves, or everything — rather than thirteen columns to tick. Email and
  ministries are new columns, and it says Member or Attendee rather than Yes
  or No.
- **The add-person drawer lost its colours**, and the phone's account drawer
  has "Link my member record" back, which only the desktop menu had.

### Fixed
- **Recording someone the gathering leaves out now asks first.** A Sunday
  schooler found by search could be ticked into the service as well as their
  own register, counting them twice.
- **A gallery upload no longer replaces a chosen cover**, photograph downloads
  work again, and "New album" opens.

## [0.20.0] — 2026-09-13

The Bible arrives as somewhere to read, and a meeting's attendance stops being
kept in two places that disagreed.

### Added
- **A Bible reader.** `/bible` opens the Tagalog translation as a book to read
  rather than a verse to look up: a chapter of text, a way to the next one, and
  a picker and a search folded away until they are asked for. Both the reader
  and the Presentation page go through the same cached books, so a passage
  found in one is already loaded in the other.
- **It remembers where you were.** Bare `/bible` means "carry on", against the
  account rather than the device — a phone and a laptop agree about where you
  are up to, and the office tablet does not hand the last reader's place to the
  next one. The full form, `/bible/juan/3`, is what a reference shared with
  somebody else looks like.
- **Search that matches what was typed against what is printed.** Case, the
  accents this translation sets on a handful of words, and its curly quotes are
  all folded away, so "kaya't" typed with a straight apostrophe finds the verse.
  The scope is the reader's choice — this book is instant and offline, all
  sixty-six is five megabytes it asks for and reports progress through.
- **One date of a weekly service can be deleted.** Not the same answer as
  calling it off: calling off leaves the date on the calendar struck through,
  deleting takes it away, and the schedule carries on either way.
- **An attendance count can be deleted.** The gathering stays; what goes is the
  record of who was there, and it returns to the list ready to record again —
  which is also the way out of a count taken against the wrong Sunday.

### Fixed
- **A meeting whose register had been taken read "Not recorded".** Attendance
  for a meeting is marked on the minute as people arrive, and the Attendance
  page was separately writing its own document for the same meeting: two stores
  for one fact with no rule about which spoke for it. Meetings now live on their
  minute, everything else in the attendance collection, and one place decides
  which of the two a row comes from. A correction made on either screen reaches
  both.
- **A committee meeting was counted out of the whole church.** A meeting names
  its group as a tag *or* a ministry — a church files "Council" as one and
  "Ushers" as the other — and only the minute's own drawer knew that. The
  council's monthly meeting was landing on everyone else's record as an absence;
  it is now counted out of the nine people it is for, by the same rule on every
  screen.
- **A person's record had a hole in it exactly where the meetings were**, and
  a Sunday service marked "everyone except the kids" could still show against a
  child. Who a gathering was for is now asked of the event or schedule itself
  rather than of the tags copied down the day it was saved, so narrowing an
  event narrows last month's record with it.
- **The month's attendance figures left every meeting out.** "Recorded" meant
  "came from the attendance collection", which a meeting never does.

### Changed
- **A person's attendance history is grouped by month**, and their record leads
  with the few figures worth having — turnout, ministries, the next birthday.

## [0.19.0] — 2026-09-12

The minutes become a document you write in during the meeting, and a gathering
can be called off without vanishing.

### Added
- **A minute is a page now, not a drawer.** Opening one leaves the list and
  fills the screen — no top or bottom bar, the same as recording attendance.
  The agenda lives in a side drawer on a phone and the rail on a desktop, so
  the notes and the write-up get the height. The preview drawer that used to
  stand in front of the page is gone; it showed a shortened copy of the thing
  behind it.
- **Names and dates are found in the notes and marked.** "Joyce", "by Friday"
  — matched against the church's own roster and highlighted as they are typed,
  painted with the CSS Custom Highlight API so the caret, the undo stack and
  the phone keyboard's autocorrect are never touched.
- **Typing "@" offers the roster.** What it inserts is the person's plain name,
  not a tag: a minute the church files should not carry an app's typing
  shortcut.
- **A highlight can be told it is wrong.** Tapping one opens what it was taken
  for, and the ways to disagree — not a name after all, or a different person.
  Corrections are kept per minute, because "Mark" is a name in one meeting and
  a word in the next.
- **Comments to whoever writes the minutes up, which is Claude.** A correction
  from the person who was in the room survives "Write again" instead of being
  thrown away by it, and stays on the record afterwards as the reason the
  minute reads the way it does. Comments never appear in the minutes, the
  export or the printed copy.
- **The write-up arrives as it is written.** `/api/enhance` streams
  newline-delimited JSON, so the page shows the Discussion section filling in
  rather than a dimmed button. Two honest states: reading, then writing. No
  progress bar — the endpoint cannot say how long it has left.
- **Action Items become to-do items with a button.** Read back out of the
  table in the minute rather than from a separate structured reply, so the
  buttons can never disagree with the record above them, and every minute
  already filed works without being re-enhanced. Nothing is added
  automatically.
- **Attendance is edited from the minute itself**, saving as it is tapped.
  It could only be set in the editor drawer before the meeting — the one
  moment nobody knows who is coming.
- **Standing gatherings can keep minutes.** Tick it in Settings and the next
  occurrence shows on the Minutes list as "Not started"; opening it starts the
  record with that gathering's date, time, place and people already in.
  Nothing is written until somebody opens it, and there is no back-fill.
- **Calling a gathering off is its own action**, from the calendar or from the
  attendance list: cancelled, postponed, or simply not counted, with a reason.
- **A person's turnout is on their record** — the gatherings they were actually
  expected at, oldest on the left, with "not recorded" kept distinct from
  "absent".
- **The People list can be sorted seven ways**, and the sort decides the
  headings as well as the order: first name, last name, age, birthday,
  ministry, tag, recently added.
- **Swipe to turn the month** on the calendar, sideways or up and down — the
  same direction the desktop's scroll wheel already meant.

### Changed
- **The minutes prompts are written in plain English.** The headings are
  questions now — "What we talked about", "What we decided", "Who does what",
  "Money", "Please pray for", "Still open" — and the brief is a tired person
  reading it on a phone on a Tuesday night, not a board. Money and commitments
  are always tables, with a bold total.
- **A called-off gathering stays on the calendar**, struck through and
  labelled. It used to be filtered out, which meant cancelling the Sunday
  service made it silently disappear — and a service that vanishes without a
  word is how somebody drives to a locked building. Counted tiles still report
  only on what is happening.
- **`status` carries what happened to a gathering**, replacing a boolean that
  meant "hide this occurrence". `isCancelled` is still written alongside it,
  true for both cancelled and postponed, so the public site, the digest, the
  MCP tools and `lib/occurrences.js` stay correct without changing.
- **A person's record is a page too**, not a drawer — the same as songs and
  minutes. "Edit" from the list arrives as `?edit=1`, consumed once and dropped
  from the URL.
- **The arrangement of the apps follows the account**, in `userPrefs/{uid}`,
  rather than the device. An order already arranged on a device is carried up
  once, by the first account to sign in after the change.
- **The calendar is the default view on Events**, with the month list one tap
  away on the floating button.
- **Search is a mode on Minutes and Events**, opened from the floating button
  and cleared when closed — a bar you cannot see must not still be filtering.
  One box reaches the whole minute: the agenda, the notes and the write-up.
- **A minutes row says when, what, and how far it got**, instead of repeating
  the hall and the start time on every line.

### Fixed
- **Reverting notes looked like it did nothing at all.** Sixteen call sites
  used a `showToast` that was never defined, so each one threw a
  `ReferenceError` instead of showing a message — including the ones inside a
  `catch`, which then swallowed the error they were reporting.
- **A minute's legacy `content` field went to `v-html` untouched** whenever it
  held no "#", which is most of them. It goes through the renderer now.
- **Going back to a list lands where you left it.** Our lists scroll an inner
  box rather than the window, so the router had nothing to restore — and with
  every record now opening as a full page, checking three people in a row put
  you back at the top of the roll each time.
- **Deleting a weekly occurrence** was a delete wearing a different label:
  there is no document behind one, so it is called off instead.

## [0.18.0] — 2026-09-10

The connector learns to write. Still nothing in the app itself moves.

### Added
- **Twelve write tools on the MCP connector**, off unless `MCP_WRITE_TOOLS` is
  set: put someone on the roll and correct their record, add a gathering, move
  or cancel one, record a head count, raise a prayer concern and mark it
  answered, assign a task and tick it off, add a song, move people in and out
  of a small group, and write a line into the ledger.
- **Moving one Sunday without moving every Sunday.** A recurring service has no
  document behind it, so changing one saves a one-off override for that date —
  the same thing the calendar does when somebody edits an occurrence by hand.
  Asking twice amends that override rather than stacking a second one.
- **A refusal that can be acted on.** An invented ministry, event type or
  ledger category comes back with the real list attached, so the next attempt
  succeeds instead of guessing again.

### Fixed
- **Developer tickets were showing up as church work.** They share the `tasks`
  collection and the To-do page filters them out; the connector did not, so
  "what is outstanding" answered with somebody's bug list mixed in. Three of
  six tasks were not the church's.
- **The song tools described fields that do not exist.** They offered to search
  by artist and CCLI number and to filter by musical key, none of which a song
  record carries — filtering by key silently returned nothing at all. They now
  read what is really there, including the key each leader sings a song in.
- **A gathering's expected attendance came back as a list of numbers** where a
  count belonged, because that field is a head count on some records and a list
  of member ids on others.
- **The connector could answer from before its own last write.** Reads are
  cached for half a minute; adding a member and asking who is on the roll in
  the same breath gave the list from before the addition.

### Security
- Nothing the connector writes can delete a record: a gathering is cancelled, a
  task is ticked, a concern is marked answered — each with an undo in the app.
- Every write is signed "Claude (MCP connector)", so a record changed through a
  conversation can be told from one somebody typed.
- No write notifies anybody. The app raises a push when a person saves an event
  or a task; the tools deliberately stay quiet.
- Recording attendance twice is refused rather than silently doubling a month's
  figures; correcting one takes an explicit flag.

## [0.17.0] — 2026-09-10

The records learn to answer questions. Nothing in the app itself moves.

### Added
- **The church's records as an MCP connector**, at `/api/mcp`. Connect Claude
  to it and the congregation, the calendar, attendance, worship lineups, small
  groups, minutes, tasks and the ledger can be asked about in conversation
  instead of read page by page — "how has Sunday attendance been since June",
  "who has a birthday next month", "when did we agree the medical mission
  budget". Seventeen tools; fifteen of them only read.
- **A written account of it** in `MCP.md` — what each tool answers, how to
  generate a token, and how to add the connector to Claude.

### Changed
- The calendar is expanded for the connector by the same `collectOccurrences`
  the app's own calendar and the digest email use, so a cancelled or edited
  Sunday suppresses the generated one there too rather than appearing twice.

### Security
- **The endpoint is shut until `MCP_TOKEN` is set**, and refuses every request
  until it is. It reads with the Admin SDK, so Firestore's rules do not apply
  to it and that token is the whole of its protection — anyone holding the URL
  holds every record the church keeps.
- **Portraits and gallery photographs are never returned**, and contact numbers
  and home addresses are withheld unless a question actually asks for them.
- **The two tools that write** — adding an event, recording a prayer concern —
  are off unless `MCP_WRITE_TOOLS=true`. Read-only, the worst the connector can
  do is answer badly.

## [0.16.0] — 2026-09-09

Google is the only way in, the app can be installed and pulled to refresh, and
the church's logo learns to draw itself.

### Added
- **An offer to install.** Anyone still reading in a browser tab is shown how
  to put the app on their home screen. Chrome and friends get the real install
  dialog; iOS has no such API, so it gets Share → Add to Home Screen drawn out
  step by step. It never appears once installed, once dismissed, or over the
  projector.
- **Pull down to refresh**, with the church's own logo turning under the
  finger rather than the browser's bar. The platform gesture and the
  rubber-band glow are switched off across every scroller — a flick at the top
  of a bottom sheet used to reload the whole app.
- **The mark over the gap between pages.** Every screen is fetched on first
  visit, which on mobile data leaves the old page sitting there; the logo goes
  over that instead.
- **The logo as an animation.** A build script cuts two web-ready clips out of
  the master GIF — a full reveal for the landing page and sign-in, a short loop
  for everywhere else — at a fifth of its weight and with the black ends
  thrown away.
- **A photo deck on the public page**, swiped edge-on: the picture being
  looked at in the middle, its neighbours tipped back to either side, wrapping
  with no end to reach.
- **A birthday that knows whose it is.** On the morning of it, the public page
  greets the member by name instead of welcoming them, and drops confetti once
  — the first load of that day, not every load.

### Changed
- **Sign-in is a single button on a full-bleed photograph** of the room the
  church meets in, with the mark drawing itself in over it. The split-panel
  layout and its stack of fields are gone.
- **The centre of the bottom bar says where you are.** Pages opened from the
  app drawer light no tab, so the mark carries the name of the page instead of
  a blank space. The strip is taller to hold that line, and the app drawer now
  stops at four fifths of the screen so the page stays visible behind it.
- **The logo in the topbar is a link back to the public page**, while that
  page is published.
- **The bundled mark is trimmed** of the transparent margin it was drawn
  against, so it sits the same size on screen at smaller numbers.
- **The Events dock on the public page is a flat calendar** with the word
  under it, rather than a block drawn in perspective — and it no longer
  vanishes on a quiet fortnight, which read as a page that had failed to load.

### Fixed
- **Anything opened over the page holds the page still.** Drawers and modals
  let the page scroll on underneath them, and on a phone they ate the flick
  meant for the sheet's own list.
- **Google sign-in works in the app installed to an iPhone home screen.** It
  could not before — the button simply span forever. Needs two Firebase and
  Google Cloud console changes and a flag; see README.

### Removed
- **Email and password sign-in, and the sign-up page. Breaking.** One provider
  means one account per person, no password for a congregation to lose and
  nothing to reset. Accounts made the old way still exist and still show as
  "Email & password" on the Accounts page, but there is no door for them here
  any more. `/register` redirects to `/login`. Email/Password must also be
  switched off in the Firebase console, or the REST API still accepts it.

## [0.15.0] — 2026-09-09

The public page becomes the church's own, in Tagalog, and every photograph in
the app moves out of the database and onto a CDN.

### Added
- **A landing page written for the congregation, not for a template.** Warm
  paper, a serif, an arched window instead of a full-bleed photograph, and
  Tagalog throughout — the greeting rolls through the names somebody at the
  door would use (ate, kuya, nanay, lolo), or the member's own name once they
  have signed in. Dates stay in English, being read off a calendar.
- **Punla, Puno, Prutas as a section of its own**, drawn with the church's own
  poster artwork behind it. The rail walks itself through the three stages and
  hands over the moment somebody taps one.
- **A floating Upcoming dock.** What is coming up used to sit inline under the
  hero, in the middle of the one paragraph a stranger reads. It waits in the
  corner instead, counts what has not been seen, leans out with a reminder now
  and then, and opens into a focused sheet revealed by a circle growing out of
  the icon. The count goes quiet once it has been opened and returns only when
  something new appears.
- **Birthdays on the public page, off by default.** Only the name somebody is
  called by and the day — never a surname, never the year, so never an age —
  and only once an administrator turns it on under Settings → Public page.
  A member's photograph appears beside theirs when they have one.
- **Nearly all of the public page is editable.** The verse, the vision and
  mission, the discipleship stages, the closing invitation and the list of
  names the greeting rolls through all moved into Settings → Public page.

### Changed
- **Photographs live in Vercel Blob, not in Firestore.** Every image the app
  stores — gallery photographs, member portraits, the church logo, the hero,
  small-group covers and session photos — went in as base64 inside a document,
  which capped each one at the 1 MiB a document holds, inflated it by a third,
  and put a Firestore read and a decode in front of every view. A cold gallery
  photograph took two seconds to arrive; from the CDN it takes 124–517 ms. The
  existing gallery was migrated; the other images were cleared at the church's
  request and want re-uploading.
- **Deleting an album now deletes its photographs**, in Firestore and in
  storage. It used to delete only the album, leaving every photograph behind
  for good.
- **Vision and mission read as two statements** rather than cards to turn over,
  and sit after the photographs, where what the church says about itself lands
  better.
- The church is UECPCOM, with Canubing II beneath it.

### Fixed
- **An album deleted from the gallery kept appearing on the public page.** The
  payload allowed an hour of stale serving at the edge, so the old list was
  handed out long after the change — and no amount of clearing a browser
  touches a cache that lives in Singapore. The page is no longer cached.
- **Albums that shared a calendar event collapsed into one tile**, leaving the
  others unreachable — and so undeletable. Three albums named "test" were
  showing as one.
- **A member's photograph was racing its own upload.** The cropper was bound
  twice, so the raw base64 was written to the record alongside the upload and
  won whenever the upload failed.
- The close button on the Upcoming sheet did nothing: the dock's wrapper was
  claiming clicks across an invisible box that covered it.
- Service times on a phone each began wherever their name happened to end.
- Editing a file under `api/` no longer leaves `npm run dev` serving the
  version it first imported.

### Removed
- **Every capability check, temporarily.** Roles come from a member record's
  ministry tags and most accounts are not linked to one yet, so the real rules
  lock out the people setting the church up. `OPEN_ACCESS` in
  `src/composables/usePermissions.js` turns them back on in one word. This does
  not open anything to the public — signing in is still required, and the
  Firestore rules are untouched.

## [0.14.0] — 2026-09-07

The navigation stops being someone else's guess, and a person's record stops
being the add form worn backwards.

### Added
- **The app drawer is draggable, and the first four become the bottom bar.**
  `PRIMARY_PATHS` was one hardcoded guess about what every church does most.
  The order is now whatever the person dragged, alphabetical until they do,
  kept per device in `localStorage` by `src/composables/useAppOrder.js` — so
  the dock holds the apps they actually use without anyone configuring a dock.
  Stored as paths, not indexes: a path survives a page being renamed, added or
  removed.
- **`holdDelay` and `reorder` on `useDragReorder`.** On a tile a tap opens the
  app and a drag rearranges it, and only time tells them apart — hold still
  for 350ms and it is a drag. `reorder` lets a drop that touches the dock swap
  rather than insert, because inserting the tenth app into the second slot
  pushes second into third, third into fourth and knocks the fourth off the bar
  entirely.
- **`src/components/nav/AppTile.vue`** — the drawer draws a tile in three
  places now, and three copies of a tile is how the two navs drifted apart in
  the first place.
- **`src/composables/useSwipeDismiss.js`** — a sheet swipes down, an edge
  drawer swipes right, and the whole panel is the target. A gesture you can
  only start from a 40px header is one most people never find.
- **`src/composables/useNotificationFeed.js`** — one reference-counted
  subscription, with the permission gate and the last-seen mark in one place.
  The feed lived in `Topbar.vue` while the bell was its only reader; the people
  drawer shows the same history now.
- **The people rail doubles as the account drawer on a phone** — who you are,
  your profile, the theme, sign out, alongside who else is online.
- **`missingMemberFields`** — the same gaps as `missingMemberDetails`, keyed
  rather than phrased, for the record itself where there is room to name each.
- **`short` labels in `navigation.js`** for the bottom bar, where a tab is
  about 65px and "Prayer Concerns" would be cut off, plus artwork for To-do,
  Accounts and Settings.

### Changed
- **A person's record reads as a record.** Facts are grouped in plain language
  — "12 March 1990 · 35 · Female · Single" is one fact and belongs on one line
  — with one Edit button for the whole thing. The two-column grid of boxed
  rows, each with its own hover pencil, was the add form's shape borrowed for
  reading: a screen and a half to say very little, asking which field you meant
  before you had decided you were editing anything.
- **`/members/:id` is a focus route.** One record is a task, and the chrome
  around it cost a topbar and a bottom bar's worth of a phone screen. The page
  carries its own way back.
- **The attention badge counts instead of pointing.** Naming every gap turned
  the roster into a wall of amber sentences; a bare icon said nothing on a
  phone, where no hover reveals a tooltip. The record names which.
- **Search on People is a mode, not furniture** — opened from the plus button,
  focused on open, Escape closes, and closing clears the query, because a bar
  you cannot see must not still be filtering the list. The summary tiles hide
  too, remembered per device.
- **The email digest switch comes off the bell.** `api/email.js` has always
  treated the digest as opt-out, so an account that touches no setting already
  gets one. A switch that only ever turned off the default made it look like a
  subscription.
- The last "member" labels — add drawer, export dialog, drawer headings — now
  read "person", finishing the vocabulary change.

### Fixed
- **An installed app is no longer left on an old build.** `sw.js`, the shell
  and the manifest are served `must-revalidate` and the hashed assets
  `immutable`; a phone holding a cached service worker could go on serving a
  build from weeks ago, which is why a reported bug and the code in `main` kept
  disagreeing.
- **`InlineEditField` no longer renders every field in edit mode on its first
  pass.** `fieldId` is only assigned on mount and `activeEditId` starts null
  too, so a bare equality check matched before there was an id to tell them
  apart.

### Removed
- **Address is no longer a missing detail.** The church does not need one to do
  anything for the person, and flagging it made most of the roster look
  incomplete over something nobody was going to chase. Still on the record for
  anyone who wants to fill it in.

## [0.13.0] — 2026-09-07

Special Sundays stop arriving on the calendar twice.

### Added
- **Occasions can be pinned to a date.** An occasion marks the service its
  schedule already generates — communion on the first Sunday is the Sunday
  service, not a second thing at the same hour — but it could only be written
  as a week-of-month ordinal. Half the church calendar is not cyclical:
  Christmas, the anniversary, the Sunday Grandparents Day or Teacher's Day or
  Pastor's Appreciation is being kept on. None of those is "the fourth Sunday"
  in a way that survives to next year, so an occasion now also carries `dates`,
  matched against the day outright. Either rule will do, or both.
- **The occasion editor checks the weekday as you type.** Christmas Day 2026 is
  a Friday: a Friday saved against a Sunday service would mark nothing and only
  be noticed in December. The field says the date misses and offers the nearest
  day the schedule does meet.
- **`scheduleFallsOn`** in `lib/occurrences.js`, which the editor uses for that
  check. It answers whether a schedule generates an occurrence on a given date,
  weekday and week-of-month together.

### Changed
- The Occasions help text in Settings names the two ways to say when, and says
  plainly that there is still one calendar entry and one attendance sheet.

### Notes
Three mechanisms now overlap, and which one is right depends on what the
special Sunday actually is:

- It only changes **what the service is called or what happens inside it** —
  greeting the grandparents, honouring the pastor: an **occasion**. One entry,
  titled `Sunday Service · Pastor's Appreciation`. Attendance is unaffected,
  because the occurrence id does not change.
- That one week **moves or is off** — different time, different venue,
  cancelled: **edit or cancel the occurrence**, which writes an override
  replacing the generated entry. Still one entry.
- It is a **separate gathering** — a Christmas Eve service, a party on the
  Saturday: **add an event**. Two entries, correctly, with their own
  attendance.

A dated occasion belongs to the year it names; the editor shows the year on
each chip for that reason. `useRecurringEvents` expands the current year only,
so next year's Christmas Sunday is set next year — a `MM-DD` repeat would drift
onto weekdays and silently stop marking anything.

## [0.12.0] — 2026-09-06

Finances returns, rebuilt around a cash book rather than the transaction list
that came out in 0.7.0.

### Added
- **A Finances page at `/finances`**, behind a new `finances` capability, with
  the `finances.view` permission area alongside the rest.
- **A month at a time, as a book.** Entries carry a running balance rather than
  standing alone, so the question a treasurer actually asks — what was in hand
  on the 14th — is answered by reading down the column.
- **Two accounts, Cash on Hand and Bank.** A transfer moves between them and is
  neither income nor expense: the two halves cancel, because the church is no
  richer for having moved its own money into the bank.
- **Opening balances**, dated. Entries before that date are pre-history and are
  not counted twice — the opening figure already is their sum.
- **A statement for the month**, rolled up by the chart of accounts, with
  export. Groups with nothing in them are left off: an empty line on a
  statement is noise, not information.

### Changed
- `HOME` and the navigation gain Finances; the sidebar, bottom bar and
  catalogue pick it up from `src/data/navigation.js` without further wiring.

## [0.11.0] — 2026-09-06

Every page in the app gathered onto one screen, and one list behind the three
places that navigate to them.

### Added
- **A catalogue at `/home`**, and it is where signing in now lands. Each page
  is a tile with a plain sentence saying what you would open it for — a grid of
  names would tell you nothing the sidebar does not.
- **`src/data/navigation.js`** — the sidebar, the bottom bar and the catalogue
  read their items from here. They each kept their own copy before, and the
  copies drifted: Presentation was in the sidebar and missing from the bottom
  bar, so on a phone the tech team could not reach the projector from the
  navigation at all.
- **Painted icons** for thirteen of the pages, drawn in the church's red and
  blue. Anything without artwork still falls back to its line icon, so a page
  added tomorrow needs no drawing before it can appear.

### Changed
- **The bottom bar's centre button opens the app drawer** and wears the church
  logo rather than a grid glyph. It is the one thing on the strip that does not
  look like a tab, which is the point: it opens a chooser rather than going
  somewhere. The drawer lists the whole catalogue, including the four tabs
  already on the bar — a dock does not hide the apps that are in it.
- The sidebar's logo is now the way back to the catalogue. The catalogue is not
  in the nav list itself, because it would then have to list itself.
- `HOME` is `/home` rather than `/dashboard`, and carries no capability on
  purpose: every "denied" redirect lands there, so a page that could itself be
  denied would bounce forever.

### Removed
- The dark-mode twin of the presentation icon, and the `artFor` helper that
  chose between an icon and its twin. The new artwork carries its own red and
  blue and holds up on a light page and a dark one, so no icon needs a variant.

## [0.10.0] — 2026-09-05

A backlog for the app itself — what is broken, what is wanted, and who is on
it — kept apart from the church's own to-do list.

### Added
- **A To-do page at `/todo`**, administrators only. Tickets are filed as a Bug,
  a Feature or a Chore: the same three words the commit messages already use,
  so a ticket and the commit that closes it are filed alike.
- **A ticket is moved rather than ticked.** Start takes it and begins, Pause
  keeps it yours while you are elsewhere, Stop puts it back for anyone, Done
  closes it. "Not right now" and "no longer mine" are different facts, and a
  checkbox could express neither.
- **The order is the priority.** The list is dragged rather than labelled —
  there is no urgent/high/normal — so second is second rather than "also high".
  The grip appears only on the unfiltered list, because reordering three rows a
  filter happens to show says nothing about where they sit among the rest.
- Kind pills, and a search reaching state, assignee and kind, so "paused" or a
  person's name narrows the list.

### Changed
- Tickets ride in the `tasks` collection under `scope: 'dev'` rather than a
  collection of their own. A new collection needs a Firestore rule written by
  hand before its first write lands, and that is a trip nobody should make to
  file a bug against their own app. Both subscriptions filter on the marker, so
  neither list shows the other's rows.
- `build-ui-icons.mjs` now also resolves Phosphor's fill weight, for any name
  ending `Fill`. A stop button is a filled square; the outlined one reads as an
  empty box.

## [0.9.3] — 2026-09-04

### Removed
- **"Notes for the team" on a service.** The textarea in the drawer, the block
  on the panel, and `notes` on the service itself. A Sunday having notes no
  longer counts towards it being planned.
- The per-song note — "opener", "key change on last chorus" — is untouched;
  that one belongs to a song in the order, not to the service.

## [0.9.2] — 2026-09-04

### Changed
- **Editing is back in a drawer.** In-place editing put three pickers and a
  dozen inputs inside a panel meant to be read. The focused service is now a
  display panel with one Edit button; the drawer opens over it with room for
  the song picker and the member search, and closes again.
- Autosave goes with it — the drawer saves on Save, as it did before.
- The panel reads better for it: leader, band, the order with keys, notes, each
  under its own heading, and the "You're leading" summary still on top.

### Kept
- The focus-plus-rows month, one permission, and the worship-ministry band
  filter are all unchanged.

## [0.9.1] — 2026-09-04

### Fixed
- **The service panel rendered no controls at all** — no Add songs, no Add to
  band, nothing, for anyone including administrators. Its immediate watcher ran
  during setup and reset five refs that were declared below it, so the whole
  setup threw in their temporal dead zone. The refs now come first. Nothing to
  do with permissions, which were working the whole time.

## [0.9.0] — 2026-09-04

Lineups goes back to one permission. Leading a Sunday is a view, not a rank.

### Changed
- **One gate for the whole page.** Anyone granted Worship lineups in Settings
  edits all of it — who leads, who is on the band, and which songs they use.
  Administrators bypass the check as they always did. The two-tier split from
  0.8.0, where only a Sunday's named leader could touch its songs, is gone.
- **Leading this week changes what you see, not what you may do.** Your service
  opens first, carries a "You're leading" badge, and gains a summary line: how
  many songs, who you are playing with by name, and what is still unsettled —
  "no band yet", or "Ready to go".
- A draft month is again visible only to those who can plan it.

### Removed
- `canEditRoster` / `canEditSongs` and the merge-on-save that existed to stop
  one tier overwriting the other. A single `canEdit` replaces both.

## [0.8.3] — 2026-09-04

Lineups rebuilt around one service at a time.

### Changed
- **One service is open, the rest are a line each.** The page was a scrolling
  stack of fully expanded Sunday cards — leader, theme, five songs with keys, a
  band of ten, a note — so both the head and a leader scrolled past three
  irrelevant services to reach the one they came for. The service you came for
  opens by itself: the next one you are leading, else simply the next one.
- **Planning happens in place and saves itself.** The full-screen drawer is
  gone; so is the Save button. Editing no longer covers up the month you are
  planning against.
- **Past services fold away.** Mid-month they were costing half the scroll for
  Sundays nobody can change.
- **The roster is a line you can open**, not two wrapped rows of a dozen chips
  on every visit. The month line itself now reads "3 of 4 planned · 2 still
  need a leader", or "· you're leading 2".
- Compact rows say leader, song count, band size and theme, and flag a missing
  leader — to the head, who can act on it.

### Removed
- `LineupSundayCard.vue` and `SundayEditorDrawer.vue`, replaced by
  `LineupServicePanel.vue` and `LineupServiceRow.vue`.

## [0.8.2] — 2026-09-04

### Changed
- **The band picker offers the worship ministries, not the congregation.** Song
  Leader and Instrumentalist — which between them are the band — instead of
  every member of the church. Filtered on `ministries`, never `tags`, for the
  reason already recorded on `songLeadersFrom`: tags are free text, and reading
  them would let a label spell its way onto the band.
- The picker says which list it is showing and keeps a "Show all members" way
  out for a visiting musician or a church that names these jobs differently.
  If nobody is rostered in a worship ministry at all it lists everyone with a
  note saying so, rather than offering an empty list.

## [0.8.1] — 2026-09-04

### Removed
- **Month notes.** The whole-month notes box, its save button and `setNotes`
  are gone, and `notes` is no longer part of the month's shape. Per-service
  "Notes for the team" is untouched — that is the one attached to a Sunday
  someone is actually playing.

## [0.8.0] — 2026-09-04

Lineups now has two people in mind instead of one: the worship ministry head
who staffs a service, and the leader who then plans its songs.

### Added
- **Being named a Sunday's leader grants editing it.** A song leader can plan
  her own service's songs, theme and notes without the run of the month — no
  `lineups.manage` needed. She sees the band she is playing with, read-only,
  and the leader field that put her there.
- She can also open the month while it is still a draft, which is how the
  sequence works: the head staffs the month, the leaders fill in songs, and
  only then is it published. Everyone else still sees "Not published yet".
- **Role-aware prompts.** A card says "Tap to assign a leader and band" to the
  head and "Tap to choose your songs" to the leader, and carries a "You're
  leading" badge on the viewer's own services. The month summary says
  "2 still need a leader" to the head and "You're leading 2 services this
  month" to a leader.

### Changed
- A leader's save writes back only songs, theme and notes, merged onto what is
  stored at that moment, so it cannot overwrite a band the head reassigned
  while her drawer sat open.
- Clearing a service stays with the head: it wipes the leader and band too.

### Removed
- **"Add another service date".** The month is the calendar's Sundays. Any
  off-Sunday date already stored is still shown and still editable — the page
  simply no longer offers a way to add one. Drops `addServiceDate`.

## [0.7.4] — 2026-09-04

The band half of a lineup, and a shorter road from a missing song to YouTube.

### Changed
- **Lineups shows the band by name.** A Sunday card used to reduce the players
  to four 20px avatars and a "+2" — it told you a lineup had people in it
  without telling you who. They are now named chips under a Band heading, with
  "No band assigned yet" when the roster is still empty, and the songs above
  them got a heading of their own so the card reads as the two things a lineup
  actually is.
- **The month summary counts playing as well as leading.** Leading and On the
  band are listed apart, because four Sundays on the drums is not four Sundays
  out front, and the drummer playing every week is what a planner needs to see
  before publishing. Adds `bandLoad` alongside `leaderLoad`.
- **Search YouTube now sits next to Clear filters** when a song search comes up
  empty. The offer already existed but was stranded below a screenful of empty
  state; the songbook not having a song is the usual reason to reach for
  YouTube, so the two moves belong together. Listed first, since the song
  usually exists and simply is not saved yet.

## [0.7.3] — 2026-09-04

Choosing a service became a list instead of a column.

### Added
- **A services list at `/present`** — the next service as a card of its own,
  then what is coming up, then past services. Each row says how many songs the
  lineup holds and whether a run sheet has been prepared or the Sunday is still
  following the lineup alone.
- `subscribeToServicePlans` — the whole plans collection, so the list can say
  which Sundays are prepared.

### Changed
- **The presenter's service sidebar is gone.** A church runs one service a
  week; nobody switches mid-Sunday, and the column cost space the run sheet
  wanted. The presenter is now about one service, named in its header, reached
  from the list at `/present/<date>`.

## [0.7.2] — 2026-09-04

Presentation became a place of its own, and the run sheet stopped needing to be
saved.

### Added
- **Presentation in the sidebar**, next to Lineups. The tech team goes straight
  there on a Sunday instead of reaching it through the worship team's page.
- **Its own services sidebar** inside the page, listing every Sunday with a
  lineup and its song count — a column on the booth laptop, a scrolling strip
  on a phone. Replaces the date dropdown that was competing for space in the
  header with the controls needed mid-service.
- The chosen service now lives in the URL, so a refresh in the booth comes back
  to the same Sunday and a link can name one.

### Changed
- **The run sheet saves itself.** Adding a reading, removing an item or
  reordering the service persists on its own after a moment; the Save button is
  gone. A Sunday morning is no time to remember to press it, and forgetting it
  lost the work on the next reload.
- **Songs are inherited from the lineup rather than snapshotted from it.** The
  run sheet used to be seeded once and then go its own way, so a song the
  worship team added on the Saturday never reached the booth. Now inherited
  songs arrive when the lineup gains them and leave when it drops them, while
  readings, notices, videos and any song the tech team added themselves stay
  exactly where they were put.
- The plan subscription is now released when the page closes.

## [0.7.1] — 2026-09-04

Scripture on the wall. A reading is now found rather than typed: the operator
gives a reference and the verses come out of the translation.

### Added
- **Bible readings in the run sheet.** The scripture item type, which already
  existed, now takes a reference instead of pasted text. `Juan 3:16`,
  `jn 3.16`, `1 Cor 13`, `Mga Awit 23`, `Gen 1:1-2:3` all resolve; an
  ambiguous abbreviation is refused by name rather than guessed at.
- The translation ships as static JSON in `public/bible/MBBTAG/`, one file per
  book, fetched on demand (2-89 KB gzipped) and cache-first thereafter, so a
  service whose passages have been looked up once projects with the wifi down.
- Verses break into slides a whole verse at a time and never mid-sentence, six
  lines of forty characters, with the reference captioned under the words on
  every slide of a reading.
- `npm run sync:bible` turns a scrape in `data/bible/` into the shipped JSON
  and the generated book table.

## [0.7.0] — 2026-09-04

The worship-and-work release: songs became a real module with a projector
attached, and the church's to-do list moved into the app. Finances came out.

### Added
- **Songs**: full-screen song editor (`SongDetails`), AI-assisted song lookup
  and lyric-structure parsing (`/api/song-lookup`, `/api/lyrics-structure`),
  YouTube search (`/api/youtube-search`).
- **Presentation**: `Present` (the tech booth, keyed by service date) and
  `PresentOutput` — a chrome-free second-screen window for the congregation.
- **Tasks**: a module of its own — list, quick add, drawer, toolbar, filters.
- **Public site**: `/api/public` plus `publicSiteService`, so the public page
  serves real church data instead of falling back to built-in defaults.
- **Service plans**: `servicePlansService`, for running a service in order.
- **Audience targeting**: `AudiencePicker`, `lib/audience.js`, age bands, and
  bulk ministry assignment (`BulkAssignSheet`, `MemberBandHeader`).
- Shared `batchWrite` helper, detail-aware search util, drag-reorder composable.
- Bible scraper (`scripts/scrape_bible.py`) for a future scripture feature. Its
  189 MB of output is gitignored — publisher-copyrighted text.

### Changed
- API handlers are served during `npm run dev` by a Vite middleware plugin, so
  the public page and song search work locally. `/api/notify` and `/api/email`
  stay Vercel-only on purpose: a dev session must not ring every phone.
- Members, events, attendance and lineups reworked around shared composables.

### Removed
- **Finances** — views, ledger, transactions, opening balances, statement
  reports, audit, export and chart. **Breaking**: `finances.*` capabilities and
  the `/finances` routes are gone.

## [0.6.0] — 2026-08-30 (`461345a`)
Finances rework and recurring schedules. Ministry tags admin, public landing
page admin, email digests (opt-out by default), Phosphor icon pipeline,
member/event/attendance composables, `jose` pinned to v5 so `firebase-admin`
loads on Vercel.

## [0.5.0] — 2026-08-12 (`3523341`)
Login and registration on Firebase auth. Navigation and calendar reworked,
sidebar minimize, themed scrollbars, accessibility passes across views.

## [0.4.0] — 2026-07-19 (`abbb50d`)
The app became installable: PWA support, FCM push notifications, deploy
tooling, notification history with an unread badge, high-urgency webpush with a
vibration pattern, and a live database dashboard on Home.

## [0.3.0] — 2026-07-16 (`8ca1572`)
Mobile-first pass — bottom bar, detail drawers, `useMediaQuery`, a shared
`SearchBar`, and primary-color variables in place of hard-coded classes.

## [0.2.0] — 2026-04-05 (`a77bd8e`)
Toasts, the calendar view and its date composable, the gallery module on
Firestore, and the first finance and presence modules with sidebar navigation.

## [0.1.0] — 2026-01-24 (`0b5a5c9`)
First working app: members, attendance and minutes on Firebase, deployed to
Vercel, with dark mode and themed transitions.
