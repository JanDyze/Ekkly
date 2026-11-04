import { callPlatform } from './platformService'

// Ekkly's own roadmaps, for the console's Roadmaps section. Read and written
// through /api/platform (lib/platform/roadmaps.js), which keeps the
// collection shut to the browser and logs every change.

const toDate = (value) => (value ? new Date(value) : null)

const normalizeStop = (stop) => ({
  id: stop.id,
  kind: stop.kind === 'side' ? 'side' : 'step',
  title: stop.title || '',
  note: stop.note || '',
  status: stop.status || (stop.kind === 'side' ? 'open' : 'next'),
  stars: stop.stars || 0,
  doneOn: stop.doneOn || '',
})

const normalizeRoadmap = (roadmap) => ({
  id: roadmap.id,
  title: roadmap.title || '',
  why: roadmap.why || '',
  after: roadmap.after || [],
  stops: (roadmap.stops || []).map(normalizeStop),
  updatedAt: toDate(roadmap.updatedAt),
  updatedBy: roadmap.updatedBy || '',
})

export const listRoadmaps = async () => (await callPlatform('roadmaps')).map(normalizeRoadmap)

/** Creates one when it has no id; otherwise replaces it whole. */
export const saveRoadmap = async ({ id, title, why, stops, after = [] }) =>
  normalizeRoadmap(await callPlatform('saveRoadmap', { id: id || undefined, title, why, stops, after }))

export const deleteRoadmap = (id) => callPlatform('deleteRoadmap', { id })
