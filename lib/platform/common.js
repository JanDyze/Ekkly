// Small pieces every platform action uses.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";

/** An answer the caller should see as-is, with the HTTP status it deserves. */
export class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const clip = (value, max) => String(value ?? "").trim().slice(0, max);

/** A Firestore Timestamp (or Date) as an ISO string, for JSON. */
export const iso = (value) => {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return null;
};

export const PLATFORM_LOG = "platformLog";

/**
 * One line in the platform's own activity log. Written by the server in the
 * same transaction or batch as the change where it can be, so there is no
 * change without its line.
 *
 * Kept apart from each church's auditLog: the platform acts on churches from
 * outside them, and a church's administrators have no business reading what
 * the platform did to somebody else's.
 */
export const logEntry = (admin, action, { churchId = "", target = "", label = "", details = {} } = {}) => ({
  at: FieldValue.serverTimestamp(),
  actorUid: admin?.uid || "",
  actorEmail: admin?.email || "",
  actorName: admin?.displayName || "",
  action,
  churchId,
  target,
  label: clip(label, 200),
  details,
});

export const logRef = () => db().collection(PLATFORM_LOG).doc();

export const writeLog = (admin, action, fields) => logRef().set(logEntry(admin, action, fields));
