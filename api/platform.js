// Vercel serverless function: everything the platform's console does, and the
// few things a church's administrators ask of the platform.
//
//   POST /api/platform { action, ...fields }
//
// One file rather than one per job because api/ is at Vercel's function limit
// for the plan; the work itself lives in lib/platform/, one module per subject.
//
// Three kinds of caller, checked before an action runs:
//   PLATFORM_ACTIONS  somebody in platformAdmins (lib/tenant.js requirePlatformAdmin)
//   CHURCH_ACTIONS    an administrator of the church the request names, via
//                     the X-Church-Id header (requireChurchAdmin)
//   PUBLIC_ACTIONS    anyone at all, signed in or not. Only the front door's
//                     own counting, its welcome and its chat bubble are here,
//                     each written to be safe in the open: see
//                     lib/platform/frontDoor.js and lib/platform/chat.js.
//
// The Admin SDK is not bound by Firestore's rules, so those checks are the
// rules here. Every change an action makes is written to platformLog.
import { requireChurchAdmin, requirePlatformAdmin } from "../lib/tenant.js";
import { Refusal } from "../lib/platform/common.js";
import { approve, decline } from "../lib/platform/requests.js";
import { getChurch, listChurches, setChurchStatus, updateChurch } from "../lib/platform/churches.js";
import { usageForAll } from "../lib/platform/usage.js";
import { activity, addAdmin, listAdmins, removeAdmin } from "../lib/platform/admins.js";
import { myPlan, setChurchApps, setMyApps } from "../lib/platform/apps.js";
import { recordPayment, removePayment, setBilling } from "../lib/platform/billing.js";
import {
  listSupportRequests,
  mySupportRequests,
  replySupportRequest,
  sendSupportRequest,
} from "../lib/platform/support.js";
import { readConfig, saveAi, saveBranding, saveCatalog, saveDefaults, saveTheme } from "../lib/platform/config.js";
import { addDomain, domainStatus, removeDomain, setPrimaryDomain } from "../lib/platform/domains.js";
import { frontDoorReport, recordFrontDoor, recordLead } from "../lib/platform/frontDoor.js";
import { chatIdentify, chatPoll, chatSend, listChats, presenceBeat, readChat, replyChat } from "../lib/platform/chat.js";
import {
  cancelCardBilling,
  handlePaymongoEvent,
  signatureValid,
  startCardBilling,
  syncCardBilling,
} from "../lib/platform/payments.js";

// (admin, body) => result
const PLATFORM_ACTIONS = {
  // church requests
  approve,
  decline,
  // churches
  listChurches: () => listChurches(),
  church: (_admin, body) => getChurch(body),
  updateChurch,
  setChurchStatus,
  usage: () => usageForAll(),
  // apps and billing
  setChurchApps,
  setBilling,
  recordPayment,
  removePayment,
  // domains
  addDomain,
  domainStatus,
  removeDomain,
  setPrimaryDomain,
  // support requests
  supportRequests: () => listSupportRequests(),
  replySupportRequest,
  // the platform's own settings
  config: () => readConfig(),
  saveBranding,
  saveTheme,
  saveCatalog,
  saveAi,
  saveDefaults,
  // the front door
  frontDoor: (_admin, body) => frontDoorReport(body),
  // the front door's chat
  presenceBeat: (admin) => presenceBeat(admin),
  chats: () => listChats(),
  chat: readChat,
  replyChat,
  // who runs it
  listAdmins: () => listAdmins(),
  addAdmin,
  removeAdmin,
  activity: (_admin, body) => activity(body),
};

// (body) => result, for a visitor who has not signed in and may never.
const PUBLIC_ACTIONS = {
  frontDoorSignal: recordFrontDoor,
  chatPoll,
  chatSend,
  chatIdentify,
  // the front door's welcome: a new church leaving its name and a way to reach it
  frontDoorLead: recordLead,
};

// (caller, body) => result, where caller carries the church
const CHURCH_ACTIONS = {
  myPlan: (caller) => myPlan(caller),
  setMyApps,
  mySupportRequests: (caller) => mySupportRequests(caller),
  sendSupportRequest,
  // paying by card (lib/platform/payments.js)
  startCardBilling,
  syncCardBilling: (caller) => syncCardBilling(caller),
  cancelCardBilling: (caller) => cancelCardBilling(caller),
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // PayMongo's webhook comes here too, since api/ has no room for a route of
  // its own. It is told apart by its signature header, answered quickly, and
  // acted on only after PayMongo is asked directly (see payments.js).
  if (req.headers["paymongo-signature"]) {
    try {
      const raw = typeof req.rawBody === "string" ? req.rawBody : null;
      if (signatureValid(req.headers["paymongo-signature"], raw) === false) {
        return res.status(401).json({ error: "Bad signature" });
      }
      const event = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      return res.status(200).json(await handlePaymongoEvent(event));
    } catch (error) {
      console.error("Error handling a PayMongo event:", error);
      // A 500 makes PayMongo retry, which is what an outage here should do.
      return res.status(500).json({ error: "Could not handle that event" });
    }
  }

  let body = req.body || {};
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Could not read that request" });
    }
  }

  const { action, ...fields } = body;

  try {
    if (Object.hasOwn(PUBLIC_ACTIONS, action)) {
      return res.status(200).json(await PUBLIC_ACTIONS[action](fields));
    }

    if (Object.hasOwn(PLATFORM_ACTIONS, action)) {
      const admin = await requirePlatformAdmin(req);
      if (admin.error) return res.status(admin.status).json({ error: admin.error });
      return res.status(200).json(await PLATFORM_ACTIONS[action](admin, fields));
    }

    if (Object.hasOwn(CHURCH_ACTIONS, action)) {
      const caller = await requireChurchAdmin(req);
      if (caller.error) return res.status(caller.status).json({ error: caller.error });
      return res.status(200).json(await CHURCH_ACTIONS[action](caller, fields));
    }

    return res.status(400).json({ error: `Unknown action "${action}"` });
  } catch (error) {
    if (error instanceof Refusal) return res.status(error.status).json({ error: error.message });
    console.error(`Error in platform action ${action}:`, error);
    return res.status(500).json({ error: error.message || "Something went wrong" });
  }
}
