# ekkly

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
- **Navigation has one source: `src/data/navigation.js`.** The sidebar, the
  bottom bar and the home catalogue all read it. Don't add links anywhere else.
- **Access is by capability.** Capabilities are `<area>.view` and
  `<area>.manage`, and the areas are listed in `lib/capabilities.js`. A route
  sets `meta.capability` (or `meta.adminOnly`). A component hides what
  `usePermissions().canManage(area)` refuses rather than disabling it.
- **Icons come from `src/icons`, which is generated.** Import any Phosphor name
  (`import { Bell } from '../icons'`) and run `npm run build:icons`. Append
  `Fill` for the solid weight. Don't edit `src/icons/index.js` or import an
  icon library (`@heroicons/vue` is installed but unused).
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
- **Colours are tokens:** `primary`, `primary-hover`, `primary-light`.
  Never put hex values in classes. The platform and each church can change
  what the tokens are (`useBrandTheme`), so a hex value is one that won't
  follow.

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

## How code is written here

- Comments explain *why*, in full sentences, above the code they're about.
  Keep existing comments when editing nearby.
- New files use single quotes, no semicolons, and 2-space indent. When editing
  an existing file, match its style.
- Headings, buttons and messages use sentence case ("New task", "Could not
  save that task. Please try again."). Page names in navigation use Title Case.
- A user-facing change gets a CHANGELOG entry written for the church, not for
  developers. `/commit` writes it.
