import { SECTION_HUES } from '../data/appHues'

// A roadmap's stops are one ordered list: steps on the road, each followed by
// the sidetracks taken off it. These read and rearrange that list without
// ever leaving a sidetrack with no step before it.

export const newStopId = () => Math.random().toString(36).slice(2, 10)

/** Today as YYYY-MM-DD, in the browser's own day. */
export const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** [{ step, sides }] in road order. */
export const groupStops = (stops) => {
  const groups = []
  stops.forEach((stop) => {
    if (stop.kind === 'side' && groups.length) groups[groups.length - 1].sides.push(stop)
    else groups.push({ step: { ...stop, kind: 'step' }, sides: [] })
  })
  return groups
}

const flatten = (groups) => groups.flatMap((g) => [g.step, ...g.sides])

/** Where the road stands: the first step not yet done. */
export const currentStepId = (stops) => stops.find((s) => s.kind === 'step' && s.status !== 'done')?.id || ''

export const progressOf = (stops) => {
  const steps = stops.filter((s) => s.kind === 'step')
  const sides = stops.filter((s) => s.kind === 'side')
  return {
    steps: steps.length,
    done: steps.filter((s) => s.status === 'done').length,
    sides: sides.length,
    reached: steps.length > 0 && steps.every((s) => s.status === 'done'),
  }
}

/** Finishing a stop dates it, and opening it again clears the date and stars. */
const settle = (stop) =>
  stop.status === 'done'
    ? { ...stop, doneOn: stop.doneOn || today() }
    : { ...stop, doneOn: '', stars: 0 }

export const putStop = (stops, stop) =>
  stops.some((s) => s.id === stop.id) ? stops.map((s) => (s.id === stop.id ? settle(stop) : s)) : [...stops, settle(stop)]

/** A new sidetrack goes after the step's last one, so they read in the order taken. */
export const addSide = (stops, stepId, side) => {
  const groups = groupStops(stops)
  const group = groups.find((g) => g.step.id === stepId)
  if (!group) return stops
  group.sides.push(settle({ ...side, kind: 'side' }))
  return flatten(groups)
}

/** Removing a step takes its sidetracks with it: they branch off nothing else. */
export const removeStop = (stops, id) => {
  const groups = groupStops(stops)
  return flatten(
    groups
      .filter((g) => g.step.id !== id)
      .map((g) => ({ ...g, sides: g.sides.filter((s) => s.id !== id) }))
  )
}

/** A step moves with its sidetracks; a sidetrack moves among its step's own. */
export const moveStop = (stops, id, by) => {
  const groups = groupStops(stops)
  const at = groups.findIndex((g) => g.step.id === id)
  if (at >= 0) {
    const to = at + by
    if (to < 0 || to >= groups.length) return stops
    ;[groups[at], groups[to]] = [groups[to], groups[at]]
    return flatten(groups)
  }
  const group = groups.find((g) => g.sides.some((s) => s.id === id))
  if (!group) return stops
  const i = group.sides.findIndex((s) => s.id === id)
  const j = i + by
  if (j < 0 || j >= group.sides.length) return stops
  ;[group.sides[i], group.sides[j]] = [group.sides[j], group.sides[i]]
  return flatten(groups)
}

/** What can move, for the sheet's buttons. */
export const canMove = (stops, id) => {
  const groups = groupStops(stops)
  const at = groups.findIndex((g) => g.step.id === id)
  if (at >= 0) return { earlier: at > 0, later: at < groups.length - 1 }
  const group = groups.find((g) => g.sides.some((s) => s.id === id))
  const i = group ? group.sides.findIndex((s) => s.id === id) : -1
  return { earlier: i > 0, later: group ? i < group.sides.length - 1 : false }
}

export const SIDE_STATUSES = [
  { key: 'done', label: 'Taken', hint: 'Went off the road and came back' },
  { key: 'open', label: 'On it', hint: 'Off the road right now' },
  { key: 'dropped', label: 'Dropped', hint: 'Given up part way' },
]

export const STEP_STATUSES = [
  { key: 'done', label: 'Done' },
  { key: 'next', label: 'Ahead' },
]

export const shortDate = (ymd) => {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * A goal's own colour, from Ekkly's palette (appHues.js), so each goal's road
 * and its stop on the map of every goal look like a world of their own. Taken
 * from the goal's id rather than its place in the list, so it never changes
 * when another goal is added or worked on.
 */
export const goalHue = (id = '') => {
  let n = 7
  for (const ch of String(id)) n = (n * 31 + ch.charCodeAt(0)) >>> 0
  return SECTION_HUES[n % SECTION_HUES.length]
}
