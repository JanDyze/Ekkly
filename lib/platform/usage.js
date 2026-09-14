// How much each church uses: the counts the console shows beside a church, and
// the monthly counter every AI call adds to.
//
// Counted with Firestore's aggregate queries, which bill one read per thousand
// documents rather than one per document — a church of four hundred people is
// one read, not four hundred.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { CHURCHES_COLLECTION } from "../churchId.js";
import { DEFAULT_TIMEZONE } from "../occurrences.js";
import { monthKey } from "../platformDefaults.js";
import { iso } from "./common.js";

const count = async (query) => {
  try {
    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error("Error counting:", error);
    return null;
  }
};

/**
 * `{ members, accounts, pendingJoins, lastActiveAt, month, ai }` for one church.
 * The last activity is the newest audit entry: every change anyone makes in
 * the app writes one, so it is when somebody last did something, not merely
 * looked.
 */
export async function churchUsage(churchId, timezone = DEFAULT_TIMEZONE) {
  const ref = churchRef(churchId);
  const month = monthKey(new Date(), timezone);
  const [members, accounts, pendingJoins, last, usage] = await Promise.all([
    count(ref.collection("members")),
    count(ref.collection("access")),
    count(ref.collection("joinRequests").where("status", "==", "pending")),
    ref.collection("auditLog").orderBy("at", "desc").limit(1).get().catch(() => null),
    ref.collection("usage").doc(month).get().catch(() => null),
  ]);
  return {
    members,
    accounts,
    pendingJoins,
    lastActiveAt: iso(last?.docs?.[0]?.get("at")),
    month,
    ai: usage?.exists ? usage.get("ai") || {} : {},
  };
}

/** Every church's usage, keyed by id. A few at a time, so a long list does not open a hundred queries at once. */
export async function usageForAll() {
  const churches = await db().collection(CHURCHES_COLLECTION).get();
  const out = {};
  const docs = churches.docs;
  for (let i = 0; i < docs.length; i += 5) {
    await Promise.all(
      docs.slice(i, i + 5).map(async (d) => {
        out[d.id] = await churchUsage(d.id, d.get("timezone") || DEFAULT_TIMEZONE);
      })
    );
  }
  return out;
}

/**
 * One AI call, counted against the church in its own month. Never awaited by a
 * caller that is answering a person: a counter that failed is not a reason to
 * withhold the minutes they are waiting for.
 */
export async function recordAiUse(church, feature) {
  const month = monthKey(new Date(), church?.data?.timezone || DEFAULT_TIMEZONE);
  try {
    await church.ref
      .collection("usage")
      .doc(month)
      .set({ ai: { [feature]: FieldValue.increment(1) }, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } catch (error) {
    console.error("Error counting AI use:", error);
  }
}
