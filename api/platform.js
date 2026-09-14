// Vercel serverless function: the platform's administrators answering a request
// for a church.
//
//   POST /api/platform { action: "approve", requestId, churchId, churchName? }
//        -> { churchId, address, domain, authorizedDomain }
//   POST /api/platform { action: "decline", requestId, note? }
//        -> { declined: true }
//
// Approving is the moment a church comes into being, and it is one
// transaction: the church document, the person who asked made its first
// administrator with access, a settings document carrying its name, an entry
// in its audit log, and the request marked as answered. Either all of that
// exists afterwards or none of it does. The church id is its address and is
// never reused: a taken id fails the whole approval rather than joining an
// existing congregation.
//
// Then, outside the transaction because it is another Google API entirely,
// the church's address is added to Firebase Auth's authorised domains so
// Google sign-in works there. If that fails the church still stands; the
// response says so, and the domain can be added by hand.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebaseAdmin.js";
import { churchRef, requirePlatformAdmin } from "../lib/tenant.js";
import { isValidChurchId } from "../lib/churchId.js";
import { addAuthorizedDomain } from "../lib/authorizedDomains.js";
import { DEFAULT_TIMEZONE } from "../lib/occurrences.js";

class Refusal extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const clip = (value, max) => String(value || "").trim().slice(0, max);

async function approve({ requestId, churchId, churchName }, admin) {
  if (!isValidChurchId(churchId)) {
    throw new Refusal(400, "The church id must be 3–40 lowercase letters, numbers and single hyphens, and not a reserved word.");
  }

  const firestore = db();
  const requestRef = firestore.collection("churchRequests").doc(String(requestId || ""));
  const church = churchRef(churchId);

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
      timezone: DEFAULT_TIMEZONE,
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

    // Its name, so nothing shows the built-in defaults — another church's. The
    // public page starts switched off: its default words and service times are
    // a starting point to edit, not something to publish on day one.
    tx.set(church.collection("appSettings").doc("church"), {
      church: { shortName: nameOfChurch, fullName: nameOfChurch, branch: "" },
      landing: { enabled: false },
      updatedAt: now,
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

async function decline({ requestId, note }, admin) {
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
  });
  return { declined: true };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const admin = await requirePlatformAdmin(req);
    if (admin.error) return res.status(admin.status).json({ error: admin.error });

    let body = req.body || {};
    if (typeof body === "string") {
      try {
        body = JSON.parse(body || "{}");
      } catch {
        return res.status(400).json({ error: "Could not read that request" });
      }
    }

    if (body.action === "approve") return res.status(200).json(await approve(body, admin));
    if (body.action === "decline") return res.status(200).json(await decline(body, admin));
    return res.status(400).json({ error: 'action must be "approve" or "decline"' });
  } catch (error) {
    if (error instanceof Refusal) return res.status(error.status).json({ error: error.message });
    console.error("Error answering a church request:", error);
    return res.status(500).json({ error: error.message || "Could not answer that request" });
  }
}
