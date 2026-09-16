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

- **Desktop (`lg`, 1024px and up):** sidebar on the left, top bar, people rail
  on the right.
- **Phone (below `lg`):** top bar, bottom bar.
- The shell pads the content area (`p-0 sm:p-4 lg:px-8 lg:py-3`), so **a page
  never adds its own outer padding.**

`lg` is the line between phone and desktop everywhere. In script, use
`useMediaQuery('(max-width: 1023px)')`.

Route `meta` options that change the shell:

| meta | Effect | Use for |
|---|---|---|
| `focus: true` | No top bar, bottom bar or people rail. The page handles its own padding and safe areas, and **must have its own back button.** | Something you finish: one person's record, taking attendance, a minute |
| `hideTopbar: true` | Top bar hidden, bottom bar kept | A page with its own header that you still browse from (Bible) |

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

The front door is five pages sharing one header and footer
([FrontDoorHeader.vue](src/components/frontdoor/FrontDoorHeader.vue),
[FrontDoorFooter.vue](src/components/frontdoor/FrontDoorFooter.vue)):

- **Home** ([PlatformHome.vue](src/views/PlatformHome.vue)): the tour, What's
  inside, How it works, a short word about price with the plan so far, the
  first few questions, and the last call. It sells; the detail lives elsewhere.
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
  Home screens and app lists on the device wear the app artwork; sidebars and
  bottom bars keep the line icons the real app uses.
- **"Say hello, we'll reach out"** sits under the hero's buttons and opens the
  welcome again, straight away, for anyone who skipped it. The church named
  there goes on the device in the tour and into the request form.
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

### Floating action button (FAB)

Copy [MembersFab.vue](src/components/members/MembersFab.vue).

- **Main button:** `absolute bottom-4 right-4 z-50`, `h-14 w-14 rounded-full
  bg-primary text-white shadow-lg shadow-primary/30`. The `Plus` icon rotates
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

### Drawer: adding or editing

Copy [TaskDrawer.vue](src/components/tasks/TaskDrawer.vue).

- **Phone:** a bottom sheet, `<Teleport to="body">`. Backdrop `fixed inset-0
  z-80 bg-black/50`; panel `max-h-[92dvh] rounded-t-2xl`.
- **Desktop:** a panel beside the list, `m-3 w-[calc(50%-1.5rem)] rounded-2xl
  border-2 border-primary/30 shadow-xl shadow-primary/25`.
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

Copy [MembersSortSheet.vue](src/components/members/MembersSortSheet.vue).

- **Layout:** a bottom sheet on phones, a centred card (`sm:max-w-sm`) on
  desktop. Overlay `fixed inset-0 z-100 bg-black/60 backdrop-blur-sm`.
- **Header:** `bg-linear-to-r from-primary/10 to-transparent`, with an icon
  tile (`rounded-xl bg-primary p-2.5 shadow-lg shadow-primary/30`), a title
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
- Scoped CSS that needs the accent uses `var(--color-primary)`, never its value.

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
- **Tasks and Prayer Concerns** still use:
  - the older heavy headings (`bg-gray-100 text-sm`) instead of the slim
    sticky heading
  - a permanent toolbar with an Add button instead of a FAB
  - "Loading…" text instead of skeletons
- **Prayer Concerns** reports errors in a modal instead of a toast, and uses
  Title Case with "Are you sure…" wording.
- **People's phone loading state** is inline markup, not a skeleton component.
- **Five copies of the FAB** exist (Members, Events, Gallery, Minutes,
  Schedules), plus repeated confirmation-modal state in each view. Before
  adding a sixth, extract a shared `common/ActionFab.vue` so they can't drift
  apart.
