// Which church an API request is for, and whether the caller belongs to it.
//
// Every endpoint that touches a church's records starts here. The church comes
// from the `X-Church-Id` header the app sends (or `?church=` where a URL is all
// there is, like the public page's images), and failing that from the address
// the request arrived on. Naming a church proves nothing: for anything behind
// a sign-in, the caller's access document in that church is checked before a
// single record is read. The header only says which door they are knocking on.
//
// The Admin SDK is not bound by Firestore's rules, so these checks are the
// rules, as far as the API is concerned.
import { getAuth } from "firebase-admin/auth";
import { db, initAdmin } from "./firebaseAdmin.js";
import { CHURCHES_COLLECTION, churchOrigin, isDevelopmentHost, isValidChurchId, readHost } from "./churchId.js";

/** churches/{churchId}, whose .collection() is every collection the church has. */
export const churchRef = (churchId) => db().collection(CHURCHES_COLLECTION).doc(churchId);

const rootDomain = () => process.env.VITE_ROOT_DOMAIN || "";

const firstValue = (value) => (Array.isArray(value) ? value[0] : value);

/**
 * The church id a request names or arrives at, or null. Does not check the
 * church exists — see loadChurch.
 */
export async function resolveChurchId(req) {
  const named = firstValue(req.headers?.["x-church-id"]) || firstValue(req.query?.church);
  if (named) return isValidChurchId(String(named)) ? String(named) : null;

  const host = firstValue(req.headers?.["x-forwarded-host"]) || req.headers?.host || "";
  const found = readHost(host, { rootDomain: rootDomain() });
  if (found.kind === "church") return found.churchId;
  if (found.kind === "platform") return null;

  if (!isDevelopmentHost(found.hostname)) {
    const mapped = await db().collection("domains").doc(found.hostname).get();
    if (mapped.exists && isValidChurchId(mapped.data()?.churchId)) return mapped.data().churchId;
  }

  const fallback = process.env.VITE_DEFAULT_CHURCH || "";
  return isValidChurchId(fallback) ? fallback : null;
}

/**
 * The church, if it exists and is open: `{ id, ref, data }`. A closed church's
 * records stay where they are but nothing is served from them.
 */
export async function loadChurch(churchId) {
  if (!isValidChurchId(churchId)) return null;
  const ref = churchRef(churchId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  if ((data.status || "active") !== "active") return null;
  return { id: churchId, ref, data };
}

/** Where the church is reached, for links in emails and pushes. */
export const originOf = (church) =>
  churchOrigin(church.id, { rootDomain: rootDomain(), primaryDomain: church.data?.primaryDomain });

async function verifyCaller(req) {
  const header = req.headers?.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    initAdmin();
    return await getAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}

/**
 * The caller, signed in as anybody at all. For the few things an account does
 * for itself, where the account is the only thing that matters: withdrawing
 * its own request for a church.
 */
export async function requireSignedIn(req) {
  const decoded = await verifyCaller(req);
  if (!decoded) return { error: "Sign in required", status: 401 };
  return { uid: decoded.uid, email: decoded.email || "", displayName: decoded.name || "" };
}

/**
 * The caller, signed in and holding access to the church the request names.
 * Returns `{ uid, email, displayName, church }` or `{ error, status }` — never
 * throws, so a handler can turn it straight into a response.
 */
export async function requireChurchUser(req) {
  const decoded = await verifyCaller(req);
  if (!decoded) return { error: "Sign in required", status: 401 };

  const churchId = await resolveChurchId(req);
  const church = churchId ? await loadChurch(churchId) : null;
  if (!church) return { error: "No church here", status: 404 };

  const access = await church.ref.collection("access").doc(decoded.uid).get();
  if (!access.exists) return { error: "You are not part of this church", status: 403 };

  return {
    uid: decoded.uid,
    email: decoded.email || "",
    displayName: decoded.name || "",
    church,
  };
}

/** requireChurchUser, and an administrator of that church. */
export async function requireChurchAdmin(req) {
  const caller = await requireChurchUser(req);
  if (caller.error) return caller;

  const admin = await caller.church.ref.collection("appAdmins").doc(caller.uid).get();
  if (!admin.exists) return { error: "Administrators only", status: 403 };

  return {
    ...caller,
    email: caller.email || admin.data()?.email || "",
    displayName: caller.displayName || admin.data()?.displayName || "",
  };
}

/** Somebody who runs the platform: signed in, with a platformAdmins document. */
export async function requirePlatformAdmin(req) {
  const decoded = await verifyCaller(req);
  if (!decoded) return { error: "Sign in required", status: 401 };

  const admin = await db().collection("platformAdmins").doc(decoded.uid).get();
  if (!admin.exists) return { error: "Platform administrators only", status: 403 };

  return { uid: decoded.uid, email: decoded.email || "", displayName: decoded.name || "" };
}

/** Every open church, for the scheduled jobs that run for each of them. */
export async function listOpenChurches() {
  const snapshot = await db().collection(CHURCHES_COLLECTION).where("status", "==", "active").get();
  return snapshot.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() || {} }));
}
