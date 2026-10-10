# What an ad may say

Everything here is true of the app as of 2026-10-09 and traced to where it
lives. A claim not on this page gets checked in the code first, then added
here. When the app changes, change this page in the same commit.

## What Ekkly is

Ekkly is a church's records and Sunday work in one app: its people,
gatherings, songs, schedules, money and meetings. It opens in any phone's
browser and can be added to the home screen in a tap; nobody installs
anything from a store.

- **Its own link and colours.** Each church gets `<name>.ekkly.online`, its own
  logo, and its own colours and typeface. (TENANCY.md, `useBrandTheme`)
- **Kept apart and private.** Each church's records are separate, and only the
  people its administrators let in can open them. (`src/api/firestore.js`,
  `firestore.rules`)
- **Pay for what you use.** A church turns on only the apps it needs and adds
  more from Settings. Turning one off never deletes what is in it.
  (`lib/apps.js`)
- **Getting in.** A church asks at `ekkly.online/start`, Ekkly opens it, then
  the church brings its people in. It is approved, not self-serve, so the
  call to action is *ask*, never *sign up free in seconds*.
- **A free month**, then card payments, monthly or yearly for the price of ten
  months. Stop any time from Settings. (`src/components/frontdoor/faqs.js`)
- **Prices are not for ads yet.** Every app is ₱1 while payments are tried.

## The apps, as the front door words them

From `src/components/frontdoor/appDetails.js`. Prefer this wording; if an ad
improves on it, consider changing the front door too.

| App | The benefit | Wins |
|---|---|---|
| People | Everyone's details, one tap away | Find anyone's number in seconds · See who serves where · Never miss a birthday |
| Small Groups | Leaders stay on top of their group | Know who is in each group · Log a session from a phone · Print a form for paper-first leaders |
| Attendance | Know whether your church is growing | Count a service in a few taps · See the trend week to week · No more tally sheets |
| Events | Everyone knows what's on | Set up Sunday service once · Call off one date in a tap · The right people get notified |
| Song List | Plan worship from songs you know | Find a song by any line · Key and lyrics always at hand · No more lost song sheets |
| Schedules & Presentation | Sunday without the scramble | Everyone knows their role · Songs go straight to the screen · No more rosters in group chats |
| Bible | Tagalog and English, always open | Find a verse by a word you remember · Pick up where you left off · Show a passage on the screen |
| Minutes | Minutes done before you get home | Just type notes in the meeting · Written up for you by YUNIT · Print or export to file |
| Prayer Concerns | No prayer request forgotten | Every request in one list · Mark prayers answered · Celebrate answers together |
| Gallery | Every service's photos in one place | An album for each gathering · Upload straight from a phone · Show the best on your public page |
| Links | Stop re-sending the same links | Forms, giving and livestream together · Copy a link in one tap · One place your people can always find |
| Finances | The treasurer's report, done | Know what's in hand on any day · A monthly statement made for you · Export it for the council |
| Tasks | Nothing from the meeting slips | Give each job to a person · See what's overdue · Tick it off when it's done |
| YUNIT | Hours of typing, done for you | Minutes from rough notes · Lyrics laid out for slides · Ask about your church in plain words |

App artwork for each is `src/assets/app-icons/<key>.svg`, where the key is
`members`, `smallgroups`, `attendance`, `events`, `songs`, `lineups`, `bible`,
`minutes`, `prayer`, `gallery`, `links`, `finances`, `tasks` or `ai`.

## Details worth an ad of their own

- **The Bible ships in Tagalog (MBBTAG) and English (KJV, WEB)** and reads
  offline. The ESV and NIV appear only where their licence key is set — don't
  promise them.
- **YUNIT** writes minutes from rough notes, finds songs, lays out lyrics for
  the screen, and answers questions about the church's own records. It is a
  paid app, not part of every church.
- **The presentation screen** shows lyrics, verses and slides on the big
  screen from the same lineup the band reads.
- **A public page**: each church's link opens to a page about the church, with
  its photos, before anyone signs in.

## Not to claim

- Numbers of churches or members using it, time saved, or growth caused.
- "Free" without "for a month".
- Native app-store apps — it is a web app added to the home screen.
- Any feature still being built. If unsure, open the view in `src/views/`.
