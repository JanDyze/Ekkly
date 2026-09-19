// Connector tokens: whose Claude connector this is, and which church it sees.
//
// A token belongs to an account, not to the church at large. Somebody issues
// one for themselves from Settings (api/mcp-token.js); the token itself is
// shown once and never stored, and what is kept is its SHA-256, at
// mcpTokens/{hash}, naming the church, the account and whether the connector
// may write. Firestore's rules refuse that collection to every browser, so the
// only way to turn a token into a church is to hold the token.
//
// One account, one token per church. Issuing a new one deletes that account's
// old one — which is how a token pasted somewhere it should not have been is
// taken back — and leaves everybody else's alone. That is the point: two
// administrators used to knock each other's connector out by making a link.
//
// What the token opens is only half the answer. api/mcp.js asks again, on
// every request, whether that account is still part of the church and what it
// may do there (lib/audience.js accessFor), so a link dies with the access it
// was made from and can never do more than its owner could in the app.
//
// A link made before links belonged to accounts named its issuer in
// `createdBy` rather than `uid`. It is read as theirs, so it keeps working, is
// theirs to replace, and answers to their access like any other — the fields
// are read through `ownerOf` in one place rather than migrated.
//
// MCP_TOKEN in the environment still works, for the single-church setup this
// replaced: it opens MCP_CHURCH_ID (or VITE_DEFAULT_CHURCH), with writes
// governed by MCP_WRITE_TOOLS as before. It belongs to the deployment and not
// to anybody, so it alone has no owner to answer to.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./firebaseAdmin.js";
import { isValidChurchId } from "./churchId.js";

export const MCP_TOKENS_COLLECTION = "mcpTokens";

export const hashToken = (token) => createHash("sha256").update(String(token)).digest("hex");

/** Length-independent, so a wrong guess cannot be measured against a right one. */
const sameToken = (given, expected) => {
  if (!given || !expected) return false;
  const a = Buffer.from(String(given));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
};

/**
 * What a presented token opens: `{ churchId, uid, name, allowWrites }`, or
 * null. Looked up by hash, so the comparison is Firestore's document lookup
 * rather than a string compare anyone could time.
 *
 * The environment token has no account behind it and says so with an empty
 * uid: it is the deployment's own door, from before churches existed.
 */
export async function grantFor(token) {
  if (!token) return null;

  const legacy = process.env.MCP_TOKEN;
  if (legacy && sameToken(token, legacy)) {
    const churchId = process.env.MCP_CHURCH_ID || process.env.VITE_DEFAULT_CHURCH || "";
    return isValidChurchId(churchId)
      ? { churchId, uid: "", name: "", allowWrites: process.env.MCP_WRITE_TOOLS === "true", legacy: true }
      : null;
  }

  const snapshot = await db().collection(MCP_TOKENS_COLLECTION).doc(hashToken(token)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  if (!isValidChurchId(data.churchId)) return null;
  const owner = ownerOf(data);
  return {
    churchId: data.churchId,
    uid: owner.uid,
    name: owner.displayName || owner.email || "",
    allowWrites: data.allowWrites === true,
  };
}

/** Whose link a stored document is, reading the older field names too. */
const ownerOf = (data) => ({
  uid: data.uid || data.createdBy || "",
  email: data.email || data.createdByEmail || "",
  displayName: data.displayName || "",
});

const tokensOf = async (churchId) =>
  (await db().collection(MCP_TOKENS_COLLECTION).where("churchId", "==", churchId).get()).docs;

/**
 * This account's links in this church. Two queries because an older link named
 * its owner in `createdBy`; a document can only match one of them, so the
 * results simply join.
 */
const tokensFor = async (churchId, uid) => {
  const inChurch = db().collection(MCP_TOKENS_COLLECTION).where("churchId", "==", churchId);
  const [own, older] = await Promise.all([
    inChurch.where("uid", "==", uid).get(),
    inChurch.where("createdBy", "==", uid).get(),
  ]);
  const found = new Map();
  [...own.docs, ...older.docs].forEach((doc) => found.set(doc.id, doc));
  return [...found.values()];
};

/** One link, described — never the token itself. `id` is what revokes it. */
const describe = (doc) => {
  const data = doc.data() || {};
  return {
    id: doc.id,
    ...ownerOf(data),
    allowWrites: data.allowWrites === true,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
  };
};

/** This account's link in this church, or null. */
export async function describeToken(churchId, uid) {
  const docs = await tokensFor(churchId, uid);
  return docs[0] ? describe(docs[0]) : null;
}

/** Every link in the church, newest first — for an administrator's list. */
export async function listTokens(churchId) {
  return (await tokensOf(churchId))
    .map(describe)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

/**
 * Replaces this account's link with a new one, and returns the token once.
 * Only this account's: everybody else's link keeps working.
 */
export async function issueToken(churchId, { uid, allowWrites = false, owner = {} } = {}) {
  if (!uid) throw new Error("A connector link belongs to an account.");
  const token = randomBytes(32).toString("base64url");
  const existing = await tokensFor(churchId, uid);

  const batch = db().batch();
  existing.forEach((d) => batch.delete(d.ref));
  batch.set(db().collection(MCP_TOKENS_COLLECTION).doc(hashToken(token)), {
    churchId,
    uid,
    allowWrites: Boolean(allowWrites),
    createdAt: FieldValue.serverTimestamp(),
    email: owner.email || "",
    displayName: owner.displayName || "",
  });
  await batch.commit();

  return token;
}

const deleteAll = async (docs) => {
  if (!docs.length) return 0;
  const batch = db().batch();
  docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return docs.length;
};

/** This account's link. */
export const revokeTokensFor = async (churchId, uid) => deleteAll(await tokensFor(churchId, uid));

/**
 * One link by its id, whosever it is — an administrator switching off a link
 * somebody left behind. Checked against the church, so an id from elsewhere
 * cannot be used to reach into another church's links.
 */
export async function revokeToken(churchId, id) {
  const ref = db().collection(MCP_TOKENS_COLLECTION).doc(String(id));
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data()?.churchId !== churchId) return 0;
  await ref.delete();
  return 1;
}
