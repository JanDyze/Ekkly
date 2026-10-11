// Everything else the church keeps, which only YUNIT reads.
//
// The connector's tools (tools.js) each answer one kind of question well: the
// roll, the calendar, the books in total. A church keeps far more than they
// cover — follow-up notes, sermons, service plans, links, the gallery, each
// line in the ledger, who has an account, the audit log — and a tool written
// by hand for each would always be one collection behind. So these three read
// any collection under the church, found as Firestore has them rather than
// from a list, so one added next month is readable the day it exists.
//
// They are plain reads: nothing is shaped beyond what makes a document safe
// and small enough to hand to the model. Three things are never handed over:
//
//   Credentials. A collection named for tokens or secrets is left out whole,
//   and any field so named is dropped wherever it appears.
//   Pictures. A portrait or a photo is stored as a data URL and can be a
//   megabyte of characters; it becomes "[picture]".
//   Bulk. Long text is cut, long lists are cut, and every listing is capped
//   and says when it was.
//
// They answer to the church's apps the way every other tool does: a
// collection that belongs to an app the church has switched off is not read
// (RECORD_APPS). Who may read is decided in lib/yunit.js, not here.
import { church } from "./church.js";
import { clampLimit, excerpt, matches, peso } from "./data.js";

const str = (description) => ({ type: "string", description });
const int = (description) => ({ type: "integer", description });
const schema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

// Collections never read: credentials, and live noise that says nothing
// about the church (who is on the front door this second).
const HIDDEN = new Set(["mcpTokens", "fcmTokens", "presence"]);
export const SECRET = /token|secret|password|passcode|hash|apikey|api_key|privatekey|private_key/i;

export const hidden = (name) => HIDDEN.has(name) || SECRET.test(name);

// Which app each collection belongs to (lib/apps.js), so a switched-off app
// stays off here too. A collection not listed belongs to no app that can go.
const RECORD_APPS = {
  events: "events",
  recurringSchedules: "events",
  attendance: "attendance",
  worshipSongs: "songs",
  worshipLineups: "lineups",
  servicePlans: "lineups",
  teamDuties: "lineups",
  teamDays: "lineups",
  followUps: "lineups",
  sermons: "lineups",
  prayerConcerns: "prayer",
  smallGroups: "smallgroups",
  sgSessions: "smallgroups",
  sgSessionPhotos: "smallgroups",
  minutes: "minutes",
  ledgerEntries: "finances",
  ledgerSettings: "finances",
  tasks: "tasks",
  links: "links",
  gallery_albums: "gallery",
  gallery_photos: "gallery",
  lessons: "teaching",
  teachingClasses: "teaching",
  inventory: "inventory",
};

// What the model is told each known collection holds, so it picks the right
// one without reading them all first. One it does not know is still listed.
const ABOUT = {
  members: "The roll: members and attendees, with contact details, ministries and tags.",
  ministries: "The ministries a person can serve in.",
  memberTags: "The free-text tags used on people.",
  memberClaims: "Accounts asking to be linked to a record on the roll.",
  userAccounts: "Who has an account and their email.",
  access: "Who may sign in to this church.",
  appAdmins: "The church's administrators.",
  rolePermissions: "What each ministry is allowed to see and do.",
  joinRequests: "People asking to join the church through the app.",
  appSettings: "The church's settings: its profile (church), the public page (landing) and lists such as event types.",
  events: "One-off events, and edits or cancellations of a weekly service on one date.",
  recurringSchedules: "The weekly services the calendar repeats.",
  attendance: "Head counts per gathering.",
  worshipSongs: "The worship song library, with lyrics.",
  worshipLineups: "Each month's schedule: who serves on each Sunday, and the songs.",
  servicePlans: "Orders of service.",
  teamDuties: "Duties given to a team on a Sunday.",
  teamDays: "A team's notes for one Sunday.",
  followUps: "Welcome and follow-up notes about people who have just started coming.",
  sermons: "Sermons: titles, preachers, passages, outline and the preacher's notes (bigIdea, manuscript).",
  lessons: "Sunday school lessons and lesson plans: class, date, teachers, passages, memory verse. A lesson with no date is a plan in the library.",
  teachingClasses: "Sunday school classes, their age band and regular teachers.",
  inventory: "What the church owns: where each thing is kept, its condition, and who has borrowed it (loans) and when it is due back. value is in centavos.",
  prayerConcerns: "Prayer concerns and their status.",
  smallGroups: "Small groups, their leaders and members.",
  sgSessions: "Small group meetings: who came and what was taught.",
  sgSessionPhotos: "Photos from small group meetings.",
  minutes: "Meeting minutes.",
  ledgerEntries: "Every line in the church's books. `amount` is in centavos; `amountText` is it in pesos.",
  ledgerSettings: "Opening balances and the books' settings.",
  tasks: "Tasks and who they are on.",
  links: "The church's saved links.",
  gallery_albums: "Photo albums.",
  gallery_photos: "Photos in the albums.",
  announcementVideos: "Announcement videos made in the app.",
  auditLog: "Every change made in the app: who, what and when.",
  mailLog: "Emails the app has sent.",
  notifications: "Notifications sent to people.",
  subscription: "The church's plan, its apps, and billing.",
  payments: "What the church has paid.",
  usage: "How much the church has used metered features.",
  supportRequests: "The church's requests for help from Ekkly.",
  userPrefs: "Each person's own preferences in the app.",
};

/* ------------------------------------------------------------- the path */

/**
 * A collection path inside the church — "members", or a nested one such as
 * "smallGroups/<id>/notes" — checked segment by segment, so nothing can
 * reach outside churches/{id}.
 */
export const collectionAt = (path, apps) => {
  const segments = String(path || "").trim().split("/").filter(Boolean);
  if (!segments.length || segments.length % 2 === 0) {
    throw new Error(`"${path}" is not a collection. Call list_collections to see them.`);
  }
  if (segments.some((s) => !/^[\w-]+$/.test(s))) throw new Error(`"${path}" is not a collection name.`);
  if (segments.some((s, i) => i % 2 === 0 && hidden(s))) throw new Error(`"${path}" holds credentials and is never read.`);
  const app = RECORD_APPS[segments[0]];
  if (apps && app && !apps.has(app)) {
    throw new Error(`"${segments[0]}" belongs to an app this church does not have.`);
  }
  let ref = church().collection(segments[0]);
  for (let i = 1; i < segments.length; i += 2) ref = ref.doc(segments[i]).collection(segments[i + 1]);
  return ref;
};

/* ---------------------------------------------------- making it readable */

/**
 * A Firestore document as plain, small JSON: dates as ISO strings, pictures
 * named rather than carried, secrets dropped, long text and lists cut.
 */
const clean = (value, text, depth = 0) => {
  if (value === null || value === undefined) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    if (/^data:/.test(value)) return "[picture]";
    return value.length > text ? excerpt(value, text) : value;
  }
  if (typeof value !== "object") return value;
  // A reference to another document, or a point on a map. Told apart by what
  // they are, not their fields: a plain map may well have a `path`.
  const kind = value.constructor?.name;
  if (kind === "DocumentReference") return value.path;
  if (kind === "GeoPoint") return { latitude: value.latitude, longitude: value.longitude };
  if (depth >= 6) return "[nested too deep]";
  if (Array.isArray(value)) {
    const list = value.slice(0, 60).map((item) => clean(item, text, depth + 1));
    if (value.length > 60) list.push(`… ${value.length - 60} more`);
    return list;
  }
  if (Buffer.isBuffer?.(value) || value instanceof Uint8Array) return "[binary]";
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (SECRET.test(key)) continue;
    out[key] = clean(item, text, depth + 1);
  }
  return out;
};

const shape = (collection, doc, text) => {
  const data = clean(doc.data() || {}, text);
  // The books store centavos; say them in pesos too, so nobody reads 150000
  // as a hundred and fifty thousand.
  if (collection === "ledgerEntries" && typeof data.amount === "number") data.amountText = peso(data.amount);
  return { id: doc.id, ...data };
};

/* ------------------------------------------------------------- the tools */

const listCollections = (apps) => async (args = {}) => {
  const parent = String(args.parent || "").trim();
  let ref = church();
  if (parent) {
    const segments = parent.split("/").filter(Boolean);
    if (segments.length % 2 !== 0) throw new Error(`"${parent}" is not a record. Give a collection and an id, e.g. smallGroups/<id>.`);
    ref = collectionAt(segments.slice(0, -1).join("/"), apps).doc(segments.at(-1));
  }
  const collections = (await ref.listCollections()).filter(
    (c) => !hidden(c.id) && (parent || !apps || !RECORD_APPS[c.id] || apps.has(RECORD_APPS[c.id]))
  );
  const rows = await Promise.all(
    collections.map(async (c) => {
      const count = await c.count().get().then((s) => s.data().count).catch(() => null);
      return { collection: parent ? `${parent}/${c.id}` : c.id, records: count, about: ABOUT[c.id] || undefined };
    })
  );
  return { collections: rows.sort((a, b) => a.collection.localeCompare(b.collection)) };
};

// How many documents a listing reads before filtering. A church's collections
// are small except the ledger and the audit log, and newest-first (`sortBy`)
// keeps those to the part anyone asks about.
const SCAN = 2000;

const listRecords = (apps) => async (args = {}) => {
  const collection = String(args.collection || "").trim();
  const ref = collectionAt(collection, apps);
  const limit = clampLimit(args.limit, 25, 100);
  const name = collection.split("/").filter(Boolean).at(-1);

  const sortBy = args.sortBy ? String(args.sortBy) : "";
  const ascending = args.order === "asc";
  const filtered = Boolean(args.field) && args.equals !== undefined && args.equals !== "";

  let query = ref;
  if (filtered) {
    // Numbers and true/false are stored as such; "12" would never match 12.
    // A number with a leading zero is a phone number or a code, kept as text.
    const raw = String(args.equals);
    const value = raw === "true" ? true : raw === "false" ? false : !Number.isNaN(Number(raw)) && !/^0\d/.test(raw) ? Number(raw) : raw;
    query = query.where(String(args.field), "in", [...new Set([raw, value])]);
  }
  // Matching one field and sorting by another needs an index nobody has made,
  // so with a filter the sorting is done here instead.
  if (sortBy && !filtered) query = query.orderBy(sortBy, ascending ? "asc" : "desc");
  const snapshot = await query.limit(SCAN).get();

  let rows = snapshot.docs
    .map((doc) => shape(name, doc, 400))
    .filter((row) => !args.query || matches(JSON.stringify(row), args.query));
  if (sortBy && filtered) {
    rows = rows
      .filter((row) => row[sortBy] !== undefined && row[sortBy] !== null)
      .sort((a, b) => (a[sortBy] < b[sortBy] ? -1 : a[sortBy] > b[sortBy] ? 1 : 0) * (ascending ? 1 : -1));
  }

  return {
    collection,
    scanned: snapshot.size,
    scanLimitReached: snapshot.size === SCAN,
    matched: rows.length,
    returned: Math.min(rows.length, limit),
    truncated: rows.length > limit,
    rows: rows.slice(0, limit),
  };
};

const getRecord = (apps) => async (args = {}) => {
  const collection = String(args.collection || "").trim();
  const id = String(args.id || "").trim();
  if (!id || !/^[\w-]+$/.test(id)) throw new Error("Give the record's id, from list_records.");
  const ref = collectionAt(collection, apps).doc(id);
  const [doc, nested] = await Promise.all([ref.get(), ref.listCollections()]);
  if (!doc.exists) return { found: false, message: `No record "${id}" in ${collection}.` };
  const name = collection.split("/").filter(Boolean).at(-1);
  const inside = nested.map((c) => c.id).filter((c) => !hidden(c));
  return {
    found: true,
    collection,
    ...shape(name, doc, 12000),
    ...(inside.length ? { collectionsInside: inside.map((c) => `${collection}/${id}/${c}`) } : {}),
  };
};

/**
 * The three tools, bound to the church's apps (a Set of app keys, or null for
 * every app) so a switched-off app's records stay closed.
 */
export const recordTools = (apps = null) => [
  {
    name: "list_collections",
    title: "What the church keeps",
    description:
      "Every kind of record the church keeps, with how many of each and what they hold — the roll, " +
      "the books line by line, follow-ups, sermons, service plans, accounts, the audit log and more. " +
      "Use it when no other tool covers what you were asked; then read with list_records and " +
      "get_record. Give `parent` (a collection and an id) to see the records kept inside one record.",
    input: schema({ parent: str("Optional: a record's path, e.g. smallGroups/<id>, to list what it holds.") }),
    run: listCollections(apps),
  },
  {
    name: "list_records",
    title: "Read the church's records",
    description:
      "Reads the records in any collection from list_collections, as they are stored. Narrow it with " +
      "`field` and `equals` (an exact value), free-text `query` across every field, and `sortBy` a " +
      "field, newest first (ledgerEntries and auditLog by `date` or `createdAt`). Long text is cut " +
      "short here; get_record gives one record whole. Prefer the dedicated tools where one fits — " +
      "finance_summary for totals, search_members for the roll.",
    input: schema(
      {
        collection: str("A collection name from list_collections, e.g. ledgerEntries, followUps, sermons, auditLog."),
        query: str("Free text matched anywhere in the record."),
        field: str("A field to match exactly, e.g. status, direction, memberId."),
        equals: str("The value that field must have."),
        sortBy: str("A field to sort by, e.g. date or createdAt. Records without it are left out."),
        order: { type: "string", enum: ["desc", "asc"], description: "Default desc: newest first." },
        limit: int("Most records to return (default 25, maximum 100)."),
      },
      ["collection"]
    ),
    run: listRecords(apps),
  },
  {
    name: "get_record",
    title: "One record in full",
    description:
      "One record from any collection, whole, with the names of any collections kept inside it.",
    input: schema(
      {
        collection: str("The collection, as list_collections or list_records gave it."),
        id: str("The record's id."),
      },
      ["collection", "id"]
    ),
    run: getRecord(apps),
  },
];
