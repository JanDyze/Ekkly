// What a church owes and what it has paid.
//
// Tracked, not collected: the platform takes payment its own way — GCash, a
// bank transfer — and records it here. Recording a payment moves the church's
// paid-through date on, so "overdue" is something the console can show at a
// glance rather than something anyone has to work out.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { isBillingStatus } from "../platformDefaults.js";
import { Refusal, clip, logEntry, logRef } from "./common.js";
import { billingRef, getChurch, requireChurch } from "./churches.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isDate = (value) => typeof value === "string" && DATE.test(value);

const centavos = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 0) throw new Refusal(400, "An amount has to be zero or more.");
  return n;
};

const peso = (c) => `₱${(c / 100).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function setBilling(admin, { churchId, status, paidThrough, customMonthly, note }) {
  const church = await requireChurch(churchId);
  if (!isBillingStatus(status)) throw new Refusal(400, "That is not a billing status.");
  if (paidThrough && !isDate(paidThrough)) throw new Refusal(400, "Paid through has to be a date.");

  const data = {
    status,
    paidThrough: paidThrough || "",
    customMonthly: centavos(customMonthly),
    note: clip(note, 500),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const batch = db().batch();
  batch.set(billingRef(churchId), data, { merge: true });
  batch.set(
    logRef(),
    logEntry(admin, "church.billing", {
      churchId,
      label: `${church.get("name") || churchId}: billing set to ${status}${paidThrough ? `, paid through ${paidThrough}` : ""}`,
      details: { status, paidThrough: data.paidThrough, customMonthly: data.customMonthly },
    })
  );
  await batch.commit();
  return getChurch({ churchId });
}

export async function recordPayment(admin, { churchId, amount, paidOn, coversUntil, method, note }) {
  const church = await requireChurch(churchId);
  const value = centavos(amount);
  if (!value) throw new Refusal(400, "Enter how much was paid.");
  if (!isDate(paidOn)) throw new Refusal(400, "Enter the date it was paid.");
  if (coversUntil && !isDate(coversUntil)) throw new Refusal(400, "Covers until has to be a date.");

  const firestore = db();
  const paymentRef = churchRef(churchId).collection("payments").doc();

  await firestore.runTransaction(async (tx) => {
    const billing = await tx.get(billingRef(churchId));
    const current = billing.exists ? billing.get("paidThrough") || "" : "";

    tx.set(paymentRef, {
      amount: value,
      paidOn,
      coversUntil: coversUntil || "",
      method: clip(method, 60),
      note: clip(note, 300),
      recordedBy: admin.uid,
      recordedByEmail: admin.email,
      recordedAt: FieldValue.serverTimestamp(),
    });

    // A payment only ever moves the date forward: recording an old receipt
    // late must not pull a church that has paid ahead back into arrears.
    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (coversUntil && coversUntil > current) updates.paidThrough = coversUntil;
    const status = billing.exists ? billing.get("status") : "none";
    if (["none", "trial", "overdue"].includes(status) && (updates.paidThrough || current)) updates.status = "active";
    tx.set(billingRef(churchId), updates, { merge: true });

    tx.set(
      logRef(),
      logEntry(admin, "church.payment", {
        churchId,
        target: paymentRef.id,
        label: `${church.get("name") || churchId} paid ${peso(value)}${coversUntil ? ` (through ${coversUntil})` : ""}`,
        details: { amount: value, paidOn, coversUntil: coversUntil || "" },
      })
    );
  });

  return getChurch({ churchId });
}

export async function removePayment(admin, { churchId, paymentId }) {
  const church = await requireChurch(churchId);
  const ref = churchRef(churchId).collection("payments").doc(clip(paymentId, 128));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Refusal(404, "That payment is not on record.");

  const batch = db().batch();
  batch.delete(ref);
  batch.set(
    logRef(),
    logEntry(admin, "church.payment.remove", {
      churchId,
      target: ref.id,
      label: `${church.get("name") || churchId}: removed a payment of ${peso(snapshot.get("amount") || 0)} from ${snapshot.get("paidOn")}`,
    })
  );
  await batch.commit();
  return getChurch({ churchId });
}
