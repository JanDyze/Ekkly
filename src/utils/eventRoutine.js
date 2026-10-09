import { isCalledOff } from '../../lib/eventStatus'

// Which gatherings are the routine and which are news.
//
// The routine is a weekly service on its usual day, at its usual time and in
// its usual place: everybody already knows it is on, and a calendar, a list or
// a card that gives it the same weight as everything else buries what is not
// routine under it. News is everything else — a gathering somebody typed in, a
// service moved this once, one marked by an occasion, one called off.
//
// The Events home, Coming up and the calendar all read it from here, so a
// service the calendar shows quietly is never one the home calls news.

const normalize = (value) => String(value || '').trim().toLowerCase()

/** The schedule an edited occurrence came from: `recurring-<schedule>-<date>`. */
export const scheduleIdOf = (overrideOf) => {
  const match = /^recurring-(.+)-\d{4}-\d{2}-\d{2}$/.exec(String(overrideOf || ''))
  return match ? match[1] : null
}

/**
 * How an edited occurrence differs from its schedule's time and place, or
 * null when it does not — `{ usual, timeMoved, placeMoved }`. A called-off one
 * is not "different": it is off, which is news of its own.
 */
export const differenceFromUsual = (event, schedules = []) => {
  if (!event?.isOverride || isCalledOff(event)) return null
  const usual = schedules.find((s) => s.id === scheduleIdOf(event.overrideOf))
  if (!usual) return null
  const timeMoved = Boolean(event.time && usual.time && event.time !== usual.time)
  const placeMoved = Boolean(event.location && usual.location && normalize(event.location) !== normalize(usual.location))
  return timeMoved || placeMoved ? { usual, timeMoved, placeMoved } : null
}

/**
 * A weekly service as its schedule has it, or edited in a way nobody turning
 * up would notice. Birthdays are neither routine nor news here; they are
 * People's, and each screen decides how quietly to carry them.
 */
export const isRoutineOccurrence = (event, schedules = []) =>
  Boolean(
    (event?.isRecurring || event?.overrideOf) &&
      !event.isBirthday &&
      !String(event.overrideOf || '').startsWith('birthday-') &&
      !isCalledOff(event) &&
      !event.occasions?.length &&
      !differenceFromUsual(event, schedules)
  )

/** A member's birthday on the calendar, generated or overridden. */
export const isBirthdayEvent = (event) =>
  Boolean(event?.isBirthday || event?.memberId || String(event?.id || '').startsWith('birthday-'))
