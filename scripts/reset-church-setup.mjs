#!/usr/bin/env node
/**
 * Puts a church back in front of the setup guide.
 *
 * A church is sent to /setup while its settings carry `setup.done: false`,
 * which /api/platform writes when it creates one. Two kinds of church never
 * get that field: the ones made before the guide existed, and the ones made by
 * a dev server still running older code. Neither is sent anywhere, which is
 * correct in production — being sold the app in March is not a reason to be
 * marched through a wizard in September — and unhelpful when the thing you are
 * trying to do is look at the guide.
 *
 * Uses FIREBASE_SERVICE_ACCOUNT from .env.
 *
 *   node scripts/reset-church-setup.mjs uec-c2            arm it
 *   node scripts/reset-church-setup.mjs uec-c2 --done     mark it finished
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHURCH_ID = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
const DONE = process.argv.includes("--done");

function loadEnv() {
  const file = path.join(ROOT, ".env");
  if (!fs.existsSync(file)) throw new Error("No .env file found");
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const at = line.indexOf("=");
    if (at > 0) env[line.slice(0, at).trim()] = line.slice(at + 1);
  }
  return env;
}

async function main() {
  if (!CHURCH_ID) {
    throw new Error("Usage: node scripts/reset-church-setup.mjs <churchId> [--done]");
  }

  const env = loadEnv();
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT is not set in .env");
  const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccount.private_key.includes("\\n")) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
  }
  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  const church = await db.collection("churches").doc(CHURCH_ID).get();
  if (!church.exists) throw new Error(`No church called "${CHURCH_ID}".`);

  const settings = db.collection("churches").doc(CHURCH_ID).collection("appSettings").doc("church");
  const setup = DONE ? { done: true, at: new Date().toISOString() } : { done: false };
  await settings.set({ setup }, { merge: true });

  const name = church.data()?.name || CHURCH_ID;
  console.log(
    DONE
      ? `${name}: setup marked done. It will not be sent to the guide again.`
      : `${name}: setup armed. Its administrators land on /setup until they finish or leave the guide.`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
