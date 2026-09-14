// What happens on the platform's front door, for whoever is selling Ekkly.
//
// Two things are kept, and only with the visitor's say-so (the page asks
// before it sends anything):
//
//   frontDoorDays/{YYYY-MM-DD}  how many people looked, tried a name, or
//                               pressed a call to action that day
//   frontDoorTries/{id}         the church names people typed into "Curious?
//                               Type your church's name", which is the useful
//                               one: it says which churches are looking.
//
// Nobody is identified. A visitor gets a random id in their own browser so the
// same person typing the same name twice is one row rather than twenty, and
// that id means nothing anywhere else. No addresses, no accounts, no cookies
// that follow anyone to another site.
//
// The write is unauthenticated — a visitor has not signed in and may never —
// so this is deliberately narrow: three kinds, short fields, a row id worked
// out from what was sent rather than a new document each time, and counters
// that only ever go up by one.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { suggestChurchId } from "../churchId.js";
import { Refusal, clip, iso } from "./common.js";

const KINDS = ["visit", "tried", "start"];

const daysRef = () => db().collection("frontDoorDays");
const triesRef = () => db().collection("frontDoorTries");

/**
 * The day a signal belongs to. The page sends its own date, because a visit at
 * nine in the evening in Manila is that evening's visit and not the next
 * morning's in UTC. It is accepted only in the right shape and only within a
 * day of now, so a wrong clock — or a made-up one — cannot file a visit in a
 * week that has not happened.
 */
const dayFor = (sent) => {
  const utc = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sent || "")) {
    const gap = Math.abs(Date.parse(`${sent}T12:00:00Z`) - utc.getTime());
    if (gap < 36 * 3600000) return sent;
  }
  return utc.toISOString().slice(0, 10);
};

/** Only the host, so a referrer is "which site sent them" and nothing more. */
const referrerHost = (value) => {
  const text = clip(value, 300);
  if (!text) return "";
  try {
    return new URL(text).host.slice(0, 100);
  } catch {
    return "";
  }
};

/** A visitor's own id: their browser made it, and we keep only its shape. */
const visitorId = (value) => (clip(value, 40).match(/^[a-z0-9]{8,40}$/) ? clip(value, 40) : "");

/**
 * One signal from the front door. Called by anyone, so it refuses anything it
 * does not recognise and never writes more than two documents.
 *
 * { kind: 'visit' | 'tried' | 'start', name?, visitor?, referrer? }
 */
export async function recordFrontDoor({ kind, name, visitor, referrer, day: sentDay } = {}) {
  if (!KINDS.includes(kind)) throw new Refusal(400, "Unknown signal");

  const day = dayFor(sentDay);
  const writes = db().batch();
  const counter = { visit: "visits", tried: "tries", start: "starts" }[kind];

  writes.set(
    daysRef().doc(day),
    { day, [counter]: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  if (kind === "tried") {
    const churchName = clip(name, 120);
    const slug = suggestChurchId(churchName);
    // Too short to mean anything, and not worth a row.
    if (churchName.length < 3 || !slug) throw new Refusal(400, "Nothing to record");

    const who = visitorId(visitor);
    // The same person refining the same name is one row, not one per keystroke.
    const id = `${who || "anon"}_${slug}`.slice(0, 120);
    const host = referrerHost(referrer);
    writes.set(
      triesRef().doc(id),
      {
        name: churchName,
        slug,
        visitor: who,
        // Only when there is one: a later signal without a referrer would
        // otherwise rub out where they came from the first time.
        ...(host ? { referrer: host } : {}),
        tries: FieldValue.increment(1),
        lastAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await writes.commit();
  return { ok: true };
}

const shapeTry = (d) => ({
  id: d.id,
  name: d.get("name") || "",
  slug: d.get("slug") || "",
  referrer: d.get("referrer") || "",
  tries: d.get("tries") || 1,
  lastAt: iso(d.get("lastAt")),
});

/**
 * The console's view: the last month of counts, and the names people tried,
 * newest first.
 */
export async function frontDoorReport({ days = 30, limit = 100 } = {}) {
  const since = new Date(Date.now() - Math.min(days, 90) * 86400000).toISOString().slice(0, 10);

  const [dayDocs, tryDocs] = await Promise.all([
    daysRef().where("day", ">=", since).orderBy("day", "desc").get(),
    triesRef().orderBy("lastAt", "desc").limit(Math.min(limit, 200)).get(),
  ]);

  return {
    days: dayDocs.docs.map((d) => ({
      day: d.id,
      visits: d.get("visits") || 0,
      tries: d.get("tries") || 0,
      starts: d.get("starts") || 0,
    })),
    tried: tryDocs.docs.map(shapeTry),
  };
}
