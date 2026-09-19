// Which church a connector call is answering about.
//
// One MCP endpoint serves every church, and the token a conversation connects
// with decides which church it sees (api/mcp.js). That choice is made once per
// request and has to reach thirty tool handlers and the reads they share
// without being threaded through every signature — so it rides in
// AsyncLocalStorage for the life of the request, and `church()` is where every
// tool reaches Firestore from.
//
// Outside a request there is no church, and `church()` throws. A tool that
// somehow ran without one must fail rather than read a collection that belongs
// to nobody.
import { AsyncLocalStorage } from "node:async_hooks";
import { churchRef } from "../tenant.js";

const context = new AsyncLocalStorage();

/**
 * Runs `fn` with `churchId` as the church every tool reads and writes, and
 * `actor` as who the records will say made any change.
 */
export const runInChurch = ({ churchId, actor }, fn) => context.run({ churchId, actor }, fn);

/* ------------------------------------------------------------------ actor */

// Who a record says made the change, when the change came through a tool.
//
// The id stays "mcp" whoever connected, so a change made in a conversation can
// always be told from one somebody typed. The name carries the person whose
// link it was — a link belongs to an account now, not to the church at large —
// and the audit entry carries their uid, so the log can be read by person.
export const MCP_ACTOR = "Claude (MCP connector)";
export const MCP_ACTOR_ID = "mcp";

/** The name a record wears for this request: the generic one, or the person's. */
export const actorFor = (personName) =>
  personName ? `Claude (for ${personName})` : MCP_ACTOR;

/** `{ id, name, uid }` — uid is the person's, empty where there isn't one. */
export const currentActor = () =>
  context.getStore()?.actor || { id: MCP_ACTOR_ID, name: MCP_ACTOR, uid: "" };

/** The name alone, which is what a record's createdByName field wants. */
export const actorName = () => currentActor().name;

export const currentChurchId = () => {
  const churchId = context.getStore()?.churchId;
  if (!churchId) throw new Error("No church was chosen for this request.");
  return churchId;
};

/** churches/{churchId} for the current request; `.collection()` from here. */
export const church = () => churchRef(currentChurchId());
