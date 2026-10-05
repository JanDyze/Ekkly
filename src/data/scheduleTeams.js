// The teams a Sunday is staffed by.
//
// A schedule is one thing — one Sunday, one rota, one place to find out when
// you are on — but it is put together by different people with different jobs.
// The worship leader picks the songs; the pastor sets what is preached; the
// head usher sorts the door. So every role belongs to a team, each team plans
// its own part of every Sunday, and each has a section of Schedules for the
// work that is only theirs.
//
// Plain data with no browser dependency, like scheduleRoles.js, so the
// connector can speak of teams the same way.
//
// `area` is the capability that lets someone plan the team's part
// (lib/capabilities.js). Whoever holds `lineups.manage` plans every team, the
// way they planned the whole Sunday before there were teams.

export const TEAMS = [
  {
    key: 'worship',
    name: 'Worship',
    area: 'worship',
    blurb: 'The songs, their keys, and who sings and plays.',
  },
  {
    key: 'preaching',
    name: 'Preaching',
    area: 'preaching',
    blurb: 'The series, each Sunday’s message, the passages and the slides.',
  },
  {
    key: 'ushers',
    name: 'Ushers',
    area: 'ushers',
    blurb: 'Who is on the door, and the jobs done every Sunday.',
  },
  {
    key: 'welcome',
    name: 'Welcome',
    area: 'consolidation',
    blurb: 'Greeting newcomers, and following them up in the week.',
  },
]

export const TEAM_KEYS = TEAMS.map((team) => team.key)

export const teamByKey = (key) => TEAMS.find((team) => team.key === key) || null

/** The team a role is planned by, or '' for one no team owns. */
export const teamOfRole = (role) => (TEAM_KEYS.includes(role?.team) ? role.team : '')

/** The church's roles that belong to one team, in the church's own order. */
export const rolesOfTeam = (roles = [], key) => roles.filter((role) => teamOfRole(role) === key)

/**
 * What a team owns on a Sunday beyond its roles' assignments, so saving one
 * team's part of a service can never touch another's:
 *   worship   — the songs and what each of the band is playing
 *   preaching — the Sunday's theme, which the series sets
 */
export const TEAM_FIELDS = {
  worship: ['songs', 'instruments'],
  preaching: ['theme'],
  ushers: [],
  welcome: [],
}

/**
 * One team's changes laid onto the Sunday as it stands now.
 *
 * `live` is the service as the latest snapshot has it, `edited` what the
 * team's editor produced. Only the team's roles and fields are taken from
 * `edited`; everything else — the other teams' people, their songs, their
 * theme — comes from `live`, so a worship leader saving at the same moment the
 * pastor saves does not put back the theme the pastor just changed.
 */
export const mergeTeamEdit = (live, edited, teamKey, roles = []) => {
  const teamRoles = new Set(rolesOfTeam(roles, teamKey).map((role) => role.id))
  const assignments = { ...(live.assignments || {}) }
  teamRoles.forEach((roleId) => {
    const people = edited.assignments?.[roleId] || []
    if (people.length) assignments[roleId] = [...people]
    else delete assignments[roleId]
  })
  const merged = { ...live, date: live.date || edited.date, assignments }
  ;(TEAM_FIELDS[teamKey] || []).forEach((field) => {
    if (edited[field] !== undefined) merged[field] = edited[field]
  })
  return merged
}
