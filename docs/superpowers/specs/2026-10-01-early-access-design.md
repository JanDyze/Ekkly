# Early-access mode

Ekkly is going into a testing phase before it charges anyone. Pilot churches
will use it for real, for free, and a public demo will let anyone try it. That
work is split into three pieces, each with its own spec, plan and build:

| | Piece | Status |
|---|---|---|
| **A** | **Early-access mode**: one console switch that makes Ekkly free and hides every price and payment | This spec |
| B | Pilot readiness: open access becomes a per-church setting (on for UEC, off for new churches), the permission path is checked end to end, and a "Send feedback" link is easy to find | Next |
| C | Public demo: "Try the demo" gives each visitor a private, throwaway sample church on `demo.<root domain>`, using anonymous sign-in, deleted after two days | Last |

## Goal

While early access is on, nobody visiting the front door or running a church
sees a price, a trial or a way to pay, and no new card can be added. Turning it
off brings billing back exactly as it is today, without changing any code.

## The switch

- **Storage.** A new `billing: { earlyAccess: boolean }` block in
  `platform/public`. It is public because the front door needs it before
  anyone signs in.
  - A missing block counts as `false`, so nothing changes until the switch is
    turned on.
  - Add `withBillingDefaults` and `billingForStorage` beside the other
    `platform/public` helpers in `lib/platformDefaults.js`.
- **Saving.** A new `saveBilling(admin, { billing })` in
  `lib/platform/config.js`, written through the existing `commit()`.
  - It is registered as a platform action in `api/platform.js`.
  - It logs `billing.save` with the label "Early access turned on" or "Early
    access turned off".
  - `readConfig()` returns `billing`.
- **Console.** A switch at the top of **Apps & prices**
  (`AppCatalogAdmin.vue`). Wording:
  - Label: "Early access"
  - Line under it: "Ekkly is free. Prices and card payments are hidden, and
    new churches start free."
  - Turning it **off** asks first, using `ConfirmationModal`
    (`src/components/common/`), as `CardBillingCard.vue` does: "Turn
    off early access? Prices and Pay by card come back on the front door and
    in every church's Settings."
  - Turning it **on** needs no confirmation.
- **Browser.** `usePlatformConfig()` returns `earlyAccess` (a computed
  boolean). Every surface below reads it from there and from nowhere else.

## What it changes while on

| Surface | File(s) | Change |
|---|---|---|
| Front door, Pricing section | `src/views/PlatformHome.vue` | Replaced by an **Early access** section. Eyebrow: "Early access". Title: "Free while we build it with you". Lead: "Every app, for every church that joins now. We'll tell your administrators at least 30 days before anything costs money." Three points: "Every app included", "No card needed", "Nothing you add is ever lost". The button goes to `/start`. The "Your plan so far" panel is not shown. |
| Front-door links to Pricing | `PlatformHome.vue` (lines that link to `/pricing`), `FrontDoorHeader.vue`, `FrontDoorFooter.vue` | The Pricing links and the plan total in the header button are hidden. |
| `/pricing` | `src/router/index.js` | Redirects to `/start`. Platform config has loaded before mount (`main.js`), so the guard can read it synchronously. |
| Get started | `src/views/PlatformStart.vue` | The plan block ("Your plan: N apps, ₱X a month" and "Change plan") is hidden. A request carries no plan. |
| FAQs | `src/components/frontdoor/faqs.js` | "How do we pay?" and "What happens after the free month?" become one question, "Is it really free?". Answer: "Yes, during early access. Every app is free for churches that join now. We'll tell your administrators at least 30 days before anything costs money, and nothing is ever charged without a card you add yourself." |
| Terms | `src/components/frontdoor/legal.js` | The section "The free month, and paying" becomes "Early access", with three points: Ekkly is free to use while in early access; administrators are told at least 30 days before any charge; nothing is charged without a card the church adds itself. |
| Settings → Apps & plan | `src/components/settings/PlanAdmin.vue` | The app switches stay. Prices, the monthly total, the "Trial ends" and "Paid through" rows, and the billing badge are hidden. A "Free during early access" badge (accent tone) takes the badge's place. |
| Pay by card | `src/components/settings/CardBillingCard.vue`, rendered by `PlanAdmin.vue` | Not shown, **unless the church already has a card on file**. Such a church keeps the card section, so its administrator can see the card and stop it. |
| Console church pages | `ChurchesAdmin.vue`, `PlatformChurch.vue`, `ChurchBillingCard.vue` | No change. Platform admins still see each church's real status. |

Every changed surface still has to work at phone width and in dark mode, as
DESIGN.md requires. Copy follows BRAND.md's voice: sentence case, and the
church's link is called a link.

## Server behaviour

- **New cards.** While early access is on, `startCardBilling`
  (`lib/platform/payments.js`) refuses with "Card payments are paused during
  early access." It reads the flag through `getPlatformPublic()`, so a change
  takes up to a minute to reach the server.
- **Existing cards.** `syncCardBilling`, `cancelCardBilling`,
  `repriceCardBilling` and the PayMongo webhook do not change. A card that is
  already on file can always be seen, stopped and kept correctly recorded.
- **New churches.** In `approve` (`lib/platform/requests.js`), while early
  access is on, the church's `subscription/billing` is written as
  `status: 'free'` with `paidThrough: ''`, whatever `trialDays` says. While it
  is off, approval writes the trial exactly as it does now.
- **Nothing else** changes in `api/` or `lib/`, and no new file is added to
  `api/`.

## Existing churches, and turning it off

- **No stored data changes.** A church on a trial keeps its trial in the
  database. Its administrators see "Free during early access" in Settings. To
  make a church properly free, a platform admin sets it to Free on the church's
  console page, using the control that already exists.
- **Turning it off** brings back every price, the Pricing page and Pay by card.
- **Churches approved during early access stay Free** until a platform admin
  changes each one by hand. This is deliberate: turning the mode off never
  starts charging a pilot church by surprise, and keeps the 30-day promise in
  the hands of whoever turns charging on.

## Out of scope

- Real prices. The ₱1 placeholders stay in the catalogue and are hidden while
  early access is on.
- Any bulk "make every trial church free" action.
- Pieces B and C.

## How it is checked

There are no automated tests, so:

1. Run `npm run build`; it must be clean.
2. On `npm run dev:all`, with the switch **on**:
   - the front door's Early access section, at phone width and in dark mode;
   - no Pricing links, and `/pricing` lands on `/start`;
   - `/start` shows no plan block;
   - the FAQ and the terms show the early-access wording;
   - Settings → Apps & plan, as an administrator: app switches are there, with
     no prices, dates or card form;
   - the same page for a church that has a card on file still shows the card
     section;
   - approving a test church request writes `subscription/billing.status ==
     'free'` with no `paidThrough`;
   - a direct `startCardBilling` call is refused with the message above.
3. With the switch **off**: every surface above looks as it does today.
4. The console's Activity log shows "Early access turned on" and "Early access
   turned off".
5. The CHANGELOG entry, written for churches, goes in through `/commit`.
