// Every church's tickets, for the people who run Ekkly (the console's Tickets
// section, TicketsAdmin.vue).
//
// A ticket lives in its church, in `tasks` marked by scope (lib/tickets.js),
// where the church's own app reads it. The rules let only that church's
// people read it, and a platform administrator is not one of them, so the
// console reads and answers them here, from the server, and every change is
// written to the platform's log in the same batch.
//
// What the console does to a ticket is Ekkly's side of it: where it stands
// (new, in progress, on hold, done, won't do), its place in the order the
// bugs and ideas are worked through, and the answer, which is a message in
// its conversation that whoever sent it reads in their church's app.
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { TICKET_SCOPE, TICKET_STATUS_KEYS, isClosedStatus, messageId, messagesOf, normalizeKind } from "../tickets.js";
import { Refusal, clip, iso, logEntry, logRef } from "./common.js";

const toDate = (value) => (value?.toDate ? value.toDate() : null);

const shape = (church, d) => {
  const data = d.data();
  return {
    id: d.id,
    churchId: church.id,
    churchName: church.get ? church.get("name") || church.id : church.name || church.id,
    title: data.title || "",
    details: data.details || "",
    kind: normalizeKind(data.kind),
    where: data.where || "",
    page: data.page || "",
    order: typeof data.order === "number" ? data.order : null,
    reporterUid: data.reporterUid || "",
    reporterName: data.reporterName || "",
    device: data.device || "",
    version: data.version || "",
    assigneeUid: data.assigneeUid || "",
    assigneeName: data.assigneeName || "",
    status: TICKET_STATUS_KEYS.includes(data.status) ? data.status : data.done ? "done" : "open",
    messages: messagesOf(data, toDate).map((m) => ({ ...m, at: m.at ? m.at.toISOString() : null })),
    doneAt: iso(data.doneAt),
    createdAt: iso(data.createdAt),
    updatedAt: iso(data.updatedAt),
  };
};

const newestFirst = (a, b) => (b.createdAt || "").localeCompare(a.createdAt || "");

/**
 * Every church's tickets, newest first. Church by church rather than one
 * query across them all: a query across every church's `tasks` needs an index
 * of its own deployed before it answers, and a handful of churches read one
 * at a time costs nothing.
 */
export async function listTickets() {
  const churches = await db().collection("churches").get();
  const lists = await Promise.all(
    churches.docs.map(async (church) => {
      const snapshot = await church.ref.collection("tasks").where("scope", "==", TICKET_SCOPE).get();
      return snapshot.docs.map((d) => shape(church, d));
    })
  );
  return lists.flat().sort(newestFirst);
}

const ticketRef = (churchId, id) => churchRef(churchId).collection("tasks").doc(id);

async function requireTicket(churchId, id) {
  if (!churchId || !id) throw new Refusal(400, "Which ticket?");
  const ref = ticketRef(String(churchId), String(id));
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.get("scope") !== TICKET_SCOPE) throw new Refusal(404, "That ticket is not there any more.");
  return { ref, snapshot };
}

/**
 * Change one: any of where it stands, its place in the order, and a message
 * from Ekkly added to its conversation. Starting it takes it; putting it back
 * to new gives up the claim.
 */
export async function updateTicket(admin, { churchId, id, status, order, message }) {
  const { ref, snapshot } = await requireTicket(churchId, id);
  const updates = { updatedAt: FieldValue.serverTimestamp() };
  const changed = [];

  if (status !== undefined) {
    if (!TICKET_STATUS_KEYS.includes(status)) throw new Refusal(400, "That is not a status.");
    updates.status = status;
    updates.doneAt = isClosedStatus(status) ? FieldValue.serverTimestamp() : null;
    if (status === "doing") {
      updates.assigneeUid = admin.uid;
      updates.assigneeName = admin.displayName || admin.email || "";
    }
    if (status === "open") {
      updates.assigneeUid = "";
      updates.assigneeName = "";
    }
    changed.push(`status ${status}`);
  }

  if (order !== undefined) {
    if (typeof order !== "number" || !Number.isFinite(order)) throw new Refusal(400, "That is not a place in the order.");
    updates.order = order;
    changed.push("moved");
  }

  const text = clip(message, 4000);
  if (text) {
    // The name over the bubble is the first name, marked as Ekkly's by the
    // thread (TicketThread): "Jan · Ekkly".
    const name = (admin.displayName || "").split(" ")[0] || "Ekkly";
    // arrayUnion takes no server timestamp, so the time is this server's.
    updates.messages = FieldValue.arrayUnion({ id: messageId(), from: "ekkly", uid: admin.uid, name, text, at: Timestamp.now() });
    changed.push("answered");
  }

  if (!changed.length) throw new Refusal(400, "Nothing to change.");

  const church = await churchRef(String(churchId)).get();
  const batch = db().batch();
  batch.update(ref, updates);
  batch.set(
    logRef(),
    logEntry(admin, "ticket.update", {
      churchId: String(churchId),
      target: ref.id,
      label: `${snapshot.get("title") || "Ticket"}: ${changed.join(", ")}`,
    })
  );
  await batch.commit();

  return shape(church, await ref.get());
}

/** Gone for good: spam, a duplicate, a chore that no longer matters. */
export async function deleteTicket(admin, { churchId, id }) {
  const { ref, snapshot } = await requireTicket(churchId, id);
  const batch = db().batch();
  batch.delete(ref);
  batch.set(
    logRef(),
    logEntry(admin, "ticket.delete", { churchId: String(churchId), target: ref.id, label: `Deleted “${snapshot.get("title") || "Ticket"}”` })
  );
  await batch.commit();
  return { ok: true };
}
