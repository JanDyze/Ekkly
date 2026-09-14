// Firebase Auth's list of authorised domains, written from the server.
//
// Google sign-in only works on a domain in that list, and the list takes no
// wildcards — so *.church.app does not cover uec.church.app, and every church's
// address has to be added by name. Doing it by hand in the Firebase console for
// each new church is the step that would be forgotten; this does it as part of
// approving the church.
//
// The Identity Toolkit API replaces the whole list on update, so it is read
// first and written back with the new domain appended.
//
// Needs the service account to be allowed to change the Auth configuration.
// The one Firebase generates ("firebase-adminsdk") usually is; when it is not,
// the call fails, the church is still created, and the approval says to add
// the domain by hand.
import { getApp } from "firebase-admin/app";
import { initAdmin } from "./firebaseAdmin.js";

const projectIdOf = (app) => {
  if (app.options.credential?.projectId) return app.options.credential.projectId;
  try {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}").project_id || "";
  } catch {
    return "";
  }
};

/** Resolves with "authorised" or "already authorised"; throws with a readable reason. */
export async function addAuthorizedDomain(domain) {
  initAdmin();
  const app = getApp();
  const projectId = projectIdOf(app);
  if (!projectId) throw new Error("The service account does not name a project.");

  const { access_token: accessToken } = await app.options.credential.getAccessToken();
  const endpoint = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const headers = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const current = await fetch(endpoint, { headers });
  if (!current.ok) {
    throw new Error(`could not read the Auth settings (HTTP ${current.status}) — add ${domain} by hand`);
  }
  const { authorizedDomains = [] } = await current.json();
  if (authorizedDomains.includes(domain)) return "already authorised";

  const updated = await fetch(`${endpoint}?updateMask=authorizedDomains`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ authorizedDomains: [...authorizedDomains, domain] }),
  });
  if (!updated.ok) {
    throw new Error(`could not update the Auth settings (HTTP ${updated.status}) — add ${domain} by hand`);
  }
  return "authorised";
}
