// The tools that remove a record, which only YUNIT offers.
//
// The Claude connector never deletes (MCP.md): a deletion made in a
// conversation outside the app has no undo and nobody watching. YUNIT is
// different in the one way that matters: he never runs a change himself. He
// proposes it as a card in the app, and it happens only when the person
// presses Confirm on it, after reading what will go. So these sit beside the
// connector's tools, are marked `write` and `destructive`, and are never in
// TOOLS, which is what the connector serves.
//
// They remove what a person could remove by hand in the app, the same way the
// app does (src/api/*Service.js): one document, nothing cascading. The roll is
// left out on purpose — a person is archived or edited, never deleted from a
// chat — as are minutes, which are the church's record of what it decided.
import { church } from "./church.js";

const str = (description) => ({ type: "string", description });
const schema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});

const requireId = (value, field) => {
  const id = String(value || "").trim();
  if (!id) throw new Error(`${field} is required.`);
  return id;
};

/**
 * One document gone from `collection`, after checking it exists, with what
 * it was called so the person sees which one went.
 */
const removeFrom = (collection, field, label, finder, refuse) => async (args = {}) => {
  const id = requireId(args[field], field);
  const ref = church().collection(collection).doc(id);
  const doc = await ref.get();
  if (!doc.exists) throw new Error(`No ${label} with id "${id}". Use ${finder} to find one.`);
  const data = doc.data();
  refuse?.(data);
  await ref.delete();
  return { done: "deleted", what: label, id, title: data.title || data.name || data.description || data.category || "" };
};

export const DELETE_TOOLS = [
  {
    name: "delete_task",
    title: "Delete a task",
    description: "Removes a task for good. Prefer update_task with done: true when the job was simply finished.",
    input: schema({ taskId: str("The task's id, from list_tasks.") }, ["taskId"]),
    write: true,
    destructive: true,
    run: removeFrom("tasks", "taskId", "task", "list_tasks", (data) => {
      if (data.scope === "dev") throw new Error("That is a developer ticket, not a church task.");
    }),
  },
  {
    name: "delete_prayer_concern",
    title: "Delete a prayer concern",
    description:
      "Removes a prayer concern for good. Prefer update_prayer_concern to mark it answered, which keeps the record of prayer.",
    input: schema({ concernId: str("The concern's id, from list_prayer_concerns.") }, ["concernId"]),
    write: true,
    destructive: true,
    run: removeFrom("prayerConcerns", "concernId", "prayer concern", "list_prayer_concerns"),
  },
  {
    name: "delete_event",
    title: "Delete a one-off event",
    description:
      "Removes a one-off event from the calendar. Only events saved as their own record can be deleted; a weekly service or a birthday is generated, so to call one off use update_event to cancel that date.",
    input: schema({ eventId: str("The event's id, from list_events (a saved event, not a generated occurrence).") }, ["eventId"]),
    write: true,
    destructive: true,
    run: removeFrom("events", "eventId", "event", "list_events"),
  },
  {
    name: "delete_song",
    title: "Delete a song",
    description: "Removes a song from the worship library.",
    input: schema({ songId: str("The song's id, from search_songs.") }, ["songId"]),
    write: true,
    destructive: true,
    run: removeFrom("worshipSongs", "songId", "song", "search_songs"),
  },
  {
    name: "delete_ledger_entry",
    title: "Delete a ledger entry",
    description: "Removes one line from the church's books, for an entry made in error.",
    input: schema({ entryId: str("The entry's id.") }, ["entryId"]),
    write: true,
    destructive: true,
    run: removeFrom("ledgerEntries", "entryId", "ledger entry", "finance_summary"),
  },
];

// Which app and capability each answers to, the same way the connector's
// tools do (tools.js TOOL_APPS): deleting needs `.manage` on that area.
export const DELETE_AREAS = {
  delete_task: "tasks",
  delete_prayer_concern: "prayer",
  delete_event: "events",
  delete_song: "songs",
  delete_ledger_entry: "finances",
};
