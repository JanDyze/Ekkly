// The people who run the platform.
//
// This used to be a script and nothing else, on the reasoning that the first
// administrator has to come from somewhere holding the service account. That
// still holds for the first one (scripts/make-platform-admin.mjs). After that,
// an administrator can appoint another from the console — every appointment
// and removal lands in the platform log, and the last administrator cannot be
// removed, so the platform can never be left with nobody able to run it.
import { getAuth } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import { db, initAdmin } from "../firebaseAdmin.js";
import { Refusal, clip, iso, logEntry, logRef } from "./common.js";

const adminsRef = () => db().collection("platformAdmins");

export async function listAdmins() {
  const snapshot = await adminsRef().get();
  return snapshot.docs
    .map((d) => ({
      uid: d.id,
      email: d.get("email") || "",
      displayName: d.get("displayName") || "",
      addedAt: iso(d.get("addedAt")),
      addedByEmail: d.get("addedByEmail") || "",
    }))
    .sort((a, b) => (a.addedAt || "").localeCompare(b.addedAt || ""));
}

export async function addAdmin(admin, { email }) {
  const address = clip(email, 200).toLowerCase();
  if (!address.includes("@")) throw new Refusal(400, "Enter the email address of their Google account.");

  initAdmin();
  let user;
  try {
    user = await getAuth().getUserByEmail(address);
  } catch {
    throw new Refusal(
      404,
      `No account uses ${address} yet. Ask them to sign in once — at the front door is enough — then add them again.`
    );
  }

  const ref = adminsRef().doc(user.uid);
  if ((await ref.get()).exists) throw new Refusal(409, `${address} is already a platform administrator.`);

  const batch = db().batch();
  batch.set(ref, {
    email: user.email || address,
    displayName: user.displayName || "",
    addedAt: FieldValue.serverTimestamp(),
    addedBy: admin.uid,
    addedByEmail: admin.email,
  });
  batch.set(logRef(), logEntry(admin, "admin.add", { target: user.uid, label: `Made ${address} a platform administrator` }));
  await batch.commit();
  return listAdmins();
}

export async function removeAdmin(admin, { uid }) {
  const id = clip(uid, 128);
  const firestore = db();

  await firestore.runTransaction(async (tx) => {
    const all = await tx.get(adminsRef());
    const target = all.docs.find((d) => d.id === id);
    if (!target) throw new Refusal(404, "That person is not a platform administrator.");
    if (all.size <= 1) throw new Refusal(409, "The platform needs at least one administrator. Add another before removing this one.");

    tx.delete(target.ref);
    tx.set(
      logRef(),
      logEntry(admin, "admin.remove", { target: id, label: `Removed ${target.get("email") || id} as a platform administrator` })
    );
  });

  return listAdmins();
}

/** The platform log, newest first, a page at a time. */
export async function activity({ limit = 100, before } = {}) {
  let query = db().collection("platformLog").orderBy("at", "desc").limit(Math.min(200, Math.max(1, Number(limit) || 100)));
  if (before) {
    const date = new Date(before);
    if (!Number.isNaN(date.getTime())) query = query.startAfter(date);
  }
  const snapshot = await query.get();
  return snapshot.docs.map((d) => ({
    id: d.id,
    at: iso(d.get("at")),
    action: d.get("action") || "",
    label: d.get("label") || "",
    churchId: d.get("churchId") || "",
    actorEmail: d.get("actorEmail") || "",
    actorName: d.get("actorName") || "",
  }));
}
