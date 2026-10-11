// Changing anything the church keeps, which only YUNIT offers.
//
// The connector's write tools (tools.js) each change one kind of record the
// way the app does — a member numbered as the app numbers them, a ledger line
// checked against the chart of accounts — and they are still the ones to use
// where they fit. These are for everything they do not reach: the church's own
// details, and any other record under the church, so nothing a church keeps is
// out of YUNIT's hands (lib/yunit.js, YUNIT_ACCESS).
//
// Like every YUNIT write, none of these runs when he calls it. Each comes back
// to the page as a card saying what will change, and runs only when the person
// presses Confirm, as them, written to the audit log in their name.
//
// A few collections stay closed to writing whatever YUNIT_ACCESS says:
//
//   Billing — the church's plan, its payments, its usage and the platform's
//   own records. These are Ekkly's, written only through /api/platform; a
//   church rewriting its own plan would be a church giving itself apps.
//   Who may do what — administrators, sign-in access and what each ministry
//   may see. These are for the permissions panel to come; a member making
//   themselves an administrator from a chat is not a change to the church.
//   The audit log and the mail log — the record of what changed and what was
//   sent cannot be rewritten by the thing it records.
//   Credentials, which are never even read (records.js).
import { FieldValue } from "firebase-admin/firestore";
import { church } from "./church.js";
import { actorName, MCP_ACTOR_ID } from "./data.js";
import { collectionAt, SECRET } from "./records.js";
import { MOVED_FROM_LANDING } from "../../src/data/appDefaults.js";

const str = (description) => ({ type: "string", description });
const schema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const CLOSED = new Set([
  "subscription",
  "payments",
  "usage",
  "platform",
  "appAdmins",
  "access",
  "rolePermissions",
  "auditLog",
  "mailLog",
]);

// Deleting is narrower still: a person on the roll is archived or edited,
// never deleted from a chat, and minutes are the church's record of what it
// decided (the same line deletes.js draws).
const NO_DELETE = new Set(["members", "minutes"]);

/** A collection path that may be written, or the reason it may not. */
const writable = (path, apps) => {
  const top = String(path || "").trim().split("/").filter(Boolean)[0] || "";
  if (CLOSED.has(top)) {
    throw new Error(`"${top}" cannot be changed from here: it is billing, permissions or a log, which are kept elsewhere.`);
  }
  return collectionAt(path, apps);
};

/**
 * The fields to write, checked: no credentials, nothing hidden, and a null
 * meaning "remove this field" rather than storing a null.
 */
const fieldsOf = (fields) => {
  if (!fields || typeof fields !== "object" || Array.isArray(fields) || !Object.keys(fields).length) {
    throw new Error("Give the fields to write as an object, e.g. { \"status\": \"done\" }.");
  }
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!key || key.startsWith("__") || SECRET.test(key)) throw new Error(`"${key}" cannot be written.`);
    if (key === "id" || key === "firestoreId") continue;
    out[key] = value === null ? FieldValue.delete() : value;
  }
  return out;
};

const stamp = () => ({ updatedAt: new Date(), updatedBy: MCP_ACTOR_ID, updatedByName: actorName() });

/* ------------------------------------------------------- the church's own */

// What the church says about itself, as Settings → Church details edits it
// (useAppSettings.saveChurchIdentity): one map, `church`, on appSettings/church.
const PROFILE_FIELDS = [
  "shortName",
  "fullName",
  "branch",
  "founded",
  "affiliation",
  "mission",
  "vision",
  "address",
  "mapUrl",
  "phone",
  "email",
  "facebook",
];

const updateChurchProfile = async (args = {}) => {
  const changes = {};
  for (const key of PROFILE_FIELDS) {
    if (args[key] !== undefined) changes[key] = String(args[key] ?? "").trim();
  }
  for (const key of ["values", "basisOfFaith"]) {
    if (Array.isArray(args[key])) changes[key] = args[key];
  }
  if (!Object.keys(changes).length) throw new Error("Give at least one detail to change.");

  // Several of these used to live on the public page's block, and the page
  // reads that copy until the church's own is written. Blanked as it is
  // written, the way the app does, so the old wording cannot show through.
  const legacy = Object.fromEntries(Object.keys(changes).filter((k) => MOVED_FROM_LANDING.includes(k)).map((k) => [k, ""]));

  await church()
    .collection("appSettings")
    .doc("church")
    .set({ church: changes, ...(Object.keys(legacy).length ? { landing: legacy } : {}), updatedAt: new Date() }, { merge: true });

  return { ok: true, action: "updated", what: "church details", changed: changes };
};

/* --------------------------------------------------------- any record */

const updateRecord = (apps) => async (args = {}) => {
  const id = String(args.id || "").trim();
  if (!id || !/^[\w-]+$/.test(id)) throw new Error("Give the record's id, from list_records.");
  const ref = writable(args.collection, apps).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`No record "${id}" in ${args.collection}. Use list_records to find it.`);
  // Merged, so the fields not named are kept; a map named is merged into, and
  // a list named is replaced whole.
  await ref.set({ ...fieldsOf(args.fields), ...stamp() }, { merge: true });
  return { ok: true, action: "updated", collection: args.collection, id, changed: Object.keys(args.fields) };
};

const addRecord = (apps) => async (args = {}) => {
  const ref = await writable(args.collection, apps).add({
    ...fieldsOf(args.fields),
    createdAt: new Date(),
    createdBy: MCP_ACTOR_ID,
    createdByName: actorName(),
    ...stamp(),
  });
  return { ok: true, action: "added", collection: args.collection, id: ref.id };
};

const deleteRecord = (apps) => async (args = {}) => {
  const top = String(args.collection || "").trim().split("/").filter(Boolean)[0] || "";
  if (NO_DELETE.has(top)) {
    throw new Error(top === "members" ? "Nobody is deleted from the roll here; mark them inactive with update_member instead." : "Minutes are the church's record and are not deleted here.");
  }
  const id = String(args.id || "").trim();
  if (!id || !/^[\w-]+$/.test(id)) throw new Error("Give the record's id, from list_records.");
  const ref = writable(args.collection, apps).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`No record "${id}" in ${args.collection}.`);
  const data = doc.data() || {};
  await ref.delete();
  return { ok: true, action: "deleted", collection: args.collection, id, was: data.title || data.name || data.description || "" };
};

/**
 * The change tools, bound to the church's apps (a Set of app keys, or null for
 * every app) so a switched-off app's records stay closed to writing as well
 * as reading.
 */
export const changeTools = (apps = null) => [
  {
    name: "update_church_profile",
    title: "Change the church's details",
    description:
      "Changes what the church says about itself — its names, branch, founding, affiliation, mission, " +
      "vision, address, map link, phone, email and Facebook page, its core values and basis of faith — " +
      "as Settings → Church details does. Give only what changes. church_profile shows what is there now.",
    write: true,
    input: schema({
      shortName: str("The name people call it."),
      fullName: str("Its full registered name."),
      branch: str("Which branch or local church this is."),
      founded: str("When it was founded."),
      affiliation: str("The denomination or network it belongs to."),
      mission: str("Its mission statement."),
      vision: str("Its vision statement."),
      address: str("Where it meets, e.g. \"Canubing II, Calapan, Oriental Mindoro\". The home's live sky reads the town from it."),
      mapUrl: str("A Google Maps link to the church."),
      phone: str("The church's phone number."),
      email: str("The church's email address."),
      facebook: str("The church's Facebook page link."),
      values: {
        type: "array",
        description: "The whole list of core values, replacing it: [{ value, note }].",
        items: { type: "object", properties: { value: { type: "string" }, note: { type: "string" } }, required: ["value"] },
      },
      basisOfFaith: {
        type: "array",
        description: "The whole basis of faith, replacing it: [{ belief, reference }].",
        items: { type: "object", properties: { belief: { type: "string" }, reference: { type: "string" } }, required: ["belief"] },
      },
    }),
    run: updateChurchProfile,
  },
  {
    name: "update_record",
    title: "Change a record",
    description:
      "Changes fields on any one record the church keeps (find it with list_records or get_record). " +
      "Fields not named are kept; a list named is replaced whole; null removes a field. Use the dedicated " +
      "tool where there is one — update_member, update_event, update_task, update_prayer_concern — " +
      "since those check what the app checks. Billing, permissions and the logs cannot be changed.",
    write: true,
    input: schema(
      {
        collection: str("The collection, as list_collections gave it."),
        id: str("The record's id."),
        fields: { type: "object", description: "The fields to set, as stored, e.g. { \"status\": \"answered\" }." },
      },
      ["collection", "id", "fields"]
    ),
    run: updateRecord(apps),
  },
  {
    name: "add_record",
    title: "Add a record",
    description:
      "Adds a record to any collection the church keeps, with the fields as the app stores them (look at " +
      "an existing record with get_record first, and copy its shape). Use the dedicated tool where there is " +
      "one — add_member, create_event, add_task, add_song, add_prayer_concern, add_ledger_entry — since " +
      "those number, check and file it the way the app does.",
    write: true,
    input: schema(
      {
        collection: str("The collection, as list_collections gave it."),
        fields: { type: "object", description: "The new record's fields, shaped like the others in that collection." },
      },
      ["collection", "fields"]
    ),
    run: addRecord(apps),
  },
  {
    name: "delete_record",
    title: "Delete a record",
    description:
      "Removes one record from a collection the church keeps, for good. Prefer a gentler change where " +
      "one exists — tick a task done, mark a concern answered, cancel an event. The roll and minutes are " +
      "never deleted here, nor billing, permissions or the logs.",
    write: true,
    destructive: true,
    input: schema(
      {
        collection: str("The collection, as list_collections gave it."),
        id: str("The record's id."),
      },
      ["collection", "id"]
    ),
    run: deleteRecord(apps),
  },
];
