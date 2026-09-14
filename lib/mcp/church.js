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

/** Runs `fn` with `churchId` as the church every tool reads and writes. */
export const runInChurch = (churchId, fn) => context.run({ churchId }, fn);

export const currentChurchId = () => {
  const churchId = context.getStore()?.churchId;
  if (!churchId) throw new Error("No church was chosen for this request.");
  return churchId;
};

/** churches/{churchId} for the current request; `.collection()` from here. */
export const church = () => churchRef(currentChurchId());
