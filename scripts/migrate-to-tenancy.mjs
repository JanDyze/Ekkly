#!/usr/bin/env node
/**
 * Moves a single-church install into a church on the multi-church project.
 *
 * The old project kept everything at the top level: members, events,
 * appSettings and the rest. The new one keeps each church under
 * churches/{churchId}/. This copies one into the other, in five steps:
 *
 *   1. Accounts. Firebase Auth users are imported with their uids intact, so
 *      every member record's `uid`, every administrator and every audit entry
 *      still points at the right person. Google sign-in carries across as-is;
 *      an old email-and-password account arrives without its password, which
 *      the app stopped accepting anyway.
 *   2. Records. Every top-level collection, and anything nested under it, is
 *      copied to churches/{churchId}/<collection> with the same document ids.
 *   3. The church. churches/{churchId} is created with its name, open.
 *   4. Access. Everyone who could use the old app keeps using it: each account
 *      in `userAccounts`, `appAdmins` or linked to a member gets an access
 *      document. --access=admins narrows that to administrators, and everyone
 *      else asks to join.
 *   5. A custom domain, if --domain is given.
 *
 * Nothing in the old project is changed or deleted. Run without --write first:
 * it reads everything and reports what it would copy.
 *
 *   node scripts/migrate-to-tenancy.mjs --from=old-project-service-account.json \
 *     --church=uec --name="UECPCOM"                      # dry run
 *   node scripts/migrate-to-tenancy.mjs --from=... --church=uec --name="UECPCOM" --write
 *
 * Options:
 *   --from=<file>        service account JSON of the OLD project (required)
 *   --church=<id>        the church id, which is also its subdomain (required)
 *   --name=<name>        the church's name, shown before sign-in (required)
 *   --domain=<host>      also map a domain of its own to the church
 *   --access=all|admins  who keeps access (default all)
 *   --skip-auth          do not import accounts (already done)
 *   --write              actually write; without it nothing is written
 *
 * The NEW project is FIREBASE_SERVICE_ACCOUNT in .env.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, DocumentReference, FieldValue } from "firebase-admin/firestore";
import { GLOBAL_COLLECTIONS, isValidChurchId } from "../lib/churchId.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : "";
};
const flag = (name) => process.argv.includes(`--${name}`);

const FROM = arg("from");
const CHURCH = arg("church");
const NAME = arg("name");
const DOMAIN = arg("domain").toLowerCase();
const ACCESS = arg("access") || "all";
const WRITE = flag("write");
const SKIP_AUTH = flag("skip-auth");

const PAGE = 500;
const IMPORT_BATCH = 1000;

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

const readServiceAccount = (raw) => {
  const sa = JSON.parse(raw);
  if (sa.private_key?.includes("\\n")) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  return sa;
};

/* ------------------------------------------------------------- accounts */

async function listAllUsers(auth) {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function importAccounts(sourceAuth, targetAuth) {
  const users = await listAllUsers(sourceAuth);
  const passwordOnly = users.filter((u) => !u.providerData.some((p) => p.providerId !== "password")).length;
  console.log(`\nAccounts: ${users.length} in the old project (${passwordOnly} email-and-password only, imported without a password).`);
  if (!WRITE || !users.length) return new Set(users.map((u) => u.uid));

  let imported = 0;
  let failed = 0;
  for (let i = 0; i < users.length; i += IMPORT_BATCH) {
    const records = users.slice(i, i + IMPORT_BATCH).map((u) => ({
      uid: u.uid,
      email: u.email,
      emailVerified: u.emailVerified,
      displayName: u.displayName,
      photoURL: u.photoURL,
      disabled: u.disabled,
      metadata: {
        creationTime: u.metadata.creationTime,
        lastSignInTime: u.metadata.lastSignInTime,
      },
      // Google (and any other federated) identities, so signing in with the same
      // Google account lands on the same uid. Password entries are left out:
      // without the old project's hash parameters they cannot be carried.
      providerData: u.providerData
        .filter((p) => p.providerId !== "password")
        .map((p) => ({
          uid: p.uid,
          providerId: p.providerId,
          email: p.email,
          displayName: p.displayName,
          photoURL: p.photoURL,
        })),
    }));
    const result = await targetAuth.importUsers(records);
    imported += result.successCount;
    failed += result.failureCount;
    result.errors.forEach((e) => console.log(`  could not import ${records[e.index]?.email || records[e.index]?.uid}: ${e.error.message}`));
  }
  console.log(`  imported ${imported}, failed ${failed} (an account that already exists in the new project fails harmlessly).`);
  return new Set(users.map((u) => u.uid));
}

/* -------------------------------------------------------------- records */

/**
 * A value as the new project should hold it. Timestamps, geopoints and bytes
 * travel untouched; a reference into the old database is re-pointed at the same
 * document inside the church.
 */
function carry(value, target) {
  if (value instanceof DocumentReference) return target.doc(`churches/${CHURCH}/${value.path}`);
  if (Array.isArray(value)) return value.map((v) => carry(v, target));
  if (value && typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, carry(v, target)]));
  }
  return value;
}

async function copyCollection(sourceCollection, targetCollection, target, writer, counts) {
  let last = null;
  for (;;) {
    let query = sourceCollection.orderBy("__name__").limit(PAGE);
    if (last) query = query.startAfter(last);
    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      counts.set(targetCollection.path, (counts.get(targetCollection.path) || 0) + 1);
      if (WRITE) writer.set(targetCollection.doc(doc.id), carry(doc.data(), target));

      // Anything nested under the document comes along at the same depth.
      for (const sub of await doc.ref.listCollections()) {
        await copyCollection(sub, targetCollection.doc(doc.id).collection(sub.id), target, writer, counts);
      }
    }

    last = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PAGE) break;
  }
}

async function copyRecords(source, target) {
  const collections = await source.listCollections();
  const skipped = collections.filter((c) => GLOBAL_COLLECTIONS.has(c.id)).map((c) => c.id);
  const church = target.doc(`churches/${CHURCH}`);
  const writer = WRITE ? target.bulkWriter() : null;
  const counts = new Map();

  for (const collection of collections) {
    if (GLOBAL_COLLECTIONS.has(collection.id)) continue;
    await copyCollection(collection, church.collection(collection.id), target, writer, counts);
  }
  if (writer) await writer.close();

  console.log(`\nRecords${WRITE ? " copied" : " to copy"}:`);
  [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([p, n]) => console.log(`  ${String(n).padStart(6)}  ${p}`));
  if (skipped.length) console.log(`  (skipped platform collections found in the old project: ${skipped.join(", ")})`);
}

/* --------------------------------------------------------------- access */

async function grantAccess(source, target, knownUids) {
  const [accounts, admins, members] = await Promise.all([
    source.collection("userAccounts").get(),
    source.collection("appAdmins").get(),
    source.collection("members").select("uid").get(),
  ]);

  const adminUids = new Set(admins.docs.map((d) => d.id));
  const profile = new Map(accounts.docs.map((d) => [d.id, d.data() || {}]));
  const uids = new Set(adminUids);
  if (ACCESS === "all") {
    accounts.docs.forEach((d) => uids.add(d.id));
    members.docs.forEach((d) => d.data()?.uid && uids.add(d.data().uid));
  }

  // An access document for an account that does not exist would let nobody in
  // and only confuse the Accounts page.
  const granted = [...uids].filter((uid) => SKIP_AUTH || knownUids.has(uid));
  console.log(`\nAccess: ${granted.length} account(s) keep access (${adminUids.size} administrator(s)); --access=${ACCESS}.`);
  if (!WRITE) return;

  const writer = target.bulkWriter();
  const church = target.doc(`churches/${CHURCH}`);
  for (const uid of granted) {
    const data = profile.get(uid) || {};
    writer.set(church.collection("access").doc(uid), {
      uid,
      name: data.displayName || data.email || "",
      email: data.email || admins.docs.find((d) => d.id === uid)?.data()?.email || "",
      grantedBy: "migration",
      grantedByEmail: "",
      grantedAt: FieldValue.serverTimestamp(),
    });
  }
  await writer.close();
}

/* ----------------------------------------------------------------- main */

async function main() {
  if (!FROM || !CHURCH || !NAME) {
    throw new Error("Usage: node scripts/migrate-to-tenancy.mjs --from=<old service account.json> --church=<id> --name=<name> [--domain=<host>] [--access=all|admins] [--skip-auth] [--write]");
  }
  if (!isValidChurchId(CHURCH)) throw new Error(`"${CHURCH}" is not a valid church id.`);
  if (!["all", "admins"].includes(ACCESS)) throw new Error("--access must be all or admins");

  const env = loadEnv();
  if (!env.FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT (the new project) is not set in .env");

  const sourceSa = readServiceAccount(fs.readFileSync(path.resolve(FROM), "utf8"));
  const targetSa = readServiceAccount(env.FIREBASE_SERVICE_ACCOUNT);
  if (sourceSa.project_id === targetSa.project_id) {
    throw new Error("--from is the same project as .env. This copies between two projects.");
  }

  const sourceApp = initializeApp({ credential: cert(sourceSa) }, "source");
  const targetApp = initializeApp({ credential: cert(targetSa) }, "target");
  const source = getFirestore(sourceApp);
  const target = getFirestore(targetApp);

  console.log(`${WRITE ? "Migrating" : "Dry run:"} ${sourceSa.project_id} -> ${targetSa.project_id} as churches/${CHURCH} ("${NAME}")`);

  const existing = await target.doc(`churches/${CHURCH}`).get();
  if (existing.exists) {
    console.log(`\nNote: churches/${CHURCH} already exists in ${targetSa.project_id}. Re-running overwrites documents with the old project's copies.`);
  }

  const knownUids = SKIP_AUTH ? new Set() : await importAccounts(getAuth(sourceApp), getAuth(targetApp));
  await copyRecords(source, target);

  console.log(`\nChurch: churches/${CHURCH} "${NAME}", open.`);
  if (WRITE) {
    await target.doc(`churches/${CHURCH}`).set(
      {
        name: NAME,
        status: "active",
        timezone: env.DIGEST_TIMEZONE || "Asia/Manila",
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        migratedFrom: sourceSa.project_id,
      },
      { merge: true }
    );
  }

  await grantAccess(source, target, knownUids);

  if (DOMAIN) {
    console.log(`\nDomain: ${DOMAIN} -> ${CHURCH}. Add it to the Vercel project and to Firebase Auth's authorised domains too.`);
    if (WRITE) await target.doc(`domains/${DOMAIN}`).set({ churchId: CHURCH, addedAt: FieldValue.serverTimestamp() });
  }

  console.log(WRITE ? "\nDone." : "\nNothing was written. Add --write to migrate.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
