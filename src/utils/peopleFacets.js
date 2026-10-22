import { bandOf } from './ageBands'
import { isBlankDetail } from './memberUtils'

// The ways the roll is cut on People's Overview (PeopleGlance), and the
// people behind each figure, for the list it opens (PeopleMinistry, as
// PeopleFacet). One reading for both, so a figure and the list it opens
// always agree.
//
// A facet is the list's query: { standing, band, sex, civil, serving,
// grouped }, any of them, all of them narrowing.
//
//   standing  members | attendees
//   band      an age band's key (ageBands.js), or unknown
//   sex       Male | Female | unknown
//   civil     a civil status, or unknown
//   serving   yes | no     in a ministry the church keeps, or in none
//   grouped   yes | no     members past the Kids band in a small group, or
//                          in none, as the Ministries screen counts them

const keyOf = (member) => String(member.firestoreId || member.id)

const inMinistry = (member, ministryNames) =>
  (member.ministries || []).some((name) =>
    ministryNames.some((known) => known.toLowerCase() === String(name).toLowerCase())
  )

/** Members past the Kids band: who "in a small group" is counted out of. */
export const groupEligible = (member) => member.isMember !== false && bandOf(member)?.key !== 'kids'

/**
 * The people a facet picks out.
 * `context`: { ministryNames: [], groupedKeys: Set } — what the church keeps
 * and who is in a small group.
 */
export const facetPeople = (members, facet = {}, context = {}) => {
  const ministryNames = context.ministryNames || []
  const grouped = context.groupedKeys || new Set()
  return members.filter((member) => {
    if (facet.standing === 'members' && member.isMember === false) return false
    if (facet.standing === 'attendees' && member.isMember !== false) return false
    if (facet.band) {
      const band = bandOf(member)?.key || 'unknown'
      if (band !== facet.band) return false
    }
    if (facet.sex) {
      const sex = member.sex === 'Male' || member.sex === 'Female' ? member.sex : 'unknown'
      if (sex !== facet.sex) return false
    }
    if (facet.civil) {
      const civil = isBlankDetail(member.civilStatus) ? 'unknown' : member.civilStatus
      if (civil !== facet.civil) return false
    }
    if (facet.serving === 'yes' && !inMinistry(member, ministryNames)) return false
    if (facet.serving === 'no' && inMinistry(member, ministryNames)) return false
    if (facet.grouped) {
      if (!groupEligible(member)) return false
      if ((facet.grouped === 'yes') !== grouped.has(keyOf(member))) return false
    }
    return true
  })
}

const BAND_NAMES = { kids: 'Kids', youth: 'Youth', adults: 'Adults', seniors: 'Seniors', unknown: 'Age not on file' }
const SEX_NAMES = { Male: 'Men and boys', Female: 'Women and girls', unknown: 'Sex not on file' }

/** What a facet's list is called: "Youth · Women and girls", "Married". */
export const facetTitle = (facet = {}) => {
  const parts = []
  if (facet.standing) parts.push(facet.standing === 'members' ? 'Members' : 'Attendees')
  if (facet.band) parts.push(BAND_NAMES[facet.band] || facet.band)
  if (facet.sex) parts.push(SEX_NAMES[facet.sex] || facet.sex)
  if (facet.civil) parts.push(facet.civil === 'unknown' ? 'Civil status not on file' : facet.civil)
  if (facet.serving) parts.push(facet.serving === 'yes' ? 'Serving in a ministry' : 'In no ministry')
  if (facet.grouped) parts.push(facet.grouped === 'yes' ? 'In a small group' : 'In no small group')
  return parts.join(' · ') || 'Everyone'
}

/** A facet from a route's query, only the keys it knows. */
export const facetFromQuery = (query = {}) =>
  Object.fromEntries(
    ['standing', 'band', 'sex', 'civil', 'serving', 'grouped']
      .filter((key) => typeof query[key] === 'string' && query[key])
      .map((key) => [key, query[key]])
  )

/** The route that lists a facet's people. */
export const facetRoute = (facet) => ({ name: 'PeopleFacet', query: facet })
