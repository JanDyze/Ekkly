// Admin SDK bootstrap shared by the API routes.
//
// Deliberately outside `api/`: everything in that directory is a candidate
// Serverless Function, and shared modules parked there — even underscore-
// prefixed ones — are not reliably included in the deployed bundle. Vercel
// traces the imports from api/email.js and pulls this in from here.
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export function initAdmin() {
  if (getApps().length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT not configured");
  const serviceAccount = JSON.parse(raw);
  // Env var storage can double-escape the key's newlines, and what comes back
  // is a literal backslash-n that cert() cannot read as a PEM. Matching on a
  // real newline — as this did — never fired, because JSON.parse has already
  // turned the escapes back into newlines by the time it looks.
  if (serviceAccount.private_key?.includes(String.raw`\n`)) {
    serviceAccount.private_key = serviceAccount.private_key.split(String.raw`\n`).join("\n");
  }
  initializeApp({ credential: cert(serviceAccount) });
}

/** Initialises on first use so callers never have to remember the order. */
export function db() {
  initAdmin();
  return getFirestore();
}

// Who a caller is, and which church they may act in, is lib/tenant.js:
// requireChurchUser, requireChurchAdmin and requirePlatformAdmin. There is no
// check here that stops at "signed in" any more — with every church in one
// project, a Google account on its own is nobody in particular.

/**
 * Vercel Cron attaches `Authorization: Bearer $CRON_SECRET` to its requests
 * once that env var is set. Without the secret configured the scheduled route
 * stays closed rather than falling open to anyone who finds the URL.
 */
export function isCronRequest(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.authorization || "";
  return header === `Bearer ${secret}` || req.headers["x-cron-secret"] === secret;
}
