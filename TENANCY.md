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
| `church.app`, `app.church.app` | The platform's front door: sign in, ask for a church, see your requests. Platform admins also get `/platform`. |
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
| `platformAdmins/{uid}` | people who approve churches | `scripts/make-platform-admin.mjs` |
| `domains/{host}` | custom domain → church id | by hand for now |
| `mcpTokens/{sha256}` | a church's connector token | `/api/mcp-token` |

### A new church

1. Someone signs in at `app.church.app` and fills in *Ask for a church*.
2. A platform admin opens `/platform` and approves it, with the final id.
3. `/api/platform` creates the church in one transaction:
   - the church document
   - the requester's access and administrator role
   - a settings document with the church's name
   - an audit entry

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

`/platform` now shows the requests.

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

Photos and logos already live in Vercel Blob under public URLs, so they keep
working. New uploads go under `uec/…` in the store.

The old maintenance scripts (`reset-attendance`, `clean-notifications`,
`migrate-ministries`, `migrate-photos-to-blob`, `clear-base64-images`) still
assume the old top-level layout. Don't run them against the new project as
they are.

---

## Custom domains

The data model supports custom domains already. There is no screen for them
yet. To give a church `app.uecp-calapan.com` by hand:

1. Add the domain to the Vercel project. The church adds the DNS record Vercel
   shows.
2. In Firestore, create `domains/app.uecp-calapan.com` with `{ churchId: "uec" }`.
3. Add the domain to Firebase Auth's authorised domains.
4. Optionally, set `primaryDomain: "app.uecp-calapan.com"` on `churches/uec`, so
   emails and connector links use it.

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

- **Installed app name and icon.** The PWA manifest in `vite.config.js` still
  says "UECPCOM Canubing II" for every church. It needs to be served per church.
- **Sign-in screen mark.** A church without an uploaded logo shows the UEC logo
  and its drawing animation.
- **Custom domain screen.** Setup is manual, as described above.
- **Roles.** `OPEN_ACCESS` in `usePermissions.js` still gives every member of a
  church every page. Churches are separated from each other; ministries within a
  church are not.
- **Rules tests.** The rules have not been run against the Firestore emulator.
  Check them in the Firebase console's Rules Playground before real data goes in:
  - a non-member reading `churches/uec/members/x`: denied
  - a member of another church doing the same: denied
  - a member creating their own `joinRequests` document in a church they're
    already in: denied
