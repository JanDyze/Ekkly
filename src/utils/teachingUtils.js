// Small words the Teaching app says in more than one place, so a lesson reads
// the same on its class's screen, in the library and on the calendar.
import { AGE_BANDS } from './ageBands'
import { formatShortDate } from './lineupUtils'

export const plural = (n, one, many) => `${Number(n || 0).toLocaleString()} ${n === 1 ? one : many}`

/** "Kids", or '' for a lesson written for anyone. */
export const bandLabel = (key) => AGE_BANDS.find((band) => band.key === key)?.label || ''

/** The choices for who a class or a lesson is for. */
export const BAND_OPTIONS = [{ key: '', label: 'Any age' }, ...AGE_BANDS.map(({ key, label }) => ({ key, label }))]

/** "Kids · Ages 4 to 6": what a class is, under its name. */
export const classLine = (cls) => [bandLabel(cls?.band), cls?.ages ? `Ages ${cls.ages}` : '', cls?.room].filter(Boolean).join(' · ')

/** Where a lesson stands, in a few words: "Little Lambs · Oct 12", or the library. */
export const lessonWhere = (lesson, cls) => {
  if (!lesson?.date) return 'In the library'
  return [cls?.name || (lesson.classId ? 'A class no longer running' : ''), formatShortDate(lesson.date)].filter(Boolean).join(' · ')
}

/** The passages of a message or a lesson, as one line of references. */
export const referencesOf = (passages = []) => passages.map((p) => p.reference).filter(Boolean).join(', ')

/** Lines of text as a list, for materials typed one to a line. */
export const linesOf = (text) =>
  String(text || '')
    .split('\n')
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
