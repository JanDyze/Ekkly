// Which apps a church has, changed by the platform or by the church itself.
//
// A church's administrators choose their own apps: that is how a congregation
// keeps its bill to what it uses. The platform can still switch an app off for
// a church and lock it there (lockedOff) — a church that stopped paying for
// Finances, say — and the church cannot turn a locked app back on, nor one the
// platform has stopped offering.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { APP_KEYS, appByKey, enabledAppsFrom, isAppKey, mergeCatalog, normalizeAppList } from "../apps.js";
import { Refusal, logEntry, logRef } from "./common.js";
import { getPlatformPublic } from "./config.js";
import { appsRef, billingRef, getChurch, planOf, requireChurch } from "./churches.js";

const names = (keys) => keys.map((k) => appByKey(k)?.name || k).join(", ");

const diff = (before, after) => ({
  added: after.filter((k) => !before.includes(k)),
  removed: before.filter((k) => !after.includes(k)),
});

const describe = ({ added, removed }) =>
  [added.length ? `turned on ${names(added)}` : "", removed.length ? `turned off ${names(removed)}` : ""]
    .filter(Boolean)
    .join("; ");

/** The platform setting a church's apps, and which ones it may not turn back on. */
export async function setChurchApps(admin, { churchId, apps, lockedOff = [] }) {
  const church = await requireChurch(churchId);
  const current = await appsRef(churchId).get();
  const before = [...(enabledAppsFrom(current.exists ? current.data() : null) || APP_KEYS)];

  const locked = [...new Set((Array.isArray(lockedOff) ? lockedOff : []).filter(isAppKey))].filter(
    (k) => !appByKey(k).core
  );
  const after = normalizeAppList(apps).filter((k) => !locked.includes(k));
  const change = diff(before, after);

  const batch = db().batch();
  batch.set(appsRef(churchId), {
    apps: after,
    lockedOff: locked,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: admin.email || admin.uid,
  });
  batch.set(
    logRef(),
    logEntry(admin, "church.apps", {
      churchId,
      label: `${church.get("name") || churchId}: ${describe(change) || "apps saved"}`,
      details: { ...change, lockedOff: locked },
    })
  );
  await batch.commit();
  return getChurch({ churchId });
}

/** A church's plan as its own administrators see it. */
export async function myPlan(caller) {
  const churchId = caller.church.id;
  const [apps, billing, platform] = await Promise.all([
    appsRef(churchId).get(),
    billingRef(churchId).get(),
    getPlatformPublic(),
  ]);
  const catalog = mergeCatalog(platform.apps);
  return {
    catalog,
    plan: planOf(apps.exists ? apps.data() : null, billing.exists ? billing.data() : null, catalog),
  };
}

/**
 * A church's administrator choosing its apps. Written to the church's own
 * audit log as well as the platform's: the church should be able to see who
 * changed what it pays for.
 */
export async function setMyApps(caller, { apps }) {
  const churchId = caller.church.id;
  const current = await appsRef(churchId).get();
  const data = current.exists ? current.data() : null;
  const before = [...(enabledAppsFrom(data) || APP_KEYS)];
  const locked = Array.isArray(data?.lockedOff) ? data.lockedOff : [];
  const catalog = mergeCatalog((await getPlatformPublic()).apps);

  const wanted = normalizeAppList(apps);
  const change = diff(before, wanted);

  for (const key of change.added) {
    const app = catalog.find((a) => a.key === key);
    if (locked.includes(key)) {
      throw new Refusal(403, `${app?.name || key} has been switched off for your church. Send a request to have it turned back on.`);
    }
    if (!app?.available) throw new Refusal(403, `${app?.name || key} is not offered at the moment.`);
  }
  if (!change.added.length && !change.removed.length) return myPlan(caller);

  const actor = { uid: caller.uid, email: caller.email, displayName: caller.displayName };
  const label = `${caller.church.data?.name || churchId}: ${describe(change)}`;
  const now = FieldValue.serverTimestamp();

  const batch = db().batch();
  batch.set(appsRef(churchId), { apps: wanted, lockedOff: locked, updatedAt: now, updatedBy: caller.email || caller.uid });
  batch.set(logRef(), logEntry(actor, "church.apps.self", { churchId, label, details: change }));
  batch.set(caller.church.ref.collection("auditLog").doc(), {
    at: now,
    actorUid: caller.uid,
    actorName: caller.displayName || "",
    actorEmail: caller.email || "",
    action: "update",
    collection: "subscription",
    path: "subscription/apps",
    docId: "apps",
    label: `Apps: ${describe(change)}`,
    fields: ["apps"],
    changes: {},
    page: "/settings",
    source: "app",
  });
  await batch.commit();
  return myPlan(caller);
}
