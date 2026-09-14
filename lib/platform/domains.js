// A church on a domain of its own: app.uecp-calapan.com rather than
// uecp-calapan.church.app.
//
// A custom domain needs four things to work, and this does as many as it can:
//   1. domains/{host} -> churchId, so the page knows which church it is
//      (always done here)
//   2. the host on Firebase Auth's authorised domains, so Google sign-in works
//      (done here if the service account may change Auth settings)
//   3. the host on the Vercel project, so the request reaches this deployment
//      (done here when VERCEL_API_TOKEN and VERCEL_PROJECT_ID are set)
//   4. a DNS record at the church's registrar pointing at Vercel
//      (only the church can do this; the answer says exactly what to add)
//
// A step that cannot be done is reported, not fatal: the mapping still stands
// and the console shows what is left to do by hand.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { churchRef } from "../tenant.js";
import { isDevelopmentHost } from "../churchId.js";
import { addAuthorizedDomain } from "../authorizedDomains.js";
import { Refusal, clip, logEntry, logRef } from "./common.js";
import { getChurch, requireChurch } from "./churches.js";

const HOST = /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

const cleanHost = (value) =>
  clip(value, 253)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

const vercel = () => {
  const token = process.env.VERCEL_API_TOKEN || "";
  const project = process.env.VERCEL_PROJECT_ID || "";
  if (!token || !project) return null;
  const call = async (method, path, body, params = {}) => {
    const query = new URLSearchParams(params);
    if (process.env.VERCEL_TEAM_ID) query.set("teamId", process.env.VERCEL_TEAM_ID);
    const search = query.toString();
    const response = await fetch(`https://api.vercel.com${path}${search ? `?${search}` : ""}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, payload };
  };
  return { project, call };
};

const vercelError = (result) => result.payload?.error?.message || `HTTP ${result.status}`;

/** What DNS records Vercel wants for the host, and whether it can see them yet. */
async function dnsFor(host) {
  const api = vercel();
  if (!api) return null;
  const result = await api.call("GET", `/v6/domains/${encodeURIComponent(host)}/config`, null, {
    projectIdOrName: api.project,
  });
  if (!result.ok) return { error: vercelError(result) };
  const config = result.payload || {};
  const pick = (list) => (Array.isArray(list) ? [...list].sort((a, b) => a.rank - b.rank)[0]?.value : null);
  // An apex domain (uecp-calapan.com) cannot take a CNAME; a subdomain should.
  const isApex = host.split(".").length === 2;
  const ipv4 = pick(config.recommendedIPv4);
  return {
    misconfigured: config.misconfigured !== false,
    configuredBy: config.configuredBy || null,
    record: isApex
      ? { type: "A", name: "@", value: Array.isArray(ipv4) ? ipv4[0] : ipv4 || "76.76.21.21" }
      : { type: "CNAME", name: host.split(".")[0], value: pick(config.recommendedCNAME) || "cname.vercel-dns.com" },
  };
}

export async function addDomain(admin, { churchId, host, primary = false }) {
  const church = await requireChurch(churchId);
  const name = cleanHost(host);
  if (!HOST.test(name)) throw new Refusal(400, "That is not a domain name. Enter it like app.yourchurch.com.");
  if (isDevelopmentHost(name)) throw new Refusal(400, "That address is for testing and cannot belong to a church.");
  const root = process.env.VITE_ROOT_DOMAIN || "";
  if (root && (name === root || name.endsWith(`.${root}`))) {
    throw new Refusal(400, `Addresses under ${root} are given out automatically. A custom domain is one the church owns.`);
  }

  const ref = db().collection("domains").doc(name);
  await db().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      const owner = existing.get("churchId");
      throw new Refusal(409, owner === churchId ? `${name} is already this church's.` : `${name} already belongs to another church.`);
    }
    tx.create(ref, { churchId, addedAt: FieldValue.serverTimestamp(), addedBy: admin.email || admin.uid });
    if (primary) tx.update(churchRef(churchId), { primaryDomain: name });
    tx.set(logRef(), logEntry(admin, "domain.add", { churchId, target: name, label: `Connected ${name} to ${church.get("name") || churchId}` }));
  });

  const steps = { mapping: "done" };

  try {
    steps.signIn = await addAuthorizedDomain(name);
  } catch (error) {
    steps.signIn = `failed: ${error.message}`;
  }

  const api = vercel();
  if (!api) {
    steps.vercel = "skipped";
  } else {
    const added = await api.call("POST", `/v10/projects/${encodeURIComponent(api.project)}/domains`, { name });
    if (added.ok) {
      steps.vercel = added.payload?.verified === false ? "needs verification" : "done";
      steps.verification = added.payload?.verification || [];
    } else {
      steps.vercel = `failed: ${vercelError(added)}`;
    }
  }

  const dns = api ? await dnsFor(name).catch((error) => ({ error: error.message })) : null;
  return { church: await getChurch({ churchId }), result: { host: name, steps, dns } };
}

export async function domainStatus(_admin, { host }) {
  const name = cleanHost(host);
  const mapping = await db().collection("domains").doc(name).get();
  if (!mapping.exists) throw new Refusal(404, `${name} is not connected to a church.`);
  return { host: name, churchId: mapping.get("churchId"), vercelConfigured: Boolean(vercel()), dns: await dnsFor(name) };
}

export async function removeDomain(admin, { churchId, host }) {
  const church = await requireChurch(churchId);
  const name = cleanHost(host);
  const ref = db().collection("domains").doc(name);

  await db().runTransaction(async (tx) => {
    const mapping = await tx.get(ref);
    if (!mapping.exists || mapping.get("churchId") !== churchId) throw new Refusal(404, `${name} is not connected to this church.`);
    tx.delete(ref);
    if (church.get("primaryDomain") === name) tx.update(churchRef(churchId), { primaryDomain: FieldValue.delete() });
    tx.set(logRef(), logEntry(admin, "domain.remove", { churchId, target: name, label: `Disconnected ${name} from ${church.get("name") || churchId}` }));
  });

  // Firebase's authorised domains are left alone: an extra entry there opens
  // nothing, and removing one by mistake would break sign-in somewhere else.
  const api = vercel();
  let vercelResult = "skipped";
  if (api) {
    const removed = await api.call("DELETE", `/v9/projects/${encodeURIComponent(api.project)}/domains/${encodeURIComponent(name)}`);
    vercelResult = removed.ok || removed.status === 404 ? "removed" : `failed: ${vercelError(removed)}`;
  }

  return { church: await getChurch({ churchId }), result: { host: name, vercel: vercelResult } };
}

export async function setPrimaryDomain(admin, { churchId, host }) {
  const church = await requireChurch(churchId);
  const name = host ? cleanHost(host) : "";
  if (name) {
    const mapping = await db().collection("domains").doc(name).get();
    if (!mapping.exists || mapping.get("churchId") !== churchId) throw new Refusal(404, `${name} is not connected to this church.`);
  }
  const batch = db().batch();
  batch.update(churchRef(churchId), { primaryDomain: name || FieldValue.delete() });
  batch.set(
    logRef(),
    logEntry(admin, "domain.primary", {
      churchId,
      target: name,
      label: name ? `${church.get("name") || churchId} now uses ${name} in emails and links` : `${church.get("name") || churchId} uses its own subdomain in emails and links again`,
    })
  );
  await batch.commit();
  return getChurch({ churchId });
}
