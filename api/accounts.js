// Vercel serverless function: mirror a church's accounts from Firebase Auth into
// that church's `userAccounts` collection, which the Accounts page reads.
//
// The browser stamps its own account whenever its owner opens the app, which
// covers everyone who keeps using it. This endpoint is the backfill for the
// rest. Only the Admin SDK can read another account's Firebase record, so it
// has to live on the server.
//
// One Firebase project holds every church's accounts, so this no longer lists
// all of them — that would hand one church's administrator the names and email
// addresses of every other congregation. It reads the church's own `access`
// list and fetches exactly those accounts.
//
// Requires the FIREBASE_SERVICE_ACCOUNT env var (full service account JSON
// from Firebase Console → Project settings → Service accounts).
import { getAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { requireChurchAdmin } from "../lib/tenant.js";

// Firestore caps a batched write at 500 operations.
const BATCH_LIMIT = 500;

// getUsers takes at most 100 identifiers per call.
const LOOKUP_LIMIT = 100;

const toTimestamp = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date) ? null : Timestamp.fromDate(date);
};

export default async function handler(req, res) {
  // Deliberately no wildcard CORS header: this hands back every member's email
  // address, so it is for the app's own origin only.
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const admin = await requireChurchAdmin(req);
    if (admin.error) return res.status(admin.status).json({ error: admin.error });

    const church = admin.church.ref;
    const accessSnap = await church.collection("access").select().get();
    const uids = accessSnap.docs.map((d) => d.id);

    let batch = church.firestore.batch();
    let pending = 0;
    let synced = 0;

    for (let i = 0; i < uids.length; i += LOOKUP_LIMIT) {
      const { users } = await getAuth().getUsers(uids.slice(i, i + LOOKUP_LIMIT).map((uid) => ({ uid })));

      for (const user of users) {
        const providers = user.providerData.map((p) => p.providerId).filter(Boolean);

        // merge:true throughout — `lastActiveAt` belongs to the client
        // heartbeat and must survive a sync.
        const payload = {
          email: user.email || "",
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          emailVerified: Boolean(user.emailVerified),
          disabled: Boolean(user.disabled),
          providers: providers.length ? providers : ["password"],
          primaryProvider: providers[0] || "password",
        };

        const createdAt = toTimestamp(user.metadata?.creationTime);
        if (createdAt) payload.createdAt = createdAt;

        const lastSignInAt = toTimestamp(user.metadata?.lastSignInTime);
        if (lastSignInAt) payload.lastSignInAt = lastSignInAt;

        batch.set(church.collection("userAccounts").doc(user.uid), payload, { merge: true });
        pending += 1;
        synced += 1;

        if (pending >= BATCH_LIMIT) {
          await batch.commit();
          batch = church.firestore.batch();
          pending = 0;
        }
      }
    }

    if (pending > 0) await batch.commit();

    return res.status(200).json({ synced });
  } catch (error) {
    console.error("Error syncing accounts:", error);
    return res.status(500).json({ error: error.message || "Failed to sync accounts" });
  }
}
