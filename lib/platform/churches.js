// Every church, as the platform sees it: what it is called, whether it is open,
// what it pays for and how much it uses.
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { CHURCHES_COLLECTION, churchOrigin, isValidChurchId } from "../churchId.js";
import { DEFAULT_TIMEZONE } from "../occurrences.js";
import { enabledAppsFrom, mergeCatalog, monthlyTotal } from "../apps.js";
import { isBillingStatus, isValidTimezone } from "../platformDefaults.js";
import { Refusal, clip, iso, logEntry, logRef } from "./common.js";
import { getPlatformPublic } from "./config.js";
import { churchUsage } from "./usage.js";

const rootDomain = () => process.env.VITE_ROOT_DOMAIN || "";

export const appsRef = (churchId) => churchRef(churchId).collection("subscription").doc("apps");
export const billingRef = (churchId) => churchRef(churchId).collection("subscription").doc("billing");

/** The church must exist; returns its snapshot. */
export async function requireChurch(churchId) {
  if (!isValidChurchId(churchId)) throw new Refusal(400, "That is not a church id.");
  const snapshot = await churchRef(churchId).get();
  if (!snapshot.exists) throw new Refusal(404, `There is no church "${churchId}".`);
  return snapshot;
}

/** What a church pays for, in the shape the console and church Settings both read. */
export function planOf(appsData, billingData, catalog) {
  const enabled = enabledAppsFrom(appsData);
  const customMonthly = Number.isFinite(billingData?.customMonthly) ? billingData.customMonthly : null;
  return {
    apps: enabled ? [...enabled] : null,
    lockedOff: Array.isArray(appsData?.lockedOff) ? appsData.lockedOff : [],
    status: isBillingStatus(billingData?.status) ? billingData.status : "none",
    paidThrough: billingData?.paidThrough || "",
    customMonthly,
    listMonthly: monthlyTotal(catalog, enabled),
    monthly: customMonthly ?? monthlyTotal(catalog, enabled),
    note: billingData?.note || "",
  };
}

const summary = (snapshot, plan, domains) => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    name: data.name || snapshot.id,
    status: data.status || "active",
    timezone: data.timezone || DEFAULT_TIMEZONE,
    primaryDomain: data.primaryDomain || "",
    address: churchOrigin(snapshot.id, { rootDomain: rootDomain(), primaryDomain: data.primaryDomain }),
    createdAt: iso(data.createdAt),
    domains,
    plan,
  };
};

export async function listChurches() {
  const firestore = db();
  const [churches, domains, platform] = await Promise.all([
    firestore.collection(CHURCHES_COLLECTION).get(),
    firestore.collection("domains").get(),
    getPlatformPublic(),
  ]);
  const catalog = mergeCatalog(platform.apps);

  const domainsByChurch = {};
  domains.docs.forEach((d) => {
    const id = d.get("churchId");
    (domainsByChurch[id] ||= []).push(d.id);
  });

  const refs = churches.docs.flatMap((d) => [appsRef(d.id), billingRef(d.id)]);
  const subs = refs.length ? await firestore.getAll(...refs) : [];

  return churches.docs
    .map((snapshot, i) => {
      const apps = subs[i * 2];
      const billing = subs[i * 2 + 1];
      const plan = planOf(apps?.exists ? apps.data() : null, billing?.exists ? billing.data() : null, catalog);
      return summary(snapshot, plan, domainsByChurch[snapshot.id] || []);
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

/** One church with everything the console's church page shows. */
export async function getChurch({ churchId }) {
  const snapshot = await requireChurch(churchId);
  const firestore = db();
  const [apps, billing, domains, payments, platform] = await Promise.all([
    appsRef(churchId).get(),
    billingRef(churchId).get(),
    firestore.collection("domains").where("churchId", "==", churchId).get(),
    churchRef(churchId).collection("payments").orderBy("paidOn", "desc").limit(50).get(),
    getPlatformPublic(),
  ]);
  const catalog = mergeCatalog(platform.apps);
  const plan = planOf(apps.exists ? apps.data() : null, billing.exists ? billing.data() : null, catalog);
  const usage = await churchUsage(churchId, snapshot.get("timezone") || DEFAULT_TIMEZONE);

  return {
    ...summary(
      snapshot,
      plan,
      domains.docs.map((d) => d.id)
    ),
    domainDetails: domains.docs.map((d) => ({ host: d.id, addedAt: iso(d.get("addedAt")) })),
    payments: payments.docs.map((d) => ({
      id: d.id,
      amount: d.get("amount") || 0,
      paidOn: d.get("paidOn") || "",
      coversUntil: d.get("coversUntil") || "",
      method: d.get("method") || "",
      note: d.get("note") || "",
      recordedByEmail: d.get("recordedByEmail") || "",
    })),
    catalog,
    usage,
  };
}

/**
 * Renames a church or moves its timezone. The name is also carried into the
 * church's own settings — but only where those still say the old name, so a
 * short name the church chose for itself is not overwritten.
 */
export async function updateChurch(admin, { churchId, name, timezone }) {
  await requireChurch(churchId);
  const ref = churchRef(churchId);
  const settingsRef = ref.collection("appSettings").doc("church");

  await db().runTransaction(async (tx) => {
    const [church, settings] = await Promise.all([tx.get(ref), tx.get(settingsRef)]);
    const before = church.data() || {};
    const updates = {};

    if (name !== undefined) {
      const clean = clip(name, 120);
      if (!clean) throw new Refusal(400, "A church needs a name.");
      if (clean !== before.name) updates.name = clean;
    }
    if (timezone !== undefined) {
      if (!isValidTimezone(timezone)) throw new Refusal(400, "That is not a timezone.");
      if (timezone !== before.timezone) updates.timezone = timezone;
    }
    if (!Object.keys(updates).length) return;

    tx.update(ref, updates);

    if (updates.name) {
      const identity = settings.exists ? settings.get("church") || {} : {};
      const carried = {};
      if (!identity.fullName || identity.fullName === before.name) carried.fullName = updates.name;
      if (!identity.shortName || identity.shortName === before.name) carried.shortName = updates.name;
      if (Object.keys(carried).length) tx.set(settingsRef, { church: carried }, { merge: true });
    }

    tx.set(
      logRef(),
      logEntry(admin, "church.update", {
        churchId,
        label: updates.name ? `Renamed ${before.name || churchId} to ${updates.name}` : `Changed ${before.name || churchId}`,
        details: { before: { name: before.name || "", timezone: before.timezone || "" }, after: updates },
      })
    );
  });

  return getChurch({ churchId });
}

/**
 * Opens or closes a church. Closed, its records stay exactly where they are,
 * but its address shows only that it is closed and the API serves nothing
 * from it (lib/tenant.js loadChurch).
 */
export async function setChurchStatus(admin, { churchId, status }) {
  if (!["active", "closed"].includes(status)) throw new Refusal(400, 'Status must be "active" or "closed".');
  const snapshot = await requireChurch(churchId);
  const name = snapshot.get("name") || churchId;

  const batch = db().batch();
  batch.update(churchRef(churchId), { status });
  batch.set(
    logRef(),
    logEntry(admin, status === "closed" ? "church.close" : "church.reopen", {
      churchId,
      label: status === "closed" ? `Closed ${name}` : `Reopened ${name}`,
    })
  );
  await batch.commit();
  return getChurch({ churchId });
}
