# Many churches, one deployment

One Vercel deployment and one Firebase project serve every church. Each church
has its own address, its own records and its own people, and nothing in one
church can be read from another.

---

## How it works

**The address decides the church.** `uec.church.app` is the church whose id is
`uec`. The id is chosen when the church is approved and never changes. A
church can also bring a domain of its own; see [Custom domains](#custom-domains).

| Address | What it serves |
| --- | --- |
| `church.app`, `app.church.app` | The platform's front door: the home page, `/pricing`, `/start` (sign in, ask for a church, see your requests), `/privacy` and `/terms`. Platform admins also get the console at `/platform`. |
| `<id>.church.app` | That church's app, its sign-in page and its public page. |

**Records live under the church.** Every collection the app has always used
(`members`, `events`, `appSettings`, …) now lives at `churches/{id}/<collection>`.
The services still say `collection(db, 'members')`. `src/api/firestore.js`
places every reference inside the church the page is serving, so no service
can forget the prefix. The API routes do the same through `lib/tenant.js`, and
the Claude connector through `lib/mcp/church.js`.

**Belonging is one document: `churches/{id}/access/{uid}`.** Signing in with
Google only proves who someone is. Without that document, the Firestore rules
refuse every read and write in the church, and the API routes refuse the call.

Beside the churches sit a few platform collections:

| Collection | What it holds | Who writes it |
| --- | --- | --- |
| `churches/{id}` | name, status, timezone (readable by anyone) | `/api/platform` |
| `churchRequests` | requests for a new church | the person asking, then `/api/platform` |
| `platformAdmins/{uid}` | people who run the platform | the first by `scripts/make-platform-admin.mjs`, then the console |
| `domains/{host}` | custom domain → church id | the console (Church → Domains) |
| `mcpTokens/{sha256}` | a church's connector token | `/api/mcp-token` |
| `platform/public` | platform name, front-door wording, colours, app prices (readable by anyone) | the console |
| `platform/private` | AI model per feature, new church defaults | the console |
| `platformLog` | everything done from the console | `/api/platform` |
| `supportRequests` | a church asking for an app, a change, or with feedback | `/api/platform` |
| `frontDoorDays/{YYYY-MM-DD}` | how many visitors the front door had that day, and how many pressed a call to action | `/api/platform` |
| `frontDoorLeads` | what a first-time visitor told the welcome: their church, and, if they chose, their name and an email or phone to reach them | `/api/platform` |
| `frontDoorChats` | conversations visitors start from the front door's chat bubble, each readable only with the secret its visitor was given | `/api/platform` |
| `frontDoorPresence/host` | when the chat's host was last seen with Ekkly open, which is what "online now" means | `/api/platform` |

Inside each church, three more are written only by the platform:

| Collection | What it holds | Who reads it |
| --- | --- | --- |
| `subscription/apps` | which apps the church has on, and which the platform locked off | everyone in the church |
| `subscription/billing` | status, paid-through date, custom price | the church's administrators |
| `payments` | payments the platform recorded | the church's administrators |
| `usage/{YYYY-MM}` | AI calls that month | the church's administrators |

A church with no `subscription/apps` document has every app. That is how a
church from before apps were sold (UEC) keeps everything it had.

---

## The platform console

`/platform` on the front door's address, for platform admins. It works like
church Settings: a list of sections, each saying where it stands. Everything it
changes goes through `/api/platform`, which checks the caller is a platform
admin and writes a `platformLog` entry with the change.

| Section | What it does |
| --- | --- |
| Church requests | Approve or decline a request for a church. |
| Churches | Every church with its plan and usage. Opening one (`/platform/churches/:id`) lets you rename it, change its timezone, switch its apps on and off (and lock them off), set its billing and record payments, connect domains, and close or reopen it. |
| Apps & prices | The monthly price of each app, whether it is on offer, and how it is described to churches. |
| Live chat | Conversations from the front door's chat bubble, and your replies. The bubble says you are online while the account named in **Name & front door → Chat bubble** has any Ekkly tab open; a message left while you are away is emailed to that address. |
| Support requests | What churches asked for, with a status and a reply they see in their Settings. |
| New church defaults | Timezone, public page on or off, starting apps, trial length, starter ministries and tags. |
| Name & front door | The platform's name, tagline, contact email and front-door wording, and the chat bubble: on or off, the name visitors see, who answers, a phone for "Call" and a Messenger link. |
| Colours | The accent colours every church starts with. |
| AI | Whether AI runs at all, and which Claude model each feature uses. |
| Platform admins | Add or remove platform admins. The last one cannot be removed. |
| Activity | The platform log. |

**Apps.** Each app is tied to its pages and permissions in `lib/apps.js`. An app
that is off disappears from the sidebar, bottom bar, home page and dashboard
(`usePermissions().can()` refuses its capabilities), its routes redirect home,
and its tools leave the Claude connector. Nothing in it is deleted. A church's
administrators choose their own apps under **Settings → Apps & plan**, except
apps the platform locked off or stopped offering.

**Billing: by card, or recorded by hand.** A church's administrator can put a
card on file under **Settings → Apps & plan → Pay by card**, monthly or yearly
(a year costs ten months). PayMongo charges it on its own; each paid charge is
recorded as a payment and moves the paid-through date on, and a church still
in its free month keeps it. When a church's apps change, its card is charged
the new total from the next cycle. Payments taken any other way (GCash, a
bank transfer) are recorded on the church's page as before; a payment with a
"covers until" date moves the paid-through date forward and marks it paid up.

The card number goes from the browser straight to PayMongo. The server starts
the subscription, and PayMongo's webhook (`/api/platform`, told apart by its
`Paymongo-Signature` header) tells it about later charges. Neither the
webhook nor the page is taken at its word: the server asks PayMongo for the
subscription before recording anything. Keys are in [.env.example](.env.example).
`churches/{id}/subscription/billing.card` holds the PayMongo ids, and
`cardSubscriptions/{subscriptionId}` maps a subscription back to its church.

**Colours.** A church's own colours (Settings → Colours) win over the
platform's, which win over the built-in ones. `src/composables/useBrandTheme.js`
applies them by overriding the CSS variables Tailwind's `primary` classes read.

**AI.** Minutes write-up, song lookup and lyrics layout run only when the AI
switch in the console is on *and* the church has the EKRIS app. Each call
is counted in the church's `usage` for the month.

### A new church

1. Someone signs in at `app.church.app` and fills in *Ask for a church*.
2. A platform admin opens `/platform` and approves it, with the final id.
3. `/api/platform` creates the church in one transaction:
   - the church document
   - the requester's access and administrator role
   - a settings document with the church's name
   - what **New church defaults** says: its apps, a trial, starter ministries
     and tags
   - an audit entry, and a platform log entry

   It then adds `<id>.church.app` to Firebase Auth's authorised domains.
4. The requester opens `<id>.church.app`. They are its administrator. The
   public page starts switched off.

### Joining a church

1. Someone opens `<id>.church.app` and signs in. Without access, they land on
   `/join`.
2. They press *Ask to join*, which writes `churches/{id}/joinRequests/{uid}`.
3. A church administrator sees the request at the top of **Accounts** and
   presses *Let in*.
4. The waiting page turns into the app by itself, because it watches the
   access document live.

To remove someone, open **Accounts**, then the account, then *Remove from
church*. This deletes their access and any administrator role, and their open
app sends them back to `/join`.

---

## Setting up the shared project

This uses `church-test-fe084`, with `church.app` standing in for your real
domain.

### Firebase

1. **Authentication:** Sign-in method → enable **Google**.
2. **Firestore:** create the database, then deploy [firestore.rules](firestore.rules).
   Either run `firebase deploy --only firestore:rules` or paste the file into
   Firestore → Rules.
3. **Authentication → Settings → Authorized domains:** add `church.app` and
   `app.church.app` by hand, once. Each church's subdomain is added on approval.
   If that step fails (the approval result says so), add it by hand.
4. **Project settings → Service accounts:** generate a key. Put the JSON, on one
   line, in `FIREBASE_SERVICE_ACCOUNT`.
5. **Project settings → Cloud Messaging:** generate a Web Push key pair. Put the
   key in `VITE_FIREBASE_VAPID_KEY`.
6. **Billing:** every church shares one project quota, so expect to need the
   Blaze (pay-as-you-go) plan.

### Vercel

1. **Domains:** point `church.app`'s nameservers at Vercel. Wildcard domains
   require that. Then add both `church.app` and `*.church.app` to the project.
2. **Environment variables:** everything in [.env.example](.env.example) for the
   new project, including:
   - `VITE_ROOT_DOMAIN=church.app`
   - `VITE_PLATFORM_NAME`
   - `FIREBASE_SERVICE_ACCOUNT`
   - `CRON_SECRET`
   - the Gmail variables
3. **Plan:** the Hobby plan is for non-commercial use only. If churches pay, use
   Pro.
4. **Sign-in proxy:** [vercel.json](vercel.json) proxies `/__/auth/*` to
   `church-test-fe084.firebaseapp.com`. If the project ever changes, change that
   line too.

### You, as platform admin

Sign in once at `app.church.app` (or `localhost:5173`, see below), then run:

```bash
node scripts/make-platform-admin.mjs you@gmail.com
```

`/platform` now opens the console. Add any further platform admins from its
**Platform admins** section; the script is only needed for the first.

---

## Moving UEC across

`scripts/migrate-to-tenancy.mjs` copies the old single-church project
(`church-c9b15`) into the new one as `churches/uec`. It does five things:

1. **Accounts:** imports them with the same uids, so member links, admins and
   audit entries still match.
2. **Records:** copies every collection, keeping document ids.
3. **Church:** creates the church document.
4. **Access:** gives it to everyone who had an account, an admin role or a
   linked member record. Pass `--access=admins` to limit it to admins; everyone
   else then asks to join.
5. **Domain:** maps a custom domain, if you pass `--domain`.

Nothing in the old project is changed. Do a dry run first:

```bash
# service account JSON of the OLD project, saved outside the repo
node scripts/migrate-to-tenancy.mjs --from=../church-c9b15-sa.json --church=uec --name="UECPCOM"
node scripts/migrate-to-tenancy.mjs --from=../church-c9b15-sa.json --church=uec --name="UECPCOM" --write
```

UEC's app used to be the app's built-in look. It now starts with Ekkly's mark and
blue, so after the copy, in UEC's own Settings, upload its logo and set its
colours. The files and the colours are in [brand/uec/README.md](brand/uec/README.md).

Photos and logos already live in Vercel Blob under public URLs, so they keep
working. New uploads go under `uec/…` in the store.

The old maintenance scripts (`reset-attendance`, `clean-notifications`,
`migrate-ministries`, `migrate-photos-to-blob`, `clear-base64-images`) still
assume the old top-level layout. Don't run them against the new project as
they are.

---

## Custom domains

To give a church `app.uecp-calapan.com`, open the church in the console, then
**Domains → Add a domain**. That does as much as it can and reports each step:

1. Creates `domains/app.uecp-calapan.com` → `{ churchId: "uec" }`.
2. Adds the domain to Firebase Auth's authorised domains.
3. Adds the domain to the Vercel project, if `VERCEL_API_TOKEN` and
   `VERCEL_PROJECT_ID` are set. Otherwise add it in Vercel by hand.
4. Shows the DNS record the church has to add at its registrar.

"Use in emails and links" sets `primaryDomain` on the church. Removing a domain
deletes the mapping and removes it from Vercel, but leaves Firebase's authorised
domains alone.

For iPhone home-screen sign-in on a custom domain, see the README's section on
`VITE_FIREBASE_SELF_HOSTED_AUTH`. It needs a redirect URI per domain in Google
Cloud.

---

## Local development

The easiest way to test is to stay on `localhost:5173`, which needs no extra
authorised domains, and switch with the address. The same works on a
`*.vercel.app` deployment, which cannot have church subdomains either. On a real
address (`uec.church.app`, a church's own domain) `?church=` does nothing.

| Open | This tab serves |
| --- | --- |
| `localhost:5173/?church=` | the front door (ask for a church, `/platform`) |
| `localhost:5173/?church=uec` | the church `uec` |

The choice is remembered for the tab, and a small `dev · uec` badge in the
corner leads back to the front door. One sign-in covers them all.

Browsers also send every `*.localhost` to your machine, which makes it a
stand-in for the wildcard domain:

| Address | Serves |
| --- | --- |
| `localhost:5173` | the church in `VITE_DEFAULT_CHURCH`, or the front door if that is empty |
| `uec.localhost:5173` | the church `uec` |
| `app.localhost:5173` | the front door |

Firebase only allows Google sign-in on authorised domains, and only `localhost`
is authorised by default. Add `app.localhost`, `uec.localhost` and so on to use
them. Alternatively, keep everything on `localhost:5173` and switch churches
with `VITE_DEFAULT_CHURCH` and a restart.

`npm run dev` serves `/api/platform`, `/api/mcp-token` and `/api/accounts`
against the real project, so approving a church in development creates a real
church.

---

## Not done yet

- **Installed app name and icon per church.** The PWA manifest in
  `vite.config.js` says "Ekkly", with Ekkly's icons, for every church. A church
  installing its app gets Ekkly on the home screen rather than its own name
  and logo until the manifest is served per church.
- **Rules deployment.** `firestore.rules` now covers the console's collections
  (`platform`, `platformLog`, `supportRequests`, and each church's
  `subscription`, `payments`, `usage`). Until it is deployed, the browser cannot
  read the platform's colours and name (the app falls back to the built-in
  ones), and church members could still write `subscription/apps` directly.
- **Card payments are untested against PayMongo.** The integration follows
  PayMongo's documentation but has not been run with real keys. Try it with the
  test keys and PayMongo's test cards before going live, including a card that
  asks for 3-D Secure, a declined card, and a renewal (the webhook).
- **Roles.** `OPEN_ACCESS` in `usePermissions.js` still gives every member of a
  church every page. Churches are separated from each other; ministries within a
  church are not.
- **Rules tests.** The rules have not been run against the Firestore emulator.
  Check them in the Firebase console's Rules Playground before real data goes in:
  - a non-member reading `churches/uec/members/x`: denied
  - a member of another church doing the same: denied
  - a member creating their own `joinRequests` document in a church they're
    already in: denied
  - a member writing `churches/uec/subscription/apps`: denied
  - anyone but a platform admin reading `platform/private`: denied
