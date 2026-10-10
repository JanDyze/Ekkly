# Marketing

Ekkly's ads and posts for its Facebook page and Instagram account. Nothing in
this folder ships with the app: Vite never imports it and Vercel only builds
`dist/`. It is here so the ads sit beside the product they describe, and so
every claim can be checked against the code.

## Read first

| Before | Read |
|---|---|
| Writing any line of copy | [FACTS.md](FACTS.md) — what Ekkly does, and what an ad may promise |
| Making anything | [LEARNINGS.md](LEARNINGS.md) — what has worked and what has not |
| Choosing what to make next | [LOG.md](LOG.md) — what has already gone out |
| Anything visual | [../BRAND.md](../BRAND.md) — the mark, the four colours, what Ekkly is not |

Use the skills rather than doing these by hand: `/ad` makes ads, `/ad-plan`
plans a run of them, `/ad-results` records how they did.

## Layout

```
marketing/
  CLAUDE.md        these rules
  FACTS.md         claims an ad may make, each traced to the app
  LEARNINGS.md     what worked and what flopped, kept up by /ad-results
  LOG.md           every ad and post, one row each
  templates/       ad.css, ad.js and the starting layouts
  ads/<date>-<slug>/
    brief.md       who it is for, the one idea, the copy for every placement
    feed.html      1080×1350, plus story.html, square.html as needed
    *.png|webp     screenshots or pictures the ad uses
    out/           rendered PNGs (ignored by git; re-render from the HTML)
  scripts/render.mjs
```

One folder per ad, named `YYYY-MM-DD-short-slug` by the day it was made. A
variant of the same idea (another headline, another picture) is another HTML
file in the same folder, not a new folder, so a test stays together.

## Rendering

```
node marketing/scripts/render.mjs marketing/ads/<folder>     # every .html → out/<name>.png
node marketing/scripts/render.mjs serve                      # preview at http://localhost:4178
node marketing/scripts/render.mjs shot <url> <out.png> 390x844 3
```

It drives the Chrome or Edge already installed, headless, and serves the repo
root while it runs, so an ad links the real mark, app artwork and icons by
path (`/public/ekkly-mark.svg`, `/src/assets/app-icons/<app>.svg`) instead of
copying them. `shot` photographs any page — usually the dev app
(`npm run dev`, `?church=<id>`) — at phone size for an ad to frame.

An ad's size is its `<meta name="ad-size">`. Look at every PNG before calling
an ad done.

## Placements

| Placement | Size | Keep clear |
|---|---|---|
| Feed, Facebook and Instagram | 1080×1350 (4:5) | Nothing, but the first 125 characters of text are all most people see |
| Square, when a post needs it | 1080×1080 | — |
| Stories | 1080×1920 (9:16) | Top 250px and bottom 340px: the profile bar and the reply box sit there |
| Reels cover | 1080×1920 | Bottom 670px: the caption and buttons cover it |

Copy for a paid ad, per placement:

- **Primary text**: the hook in the first line, within 125 characters. The
  rest is optional and mostly unread.
- **Headline**: under 40 characters. The benefit, not the product name.
- **Description**: under 30 characters, or leave it empty.
- **Button**: *Learn more* for a cold audience; *Sign up* only once the
  start page is the destination.
- **Destination**: `https://ekkly.online/start`, with
  `?utm_source=facebook|instagram&utm_medium=paid|organic&utm_campaign=<folder>`
  so LOG.md can say which ad brought a church in.

## Rules

**Ads follow the brand.** Ads are Ekkly's own surface, like the front door, so
they wear Ekkly's identity and the default accent, not any church's. The mark
is never recoloured, outlined or set flat; on a coloured ground it sits on a
white tile. The wordmark is Poppins 500. Text is Inter (one of `BRAND_FONTS`),
headings `font-weight: 900` in ink. The four pane colours, if used, go warm
over cool. Colours are the variables in `templates/ad.css`, not hex in an ad.

**None of the SaaS look.** The list in BRAND.md → *What Ekkly is not* applies
to every ad: no blurred blobs, dot grids, gradient words, badge chips over a
headline, frosted panels, glowing buttons, or sparkle and wand icons for
YUNIT. Real app screens and the app artwork beat any illustration.

**A benefit, then a few practical wins.** One line saying what changes for the
church, then at most three wins of three to seven words. No paragraphs on the
picture. Lift wording from `src/components/frontdoor/appDetails.js` when it
fits — the front door and the ads should sound like one voice.

**Only what is true today.** Every claim is in FACTS.md or is checked in the
code before it is written. No invented numbers ("saves 5 hours a week"), no
"#1", no "trusted by hundreds of churches" until it is.

**No made-up people or churches.** A testimonial, a church's name or logo, or
a member's face appears only with that church's written OK, noted in the
brief. Screens come from the showcase church (below), never a real church's
members — that is their personal data.

**Talk about churches, not about the viewer's faith.** Meta refuses ads that
assert or imply a personal attribute of the person reading, religion
included. "For churches that still count on paper" is fine; "Are you a
Christian?" or "As a believer, you…" gets the ad rejected. This applies to
paid ads; an unpaid post on the page is freer but should still sound like
Ekkly.

**Don't plan on religious targeting.** Meta removed detailed targeting by
religion, so audiences are built from location (the Philippines first), broad
targeting, people who engage with the page, and lookalikes of them. There is
no Meta Pixel on ekkly.online; adding one changes the cookie banner and
privacy page, so it is the owner's decision, not an ad's.

**Prices only when confirmed.** Every app is ₱1 while payments are being
tried. The launch prices in `lib/apps.js` are a plan, not an offer. An ad
quotes a price only when the owner has said it is live.

**Names.** Ekkly with a capital E. The assistant is YUNIT — never "AI-powered",
Claude, or a model name. Say *link*, not address, for a church's
`<id>.ekkly.online`. Sentence case everywhere.

**Language.** Most churches Ekkly is for are Filipino. Each brief picks
English, Tagalog or Taglish and keeps the whole ad in it. Write Tagalog the way
a church volunteer would text it, not as a translation.

## The showcase church

Screens for ads need a church whose members, songs and money are made up but
look real: Filipino names, a believable Sunday lineup, a month of
attendance. It does not exist yet. Until it does, an ad that needs a screen
waits, or asks the owner which church to create and fill. Once it exists,
write its id here.

## After an ad is made

Add a row to LOG.md with status `ready`. When it goes out, the owner (or
`/ad-results`) changes it to `live` with the date; when results come in,
`/ad-results` records them and moves anything learned into LEARNINGS.md.
