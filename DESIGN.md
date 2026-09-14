# Design

How a page in ekkly looks and behaves, so every page reads as part of the same
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
