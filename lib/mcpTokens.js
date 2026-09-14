// Connector tokens: which church a Claude connector is allowed to see.
//
// A church's administrator issues one from Settings (api/mcp-token.js). The
// token itself is shown once and never stored: what is kept is its SHA-256, at
// mcpTokens/{hash}, naming the church and whether the connector may write.
// Firestore's rules refuse that collection to every browser, so the only way
// to turn a token into a church is to hold the token.
//
// One church, one token. Issuing a new one deletes the old, which is how a
// token pasted somewhere it should not have been is taken back.
//
// MCP_TOKEN in the environment still works, for the single-church setup this
// replaced: it opens MCP_CHURCH_ID (or VITE_DEFAULT_CHURCH), with writes
// governed by MCP_WRITE_TOOLS as before.
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
 * What a presented token opens: `{ churchId, allowWrites }`, or null. Looked up
 * by hash, so the comparison is Firestore's document lookup rather than a
 * string compare anyone could time.
 */
export async function grantFor(token) {
  if (!token) return null;

  const legacy = process.env.MCP_TOKEN;
  if (legacy && sameToken(token, legacy)) {
    const churchId = process.env.MCP_CHURCH_ID || process.env.VITE_DEFAULT_CHURCH || "";
    return isValidChurchId(churchId)
      ? { churchId, allowWrites: process.env.MCP_WRITE_TOOLS === "true", legacy: true }
      : null;
  }

  const snapshot = await db().collection(MCP_TOKENS_COLLECTION).doc(hashToken(token)).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() || {};
  return isValidChurchId(data.churchId)
    ? { churchId: data.churchId, allowWrites: data.allowWrites === true }
    : null;
}

const tokensOf = (churchId) =>
  db().collection(MCP_TOKENS_COLLECTION).where("churchId", "==", churchId).get();

/** The church's current token, described — never the token itself. */
export async function describeToken(churchId) {
  const snapshot = await tokensOf(churchId);
  const doc = snapshot.docs[0];
  if (!doc) return { exists: false };
  const data = doc.data() || {};
  return {
    exists: true,
    allowWrites: data.allowWrites === true,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    createdByEmail: data.createdByEmail || "",
  };
}

/** Replaces the church's token with a new one, and returns the new token once. */
export async function issueToken(churchId, { allowWrites = false, createdBy = {} } = {}) {
  const token = randomBytes(32).toString("base64url");
  const existing = await tokensOf(churchId);

  const batch = db().batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  batch.set(db().collection(MCP_TOKENS_COLLECTION).doc(hashToken(token)), {
    churchId,
    allowWrites: Boolean(allowWrites),
    createdAt: FieldValue.serverTimestamp(),
    createdBy: createdBy.uid || "",
    createdByEmail: createdBy.email || "",
  });
  await batch.commit();

  return token;
}

export async function revokeTokens(churchId) {
  const existing = await tokensOf(churchId);
  if (existing.empty) return 0;
  const batch = db().batch();
  existing.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return existing.size;
}
