// Which church a request is for, worked out from the address it arrived on.
//
// One deployment serves every church. Each church's records live under
// churches/{churchId}/ in Firestore, and the id is also the church's own
// subdomain: uec.church.app is the church whose id is "uec". A church that
// brings its own domain (uecp-calapan.com) gets a row in `domains` pointing at
// the same id, so the rest of the app never has to know which door was used.
//
// Pure — no Firestore, no Vue — because the browser (src/api/church.js) and the
// server (lib/tenant.js) have to agree on every one of these answers. A host the
// browser reads as one church and the server as another would be a way to
// write into somebody else's congregation.

export const CHURCHES_COLLECTION = "churches";

/**
 * Collections that sit beside the churches rather than inside one. Everything
 * else is church data and is only ever read or written under churches/{id}/.
 */
export const GLOBAL_COLLECTIONS = new Set([
  CHURCHES_COLLECTION,
  // host -> churchId, for churches on a domain of their own
  "domains",
  // the people who run the platform and approve new churches
  "platformAdmins",
  // a congregation asking for a church of its own
  "churchRequests",
  // sha256(connector token) -> churchId, so a Claude connector finds its church
  "mcpTokens",
  // the platform's own settings (public: name, colours, prices; private: AI, defaults)
  "platform",
  // what the platform's administrators did
  "platformLog",
  // a church asking the platform for an app, a change, or with feedback
  "supportRequests",
]);

/**
 * Subdomains that are the platform's own rather than a church's. app.church.app
 * is where a new congregation asks for a church, and none of these can be taken
 * as a church id.
 */
export const RESERVED_IDS = new Set([
  "www",
  "app",
  "api",
  "auth",
  "admin",
  "platform",
  "mail",
  "email",
  "help",
  "support",
  "status",
  "docs",
  "blog",
  "static",
  "assets",
  "cdn",
]);

// A DNS label: lowercase letters, digits and inner hyphens, 3 to 40 long. Kept
// short enough that uec-canubing-ii.church.app still reads as an address.
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export const isValidChurchId = (value) =>
  typeof value === "string" && ID_PATTERN.test(value) && !value.includes("--") && !RESERVED_IDS.has(value);

/** "UEC Canubing II" -> "uec-canubing-ii", a starting point for the id. */
export const suggestChurchId = (name) =>
  String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");

const normalizeHost = (host) =>
  String(host || "")
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "")
    .replace(/\.$/, "");

const normalizeRoot = (rootDomain) =>
  String(rootDomain || "")
    .trim()
    .toLowerCase()
    .replace(/^\.+|\.+$/g, "");

/**
 * Hosts that can never be a church's own domain, so there is no point asking
 * Firestore about them: the dev server, a LAN address, Vercel's preview URLs
 * and the tunnels used to try the app on a phone.
 */
export const isDevelopmentHost = (host) => {
  const hostname = normalizeHost(host);
  return (
    !hostname ||
    hostname === "localhost" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) ||
    hostname.endsWith(".vercel.app") ||
    hostname.endsWith(".ngrok-free.app") ||
    hostname.endsWith(".ngrok.io") ||
    hostname.endsWith(".trycloudflare.com")
  );
};

/**
 * What the address alone says.
 *
 *   { kind: "church", churchId }  uec.church.app, or uec.localhost in development
 *   { kind: "platform" }          church.app, app.church.app — no church at all
 *   { kind: "unknown", hostname } anything else: a church's own domain, or a
 *                                 dev/preview host. The caller looks it up in
 *                                 `domains` and falls back from there.
 */
export function readHost(host, { rootDomain = "" } = {}) {
  const hostname = normalizeHost(host);
  const root = normalizeRoot(rootDomain);

  const fromLabel = (label) => {
    // One label only. docs.uec.church.app is not a church called "docs.uec".
    if (!label || label.includes(".")) return { kind: "unknown", hostname };
    if (RESERVED_IDS.has(label)) return { kind: "platform" };
    return isValidChurchId(label) ? { kind: "church", churchId: label } : { kind: "unknown", hostname };
  };

  if (root && (hostname === root || hostname === `www.${root}`)) return { kind: "platform" };
  if (root && hostname.endsWith(`.${root}`)) return fromLabel(hostname.slice(0, -(root.length + 1)));

  // Browsers resolve every *.localhost to this machine, which makes it the
  // development twin of the wildcard domain: uec.localhost:5173 is uec.
  if (hostname.endsWith(".localhost")) return fromLabel(hostname.slice(0, -".localhost".length));

  return { kind: "unknown", hostname };
}

/** The address a church is reached at, for links in emails and pushes. */
export function churchOrigin(churchId, { rootDomain = "", primaryDomain = "" } = {}) {
  if (primaryDomain) return `https://${normalizeHost(primaryDomain)}`;
  const root = normalizeRoot(rootDomain);
  return root && churchId ? `https://${churchId}.${root}` : "";
}
