// Card payments, through PayMongo: a church's administrator puts a card on
// file, and PayMongo charges it every month or every year on its own.
//
// How it fits together:
//
//   1. startCardBilling (a church action) makes the PayMongo customer, a plan
//      for exactly what this church pays, and the subscription. PayMongo
//      answers with the first payment, waiting for a card.
//   2. The browser sends the card to PayMongo itself, with the public key —
//      card numbers never reach this server — and attaches it to that payment.
//      The bank may ask for 3-D Secure, which is a redirect and back.
//   3. syncCardBilling runs when they come back, and PayMongo's webhook runs on
//      every later charge. Both ask PayMongo for the subscription's real state
//      rather than trusting what was sent to them, and record a paid invoice as
//      a payment exactly once, moving the church's paid-through date on.
//
// A church still in its free month keeps it: the first charge covers a month
// (or a year) from the day the trial ends, not from today.
//
// Environment:
//   PAYMONGO_SECRET_KEY       sk_test_… or sk_live_…, server only
//   VITE_PAYMONGO_PUBLIC_KEY  pk_…, the browser's half
//   PAYMONGO_WEBHOOK_SECRET   whsk_…, shown once when the webhook is created
import crypto from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { MONTHS_PER_YEAR_PAID, mergeCatalog } from "../apps.js";
import { Refusal, logEntry, logRef } from "./common.js";
import { getPlatformPublic } from "./config.js";
import { appsRef, billingRef, planOf } from "./churches.js";

const API = "https://api.paymongo.com/v1";
const CYCLES = ["month", "year"];

// PayMongo is the actor for charges nobody pressed a button for.
const PAYMONGO = { uid: "paymongo", email: "", displayName: "PayMongo" };

export const isCardConfigured = () => Boolean(process.env.PAYMONGO_SECRET_KEY);

const mapRef = (subscriptionId) => db().collection("cardSubscriptions").doc(subscriptionId);

/* ------------------------------------------------------------ PayMongo */

async function paymongo(method, path, attributes) {
  if (!isCardConfigured()) throw new Refusal(503, "Card payments are not set up yet.");
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: attributes ? JSON.stringify({ data: { attributes } }) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.errors?.[0]?.detail || `PayMongo refused the request (HTTP ${response.status}).`;
    console.error(`PayMongo ${method} ${path} failed:`, JSON.stringify(payload));
    throw new Refusal(502, detail);
  }
  return payload.data;
}

/* --------------------------------------------------------------- dates */

const today = () => new Date().toISOString().slice(0, 10);

/** A date one billing cycle on, keeping the day of the month where it exists. */
export const addCycle = (date, cycle) => {
  const [y, m, d] = date.split("-").map(Number);
  const months = cycle === "year" ? 12 : 1;
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
};

/* ---------------------------------------------------------------- plan */

/** What this church pays each cycle, in centavos. */
async function amountFor(churchId, cycle) {
  const [apps, billing, platform] = await Promise.all([appsRef(churchId).get(), billingRef(churchId).get(), getPlatformPublic()]);
  const plan = planOf(apps.exists ? apps.data() : null, billing.exists ? billing.data() : null, mergeCatalog(platform.apps));
  const amount = cycle === "year" ? plan.monthly * MONTHS_PER_YEAR_PAID : plan.monthly;
  // PayMongo's smallest charge is one peso.
  if (amount < 100) throw new Refusal(400, "There is nothing to charge for yet.");
  return amount;
}

const createPlan = (churchName, amount, cycle) =>
  paymongo("POST", "/subscriptions/plans", {
    name: `${churchName} · ${cycle === "year" ? "yearly" : "monthly"}`.slice(0, 100),
    description: `Ekkly apps for ${churchName}`.slice(0, 250),
    amount,
    currency: "PHP",
    interval: cycle === "year" ? "yearly" : "monthly",
    interval_count: 1,
  });

/* ---------------------------------------------------- recording payment */

/**
 * Brings Firestore in line with what PayMongo says about a subscription, and
 * records its latest invoice as a payment if it is paid and not yet recorded.
 * Safe to run any number of times: the payment's id is the invoice's.
 */
async function syncSubscription(churchId, subscription) {
  const attrs = subscription.attributes || {};
  const invoice = attrs.latest_invoice || null;
  const billing = billingRef(churchId);

  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(billing);
    const data = snapshot.exists ? snapshot.data() : {};
    const card = data.card || {};
    const cycle = CYCLES.includes(card.cycle) ? card.cycle : "month";

    // A merge, so the card's other fields and the rest of billing stay put.
    const updates = {
      card: {
        status: attrs.status || card.status || "",
        nextBilling: attrs.next_billing_schedule || "",
        updatedAt: FieldValue.serverTimestamp(),
      },
    };

    if (invoice?.id && invoice.status === "paid") {
      const paymentRef = churchRef(churchId).collection("payments").doc(`paymongo_${invoice.id}`);
      const already = await tx.get(paymentRef);
      if (!already.exists) {
        // From whichever is later, today or the end of what is already paid
        // for — a trial included — so a charge never eats time already owed.
        const from = [today(), data.paidThrough || ""].sort().at(-1);
        const coversUntil = addCycle(from, cycle);
        tx.set(paymentRef, {
          amount: invoice.amount || card.amount || 0,
          paidOn: today(),
          coversUntil,
          method: "Card (PayMongo)",
          note: `Invoice ${invoice.id}`,
          recordedBy: PAYMONGO.uid,
          recordedByEmail: "",
          recordedAt: FieldValue.serverTimestamp(),
        });
        updates.paidThrough = coversUntil;
        updates.status = "active";
        tx.set(
          logRef(),
          logEntry(PAYMONGO, "church.payment", {
            churchId,
            target: paymentRef.id,
            label: `Card payment of ₱${((invoice.amount || 0) / 100).toLocaleString("en-PH")} (through ${coversUntil})`,
            details: { amount: invoice.amount || 0, coversUntil, invoice: invoice.id },
          })
        );
      }
    }

    // A failed renewal only shows as overdue once the paid time has run out;
    // PayMongo retries for three days before giving up.
    if (["past_due", "unpaid"].includes(attrs.status) && (data.paidThrough || "") < today()) updates.status = "overdue";

    tx.set(billing, updates, { merge: true });
  });
}

/* ------------------------------------------------------ church actions */

/**
 * A church's administrator starting card billing. Answers with the first
 * payment for the browser to attach the card to.
 *
 * { cycle: 'month' | 'year' } -> { paymentIntentId, clientKey, amount, cycle }
 */
export async function startCardBilling(caller, { cycle }) {
  if (!CYCLES.includes(cycle)) throw new Refusal(400, "Choose monthly or yearly.");
  const churchId = caller.church.id;
  const churchName = caller.church.data?.name || churchId;
  const billing = await billingRef(churchId).get();
  const card = billing.exists ? billing.get("card") || {} : {};

  if (card.subscriptionId && ["active", "past_due"].includes(card.status)) {
    throw new Refusal(409, "A card is already paying for this church. Remove it first to use another.");
  }

  const amount = await amountFor(churchId, cycle);

  // One PayMongo customer per church, kept across cards.
  let customerId = card.customerId;
  if (!customerId) {
    const [first, ...rest] = String(caller.displayName || churchName).trim().split(/\s+/);
    const customer = await paymongo("POST", "/customers", {
      first_name: (first || churchName).slice(0, 255),
      last_name: (rest.join(" ") || churchName).slice(0, 255),
      email: caller.email,
      default_device: "email",
    });
    customerId = customer.id;
  }

  const plan = await createPlan(churchName, amount, cycle);
  const subscription = await paymongo("POST", "/subscriptions", { customer_id: customerId, plan_id: plan.id });
  const intentId = subscription.attributes?.latest_invoice?.payment_intent?.id;
  if (!intentId) throw new Refusal(502, "PayMongo did not start the first payment. Please try again.");
  // The client key is on the payment intent itself.
  const intent = await paymongo("GET", `/payment_intents/${intentId}`);

  const batch = db().batch();
  batch.set(
    billingRef(churchId),
    {
      card: {
        provider: "paymongo",
        customerId,
        subscriptionId: subscription.id,
        planId: plan.id,
        cycle,
        amount,
        status: subscription.attributes?.status || "incomplete",
        startedBy: caller.email || caller.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
    },
    { merge: true }
  );
  batch.set(mapRef(subscription.id), { churchId, createdAt: FieldValue.serverTimestamp() });
  batch.set(
    logRef(),
    logEntry({ uid: caller.uid, email: caller.email, displayName: caller.displayName }, "church.card.start", {
      churchId,
      target: subscription.id,
      label: `${churchName}: started paying by card, ${cycle === "year" ? "yearly" : "monthly"}`,
      details: { amount, cycle },
    })
  );
  await batch.commit();

  return { paymentIntentId: intentId, clientKey: intent.attributes?.client_key, amount, cycle };
}

/** After the card is attached (and any 3-D Secure), and whenever Settings opens. */
export async function syncCardBilling(caller) {
  const churchId = caller.church.id;
  const billing = await billingRef(churchId).get();
  const card = billing.exists ? billing.get("card") || {} : {};
  if (!card.subscriptionId || !isCardConfigured()) return { card: publicCard(card) };
  const subscription = await paymongo("GET", `/subscriptions/${card.subscriptionId}`);
  await syncSubscription(churchId, subscription);
  const fresh = await billingRef(churchId).get();
  return { card: publicCard(fresh.get("card") || {}) };
}

/** Stops future charges. What is already paid for stays paid for. */
export async function cancelCardBilling(caller) {
  const churchId = caller.church.id;
  const billing = await billingRef(churchId).get();
  const card = billing.exists ? billing.get("card") || {} : {};
  if (!card.subscriptionId) throw new Refusal(404, "No card is paying for this church.");

  if (!["cancelled", "incomplete_cancelled"].includes(card.status)) {
    await paymongo("POST", `/subscriptions/${card.subscriptionId}/cancel`, { cancellation_reason: "other" });
  }
  const batch = db().batch();
  batch.update(billingRef(churchId), { "card.status": "cancelled", "card.updatedAt": FieldValue.serverTimestamp() });
  batch.set(
    logRef(),
    logEntry({ uid: caller.uid, email: caller.email, displayName: caller.displayName }, "church.card.cancel", {
      churchId,
      target: card.subscriptionId,
      label: `${caller.church.data?.name || churchId}: stopped paying by card`,
    })
  );
  await batch.commit();
  return { card: publicCard({ ...card, status: "cancelled" }) };
}

/**
 * When a church's apps change, its card should be charged the new amount from
 * the next cycle. Best effort: a failure here must not undo the apps change,
 * and the next change or a platform admin can put it right.
 */
export async function repriceCardBilling(churchId, churchName) {
  try {
    const billing = await billingRef(churchId).get();
    const card = billing.exists ? billing.get("card") || {} : {};
    if (!card.subscriptionId || !["active", "past_due"].includes(card.status) || !isCardConfigured()) return;
    const amount = await amountFor(churchId, card.cycle);
    if (amount === card.amount) return;
    const plan = await createPlan(churchName || churchId, amount, card.cycle);
    await paymongo("PUT", `/subscriptions/${card.subscriptionId}/plan`, { plan_id: plan.id });
    await billingRef(churchId).update({ "card.planId": plan.id, "card.amount": amount, "card.updatedAt": FieldValue.serverTimestamp() });
  } catch (error) {
    console.error(`Could not reprice card billing for ${churchId}:`, error);
  }
}

/** What the church's Settings may know about its card. No PayMongo ids. */
export const publicCard = (card) => ({
  on: Boolean(card.subscriptionId) && !["cancelled", "incomplete_cancelled"].includes(card.status),
  status: card.status || "",
  cycle: card.cycle || "",
  amount: card.amount || 0,
  nextBilling: card.nextBilling || "",
});

/* ------------------------------------------------------------- webhook */

/**
 * PayMongo-Signature is `t=<unix>,te=<test hmac>,li=<live hmac>`, each an
 * HMAC-SHA256 of `${t}.${raw body}` with the webhook's secret. Only checkable
 * with the body exactly as sent, which the caller may not have; when it does
 * not, the handler still acts only on what PayMongo itself says when asked.
 */
export const signatureValid = (header, rawBody) => {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || !header || typeof rawBody !== "string") return null;
  const parts = Object.fromEntries(String(header).split(",").map((p) => p.split("=")));
  if (!parts.t) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
  const given = parts.li || parts.te || "";
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
};

/**
 * One event from PayMongo. The event is a hint, not a fact: it names a
 * subscription, and the subscription is read back from PayMongo with the
 * secret key before anything is recorded.
 */
export async function handlePaymongoEvent(event) {
  const type = event?.data?.attributes?.type || "";
  if (!type.startsWith("subscription.")) return { ignored: type || "unknown" };

  const resource = event.data.attributes.data || {};
  const subscriptionId = type.startsWith("subscription.invoice.")
    ? resource.attributes?.subscription_id || resource.attributes?.subscription?.id || ""
    : resource.id || "";
  if (!/^subs_[A-Za-z0-9]+$/.test(subscriptionId)) return { ignored: "no subscription" };

  const map = await mapRef(subscriptionId).get();
  if (!map.exists) return { ignored: "unknown subscription" };

  const subscription = await paymongo("GET", `/subscriptions/${subscriptionId}`);
  await syncSubscription(map.get("churchId"), subscription);
  return { ok: true };
}
