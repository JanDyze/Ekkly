// The platform's own settings: platform/public and platform/private.
//
// public  — anyone may read it: the front door and every church's pages need
//           the platform's name and colours before anybody signs in, and a
//           church's administrators need the app prices. Nothing secret.
// private — the platform's administrators and the server only: which AI model
//           each feature runs on, and what a new church starts with.
//
// Both are written only through /api/platform, which logs every change.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import {
  PLATFORM_COLLECTION,
  PLATFORM_PRIVATE_DOC,
  PLATFORM_PUBLIC_DOC,
  brandingForStorage,
  themeForStorage,
  withBrandingDefaults,
  withNewChurchDefaults,
} from "../platformDefaults.js";
import { catalogForStorage, mergeCatalog, normalizeAppList } from "../apps.js";
import { aiForStorage, withAiDefaults } from "../aiModels.js";
import { logEntry, logRef } from "./common.js";

const publicRef = () => db().collection(PLATFORM_COLLECTION).doc(PLATFORM_PUBLIC_DOC);
const privateRef = () => db().collection(PLATFORM_COLLECTION).doc(PLATFORM_PRIVATE_DOC);

// A minute is long enough that a burst of AI calls reads the document once,
// and short enough that a model changed in the console is in use by the time
// anyone tries it.
const CACHE_MS = 60 * 1000;
const cache = { public: null, private: null };

const cached = async (key, ref) => {
  const hit = cache[key];
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const snapshot = await ref().get();
  const data = snapshot.exists ? snapshot.data() || {} : {};
  cache[key] = { at: Date.now(), data };
  return data;
};

const forget = (key) => {
  cache[key] = null;
};

export const getPlatformPublic = () => cached("public", publicRef);
export const getPlatformPrivate = () => cached("private", privateRef);

const fallbackName = () => process.env.VITE_PLATFORM_NAME || "Ekkly";

/** Everything the console edits, with defaults filled in. */
export async function readConfig() {
  const [pub, priv] = await Promise.all([publicRef().get(), privateRef().get()]);
  const publicData = pub.exists ? pub.data() || {} : {};
  const privateData = priv.exists ? priv.data() || {} : {};
  return {
    branding: withBrandingDefaults(publicData.branding, fallbackName()),
    storedBranding: publicData.branding || {},
    theme: themeForStorage(publicData.theme),
    catalog: mergeCatalog(publicData.apps),
    ai: withAiDefaults(privateData.ai),
    defaults: withNewChurchDefaults(privateData.defaults),
  };
}

const commit = async (admin, ref, data, action, label, cacheKey) => {
  const batch = db().batch();
  batch.set(ref, { ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  batch.set(logRef(), logEntry(admin, action, { target: ref.path, label, details: { fields: Object.keys(data) } }));
  await batch.commit();
  forget(cacheKey);
};

export async function saveBranding(admin, { branding }) {
  // The whole block at once: a merge would keep a line that was cleared.
  await commit(admin, publicRef(), { branding: brandingForStorage(branding) }, "branding.save", "Branding changed", "public");
  return readConfig();
}

export async function saveTheme(admin, { theme }) {
  await commit(admin, publicRef(), { theme: themeForStorage(theme) }, "theme.save", "Platform colours changed", "public");
  return readConfig();
}

export async function saveCatalog(admin, { apps }) {
  await commit(admin, publicRef(), { apps: catalogForStorage(apps) }, "apps.catalog", "App prices changed", "public");
  return readConfig();
}

export async function saveAi(admin, { ai }) {
  await commit(admin, privateRef(), { ai: aiForStorage(ai) }, "ai.save", "AI settings changed", "private");
  return readConfig();
}

export async function saveDefaults(admin, { defaults }) {
  const clean = withNewChurchDefaults(defaults);
  if (clean.apps) clean.apps = normalizeAppList(clean.apps);
  await commit(admin, privateRef(), { defaults: clean }, "defaults.save", "New church defaults changed", "private");
  return readConfig();
}
