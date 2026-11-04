// Ekkly's own roadmaps, for the people who run it (the console's Roadmaps
// section, RoadmapsAdmin.vue).
//
// A roadmap is an end goal and the way there: its stops, in order, from the
// first step to the last. A stop is either a step on the road or a sidetrack
// taken off it, and a sidetrack belongs to the step before it, which is
// where the map draws it branching off. Kept as one document, stops and all,
// because the map is always read whole and a roadmap is a few dozen stops at
// most; the handful of platform administrators are the only ones writing it,
// so saving the whole document is simpler than merging stop by stop.
//
// Only the server writes it, and every change is logged in the same batch.
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../firebaseAdmin.js";
import { Refusal, clip, iso, logEntry, logRef } from "./common.js";

const roadmapsRef = () => db().collection("roadmaps");

const KINDS = ["step", "side"];
// A step is done or still ahead; where the road stands now is the first one
// not done, so it is never stored and can never disagree with the steps.
// A sidetrack may also have been given up on part way.
const STATUSES = { step: ["done", "next"], side: ["done", "open", "dropped"] };
const MAX_STOPS = 200;

const cleanStop = (stop, index) => {
  const kind = KINDS.includes(stop?.kind) ? stop.kind : "step";
  const status = STATUSES[kind].includes(stop?.status) ? stop.status : STATUSES[kind][1];
  const title = clip(stop?.title, 140);
  if (!title) throw new Refusal(400, `Stop ${index + 1} needs a name.`);
  const stars = Number.isInteger(stop?.stars) ? Math.min(3, Math.max(0, stop.stars)) : 0;
  return {
    id: clip(stop?.id, 40) || Math.random().toString(36).slice(2, 10),
    kind,
    title,
    note: clip(stop?.note, 2000),
    status,
    // How it went, out of three: only a finished stop has any.
    stars: status === "done" ? stars : 0,
    doneOn: status === "done" ? clip(stop?.doneOn, 10) : "",
  };
};

const shape = (d) => ({
  id: d.id,
  title: d.get("title") || "",
  why: d.get("why") || "",
  stops: Array.isArray(d.get("stops")) ? d.get("stops") : [],
  createdAt: iso(d.get("createdAt")),
  updatedAt: iso(d.get("updatedAt")),
  updatedBy: d.get("updatedBy") || "",
});

/** Every roadmap, the one most recently worked on first. */
export async function listRoadmaps() {
  const snapshot = await roadmapsRef().get();
  return snapshot.docs.map(shape).sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

/**
 * Create a roadmap (no id) or replace one whole: its goal, why it matters,
 * and every stop in order.
 */
export async function saveRoadmap(admin, { id, title, why, stops }) {
  const cleanTitle = clip(title, 140);
  if (!cleanTitle) throw new Refusal(400, "Name the end goal.");
  if (!Array.isArray(stops)) throw new Refusal(400, "That roadmap has no stops list.");
  if (stops.length > MAX_STOPS) throw new Refusal(400, `A roadmap holds at most ${MAX_STOPS} stops.`);

  const cleanStops = stops.map(cleanStop);
  // A sidetrack branches off the step before it, so the road cannot start
  // with one.
  if (cleanStops[0]?.kind === "side") throw new Refusal(400, "A sidetrack has to come after a step.");

  const ref = id ? roadmapsRef().doc(clip(id, 128)) : roadmapsRef().doc();
  const existing = id ? await ref.get() : null;
  if (id && !existing.exists) throw new Refusal(404, "That roadmap is not there any more.");

  const now = FieldValue.serverTimestamp();
  const batch = db().batch();
  batch.set(ref, {
    title: cleanTitle,
    why: clip(why, 2000),
    stops: cleanStops,
    updatedAt: now,
    updatedBy: admin.displayName || admin.email || "",
    ...(existing ? {} : { createdAt: now }),
  }, { merge: true });
  batch.set(
    logRef(),
    logEntry(admin, existing ? "roadmap.update" : "roadmap.new", {
      target: ref.id,
      label: existing ? `Roadmap “${cleanTitle}” changed` : `New roadmap: ${cleanTitle}`,
    })
  );
  await batch.commit();
  return shape(await ref.get());
}

/** Gone for good. */
export async function deleteRoadmap(admin, { id }) {
  if (!id) throw new Refusal(400, "Which roadmap?");
  const ref = roadmapsRef().doc(clip(id, 128));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Refusal(404, "That roadmap is not there any more.");
  const batch = db().batch();
  batch.delete(ref);
  batch.set(logRef(), logEntry(admin, "roadmap.delete", { target: ref.id, label: `Deleted roadmap “${snapshot.get("title")}”` }));
  await batch.commit();
  return { ok: true };
}
