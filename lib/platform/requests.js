// Answering a request for a church.
//
// Approving is the moment a church comes into being, and it is one
// transaction: the church document, the person who asked made its first
// administrator with access, a settings document carrying its name, what the
// platform says a new church starts with (apps, a trial, starter ministries
// and tags), an entry in its audit log and one in the platform's, and the
// request marked as answered. Either all of that exists afterwards or none of
// it does. The church id is its address and is never reused: a taken id fails
// the whole approval rather than joining an existing congregation.
//
// Then, outside the transaction because it is another Google API entirely,
// the church's address is added to Firebase Auth's authorised domains so
// Google sign-in works there. If that fails the church still stands; the
// response says so, and the domain can be added by hand.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { isValidChurchId } from "../churchId.js";
import { addAuthorizedDomain } from "../authorizedDomains.js";
import { normalizeAppList } from "../apps.js";
import { dateKey, withNewChurchDefaults } from "../platformDefaults.js";
import { Refusal, clip, logEntry, logRef } from "./common.js";
import { getPlatformPrivate } from "./config.js";

const addDays = (key, days) => {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/**
 * The person who asked takes their request back, while it is still waiting.
 * Theirs only, and only while nobody has answered it: an approved request made
 * a church, and taking that back is not this.
 */
export async function withdraw(caller, { requestId }) {
  const firestore = db();
  const ref = firestore.collection("churchRequests").doc(String(requestId || ""));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Refusal(404, "That request is not there any more.");

  const request = snapshot.data() || {};
  if (request.uid !== caller.uid) throw new Refusal(403, "That request belongs to somebody else.");
  if (request.status !== "pending") throw new Refusal(409, "That request has already been answered.");

  const batch = firestore.batch();
  batch.delete(ref);
  batch.set(logRef(), logEntry(caller, "church.request.withdraw", { target: snapshot.id, label: request.churchName || "" }));
  await batch.commit();

  return { withdrawn: true };
}

export async function approve(admin, { requestId, churchId, churchName }) {
  if (!isValidChurchId(churchId)) {
    throw new Refusal(400, "The church id must be 3–40 lowercase letters, numbers and single hyphens, and not a reserved word.");
  }

  const firestore = db();
  const requestRef = firestore.collection("churchRequests").doc(String(requestId || ""));
  const church = churchRef(churchId);
  const defaults = withNewChurchDefaults((await getPlatformPrivate()).defaults);

  const name = await firestore.runTransaction(async (tx) => {
    const requestSnap = await tx.get(requestRef);
    if (!requestSnap.exists) throw new Refusal(404, "That request no longer exists.");
    const request = requestSnap.data() || {};
    if (request.status !== "pending") throw new Refusal(409, "That request has already been answered.");
    if (!request.uid) throw new Refusal(400, "That request has no account to make administrator.");

    const existing = await tx.get(church);
    if (existing.exists) throw new Refusal(409, `The id "${churchId}" is already a church. Choose another.`);

    const nameOfChurch = clip(churchName || request.churchName, 120) || churchId;
    const now = FieldValue.serverTimestamp();
    const requester = {
      uid: request.uid,
      email: request.email || "",
      displayName: request.displayName || "",
    };

    // Anyone may read this document (its sign-in page needs the name before
    // anyone signs in), so it holds nothing personal. Who asked and who
    // approved stay on the request, which only the asker and the platform read.
    tx.create(church, {
      name: nameOfChurch,
      status: "active",
      timezone: defaults.timezone,
      createdAt: now,
      requestId: requestRef.id,
    });

    tx.set(church.collection("access").doc(requester.uid), {
      uid: requester.uid,
      name: requester.displayName || requester.email,
      email: requester.email,
      grantedBy: admin.uid,
      grantedByEmail: admin.email,
      grantedAt: now,
    });

    tx.set(church.collection("appAdmins").doc(requester.uid), {
      email: requester.email,
      displayName: requester.displayName,
      addedBy: admin.uid,
      addedByEmail: admin.email,
      addedAt: now,
    });

    // Its name, so nothing shows the built-in defaults — another church's.
    tx.set(church.collection("appSettings").doc("church"), {
      church: { shortName: nameOfChurch, fullName: nameOfChurch, branch: "" },
      landing: { enabled: defaults.landingEnabled },
      updatedAt: now,
    });

    // A list of apps narrows the church to those; no list leaves every app on,
    // which is also what a church without the document gets.
    if (defaults.apps) {
      tx.set(church.collection("subscription").doc("apps"), {
        apps: normalizeAppList(defaults.apps),
        lockedOff: [],
        updatedAt: now,
      });
    }

    const today = dateKey(new Date(), defaults.timezone);
    tx.set(church.collection("subscription").doc("billing"), {
      status: defaults.trialDays > 0 ? "trial" : "none",
      paidThrough: defaults.trialDays > 0 ? addDays(today, defaults.trialDays) : "",
      customMonthly: null,
      note: "",
      updatedAt: now,
    });

    defaults.ministries.forEach((ministry) => {
      tx.set(church.collection("ministries").doc(), { name: ministry, description: "", createdAt: now });
    });
    defaults.tags.forEach((tag) => {
      tx.set(church.collection("memberTags").doc(), { name: tag, createdAt: now });
    });

    tx.set(church.collection("auditLog").doc(), {
      at: now,
      actorUid: admin.uid,
      actorName: admin.displayName || "",
      actorEmail: admin.email || "",
      action: "create",
      collection: "",
      path: "",
      docId: churchId,
      label: `Church created: ${nameOfChurch}`,
      fields: [],
      changes: {},
      page: "",
      source: "platform",
    });

    tx.set(logRef(), logEntry(admin, "church.create", { churchId, label: `Approved ${nameOfChurch} as ${churchId}` }));

    tx.update(requestRef, {
      status: "approved",
      churchId,
      reviewedBy: admin.uid,
      reviewedByEmail: admin.email,
      reviewedAt: now,
    });

    return nameOfChurch;
  });

  const rootDomain = process.env.VITE_ROOT_DOMAIN || "";
  const domain = rootDomain ? `${churchId}.${rootDomain}` : "";
  let authorizedDomain = "skipped: VITE_ROOT_DOMAIN is not set";
  if (domain) {
    try {
      authorizedDomain = await addAuthorizedDomain(domain);
    } catch (error) {
      console.error(`Could not authorise ${domain}:`, error);
      authorizedDomain = `failed: ${error.message}`;
    }
  }

  return { churchId, name, domain, address: domain ? `https://${domain}` : "", authorizedDomain };
}

export async function decline(admin, { requestId, note }) {
  const requestRef = db().collection("churchRequests").doc(String(requestId || ""));
  await db().runTransaction(async (tx) => {
    const snapshot = await tx.get(requestRef);
    if (!snapshot.exists) throw new Refusal(404, "That request no longer exists.");
    if (snapshot.data()?.status !== "pending") throw new Refusal(409, "That request has already been answered.");
    tx.update(requestRef, {
      status: "declined",
      note: clip(note, 500),
      reviewedBy: admin.uid,
      reviewedByEmail: admin.email,
      reviewedAt: FieldValue.serverTimestamp(),
    });
    tx.set(
      logRef(),
      logEntry(admin, "request.decline", { target: requestRef.id, label: `Declined the request for ${snapshot.get("churchName") || "a church"}` })
    );
  });
  return { declined: true };
}
