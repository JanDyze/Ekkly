import { db } from './firebase'
import { collection, doc, onSnapshot, setDoc, Timestamp } from './firestore'

// The jobs a team does every Sunday, and which of them got done.
//
// The ushers open the doors, set out the chairs, take the offering and count
// the room, every week, and nobody should have to write those down again each
// Sunday. So a team keeps one list (`teamDuties/{team}`) and each Sunday keeps
// its ticks (`teamDays/{date}`, one map per team), which is the whole of a
// weekly recurring task: the list repeats, the ticks do not.
//
// Any team can have a list. The ushers are the first to need one.

const DUTIES_COLLECTION = 'teamDuties'
const DAYS_COLLECTION = 'teamDays'

const normalizeDuties = (data = {}) =>
  (Array.isArray(data.duties) ? data.duties : [])
    .filter((d) => d?.id && d?.text)
    .map((d) => ({ id: String(d.id), text: String(d.text) }))

/** Every team's list, keyed by team: `{ ushers: [{ id, text }] }`. */
export const subscribeToTeamDuties = (callback) =>
  onSnapshot(
    collection(db, DUTIES_COLLECTION),
    (snapshot) => {
      const byTeam = {}
      snapshot.docs.forEach((d) => {
        byTeam[d.id] = normalizeDuties(d.data())
      })
      callback(byTeam)
    },
    (error) => {
      console.error('Error subscribing to team duties:', error)
      callback({})
    }
  )

export const saveTeamDuties = (team, duties) =>
  setDoc(doc(db, DUTIES_COLLECTION, team), {
    duties: duties.map((d) => ({ id: d.id, text: String(d.text).trim() })).filter((d) => d.text),
    updatedAt: Timestamp.now(),
  })

/** Every Sunday's ticks, keyed by date and then team: `{ '2026-10-11': { ushers: { dutyId: { by, at } } } }`. */
export const subscribeToTeamDays = (callback) =>
  onSnapshot(
    collection(db, DAYS_COLLECTION),
    (snapshot) => {
      const byDate = {}
      snapshot.docs.forEach((d) => {
        const data = d.data() || {}
        const teams = {}
        Object.entries(data).forEach(([team, value]) => {
          if (value && typeof value === 'object' && value.done && typeof value.done === 'object') {
            teams[team] = value.done
          }
        })
        byDate[d.id] = teams
      })
      callback(byDate)
    },
    (error) => {
      console.error('Error subscribing to team days:', error)
      callback({})
    }
  )

/**
 * One team's ticks for one Sunday, replaced whole. Only that team's map is
 * written, so the ushers ticking the doors cannot undo the welcome team's
 * ticks on the same Sunday.
 */
export const saveTeamDay = (date, team, done) =>
  setDoc(
    doc(db, DAYS_COLLECTION, date),
    { [team]: { done }, updatedAt: Timestamp.now() },
    { mergeFields: [`${team}.done`, 'updatedAt'] }
  )
