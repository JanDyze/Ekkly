# Design

How a page in Ekkly looks and behaves, so every page reads as part of the same
app.

**The reference page is People** ([src/views/Members.vue](src/views/Members.vue)).
Version 0.21.0 brought Events and Gallery in line with it. If you're unsure how
something should look, copy People. If a page disagrees with this guide, the
guide wins, and the page is listed under [Known drift](#known-drift) until
it's fixed.

## Principles

These are decisions the app has already made. Most are recorded in
CHANGELOG.md.

- **One accent colour.** `primary` is the only accent on a page. A category's
  own colour, such as a gathering's, appears as a small stripe, dot or badge,
  never across the whole page.
- **No summary tiles at the top.** Counts belong on the headings they count.
  The only thing that stays at the top of a page is something that asks the
  user to act, like gatherings still to record.
- **Say each thing once.** Don't repeat in a tile what a section below already
  shows.
- **Phone first.** Most use happens on a phone. A desktop gets more room, but
  the same page.
- **Hide what someone can't do.** Don't show a disabled Add button to someone
  without manage rights. Keep `disabled` for forms that aren't valid yet.
- **Red means gone or dangerous:** delete, overdue, cancelled, postponed.
  **Amber means needs attention:** a record with missing details.
- **Search before filters.** A search box that matches names, tags and
  statuses is better than a filter drawer.

## The shell

`src/layouts/AdminLayout.vue` wraps every signed-in page:

- **Every screen:** the top bar, and on a desktop the people rail on the
  right. There is no sidebar: the home of all apps (`/home`,
  `src/views/Apps.vue`, `meta.root`) is the way between apps, and the top
  bar's mark is a back arrow to it from every other screen. On a phone, the
  bottom bar is there for whoever turns it on in Preferences: a floating
  island with the first four apps on their home, two either side of Ekkly's
  round mark, which opens every app. It floats a clear gap above the foot of
  the screen, held in from the sides, flat (its surface and a hairline, no
  shadow). While it is on, `--bottom-bar-space` is the room it takes (0
  otherwise; `style.css`): the shell pads an ordinary page by it, and the
  home, an app's screens, floating buttons and anything pinned to the foot
  add it themselves (`pb-bar`, `bottom-bar`, or the variable directly), so
  nothing ends up behind it. `with-bar:` styles what changes shape while it
  is on. The top bar's magnifying glass (and Ctrl+K, Ctrl+F, or "/")
  opens one search over everything (`SearchSheet`, `useGlobalSearch`): words
  first, meaning too once the person lets the small model onto their device.
- **The home of all apps** leads with a Today deck (`AppHeroDeck`, fed by
  `useToday`) drawn from every app, then the five apps the person keeps there
  drawn by `HomeAppCards` (`src/components/home/`) in one of six styles —
  accent lines, illustrated, compact, orbit, list, masonry
  (`src/data/homeCards.js`). The church picks one in Settings > Home and
  anyone can pick their own in Preferences (`useHomeCards`). Every style
  wears each app's colour from its own drawing (`src/data/appHues.js`),
  never the church's, so the day card above stays the one block of it; the
  three with room show the app's `tagline` from navigation.js. The page stands
  in a picture traced by hand (`src/components/home/HomeScene.vue`): its sky,
  clouds and Ekkly's panes of light behind everything, and in the room left
  under the apps the church on its hill, always whole, its window Ekkly's own
  mark (lit and glowing at night), with the day's verse on a
  frosted card beside it. Every colour in it is a `--scene-*` setting (a
  night set for dark mode), so it can be recoloured without redrawing.
  With Live sky on (Preferences, on by default; `useLiveSky`) the picture
  follows the time and weather over the church's own town instead of the
  theme: dawn, day, dusk or night from that day's sunrise and sunset, and
  clouds, rain, a storm or fog from Open-Meteo, all as `data-sky` and
  `data-weather` on its wrapper. To see a sky that is not overhead today,
  add `?weather=rain` (clear, cloudy, rain, storm, fog) or `?sky=night`
  (dawn, day, dusk, night) to the address: that page only, nothing kept.
  YUNIT has the same: `?yunit=wave,hide,jump` plays his actions one after
  another (any of `YUNIT_ACTIONS`, `hide` for hide-and-seek behind his
  bubble, `roam` for behind a card), with
  their sounds; `?yunit-mood=sleeping` holds him in a mood (any of
  `YUNIT_MOODS`); `?yunit-say=…` has him say a line. The
  verse steps aside on a screen too short for it, so the home never scrolls and a More apps tile. A section's tile inside an app is the
  same card in the same style (`HomeCard`, laid out by `AppShortcuts`),
  its artwork in full colour and a colour of its own given out in turn
  (`SECTION_HUES` in appHues.js), so an app's home is as lively as the home
  of all apps (BRAND.md). It is flat — a hairline ring and a fill, never a
  shadow — carries no arrow, and shows a badge only when something in it is
  waiting on you; what is inside is the section's to show and the deck's to
  point out. Holding one of the five shows
  what that app is, full screen, for as long as the finger stays down
  (`AppPeek`, `usePressAndHold`): the church's colour opens out of the tile's
  plate, the plate flies to the middle, then its name, its live line and its
  front-door headline and wins; letting go runs it backwards. A tap still
  just opens the app. More
  apps opens `/apps` (`AllApps.vue`): every app, the five on the home on a shelf, press
  and hold to drag one onto it. On a desktop it has a layout of its own,
  an app store's on a computer, under Ekkly's top bar (which names it and
  leads home, so the page has no header of its own; on a phone it takes the
  whole screen, useFocusMode): down the left, always in view, the search,
  Browse (All apps, each group with its count, Not on your
  plan for an administrator — picking one shows only that group) and under
  it the five on the home as rows, dragged into order by a grip on each
  (a mouse drags at once; a phone presses and holds), Reset beside their
  heading; beside them the store — the spotlight as a featured banner
  (headline, wins as chips, Open and a star, the artwork large on its
  plate), then each group as a heading with a line saying what it is for and
  its apps as app-store rows, as many columns as fit: the plate, the name,
  its tagline and its plain description. On both sizes the whole row opens
  the app, with no Open button, and a star at its end says whether it is on
  the home — filled, it is; outlined, a press puts it there. The order is the person's, saved to their
  account (`useAppOrder`). Anyone can choose instead to have every app on the
  home (App cards > Show every app, `useHomeCards`' `showAll`): no More apps,
  and the apps scroll in their own place so the home still fits the screen;
  the orbit, which holds six, is drawn as Compact's rows then.
  Wherever the apps stand right above the church and scroll (every app on a
  phone; the apps at the foot of the church's column on a desktop), the
  church is in front of them: their list keeps the hill's height free at its
  foot (`--church-room`), so at rest nothing is hidden, and scrolled, the tiles
  go down into the hillside while the hill grows a little from its foot, as if
  walking toward it. On a phone the tiles fade out as they near the church
  (`.apps-fade`, a gradient mask on the list), so only the sky is seen
  behind the hill and no tile's edge stands behind it like a cliff. On a
  desktop the apps panel stays solid to the column's foot, the church's land
  drawn in front of it: faded, the sky and its rainbow showed through the
  card. The room lets the pointer through to the tiles behind, but for the
  verse. The church can be turned off in Preferences ("Church picture",
  `useHomeChurch`, per person): on a desktop it is then gone from the board,
  and on a phone the room under the apps stays, on plain sky, for the verse
  and YUNIT.
  The home's apps are simply there when it opens: they do not rise into
  place one after another as an app's sections do (`HomeCard`'s `rise`,
  off in `HomeAppCards`), since it is the screen opened most.
  **YUNIT is on the home** wherever the church has him (`HomeYunit`), as a
  character standing on it, never a card or a panel. He stands large, so he
  is what is seen there. On a phone a frosted "Talk to YUNIT" button stands
  beside him, and what he says pops up over him. On a desktop his place is a
  whole row of a column, so a button alone left it looking empty: there he
  talks in a bubble that never goes (ringed in his colours, `yunit-ring`)
  — what he is saying, or between times the last thing he offered to be
  asked — and beside him are that question as a chip and "Talk"; the bubble
  opens the conversation too. His place is a size container: in a narrow
  column (left or right) the bubble runs the full width above him and the
  two buttons stand one above the other beside him; in a wide one the bubble
  stands beside him, the buttons under it. He is drawn over the bubble, so
  his umbrella lies over it. Where his place is just above the church, he
  stands on its hill instead (`perch`, a spot in the footer, below): on
  the ground left of the church, never in front of it, the church set a
  little right of its column's middle so the two of them are centred; his
  bubble and its buttons stay in his place, just over the hill, the buttons
  in a row or, under 20rem, one above the other. His place is as tall as he and
  his bubble are, and keeps that height while he is lifted out of it. The
  box to write in comes with the conversation (it is there at rest, unseen,
  so the button can focus it at once and a phone's keyboard comes up).
  Talked to, he shrinks to make room for it. Left alone, he plays: every
  twenty to forty-five seconds one thing (a jump, a wave, a peek, a look
  about, or, on a desktop, hide-and-seek: curling into a ball that shrinks
  away to nothing, with a swirl, and appears straight behind a card chosen
  at random, growing back as a ball with another swirl, already cut at its
  edge; he uncurls with only the side of his head and one eye showing (no
  hand; only his head peeks), whispers "psst", and stays until he is
  clicked, when he swirls away as a ball and appears home, popping out
  "Ta-da!"; he never hides behind his own bubble
  or ducks out of sight), only
  while someone is there and nothing else is going on, and dozes only after
  five minutes of quiet. Faces of his own for some of what he says: "whoa!"
  wide-eyed with a round "O" (`whoa`, at a rainbow, and among his tap
  reactions), "there we go" mouthed and then a pleased smile (`thereWeGo`,
  as his lantern catches). Tapped five times in two and a half seconds he
  gets cross (`grumpy`): his face flushes red, he scowls and frowns and
  says "nuh-uh" or groans, and taps do nothing (the pointer says so) until he calms,
  about five seconds on. Asleep and talked to, he
  wakes gently (`waken`), never with the start a tap gives him: the
  conversation opens over him. On a phone he stands at the foot of the screen (above
  the bottom bar when it is on), in the church's room to the left of the
  church and no wider than the verse card, so the church is always whole;
  the room keeps his height free (`--foot-space`, `--yunit-foot`), so no
  app goes behind him. On a desktop he has a place on the board like a
  panel's, anywhere in any column (`yunit` in `useHomeLayout`; a gap his
  height, handed to him as `anchor`). At rest he stands inside it, in the
  page's own flow (a Teleport into it), so he goes wherever the panels
  round it go and is never left standing on one; he is lifted out over the
  home only while carried or talked to. He stands at its
  right-hand end (`side`), the button to talk to him to his left. Last in a
  column, his place is pinned to its foot however short the panels above
  are, so he stands on the bottom of the screen; last in the church's
  column, just above the church. He starts under the week, beside the people
  rail. He is moved by picking him up: pressed and moved, he is startled and
  carried with his button under the pointer while the board shows the line
  he would land on, as for a panel (`HomeBoard`'s `hold`, `aimAt` and
  `drop`), and he lands with a jump; a press that does not move is still a
  tap on him. His button is a handle too: pressed and moved it carries him,
  and a click that does not move opens the conversation. His speech bubble is drawn on the page itself,
  following him, over the top bar (z-75), so it is never hidden under the
  bar or cut off by the top of the home. In the
  column next to the rail, the rail opening squeezes the board and carries
  him left, and he is bowled over: a jolt, then curled into a ball (his feet
  tucked in, his petals hugged round him, his eyes shut) and rolled a whole
  turn as he goes, uncurled dizzy with a "?" and a glare back at the rail
  (`rollLeft` in `YunitMascot`, with his startle sound); when it closes he
  stumbles after it, a few hopping steps that each bring him upright
  (`stumbleRight`). In the dark he holds a lit lantern, its warm light
  round him; when the dark comes while he is there he starts, says "Oh! It's
  gone dark. Hang on, I've got a lantern." and it catches, and when the
  light comes back he squints and it goes out. Which dark: with Live sky on
  he follows the sky over the church, not the theme — his lantern is for
  the night there ("Oh! Night's fallen.", and "the sun's up" at dawn) — and
  in its rain or storm he wears a raincoat and holds an umbrella: the coat
  in rain-slicker yellow over each of his petals, so he keeps his shape,
  with a wet shine, two toggles and a hem flaring below his middle
  (`raincoat`), and the umbrella in four panels of his colours, held in
  his left hand behind him and tipped into the rain, which slants down from
  the right (`umbrella`), his place leaving room above him for it. He says
  "Oh! Rain. Good thing I brought an umbrella." when it starts while he is
  there. When a rainbow comes out after it (`data-rainbow`) he celebrates
  and says "Look, a rainbow! After the rain, God's promise." With Live sky
  off he goes by the theme as before. His bubble's
  corner and his conversation keep to his end. The first time the home opens in a visit he
  arrives, waves and says hello in a speech bubble with one thing he can be
  asked (`data/yunitTips.js`, only what this person can see); tapping him
  has him say another, and the bubble goes after a few seconds or at a tap
  elsewhere. Tapping the box dims and blurs the home behind him, and the
  conversation rises from where he stands as speech bubbles — his white,
  the person's in the church's colour — with nothing round them: no sheet,
  its top edge fading as it scrolls, and his name and round buttons (sound,
  new chat, his page, close) floating at the top. On a phone he stays where he stood; on a desktop he slides down from his place to the foot of the screen, in his column, and back up to it when it closes.
  It keeps to what the keyboard leaves, and the box is the same element at
  rest and open, so the keyboard stays up as it opens (no `useFocusTrap`,
  which would move the focus; the page is held with `useScrollLock`). A tap
  on the dimmed home or the open space above the bubbles closes it. Before
  anything is said it opens on his hello and the things to ask. The quick
  actions are not his (they only open a form): on a desktop the day's card
  turns over to them (a card-flip, its button the "Swap" icon in the card's
  corner; the back, `QuickActionsBack`, the same colour, the actions two
  across, "Edit" to choose them); on a phone, whose deck clips what hangs
  off a card, its "+" raises them as a sheet from the foot of the screen
  (`QuickActionsMenu` `sheet`). His sounds include his own
  recorded voice (`utils/yunitFeedback.js`, `src/assets/sounds/yunit`),
  played a third faster and softened, and quiet, a sound under the page:
  the full list of what he says and when is at the top of
  `utils/yunitFeedback.js`.
  The conversation is `YunitThread` (`floating`), the same one his page
  draws, and the same conversation (`useYunitChat`), carried on at
  `/yunit`.
  On a desktop (`lg`) the same home shows everything at once rather than
  swiped, and like a phone's it fits one screen: the page never scrolls; a
  list with more than its card holds scrolls inside the card. Three columns,
  a quarter, a half and a quarter, and six panels in them — the day, the
  apps, Needs attention, Community, the day's verse (`HomeVerse`, under
  Community to begin with; on a phone it stays on the church's picture) and
  This week — that anyone can drag to
  another place in their column or into another (`HomeBoard`, saved to their
  account by `useHomeLayout`; Home layout in the account menu puts them
  back). The
  panel in hand is a solid copy lifted on a shadow (the board's own drag;
  the browser's draws it see-through). While it is in hand the board is
  laid out as it would be let go there: its place an empty dashed outline
  its own size that moves to where it would land, the other panels sliding
  aside to make room, and let go, the copy glides down into the outline.
  Every change to the arrangement slides (FLIP), never jumps. A column
  holds **three cards at most**; YUNIT and the church are not cards. A card
  carried to a column with its three already is refused: the column dims
  behind a dashed outline, "This column is full" large in its middle over
  everything in it, the card in hand gone see-through over it, and let go
  there it goes back where it was. A column holding more (from before the
  limit) is tidied as the home opens: its last card goes to the column with
  the fewest (`HomeBoard`'s `tidy`). The church's room gives way when its
  column's panels need it, the church then the background behind them,
  except under YUNIT standing on its hill; a column left empty
  gives its width to the others. The church on its hill stands at the foot
  of a column, always at the very bottom, and is moved only from column to
  column, by taking hold of the church itself (`data-foot-grab`), its place
  marked by a dashed outline at the column's foot (`useHomeLayout`'s
  `church`, the left to begin with). On a desktop its land is a **footer the
  width of the page**, not a picture in a column, so it never ends in a cut:
  low hills run from edge to edge (`HomeScene`'s `footer`: the far land on
  the left, mirrored on the right), and the church rises from them under
  its column, slid along to that column's middle as measured from the
  board, and again whenever the column moves or changes size (the rail, a
  column emptying, the church carried). The church's column keeps the
  church's height free at its foot (its room); every other column's panels
  end just above the low hills (`--hill-band`, the foot of the board). The
  footer is behind the panels, as the sky is, so the hills never run over a
  panel; where the apps reach down behind the church, the same land is drawn
  again in front of them, cut to the church's column only, so the church
  stands before them there. The church's room lets touches through but for
  the church itself, which is what is taken hold of to move it. Needs
  attention, Community and This week share out their column's height (as
  tall as what they hold, the room left over theirs too, giving way to 9rem
  only in a short column), so none is a sliver however little it holds,
  and a busy week grows: empty, a small
  doodle of a quiet moment in soft grey with one touch of the church's
  colour (a cup of tea with a heart of steam, a bench with a bird on it, a
  hammock and a "z"; never an app's icon) over a light line ("All clear!",
  "A quiet day", "A quiet week"); with three or fewer rows, the room under
  them holds the doodle small and faint with a short line (`PanelRest`); no panel but the day goes below a few
  rows, the apps included, each scrolling inside itself instead; and nothing on the board is selectable, so a press
  that wanders moves the panel rather than highlighting words. To begin with:
  1. **The sidebar**, read top to bottom as a phone is:
     - the day's card in the church's colour, over Ekkly's panes of light:
       the logo, the day, the weather and the church's name, and the greeting
       on two lines — nothing else, so it reads at a glance. Beside the
       greeting, one round "+" opens the quick actions (`QuickActionsMenu`):
       Add a person, Record attendance, New event and New task to begin
       with; "Edit" in the menu lets each person choose their own, up to six,
       from everything they may do (`data/quickActions.js`, saved to their
       account by `useQuickActions`). Each opens the place it is done with its
       form open (`?add=` in People, Tasks, Events, Prayer and Sunday
       school). Search stays the top bar's.
     - the apps (`HomeAppCards`' `column`), in the style chosen and laid out
       as on a phone (two across, the orbit, one a row; Compact one a row,
       since two across there cuts names short; in a narrow sidebar Accent's
       names a size down, on two lines if need be), in a white panel headed
       "Apps" like the board's others, with "See all" beside the heading for
       the All apps page (as the week has "Open calendar"), the tiles
       scrolling inside it; while
       there are more below, a chevron at its foot says so and takes the list
       down a screen. They simply appear: no tile rises in.
     - the church on its hill at the foot, with the day's verse on it as on a
       phone, both giving way where there is too little room.
  2. **The work**, the half: **Needs attention** (`HomeAttention`, rows of
     `AttentionRow`): one white panel, most pressing first. A row is one
     issue and one link, with no button of its own — a small status pill
     (red for something late, amber for something waiting or missing), its
     headline, and one quiet grey line: the first records it covers and how
     many more (`records`: accounts to link, gatherings not counted, tasks
     overdue), or its own line where there are none. The issue is never
     repeated as a card for each record. Under it,
     **Community** (`HomeCommunity`), quieter: compact items — birthdays (one
     item naming everyone), serving, who is new, tasks due today — the
     church's colour only on a celebration. The two share the column by what
     each holds, the community never more than a little under half.
  3. **This week** (`HomeWeek`), the last quarter: only the days with
     something on, a small label over each (today's tinted), a time and a
     title in two columns, and "Open calendar" ("Calendar" when narrow).
  `AppHeroDeck`'s `spread` slot hands over the `warn` cards and the rest.
  Each list shows everything, scrolling inside its card when it holds more
  than fits. Each picture is the card's own (`TodayPicture`): the photo, the faces it is
  about, its date, or its drawing (`brand/ekkly/sections/today.mjs`). The
  sky leaves out the phone's big window (`.scene-window`), which only
  cluttered a desktop.
- The shell pads the content area (`p-0 sm:p-4 lg:px-8 lg:py-3`) of a page
  that is not yet an app, so **such a page never adds its own outer padding.**

`lg` is the line between phone and desktop everywhere. In script, use
`useMediaQuery('(max-width: 1023px)')`.

Route `meta` options that change the shell:

| meta | Effect | Use for |
|---|---|---|
| `focus: true` | No top bar or people rail. The page handles its own padding and safe areas, and **must have its own back button.** | Something you finish: one person's record, taking attendance, a minute |
| `hideTopbar: true` | Top bar hidden, people rail kept | A page with its own header that you still browse from (Bible) |
| `frame: 'app'` | Top bar kept on the app's home (named for the app, its mark a back arrow to all apps); no people rail. The app's home is a launcher (`AppHome`: its deck, then its `AppShortcut`s) and every screen sits in `AppScreen`, from `src/components/appframe/` | An app of its own inside Ekkly (Schedules, People). One centred column on every section; sections are a step off the home, with a back arrow, not tabs. On a desktop the home is a board like the home of all apps': the always-true card over the sections down the left, Needs attention and Good to know as the phone's cards, and the app's side list (`AppSidePanel`) on the right, on plain ground, never scrolling. A section on a desktop has the app's rail down its left (`AppRail`): the way home in the church's colour, then every section as its card, the open one ringed. A section is laid out for the desktop's width with `AppScreen`'s `desk`: its `ListGroup`s lay their rows out as cards across it (`deskGrid.js`'s `DESK_ROWS`, which a screen's own list can use too; `flat` keeps a group one block), a list of records with several facts each is a `DeskTable` (columns under names that stay in view, dropping the least needed as the screen narrows: Everyone, Tasks, the book), and a record or a workspace is two or three columns (a person, an item, a group, a sermon, a month's video). A phone's screen is unchanged |
| `root: true` | Unpadded, people rail kept | The home of all apps only |
| `ownLayout: true` | Top bar kept; unpadded; no people rail | A page with a column of its own down the side that needs the width (All apps on a desktop; on a phone it asks for focus with `useFocusMode`) |

## Anatomy of a list page

```
┌─ Toolbar ──────────────────────────────────┐  only while searching
└────────────────────────────────────────────┘
┌─ List card ────────────────────────────────┐
│                           ⇅ Sort: Name ▾   │  optional strip
│ ● KIDS  12                                 │  sticky heading
│   (A) Ana Reyes                            │  row
│   (B) Ben Cruz                             │
│ ● YOUTH  8                                 │
│   (C) Carla Santos                         │
│                                      ( + ) │  FAB
└────────────────────────────────────────────┘
```

Each area keeps its components in `src/components/<area>/`:

| File | Role |
|---|---|
| `<Area>Toolbar.vue` | Search box, plus a segment control if the page has one |
| `<Area>Fab.vue` | The round + button and its action menu |
| `<Thing>ListItem.vue` | One row |
| `<Thing>BandHeader.vue` | Sticky group heading |
| `<Thing>Drawer.vue` | Add/edit form |
| `<Thing>…Sheet.vue` | Pick one thing: a sort, a status, a tag |
| `<Thing>CardSkeleton.vue` | Loading placeholder shaped like the real row or card |

The page skeleton:

```vue
<template>
  <div class="relative flex h-full flex-col">
    <ThingsToolbar v-model:searchQuery="searchQuery" :open="searchOpen" @close="closeSearch" />

    <div class="flex flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div ref="listScroller" class="min-h-0 flex-1 overflow-y-auto pb-20">
        <!-- loading → skeletons, empty → empty state, else → groups of rows -->
      </div>
      <ThingDrawer ... />  <!-- sits beside the list on desktop, a sheet on phones -->
    </div>

    <ThingsFab v-if="showFab" @search="openSearch" @add="openAdd" />
    <ConfirmationModal ... />
  </div>
</template>
```

`pb-20` on the scroller keeps the FAB from covering the last row.

## Building blocks

### The front door's pages

The front door is six pages sharing one header and footer
([FrontDoorHeader.vue](src/components/frontdoor/FrontDoorHeader.vue),
[FrontDoorFooter.vue](src/components/frontdoor/FrontDoorFooter.vue)):

- **Home** ([PlatformHome.vue](src/views/PlatformHome.vue)): the tour, What's
  inside, How it works, a short word about price with the plan so far, the
  first few questions, and the last call. It sells; the detail lives elsewhere.
- **The Sunday** ([PlatformHomeV2.vue](src/views/PlatformHomeV2.vue), `/v2`):
  a second home, tried beside the first. It opens on a title: the camera close
  on the church's great window, which is Ekkly's mark, with the name beside it
  as the logo has it, the promise under it, and the ways on — watch the Sunday
  with a voice, start a church, scroll through it, see the price, read the
  questions. The bar above holds back while the title is up. Scrolling, or
  Watch, draws back from the mark to the whole church, one picture rather than
  one faded into another, and the page is one service told by the scroll
  ([sunday/](src/components/frontdoor/sunday/), its beats, clock, words and
  camera in [timeline.js](src/components/frontdoor/sunday/timeline.js)): the
  doors open, the camera walks in, each part of the service is the moment one
  app takes a list off somebody, and the doors shut at night on the last call.
  Inside, the cross is the centre of the back wall, never Ekkly's mark: Christ
  is the focus of a church, and Ekkly only a tool in it. The cross seen
  through the open doors is the hall's own
  ([hall.js](src/components/frontdoor/sunday/hall.js)), drawn where the hall
  is seen through the doorway, so it carries on unbroken as the camera walks
  in and back out. The people are a
  church at worship, not extras: some raise their hands as the songs swell, the
  band's hands are on their instruments, and the pastor preaches the gospel in
  a sentence the reader can see (Romans 5:8). The family on the cover
  ([FamilyFigure.vue](src/components/frontdoor/sunday/FamilyFigure.vue)) is
  the standard every person here is drawn to: limbs shaped as limbs are, and
  hands shaped as hands, never a guessed shape such as a stroked line with a
  ball on it. Every arm and hand comes from
  [limbs.js](src/components/frontdoor/sunday/limbs.js). The title says what Ekkly is
  too, a ministry that keeps the lists so the people can share the gospel,
  make disciples and worship God (BRAND.md, "What Ekkly is for"), and the night
  ends on the same. The story's words are
  in the picture as subtitles, the narration
  ([voice.js](src/components/frontdoor/sunday/voice.js)) a sentence at a time,
  each saying what the person still does before what Ekkly keeps (BRAND.md,
  "What Ekkly is for"); they follow the narrator when Watch plays it and the
  scroll when it does not. Watch starts the pictures before the voice: from
  the title the camera draws back to the church in silence and the narrator
  begins once it is in view, and from anywhere else the first line waits a
  moment as the camera sets off. The card beside the picture (a bottom sheet on a
  phone) shows rather than tells: the part of the service, the apps in use and
  a look at them, and the main button at its foot. The pictures are SVG redrawn
  through their viewBox, so they stay sharp at every zoom; the camera frames
  each part in what the card and the subtitles leave free. Everything follows
  the scroll both ways and nothing idles: the band plays and the family walks
  only while the reader scrolls. Nobody stands waiting on the cover for the
  reader to move: the path is empty, and the family walk in from off the foot
  of the picture as the reader goes on (as the cover's line is said, when it
  plays, the doors' part carrying on at their pace) and up to the door. Less
  motion cuts between the parts at rest, the family standing on the path on
  the cover, as the cover art has them. Straight after the
  Sunday comes "What is the gospel?" (#gospel, its words in
  [gospel.js](src/components/frontdoor/gospel.js), quoted from the World
  English Bible), the reason Ekkly is built, which the title and the bar link
  to; then the word about price and the questions, as on the first.
- **Pricing** ([PlatformPricing.vue](src/views/PlatformPricing.vue), `/pricing`):
  the plan builder and every question ([faqs.js](src/components/frontdoor/faqs.js)).
- **Get started** ([PlatformStart.vue](src/views/PlatformStart.vue), `/start`):
  where every call to action lands — sign in, ask for a church, and come back
  to see the request's status. It shows the plan built on the way, and fills
  the form with the church named in the welcome and the apps picked.
- **Privacy and Terms** ([PlatformLegal.vue](src/views/PlatformLegal.vue),
  `/privacy`, `/terms`): the words are in
  [legal.js](src/components/frontdoor/legal.js) and describe what the app really
  does, so a change to what the front door keeps, who helps run it, or how
  paying works is a change there too.

The plan and the named church are shared by every page through
[useFrontDoor.js](src/composables/useFrontDoor.js), for the tab. Something
that would take a phone's worth of scrolling on its own gets a page, not a
longer home.

**Churches the front door knows** ([knownChurches.js](src/components/frontdoor/knownChurches.js))
wear their own logo, name and colour in every preview — the welcome as the name
is typed, the tour, How it works — when a visitor types any name they go by
("CP", "City Praise"). Logos are bundled in `src/assets/churches/` for now.

Say **link**, not address, for a church's `<id>.<domain>` in anything a
visitor or church reads: to most people an address is a street, and the FAQ
uses it for exactly that.

### The front door's hero

The home page opens on a tour: a device that plays a short scene for each of the things Ekkly
does, first every scene on a phone and then every scene again on a computer,
ending on what the tour left out. It lives in
[src/components/frontdoor/](src/components/frontdoor/):

- **[HeroStage.vue](src/components/frontdoor/HeroStage.vue)** owns the device,
  the order of the scenes and the timing. The device changes shape between a
  phone and a monitor rather than being swapped. A scene advances when its
  chip's progress bar finishes, so pausing pauses both. Each chip wears the
  animated artwork of the app its scene shows (the mark for the church's link, a
  folder of four for "and more"), and plays it as its scene comes on; the
  phone/computer switch is icons only, with the names kept as labels.
- **A scene** (`scenes/Scene*.vue`) draws one feature happening, with a phone
  layout and a computer layout sharing one timeline
  ([useSceneTimeline.js](src/components/frontdoor/useSceneTimeline.js)).
- **[ScaledScreen.vue](src/components/frontdoor/ScaledScreen.vue)** draws a
  screen at one fixed size (272×544 for a phone, 524×320 for a monitor) and
  scales it to fit, so type never reflows into a shape no device would show.
  [AppWindow.vue](src/components/frontdoor/AppWindow.vue) is that plus the
  app's sidebar and top bar; [FloatNote.vue](src/components/frontdoor/FloatNote.vue)
  is a note beside the device.
- **Everything on screen is sample data**, and every colour is a token, so the
  platform's colour in the console carries the whole page — the light behind
  the hero and the headline included. Its dates come from
  [sceneDates.js](src/components/frontdoor/sceneDates.js), worked out from today,
  so a scene never names a Sunday that falls on a Monday. The sample church is
  Grace Fellowship throughout, and the first scene ends on it; the visitor's own
  church replaces it once they have named one. A note beside the computer
  (FloatNote) sits on a corner of the window, never over what it describes.
  Home screens and app lists on the device wear the app artwork; its sidebar
  and bottom bar draw their icons at 16px, too small for artwork, so those
  stay line icons even though the real app now paints them.
- **"Say hello, we'll reach out"** sits under the hero's buttons and opens the
  welcome again, straight away, for anyone who skipped it. The church named
  there goes on the device in the tour and into the request form.
- **The light comes through a window.** Behind the hero is a room: the mark as
  an arched window in a wall, turned, throwing the colour of each pane across
  the floor (`.hero-room` in [PlatformHome.vue](src/views/PlatformHome.vue)).
  It is a picture, one per theme, not one picture dimmed — a lit room and a
  dark one are not the same photograph. Each is levelled on the way in so its
  wall is exactly the page's ground, white or `gray-950`, and so the picture
  ends where the light runs out rather than drawing a rectangle; the light one
  is held at 70% because colour carries further on white. It is the same arch
  the last call is cut out of, so the page opens and closes on the one shape.
  From `sm` up only: a phone's hero is the words and the device on plain
  ground, because at that width anything behind them is behind the sentence
  that explains Ekkly.
- **The front door does not wear the software look.** No blurred circles of
  colour behind the hero, no dot grid, no light that follows the pointer, no
  badge-shaped chip above the headline, no gradient clipped to a word, no
  frosted panels, no coloured halo under a button, and no sheen crossing one.
  Those are what every product's home page is made of, and a church can tell.
  A call to action is the flat accent at the radius
  [Buttons](#buttons) gives it; a heading is ink, and the light crossing it as
  it scrolls (`lit-heading`) is where the colour goes. Anything decorative
  earns its place by being a church's — the window, the mark, the app artwork.
- **An icon says what a thing does.** Nothing on the front door wears a sparkle
  or a wand to mean "this part is clever": YUNIT writes minutes up, so it wears
  a pencil, and it answers questions, so it wears a speech bubble. The button
  that runs it names it ("Write up with YUNIT"), not the category.
- **Motion shows something happening.** Nothing idles: no breathing, no
  bobbing, and no button that lifts or grows under the pointer. Every scene
  also has a finished state for `prefers-reduced-motion`.
- **Below the hero, motion follows the scroll, both ways.** No section fades
  and rises into view; that stock reveal is what every template does.
  `v-scroll-light` ([scrollLight.js](src/components/frontdoor/scrollLight.js))
  gives an element `--p`, from 0 to 1, as it passes up the screen, and the
  page draws with it: a band of the window's colours crosses each heading
  (`lit-heading`), the apps in "What's inside" light up one after another,
  icon by icon, and
  the last call opens out of an arched window. A new section uses one of these,
  or shows its own content doing something; it doesn't bring back the fade.
  Styles read `var(--p, 1)` so the finished state is the default.
- **"What's inside" is one screen on a desktop:** `min-h-[calc(100dvh-4.25rem)]`
  under the header, with spacing in clamped `dvh` so a short laptop tightens it
  instead of spilling over. [AppsInside.vue](src/components/frontdoor/AppsInside.vue)
  lays the apps out like a phone's home screen: an icon and a name, nothing
  more (4 across on a phone, 5 on a tablet, 7 on a desktop), lighting up in
  turn as the grid rises. The icons are Ekkly's own artwork
  ([src/assets/app-icons/](src/assets/app-icons/), from
  `brand/ekkly/make-app-icons.mjs`, through `appArt()`): glossy SVGs in the
  mark's orange and blue that keep those colours rather than the accent, glow
  by CSS drop-shadow, and grey out until lit or while not in a plan. They are
  drawn inline by [AppArt.vue](src/components/frontdoor/AppArt.vue) so their
  parts move: each plays a short animation once — as it lights up, when the
  pointer arrives, when its app opens or joins the plan — and never loops.
  Moving parts carry an `a-…` class in the generator; a new icon reuses those
  motions before inventing one. Opening an app shows what a church
  gets from it, from [appDetails.js](src/components/frontdoor/appDetails.js):
  one benefit line and three practical wins of a few words, each with an icon.
  Keep it that short; paragraphs there go unread. On a
  desktop the panel grows out of the app's icon to cover the section, with a
  strip of every app, arrows and Escape; on a phone it is a card in the middle
  of the screen, with the page locked behind it, "4 of 14" and arrows instead
  of a strip (nothing in it scrolls sideways), and a sideways swipe turns to
  the next app. The panel is a soft grey, not white: several icons are mostly
  white. Its action is one button in one place — "Add to my plan", which
  becomes "See my plan" once added — with a line beside it saying where the app
  stands. Adding keeps the panel open. A new app gets an entry in appDetails.js.
- **"How it works" holds still on a desktop** while the scroll walks through its
  three steps ([HowItWorks.vue](src/components/frontdoor/HowItWorks.vue)): the
  section is a screen plus 0.8 of one per step, its content pinned under the
  header. The step being read is open in the list, the ones before it ticked
  and the ones to come dim, so nobody meets a step before its turn; each step's
  name scrolls to it. Beside the list, a small illustration shows the step
  happening ([HowVisual.vue](src/components/frontdoor/HowVisual.vue)) — the name
  writing itself and its link appearing, an Approved stamp landing, seats filling
  with faces — with the church the visitor named, if any. It is deliberately
  not a screen from the app: fields and buttons read as a form to fill in, and
  the hero already shows the app on a device. Nothing in it looks tappable, and
  it carries no "preview" label. A phone gets a walkthrough instead of the
  pinned scroll: step tabs, a swipe, and a Next step button (full width on the
  first step; a back arrow joins it after), each illustration playing as its
  step comes up and again when tapped.
- **Section headings share one scale:** `TYPE.eyebrow`, `TYPE.title` and
  `TYPE.lead` in [type.js](src/components/frontdoor/type.js), on every front door
  page. A new section uses them rather than its own
  sizes; only colour changes, for the dark band.
- **Prices are written in full**, centavos and all (`₱1.00`), wherever one is
  shown. The plan builder
  switches between monthly and yearly, a year costing `MONTHS_PER_YEAR_PAID`
  months (`lib/apps.js`), and says the first month is free.
- **The welcome** ([WelcomeSheet.vue](src/components/frontdoor/WelcomeSheet.vue))
  greets a first visit, once, 1.4s after the headline, and never someone signed
  in. It asks which church they are with (the link it could have appears as
  they type, and the hero's phone takes the name), then, optionally, a name and
  an email or phone so someone can reach out. Skip, the backdrop and Escape
  close it for good; the cookie question waits until it has. Entries land in
  the console's Front door section. A small card in the middle of the screen
  at every size; on a phone it stays centred in the space above the keyboard
  (visual viewport), and it never focuses a field on its own.
- **The chat bubble** ([ChatBubble.vue](src/components/frontdoor/ChatBubble.vue))
  sits bottom right once the cookie question is answered. It says whether the
  host is online. Opened, it greets, offers four one-tap questions and Call /
  Email / Messenger; nobody is asked for a name before they have said
  something, and a card asks where to reply after their first message. Turns
  show a time and "Seen"; a reply that arrives while it is closed is previewed
  beside it. On a phone it fills the screen above the keyboard (visual
  viewport), never focuses the box on its own, and Enter makes a new line.
  Replies come from the console's Live chat. It grows out of where it was
  pressed and never idles.

### Settings-style pages

Church Settings and the platform console share one layout. Copy
[Settings.vue](src/views/Settings.vue) or
[PlatformAdmin.vue](src/views/PlatformAdmin.vue).

- **Phone:** a list of sections grouped under small headings. Each row shows an
  icon, a label, and a status line that says where the section stands ("2
  requests waiting"). Use amber for a status that needs action.
- **Desktop:** the list down the side, with the open section beside it.
- **URL:** the open section lives in `?section=`, so back, refresh and a shared
  link all land in the same place.
- **Cards:** each section is built from
  [SectionCard](src/components/common/SectionCard.vue): an icon tile, a title
  and a one-line subtitle, with optional actions on the right.
- **A section that edits a record** — Church details — is read as a profile and
  changed in a sheet of short steps, the way a person's record is
  ([ChurchEditSheet.vue](src/components/settings/ChurchEditSheet.vue),
  [MemberEditSheet.vue](src/components/members/MemberEditSheet.vue)). Not a
  page of live inputs behind an Edit toggle: nothing then says what you are in
  the middle of, or gives you a way back out of it. A single setting with
  nothing to type beside it — a logo, a switch — still saves on the spot.
- **Switches:** on/off settings use
  [ToggleSwitch](src/components/common/ToggleSwitch.vue).

### Toolbar

```
sticky top-0 z-40 mb-3 shrink-0 rounded-xl border border-gray-200/80 bg-white/95
px-2 py-2 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 sm:px-3
```

Search is something you open, not a permanent bar. The FAB's Search action
opens it. Closing it clears the query, because a search bar you can't see must
not still be filtering the list. While a query is active, show "12 of 80".

A **segment control** is for two or three choices, like Mine / Everyone:

```
container: flex h-10 items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-700
option:    h-9 rounded-md px-2.5 text-xs font-medium sm:text-sm
  on:      bg-white text-primary shadow-sm dark:bg-gray-800 dark:text-primary-light
  off:     text-gray-500 dark:text-gray-400
```

### Search dock (on trial in People)

People's roll ([PeopleEveryone.vue](src/apps/people/PeopleEveryone.vue)) has
no FAB. Search is a labelled capsule at the foot of the screen, with the sort
and the list/grid switch inside it ([PeopleDock.vue](src/components/members/PeopleDock.vue)).
It is dark on a light page and light on a dark one (`bg-gray-900` /
`dark:bg-gray-100`): white on white rows it read as one more row, and a shadow
to lift it is not allowed, while the church's colour stays with the one action
that adds (`+ Person`). While the list scrolls down it narrows into a round
search button, its width animating, on the same flick that hides the header
(AppScreen exposes `hidden`). Searching, the bar
is the search box and rides above the keyboard. Adding sits in the header's
action slot (`+ Person`), and the rarer actions (Select people, Add several,
Export) behind its "…" ([PeopleMenu.vue](src/components/members/PeopleMenu.vue)).
If it holds up, the other FAB screens follow it.

### Floating action button (FAB)

Copy [ActionFab.vue](src/components/common/ActionFab.vue).

- **Main button:** `absolute bottom-4 right-4 z-50`, `h-14 w-14 rounded-full
  bg-primary text-white shadow-lg`. The `Plus` icon rotates
  45° while the menu is open.
- **Action menu:** labelled pills stacked upward. Search comes first, then
  Add, then everything else (Export, and so on). Only offer Add to people who
  can manage the area.
- **Hide the FAB** while a drawer is open or the page is in selection mode.

### Sticky group heading

Copy [MemberBandHeader.vue](src/components/members/MemberBandHeader.vue) or
[EventBandHeader.vue](src/components/events/EventBandHeader.vue):

```
sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white/95 px-3 py-2
backdrop-blur dark:border-gray-700 dark:bg-gray-800/95

label: text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400
count: text-xs tabular-nums text-gray-400 dark:text-gray-500
```

An optional `h-2 w-2 rounded-full` dot before the label carries a category
colour. Leave out empty groups entirely.

### List row

```
p-3 rounded-lg cursor-pointer select-none touch-callout-none transition-all
  default:  hover:bg-gray-100 dark:hover:bg-gray-700/50
  selected: bg-primary/10 ring-1 ring-primary/30 dark:bg-primary/20 dark:ring-primary-light/30
  needs attention: amber gradient (see MemberListItem.vue)

title:     text-sm font-medium text-gray-900 dark:text-white truncate
secondary: text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate
```

- Keep rows short: name plus one line. The full record is one tap away.
- **Long-press** (with `useLongPress`) and right-click open the same context
  menu.
- **Selection mode** puts a round checkbox at the start of each row and
  replaces the FAB with an action bar at the bottom.

### Opening a record

- **Records with a lot to read** (a person, a minute, a song) open as their
  own page at `/things/:id`. Call `useListScrollMemory(listScroller)` on the
  list so going back returns to the same scroll position.
- **Small records you mostly edit** (a task, a prayer concern) open in the
  drawer.

### Moving between screens

The router animates each change of page (`src/router/viewTransitions.js`).
What you tapped travels with you: an app tile's picture and name fly into the
top bar, a section tile's name flies up into its screen's header, and both go
back down when you return. An element takes part by naming the path it opens
or heads, as `data-morph-icon="/path"` or `data-morph-label="/path"`. The
tile and the header carry the same path, and that is the whole pairing. A
new kind of tile or header gets the attribute; don't add a `<Transition>`
around the router view.

### Drawer: adding or editing

Copy [TaskDrawer.vue](src/components/tasks/TaskDrawer.vue).

- **Phone:** a bottom sheet, `<Teleport to="body">`. Backdrop `fixed inset-0
  z-80 bg-black/50`; panel `max-h-[92dvh] rounded-t-2xl`.
- **Desktop:** a panel beside the list, `m-3 w-[calc(50%-1.5rem)] rounded-2xl
  border-2 border-primary/30 shadow-xl`.
- **Header:** icon plus title (`text-lg font-semibold`), such as "New task" or
  "Edit task", with a close X.
- **Body:** `flex-1 overflow-y-auto p-4 sm:p-6`, holding a
  `<form class="space-y-4">`.
- **Footer, right-aligned:** Delete on the far left (edit only), then Cancel,
  then Save (or Update when editing).
- Call `useFocusTrap(dialogRef, () => props.show, handleCancel)` so Escape
  closes it and focus returns to where it was.

### The page holds still behind anything open over it

**Always.** While a modal, drawer, sheet or full-screen panel is open, the page
behind it does not scroll. `useFocusTrap` does this by default; anything not
built on it calls `useScrollLock(openState)`
([useScrollLock.js](src/composables/useScrollLock.js)), which counts holders
so a confirmation over a drawer does not hand the page back early, and keeps
the scrollbar's width so nothing jumps. Never set `overflow` on `html` or
`body` yourself. A drawer that is a column beside the page on a desktop locks
only where it covers it (`() => props.show && isPhone.value`). Small menus and
popovers that leave the page usable are the only exception.

### Sheet: picking one thing

Copy [SortSheet.vue](src/components/common/SortSheet.vue), or use it directly — it takes its title and hint from the caller.

- **Layout:** a bottom sheet on phones, a centred card (`sm:max-w-sm`) on
  desktop. Overlay `fixed inset-0 z-100 bg-black/60 backdrop-blur-sm`.
- **Header:** `bg-linear-to-r from-primary/10 to-transparent`, with an icon
  tile (`rounded-xl bg-primary p-2.5`, no shadow), a title
  (`text-base font-bold`) and a one-line hint (`text-xs text-gray-500`).
- **Options:** `rounded-xl px-3 py-3`. The chosen option gets
  `bg-primary/10`, primary-coloured text and a `Check` icon.
- Picking an option closes the sheet. There's no Save button.

### Forms

```
label:    mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300
input:    w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900
          focus:border-transparent focus:ring-2 focus:ring-primary
          dark:border-gray-600 dark:bg-gray-700 dark:text-white
hint:     mt-1 text-xs text-gray-500 dark:text-gray-400
required: <span class="text-red-500">*</span>
```

- Labels ask the question in plain words: "What needs doing", "Who is doing
  it".
- Placeholders show a real example: "Print the bulletins".
- Put two short fields side by side with `grid grid-cols-1 gap-4
  sm:grid-cols-2`.

### Buttons

| Kind | Classes |
|---|---|
| Primary | `rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary-hover` |
| Secondary | `rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600` |
| Soft | `rounded-lg bg-primary/10 px-3 text-primary hover:bg-primary/20 dark:bg-primary-light/15 dark:text-primary-light` |
| Danger (text) | `rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20` |
| Danger (confirm) | `bg-red-600 text-white hover:bg-red-700` |
| Disabled | `cursor-not-allowed bg-gray-300 text-gray-500 dark:bg-gray-600 dark:text-gray-400` |
| Icon only | `rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700`, plus `aria-label` |

Touch targets are at least `h-10`. Use `h-11` for main actions in a bottom bar.

### Loading

Show placeholders shaped like the content: `animate-pulse bg-gray-200
dark:bg-gray-600` blocks in the layout of a real row, or a
`<Thing>CardSkeleton` component. Don't show "Loading…" text.

A starting value is not a loading state. Where a field has a built-in default
— the church name, the landing copy, the discipleship stages — draw the
placeholder until the real answer lands rather than the default, or the page
publishes another congregation's words for as long as the network takes. The
public page does this off `ready` from [usePublicSite](src/composables/usePublicSite.js);
over ink, the placeholder is `bg-white/15` rather than grey.

### An address that leads nowhere (404)

Every address the app does not know, on a church's address and the
platform's alike, signed in or out, gets **YUNIT the Sheep looking for it**
([NotFound.vue](src/views/NotFound.vue), `LostYunit`), in an open field of
rolling hills (`components/notfound/LostField.vue`) with a signpost
pointing both ways. The field follows the theme; in the dark his lantern is
lit and the field lies dark but for the pool of its light, which goes with
him. He is dressed as a lamb (`components/yunit/YunitLamb.vue`: one round
of cream fleece, as YUNIT is one round, his face on it, floppy ears, navy
blob feet as YUNIT's, his fleece white lumps lying over one another, his
colours four irregular patches of dyed wool in it — one of each, of
different sizes, woven in with cream over them, never on his face, never
under his topknot, somewhere new each time he is drawn — and again as the
panes of his lantern). "YUNIT the Sheep looked everywhere.", "Take me home"
(the home of all apps when signed in to a church, the front page
otherwise) and "Go back". He walks from spot to spot searching
(`walking`: his legs step and stay planted, so the page moves him at
`LAMB_WALK_SPEED` of his width a second, never a glide), looks about, and
now and then says how it is going ("Not here.", "Is it behind the
signpost? No."); a tap in the dark sends him to look there; a tap on him
makes him hop and say "Baa!", his mouth open round, bleating if the app's
sounds are on (`utils/bleat.js`, the recording in
`src/assets/sounds/baa.mp3`). A small "?" in the corner (`LostAbout`) says
the page is inspired by the parable of the lost sheep and links to Luke
15:3–7: in the church's Bible for someone signed in to one, online
otherwise. With less motion asked for he stands still. The lost little
lamb that used to share the page (`LostSheep`) is kept but no longer
shown. The page used to redirect to the home, which left someone wondering
why their link had not opened what it said.

### Empty states

```
flex flex-col items-center justify-center px-8 py-16 text-center text-gray-500 dark:text-gray-400
icon:  mb-3 h-10 w-10 text-gray-300 dark:text-gray-600
line:  mb-1 text-lg
hint:  text-sm
```

The words depend on why the list is empty (see Tasks.vue):

| Situation | Headline | Hint |
|---|---|---|
| Search found nothing | Nothing matches "choir" | Try a name, a ministry, or a word from the task. |
| Nothing yet, user can add | Nothing on the list | Type in the box above to add the first one. |
| Nothing yet, user can't add | Nothing on the list | Someone will add tasks here as they come up. |

### Confirming and feedback

- **Before deleting,** use `ConfirmationModal` (z-120, above everything):
  - title: "Delete task"
  - message: `Delete "Print the bulletins"? This cannot be undone.`
  - buttons: Delete (danger) and Cancel
- **After an action,** use `useToast()`. `toast.success('Export downloaded')`
  for success, and `toast.error('Could not save that task. Please try
  again.')` for failure.
- **Never report errors in a modal.** Catch the error in the page, send it to
  `console.error`, and show a toast.

## Colour

| Use | Light | Dark |
|---|---|---|
| Accent | `primary` | `primary-light` for text on dark |
| Accent hover | `primary-hover` | `primary-hover` |
| Page / shell ground | `bg-gray-50` / `bg-white` | `bg-gray-900` |
| Card, list, drawer | `bg-white` | `bg-gray-800` |
| Borders | `border-gray-200` (inner: `gray-100`) | `border-gray-700` |
| Main text | `text-gray-900` | `text-white` |
| Secondary text | `text-gray-500` | `text-gray-400` |
| Faint (counts, empty icons) | `text-gray-400` / `gray-300` | `text-gray-500` / `gray-600` |
| Danger | `red-600` | `red-400` |
| Needs attention | `amber-*` | `amber-500/20` grounds |

- Every colour class needs a `dark:` partner. Dark mode is class-based
  (`.dark` on the root).
- Tints of the accent use opacity (`bg-primary/10`, `ring-primary/30`), not
  new colours.
- Never use hex values in classes (`bg-[#01779b]`). The tokens are defined in
  `src/style.css`, and the platform and each church can re-colour them at run
  time (`src/composables/useBrandTheme.js`). A hard-coded value stays teal when
  a church chooses purple.
- **The mark's own four colours never follow a re-colour**, and should not:
  the mark in the header does not either. Nothing on a page names them today.
  What they are, and the one rule for spending them anywhere, is
  [BRAND.md](BRAND.md).
- Scoped CSS that needs the accent uses `var(--color-primary)`, never its value.
- **The typeface is a token too.** The platform and each church can set the
  whole app in one of the faces in `BRAND_FONTS` (`lib/platformDefaults.js`),
  which lands on `--font-sans` and on the root `font-family`. Anything that
  should follow the church just inherits, or wears `font-sans`; a component
  that names its own face (`.font-pixel`, the wordmark's Poppins) is opting
  out on purpose.

## Type and icons

| Element | Classes |
|---|---|
| Drawer or modal title | `text-lg font-semibold` |
| Sheet title | `text-base font-bold` |
| Row title | `text-sm font-medium` |
| Secondary line | `text-sm` or `text-xs`, gray |
| Group heading | `text-xs font-bold uppercase tracking-wide` |
| Numbers that line up | `tabular-nums` |

| Icon placement | Size |
|---|---|
| Inside a button or input | `h-4 w-4` |
| Headers, FAB actions, close buttons | `h-5 w-5` |
| The FAB itself | `h-6 w-6` |
| Empty state | `h-10 w-10` |

## Stacking order (z-index)

| Layer | z |
|---|---|
| Sticky group headings | 10–20 |
| Toolbar | 40 |
| FAB, selection bar | 50 |
| Mobile drawer | 80 |
| Sheets | 100 |
| Confirmation modal | 120 |

## Words

- Plain, warm and specific. Write for a church volunteer, not a developer.
- Use sentence case for headings, buttons and messages ("Add person", "Sort
  people by").
- Errors say what failed and what to do: "Could not add that task. Please try
  again." Not "Failed to…" or "An error occurred".
- Confirmations name the thing: `Delete "Youth camp"?` Not "Are you sure?".
- A navigation description is one sentence saying what you'd open the page to
  do.

## Checklist before a page is done

- [ ] Works at phone width (375px) and on desktop
- [ ] Looks right in dark mode
- [ ] Checked as someone who can view but not manage: no dead buttons
- [ ] Loading, empty, and "search found nothing" states all shown
- [ ] Long names truncate instead of wrapping the layout
- [ ] The FAB doesn't cover the last row
- [ ] Back from a record returns to the same scroll position
- [ ] `npm run build` passes

## Known drift

These pages or parts don't follow the guide yet. When you're working in one
anyway, bring it in line and remove it from this list.

- **Fixed colours that don't follow a church's accent:** the public Landing
  page and its UpcomingDock use their own dark teal (`#062832`, `#04202a`), and
  the notification dot uses the church red (`#bc1c09`). SessionFormPrintable.vue
  is a printed form and may keep its own.
- **Tasks** still uses:
  - the older heavy headings (`bg-gray-100 text-sm`) instead of the slim
    sticky heading
  - a permanent toolbar with an Add button instead of a FAB
  - "Loading…" text instead of skeletons
- **People's phone loading state** is inline markup, not a skeleton component.
- **Copies of the FAB** exist (Events, Gallery, Minutes, Schedules; People's
  roll has the search dock instead), plus repeated confirmation-modal state in each view. Before
  adding a sixth, extract a shared `common/ActionFab.vue` so they can't drift
  apart.
