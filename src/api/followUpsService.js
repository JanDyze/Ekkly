import { db } from './firebase'
import { collection, doc, onSnapshot, setDoc, Timestamp } from './firestore'

// Following up the people who have started coming: who has been called, who
// has been visited, who has found a small group and stayed.
//
// One document per person, keyed by their People record, so the record itself
// is never touched by somebody who can follow people up but not edit the roll.
// These are pastoral notes about real people, which is why seeing them is a
// permission of its own (consolidation.view) rather than part of Schedules.

const FOLLOW_UPS_COLLECTION = 'followUps'

// Where someone stands, in the order the welcome team works through them.
export const FOLLOW_UP_STEPS = [
  { key: 'new', label: 'New', hint: 'Nobody has reached out yet' },
  { key: 'contacted', label: 'Contacted', hint: 'Called or messaged' },
  { key: 'visited', label: 'Visited', hint: 'Met in person' },
  { key: 'connected', label: 'Connected', hint: 'In a small group, or serving' },
]

const STEP_KEYS = FOLLOW_UP_STEPS.map((s) => s.key)

const normalizeFollowUp = (id, data = {}) => ({
  memberId: id,
  step: STEP_KEYS.includes(data.step) ? data.step : 'new',
  // Who on the welcome team is looking after them.
  caretakerId: data.caretakerId ? String(data.caretakerId) : '',
  notes: data.notes || '',
  lastContact: data.lastContact || '',
  updatedBy: data.updatedBy || '',
  updatedAt: data.updatedAt?.toDate?.() || null,
})

export const blankFollowUp = (memberId) => normalizeFollowUp(memberId)

/** Everyone being followed up, keyed by their People record. */
export const subscribeToFollowUps = (callback) =>
  onSnapshot(
    collection(db, FOLLOW_UPS_COLLECTION),
    (snapshot) => {
      const byMember = {}
      snapshot.docs.forEach((d) => {
        byMember[d.id] = normalizeFollowUp(d.id, d.data())
      })
      callback(byMember)
    },
    (error) => {
      console.error('Error subscribing to follow-ups:', error)
      callback({})
    }
  )

export const saveFollowUp = (memberId, followUp, by) =>
  setDoc(doc(db, FOLLOW_UPS_COLLECTION, String(memberId)), {
    step: STEP_KEYS.includes(followUp.step) ? followUp.step : 'new',
    caretakerId: followUp.caretakerId || '',
    notes: String(followUp.notes || '').trim(),
    lastContact: followUp.lastContact || '',
    updatedBy: by?.email || by?.uid || '',
    updatedAt: Timestamp.now(),
  })
