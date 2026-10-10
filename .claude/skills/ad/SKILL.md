---
name: ad
description: Make a Facebook or Instagram ad or post for Ekkly — pick the one idea, write the copy for every placement, build the picture from the templates in marketing/, render it to PNG and check it. Use when the user says "make an ad", "an ad about <app>", "a post for the page", "a story", "a reel cover", "some ads", or "another version of <ad>".
---

# Make an ad

The rules are in `marketing/CLAUDE.md`. Read it, then `marketing/FACTS.md`,
`marketing/LEARNINGS.md` and the top of `marketing/LOG.md` before writing a
word. LEARNINGS beats habit: if it says a kind of hook flopped, don't write
that hook again.

Asked for several ads, make each one fully — brief, pictures, render, look —
before starting the next. Ten half-checked ads are worth less than three
finished ones.

## 1. Settle the brief

Say in one line each, and only ask the user what can't be inferred:

- **The one idea.** One benefit a church feels, from FACTS.md. Not a feature
  list, not two ideas.
- **For whom.** A pastor, a worship leader, a treasurer, a secretary, a
  small-group leader. The idea should be theirs.
- **Paid or unpaid.** A paid ad follows Meta's ad rules (CLAUDE.md → Rules); a
  post on the page can be warmer and longer.
- **Language.** English, Tagalog or Taglish — the whole ad in one.
- **Placements.** Feed (4:5) by default; add a story when it's paid or the
  user asks.

Don't repeat an idea LOG.md shows went out in the last month unless this is a
deliberate variant of it.

## 2. Write the copy

In `marketing/ads/<YYYY-MM-DD>-<slug>/brief.md`, following the example in
`marketing/ads/2026-10-09-sunday-scramble/brief.md`: the brief, then primary
text, headline, description, button and the UTM link, and an unpaid caption
if it will be posted too.

Write two or three hooks and keep the one a tired volunteer would stop for.
The words on the picture are fewer than the words in the copy: the picture
carries the benefit line and at most three wins.

End the brief with **Checked**: every claim's source in FACTS.md, no
attribute of the viewer asserted, no price unless confirmed, no real church's
data.

## 3. Build the picture

Copy a layout from `marketing/templates/` into the folder:

| Layout | When |
|---|---|
| `benefit.html` | One app: its artwork, the benefit, three wins. The default |
| `screen.html` | Showing is better than telling. Needs a screen (below) |
| `statement.html` | One line said plainly. Stories and reel covers |

Change words, the app artwork (`/src/assets/app-icons/<key>.svg`) and icons
(`<i data-icon="phosphor-name">`). Resize with the body class (`feed`,
`square`, `story`, `reel`) and the `ad-size` meta together. Styling goes in
`templates/ad.css` when it should apply to every ad, or a `<style>` in the
ad when it's only this one — never a hex value in an ad.

For a screen: start the app (`npm run dev`) on the showcase church named in
marketing/CLAUDE.md, never a real one, and take it at phone size:

```
node marketing/scripts/render.mjs shot "http://localhost:5173/<page>?church=<showcase>" marketing/ads/<folder>/screen.png
```

A variant (another headline, another picture) is a second file in the same
folder — `feed-b.html` — differing in one thing, so a test can tell what
mattered.

## 4. Render and look

```
node marketing/scripts/render.mjs marketing/ads/<folder>
```

Open every PNG in `out/` with Read and look at it as someone scrolling past
would. Check: the benefit reads in a second; nothing sits in a story's or
reel's covered bands; nothing overflows or wraps one word alone; the mark is
whole and uncoloured; nothing on BRAND.md's *What Ekkly is not* list crept in.
Fix and render again until it holds.

## 5. Record it

Add a row to the top of `marketing/LOG.md` with status `ready`. Tell the user
where the PNGs are, and give the copy ready to paste into Meta, placement by
placement. Don't commit unless asked; when asked, it's a `chore(marketing):`
commit with no version bump — ads don't change the app.
