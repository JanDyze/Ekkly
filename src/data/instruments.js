// What a musician plays, for the band.
//
// Plain data with no browser dependency, like scheduleRoles.js, so anything
// reading a schedule — the connector included — means the same thing by
// "bass". The icons are drawn by components/schedules/InstrumentIcon.vue.
//
// Recorded in two places, because they answer two questions:
//   - a member's `instruments`, on their People record: what they can play,
//     in the order they would usually be asked to;
//   - a service's `instruments`, { [personId]: instrumentId }: what they are
//     playing that Sunday — Kevin on keys one week and guitar the next.
// A Sunday that says nothing for someone falls back to the first thing their
// record says they play.

export const INSTRUMENTS = [
  { id: 'vocals', name: 'Vocals' },
  { id: 'guitar', name: 'Guitar' },
  { id: 'bass', name: 'Bass' },
  { id: 'keys', name: 'Keys' },
  { id: 'drums', name: 'Drums' },
  { id: 'other', name: 'Other' },
]

const IDS = new Set(INSTRUMENTS.map((instrument) => instrument.id))

export const isInstrument = (id) => IDS.has(id)

export const instrumentName = (id) => INSTRUMENTS.find((instrument) => instrument.id === id)?.name || ''

/** A member's instruments, kept to ones this list knows, in their order. */
export const instrumentsOf = (member) =>
  (Array.isArray(member?.instruments) ? member.instruments : []).filter(isInstrument)

/**
 * What someone plays on a service: the Sunday's own word for it, or failing
 * that the first instrument on their record, or nothing.
 */
export const instrumentOn = (sunday, personId, member) => {
  const chosen = sunday?.instruments?.[personId]
  if (isInstrument(chosen)) return chosen
  return instrumentsOf(member)[0] || ''
}

/** A service's instruments, kept to the people still on its band and known ids. */
export const cleanInstruments = (instruments, bandIds = []) => {
  const band = new Set(bandIds.map(String))
  return Object.fromEntries(
    Object.entries(instruments && typeof instruments === 'object' ? instruments : {}).filter(
      ([id, instrument]) => band.has(String(id)) && isInstrument(instrument)
    )
  )
}
