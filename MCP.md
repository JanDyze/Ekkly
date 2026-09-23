# The church records as an MCP connector

`/api/mcp` serves this app's Firestore records to Claude over the Model Context
Protocol, so you can ask about the congregation, the calendar, worship
planning, small groups, minutes, tasks and the ledger in ordinary conversation
instead of opening the app and reading pages.

It is a **remote** MCP server — Streamable HTTP, stateless, one Vercel function.
Nothing is installed on your machine.

---

## What it can answer

Fifteen read tools, always available:

| Tool | What it gives you |
| --- | --- |
| `church_profile` | Name, mission, vision and core values, service times, contacts, the size of the roll, and every ministry and tag in use |
| `search_members` | People, filtered by name, ministry, tag, sex, civil status, age or birthday month |
| `get_member` | One person in full, plus their small groups and open tasks |
| `list_events` | The calendar between two dates — events, recurring services and birthdays |
| `attendance_records` | The head count for each gathering |
| `attendance_summary` | Attendance totals and averages by type, month or gathering |
| `search_songs` | The worship library, searchable down to a line of lyrics |
| `get_lineup` | A month's schedule: everyone serving by role, songs and keys |
| `list_prayer_concerns` | What the church is praying for, by status and priority |
| `list_small_groups` | Groups, leaders, when they meet, how many belong |
| `get_small_group` | One group's membership and its recent sessions |
| `search_minutes` | Meeting minutes, full-text |
| `get_minute` | One meeting: agenda, discussions, decisions, action items |
| `list_tasks` | What is assigned, to whom, and what is overdue |
| `finance_summary` | Money in, out and net for a period, by category, month or account |

Things it deliberately will not do: it never returns member portraits or gallery
photos, and `search_members` withholds contact numbers and home addresses
unless the question asks for them.

## What it can change

Twelve write tools, **all off unless the church's link was made with writing
allowed**:

| Tool | What it does |
| --- | --- |
| `add_member` | Puts a new member or attendee on the roll |
| `update_member` | Corrects a record, adds a ministry, turns an attendee into a member |
| `create_event` | Adds a one-off gathering to the calendar |
| `update_event` | Moves, retitles or cancels one gathering — see the note below |
| `record_attendance` | Saves a head count against a gathering |
| `add_prayer_concern` | Records a prayer concern, optionally against a person |
| `update_prayer_concern` | Marks one answered, or changes its priority |
| `add_task` | Assigns a task to people by name |
| `update_task` | Ticks a task off, reassigns or reschedules it |
| `add_song` | Adds a song to the worship library |
| `update_small_group_members` | Moves people in and out of a group |
| `add_ledger_entry` | Records money in, money out, or a transfer |

Four things hold across all of them:

- **Nothing is ever deleted.** A gathering is cancelled, a task is ticked, a
  concern is marked answered. Every one of those has an undo in the app; a
  deletion made in a conversation does not.
- **The controlled lists are enforced.** An invented ministry, event type or
  ledger category is refused with the real list attached, so the next attempt
  succeeds. A ministry is the only field that grants access, and this must not
  become the way round that.
- **Every write is signed.** Records carry `mcp` in their createdBy/updatedBy
  whoever connected, so anything changed through a conversation can be told
  from something a person typed; the name beside it says whose link it was —
  "Claude (for Ana Reyes)" — and the audit entry carries their uid, so the log
  can be read by person.
- **Nothing notifies anybody.** The app raises a push when a person saves an
  event or a task; these do not. Ringing every phone in the congregation is not
  a side effect a tool call should have — so if something needs announcing, it
  still needs announcing.

**Editing a recurring service.** A weekly service and a birthday have no
document behind them — they are generated from the schedule. Asking to move one
saves a *one-off override* for that date and leaves the rest of the series
alone, which is how "move next Sunday to ten" works without moving every
Sunday. Note that once an occurrence is overridden its generated id retires, so
call `list_events` again before doing anything else with it.

**Recording attendance twice** is the mistake this is most likely to make,
since Claude cannot see what it already saved. `record_attendance` refuses a
gathering that already has a figure and says so; correcting one needs an
explicit `replace: true`.

---

## Whose link it is

One endpoint serves every church on the platform, and a link answers two
questions before a single tool runs:

- **Which church.** The link decides, and it decides once and for all — that
  church's records and nobody else's.
- **Whose it is.** A link belongs to the account that made it. It reaches only
  what that person can reach in the app, it stops working the moment they leave
  the church, and what it changes carries their name.

So the tools on offer are not the same for everyone. Somebody who cannot open
Finances in the app has no `finance_summary` in their connector; somebody who
can see the roll but not edit it has `search_members` and no `add_member`, even
with writing switched on. The write switch is a ceiling over what the person
could already do by hand, never a grant of anything more. A tool held back says
which of the three reasons it was — read-only link, app switched off, or access
the person does not have — so the conversation can say something useful instead
of looking like it guessed a name wrong.

Each account makes its own link, and making one leaves everybody else's alone.
An administrator sees every link in the church in Settings and can switch any
of them off.

## Setting it up

### 1. Make your link

Open **Settings → Claude connector** and press *Make a link*, ticking *Let
Claude add and change records* first if the connector should be able to write.
The link is shown **once**:

```
https://uec.church.app/api/mcp/THE_TOKEN
```

Only a SHA-256 fingerprint of the token is kept (`mcpTokens/{hash}`, which no
browser can read), so a lost link cannot be shown again — make a new one, which
also switches your old one off and leaves everybody else's alone.

The endpoint reads with the Firebase Admin SDK, so Firestore's security rules
do not apply to it. **The token is the only thing standing between this URL and
every record the church keeps.** `FIREBASE_SERVICE_ACCOUNT` must be set in the
deployment; nothing else is.

`MCP_TOKEN` in the environment still works as the old single-church door — it
opens `MCP_CHURCH_ID` (or `VITE_DEFAULT_CHURCH`), with writes governed by
`MCP_WRITE_TOOLS` — so a connector set up before churches existed keeps working
through the move. It belongs to the deployment rather than to a person, so
there is nobody to scope it to and it sees everything. Unset it once every
church has links of its own.

A link made before links belonged to accounts is read as belonging to whoever
issued it, so it keeps working, is theirs to replace from Settings, and answers
to their access like any other.

### 2. Add it to Claude

**Claude.ai (web and desktop).** Settings → Connectors → *Add custom connector*.
Paste the link:

```
https://uec.church.app/api/mcp/THE_TOKEN
```

Leave the OAuth fields blank. Custom connectors need a paid Claude plan (Pro,
Max, Team or Enterprise). Once it connects you will see the tools listed; start
a conversation and ask something like *"how has Sunday attendance been over the
last three months?"*

**Claude Code.** It can send a proper header, which is better — see the note
below:

```bash
claude mcp add --transport http uec-church https://uec.church.app/api/mcp \
  --header "Authorization: Bearer THE_TOKEN"
```

**Checking it by hand.** A GET on the endpoint reports its own state, including
which church a token opens:

```bash
curl -H "Authorization: Bearer THE_TOKEN" https://uec.church.app/api/mcp
# {"server":{...},"authorised":true,"church":"uec","owner":"Ana Reyes","writesEnabled":false}

curl -X POST https://uec.church.app/api/mcp \
  -H "Authorization: Bearer THE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## About the token in the URL

Claude's custom connector form takes a URL and nothing else, so the token has to
travel in the path for that client. That is a genuine trade-off worth
understanding rather than glossing over:

- A URL ends up in more places than a header does — browser history, server
  logs, anything that records where a request went.
- Anyone holding that URL holds everything its owner can reach — which, for an
  administrator's link, is the whole congregation's records.

So: treat the URL itself as the password. Do not paste it into a group chat or a
shared document. Where a client can send `Authorization: Bearer <token>` — Claude
Code can — prefer that; the endpoint accepts both. If the URL is ever exposed,
make a new link in Settings (or switch the connector off); the old one stops
working immediately.

A wrong token gets a plain `403`, not a `401`, on purpose: a `401` is the
protocol's signal to go and start an OAuth flow, and there is no authorisation
server here to find.

---

## Turning writes on

A link made with *Let Claude add and change records* ticked offers the twelve
tools in the table above, minus any the person could not do by hand; one made
without it offers none of them. It is one switch for all of them, and it
belongs to the link — to change it, make a new link.

Read-only, the worst this connector can do is answer a question badly. With
writes on it edits the church's actual records — the roll, the calendar, the
books. That is the point of turning it on, but it is worth being deliberate
about: turn it on when you have work to do, and off again afterwards.

Nothing it writes is destructive and nothing it writes is announced, so the
worst realistic outcome is a wrong entry somebody has to correct in the app,
not a lost record or a push to the whole congregation at midnight.

---

## Running it locally

`npm run dev` serves the endpoint too, at `http://localhost:5173/api/mcp`, as
long as `FIREBASE_SERVICE_ACCOUNT` is in `.env`. Make a link from Settings on
the church's local address (`uec.localhost:5173`) and use its token.
Note that local means the *real* Firestore — there is no emulator here, so a
write made in development is a write made.

The MCP Inspector is the quickest way to look at it:

```bash
npx @modelcontextprotocol/inspector
# Transport: Streamable HTTP
# URL: http://localhost:5173/api/mcp
# Authentication: Bearer Token -> the token from the church's link
```

---

## How it is put together

```
api/mcp.js         HTTP: CORS, the token -> church -> person checks, and the POST/GET contract
api/mcp-token.js   an account making, describing or revoking a link; administrators see every one
lib/mcpTokens.js   tokens stored as hashes, one per account per church
lib/audience.js    accessFor(): is this account still here, and what may it do
lib/mcp/church.js  the request's church and actor, carried to every tool (AsyncLocalStorage)
lib/mcp/server.js  the protocol: JSON-RPC dispatch, initialize, tools/list, tools/call
lib/mcp/tools.js   the twenty-seven tools — schemas and handlers
lib/mcp/data.js    shared Firestore reads, the member index, formatting
```

Every tool reaches Firestore through `church()`, which is
`churches/{churchId}` for the church the token opened, and the short-lived
cache in `data.js` is keyed by church — a warm instance serves every church's
connector, and must never hand one congregation's roll to another's conversation.

The person is resolved on every request rather than once when the link was
made, so access taken away in the app is access gone from the connector by the
next message. `accessFor` asks about one account rather than loading the whole
roll the way `loadAudience` does for notifications — three documents, and the
roles only where the person actually holds a ministry — because a connector
pays that cost on every tool call.

Which capability a tool answers to is `TOOL_AREAS` in `tools.js`: `TOOL_APPS`
plus the roll, since a capability's area is its app key. A read needs
`<area>.view`, a write `<area>.manage`. The one tool in neither map —
`church_profile` — is what any signed-in account sees on the dashboard.

There is no MCP SDK dependency. A tools-only server over Streamable HTTP is a
dispatch table, and a Vercel function cannot hold a session between requests
anyway, so each POST is answered on its own and no `Mcp-Session-Id` is ever
issued — which the specification allows.

Adding a tool means adding one entry to the `TOOLS` array in `lib/mcp/tools.js`:
a name, a description the model reads to decide whether to reach for it, a JSON
Schema for the arguments, and an async handler returning plain data. Set
`write: true` on anything that changes a record so it stays behind the flag.
