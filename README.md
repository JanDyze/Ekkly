<img src="public/ekkly-mark.svg" alt="" width="56" height="56" />

# Ekkly

Your church, in one app. People, small groups, attendance, events, songs,
schedules, the Bible, minutes, prayer concerns, photos, finances and tasks,
for any number of churches from one deployment. Each church has its own
address and records, and pays only for the apps it uses.

Built with Vue 3, Vite, Tailwind CSS 4 and Firebase, and deployed on Vercel.
Start with [CLAUDE.md](CLAUDE.md) for how the code is organised and
[DESIGN.md](DESIGN.md) for how pages look.

```bash
npm install
npm run dev        # the app; add ?church=<id> to open a church locally
npm run build      # the check before calling a change done
```

The logo lives in `public/ekkly-mark.svg`. After changing it, run
`node scripts/generate-icons.mjs` to regenerate the installed-app icons.

## Many churches, one deployment

Every church lives under its own address (`uec.church.app`) and its own
`churches/{id}/` in Firestore, and only accounts a church has let in can read
it. See [TENANCY.md](TENANCY.md) for how it fits together, how to set up the
shared project, how a church is approved, and how to move UEC's data across.

## Ask Claude about the church records

`/api/mcp` publishes the app's records as a Model Context Protocol connector,
so the calendar, the roll, attendance, schedules, minutes, tasks and the
ledger can be asked about in conversation. It is off until `MCP_TOKEN` is set.

See [MCP.md](MCP.md) for the tools it offers and how to connect Claude to it.

## Google sign-in on an installed iOS app

Signing in works everywhere out of the box **except** one case: the app
installed to an iPhone or iPad home screen. There, `signInWithPopup` cannot
work — iOS opens the popup outside the app, where it can never report back —
so the sign-in has to be a full-page redirect instead. Safari then partitions
storage per site, and a redirect that detours through
`<project>.firebaseapp.com` comes back to a different site than it left,
with the sign-in state stranded on the other one.

The fix is to stop leaving this domain. `vercel.json` already proxies
`/__/auth/*` to Firebase, so its sign-in handler is served from our own domain,
and `VITE_FIREBASE_SELF_HOSTED_AUTH=true` points Firebase at it. That flag is
off by default because the proxy alone is not enough — turning it on before
the two console changes below are made would break Google sign-in on *every*
device rather than fix it on iOS.

To turn it on:

1. **Firebase console** → Authentication → Settings → Authorized domains: add
   the production domain, if it is not already listed.
2. **Google Cloud console** → APIs & Services → Credentials → the "Web client"
   OAuth 2.0 client ID → Authorised redirect URIs: add
   `https://<production-domain>/__/auth/handler`. Google refuses any redirect
   URI it has not been shown in advance, and this one is new.
3. Set `VITE_FIREBASE_SELF_HOSTED_AUTH=true` in the Vercel project's
   environment variables (and in `.env.local` to try it locally), then
   redeploy.

Verify on a real iPhone, not the simulator and not desktop Safari's responsive
mode: install to the home screen, open from there, and sign in with Google.
Preview deployments get a fresh domain each time and are not listed in either
console, so they will fail step 1 — test this on production.
