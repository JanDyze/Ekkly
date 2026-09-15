// What happens on the platform's front door, for whoever is selling Ekkly.
//
// Two things are kept:
//
//   frontDoorDays/{YYYY-MM-DD}  how many people looked, or pressed a call to
//                               action, that day — only with the visitor's
//                               say-so (the page asks before it counts)
//   frontDoorLeads/{id}         what someone typed into the welcome that greets
//                               a first visit: their church, and, if they chose
//                               to give them, their name and how to reach them.
//                               Given for exactly that purpose, so it is kept
//                               without the counting's consent.
//
// The counting identifies nobody: no addresses, no accounts, no cookies that
// follow anyone to another site.
//
// The writes are unauthenticated — a visitor has not signed in and may never —
// so they are deliberately narrow: two kinds of count that only ever go up by
// one, and short fields.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { suggestChurchId } from "../churchId.js";
import { Refusal, clip, iso } from "./common.js";
import { isMailConfigured, isValidEmail, sendTo } from "../mailer.js";
import { withBrandingDefaults } from "../platformDefaults.js";
import { getPlatformPublic } from "./config.js";

const KINDS = ["visit", "start"];

const daysRef = () => db().collection("frontDoorDays");
const leadsRef = () => db().collection("frontDoorLeads");

/**
 * The day a signal belongs to. The page sends its own date, because a visit at
 * nine in the evening in Manila is that evening's visit and not the next
 * morning's in UTC. It is accepted only in the right shape and only within a
 * day of now, so a wrong clock — or a made-up one — cannot file a visit in a
 * week that has not happened.
 */
const dayFor = (sent) => {
  const utc = new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(sent || "")) {
    const gap = Math.abs(Date.parse(`${sent}T12:00:00Z`) - utc.getTime());
    if (gap < 36 * 3600000) return sent;
  }
  return utc.toISOString().slice(0, 10);
};

/** An id the visitor's browser made; only its shape is kept. */
const visitorId = (value) => (clip(value, 40).match(/^[a-z0-9]{8,40}$/) ? clip(value, 40) : "");

/**
 * One count from the front door. Called by anyone, so it refuses anything it
 * does not recognise and writes one document.
 *
 * { kind: 'visit' | 'start', day? }
 */
export async function recordFrontDoor({ kind, day: sentDay } = {}) {
  if (!KINDS.includes(kind)) throw new Refusal(400, "Unknown signal");

  const day = dayFor(sentDay);
  const counter = { visit: "visits", start: "starts" }[kind];

  await daysRef()
    .doc(day)
    .set({ day, [counter]: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
}

/* --------------------------------------------------------------- leads */

/** An email address or a phone number, and which it is; anything else is refused. */
const contactOf = (value) => {
  const text = clip(value, 120);
  if (!text) return { contact: "", kind: "" };
  if (isValidEmail(text)) return { contact: text.toLowerCase(), kind: "email" };
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length >= 7 && digits.length <= 15 && /^[\d+\-() .]+$/.test(text)) return { contact: text, kind: "phone" };
  throw new Refusal(400, "Add an email address or a phone number.");
};

/**
 * What a first-time visitor told the welcome. Called by anyone: an id their
 * browser made (so the name and the contact, given a step apart, land on one
 * entry), short fields, and a hidden field only a bot fills in.
 *
 * { id, churchName, name?, contact?, page?, website? }
 */
export async function recordLead({ id, churchName, name, contact, page, website } = {}) {
  if (clip(website, 200)) return { ok: true };
  const leadId = visitorId(id);
  if (!leadId) throw new Refusal(400, "Nothing to record");
  const church = clip(churchName, 120);
  if (church.length < 2) throw new Refusal(400, "Tell us your church's name.");
  const reach = contactOf(contact);
  const person = clip(name, 80);
  const from = clip(page, 200);

  const ref = leadsRef().doc(leadId);
  const before = await ref.get();
  await ref.set(
    {
      churchName: church,
      slug: suggestChurchId(church),
      ...(person ? { name: person } : {}),
      ...(reach.contact ? { contact: reach.contact, contactKind: reach.kind } : {}),
      ...(from ? { page: from } : {}),
      ...(before.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // A way to reach them is worth a nudge; a name alone is not. Once per entry.
  if (reach.contact && !(before.exists && before.get("contact"))) await emailHostAboutLead({ church, person, reach });
  return { ok: true };
}

const emailHostAboutLead = async ({ church, person, reach }) => {
  const chat = withBrandingDefaults((await getPlatformPublic()).branding).chat;
  if (!isMailConfigured() || !isValidEmail(chat.hostEmail)) return;
  const who = person ? `${person} from ${church}` : church;
  const root = process.env.VITE_ROOT_DOMAIN || "";
  const lines = [`${who} left their details on the front door.`, `Reach them at ${reach.contact}`];
  if (root) lines.push(`https://${root}/platform?section=frontdoor`);
  try {
    await sendTo({ to: chat.hostEmail, subject: `${church} wants to hear from you`, text: lines.join("\n\n"), churchName: "Ekkly" });
  } catch (error) {
    // Kept either way; the email is only a nudge.
    console.error("Could not email the host about a front door lead:", error);
  }
};

const shapeLead = (d) => ({
  id: d.id,
  churchName: d.get("churchName") || "",
  slug: d.get("slug") || "",
  name: d.get("name") || "",
  contact: d.get("contact") || "",
  contactKind: d.get("contactKind") || "",
  createdAt: iso(d.get("createdAt")),
  updatedAt: iso(d.get("updatedAt")),
});

/**
 * The console's view: the last month of counts, and the churches that said
 * hello, newest first.
 */
export async function frontDoorReport({ days = 30, limit = 100 } = {}) {
  const since = new Date(Date.now() - Math.min(days, 90) * 86400000).toISOString().slice(0, 10);

  const [dayDocs, leadDocs] = await Promise.all([
    daysRef().where("day", ">=", since).orderBy("day", "desc").get(),
    leadsRef().orderBy("updatedAt", "desc").limit(Math.min(limit, 200)).get(),
  ]);

  return {
    days: dayDocs.docs.map((d) => ({
      day: d.id,
      visits: d.get("visits") || 0,
      starts: d.get("starts") || 0,
    })),
    leads: leadDocs.docs.map(shapeLead),
  };
}
