// A church asking the platform for something: an app it wishes existed, a
// change to one that does, a bug, or plain feedback.
//
// Sent and read back through the server rather than straight to Firestore, so
// the rules can stay shut on the collection: a church's administrators see
// their own church's requests and nobody else's, and only the platform
// answers them.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { SUPPORT_KINDS, SUPPORT_STATUSES } from "../platformDefaults.js";
import { Refusal, clip, iso, logEntry, logRef } from "./common.js";

const requestsRef = () => db().collection("supportRequests");

const shape = (d) => ({
  id: d.id,
  churchId: d.get("churchId") || "",
  churchName: d.get("churchName") || "",
  kind: d.get("kind") || "feedback",
  title: d.get("title") || "",
  details: d.get("details") || "",
  status: d.get("status") || "new",
  reply: d.get("reply") || "",
  email: d.get("email") || "",
  displayName: d.get("displayName") || "",
  createdAt: iso(d.get("createdAt")),
  updatedAt: iso(d.get("updatedAt")),
  repliedAt: iso(d.get("repliedAt")),
});

const newestFirst = (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "");

export async function sendSupportRequest(caller, { kind, title, details }) {
  if (!SUPPORT_KINDS.some((k) => k.key === kind)) throw new Refusal(400, "Choose what kind of request this is.");
  const cleanTitle = clip(title, 140);
  if (!cleanTitle) throw new Refusal(400, "Give the request a short title.");

  const ref = requestsRef().doc();
  const now = FieldValue.serverTimestamp();
  const churchName = caller.church.data?.name || caller.church.id;

  const batch = db().batch();
  batch.set(ref, {
    churchId: caller.church.id,
    churchName,
    uid: caller.uid,
    email: caller.email || "",
    displayName: caller.displayName || "",
    kind,
    title: cleanTitle,
    details: clip(details, 4000),
    status: "new",
    reply: "",
    createdAt: now,
    updatedAt: now,
  });
  batch.set(
    logRef(),
    logEntry(
      { uid: caller.uid, email: caller.email, displayName: caller.displayName },
      "support.new",
      { churchId: caller.church.id, target: ref.id, label: `${churchName} asked: ${cleanTitle}` }
    )
  );
  await batch.commit();
  return mySupportRequests(caller);
}

export async function mySupportRequests(caller) {
  const snapshot = await requestsRef().where("churchId", "==", caller.church.id).get();
  return snapshot.docs.map(shape).sort(newestFirst);
}

export async function listSupportRequests() {
  const snapshot = await requestsRef().orderBy("createdAt", "desc").limit(500).get();
  return snapshot.docs.map(shape);
}

export async function replySupportRequest(admin, { id, status, reply }) {
  if (!SUPPORT_STATUSES.some((s) => s.key === status)) throw new Refusal(400, "That is not a status.");
  const ref = requestsRef().doc(clip(id, 128));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Refusal(404, "That request no longer exists.");

  const cleanReply = clip(reply, 4000);
  const updates = { status, reply: cleanReply, updatedAt: FieldValue.serverTimestamp() };
  if (cleanReply !== (snapshot.get("reply") || "")) {
    updates.repliedAt = FieldValue.serverTimestamp();
    updates.repliedByEmail = admin.email || "";
  }

  const batch = db().batch();
  batch.update(ref, updates);
  batch.set(
    logRef(),
    logEntry(admin, "support.reply", {
      churchId: snapshot.get("churchId") || "",
      target: ref.id,
      label: `${snapshot.get("churchName") || "A church"}: "${snapshot.get("title")}" marked ${status}`,
    })
  );
  await batch.commit();
  return listSupportRequests();
}
