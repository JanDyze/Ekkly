#!/usr/bin/env node
/**
 * Makes an account a platform administrator: somebody who can see every
 * request for a church and approve it at /platform on the platform's own
 * address (app.<root domain>, or app.localhost:5173 in development).
 *
 * There is deliberately no way to do this from the app. The first platform
 * administrator has to come from somewhere that already holds the service
 * account, and this is it.
 *
 * The account must have signed in to the app at least once, so that Firebase
 * knows it. Uses FIREBASE_SERVICE_ACCOUNT from .env.
 *
 *   node scripts/make-platform-admin.mjs you@gmail.com
 *   node scripts/make-platform-admin.mjs you@gmail.com --remove
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EMAIL = process.argv.slice(2).find((a) => !a.startsWith("--"));
const REMOVE = process.argv.includes("--remove");

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) throw new Error("No .env file found");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1);
  }
  return env;
}

async function main() {
  if (!EMAIL) throw new Error("Usage: node scripts/make-platform-admin.mjs <email> [--remove]");

  const env = loadEnv();
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in .env");
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  if (sa.private_key.includes("\\n")) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  initializeApp({ credential: cert(sa) });

  let user;
  try {
    user = await getAuth().getUserByEmail(EMAIL);
  } catch {
    throw new Error(`No account for ${EMAIL} in ${sa.project_id}. Sign in to the app with it once, then run this again.`);
  }

  const ref = getFirestore().collection("platformAdmins").doc(user.uid);

  if (REMOVE) {
    await ref.delete();
    console.log(`${EMAIL} is no longer a platform administrator of ${sa.project_id}.`);
    return;
  }

  await ref.set({
    email: user.email || "",
    displayName: user.displayName || "",
    addedAt: FieldValue.serverTimestamp(),
  });
  console.log(`${EMAIL} (${user.uid}) is now a platform administrator of ${sa.project_id}.`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
