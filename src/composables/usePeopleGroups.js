import { computed } from 'vue'
import { usePeopleOverview } from './usePeopleOverview'
import { useSmallGroups } from './useSmallGroups'
import { usePermissions } from './usePermissions'
import { findRosterMember } from '../utils/lineupUtils'
import { bandOf } from '../utils/ageBands'
import { getFullName } from '../utils/memberUtils'

/**
 * Who belongs to which small group, from People's side: each group with its
 * leader and people as records on the roll, and the members in none.
 *
 * Asked the way ministries are (usePeopleOverview's unplacedToAsk): "in none"
 * counts members past the Kids band only. Visitors and children are not
 * expected to be in a group, and counting them made a number that never went
 * down. A group's leader belongs to it, whether or not they are also listed
 * among its members.
 *
 * Only for someone who may see small groups (and whose church has the app
 * on): for anyone else there are no groups and nobody is "in none".
 */
export function usePeopleGroups() {
  const { members, loading: peopleLoading } = usePeopleOverview()
  const { groups: rawGroups, loading: groupsLoading } = useSmallGroups()
  const { can } = usePermissions()

  const canSee = computed(() => can('smallgroups.view'))
  const loading = computed(() => peopleLoading.value || groupsLoading.value)

  const keyOf = (member) => String(member.firestoreId || member.id)

  const groups = computed(() => {
    if (!canSee.value) return []
    return rawGroups.value
      .map((group) => {
        const leader = group.leaderId ? findRosterMember(members.value, group.leaderId) : null
        const listed = (group.memberIds || []).map((id) => findRosterMember(members.value, id)).filter(Boolean)
        // The leader first, then everyone else once.
        const seen = new Set()
        const people = [leader, ...listed].filter((m) => m && !seen.has(keyOf(m)) && seen.add(keyOf(m)))
        return { id: group.firestoreId || group.id, name: group.name || 'Small group', leader, people }
      })
      .sort((a, b) => b.people.length - a.people.length || a.name.localeCompare(b.name))
  })

  const inAGroup = computed(() => new Set(groups.value.flatMap((g) => g.people.map(keyOf))))

  /** Members past the Kids band who are in no small group. */
  const ungrouped = computed(() => {
    if (!canSee.value) return []
    return members.value.filter(
      (m) => m.isMember !== false && bandOf(m)?.key !== 'kids' && !inAGroup.value.has(keyOf(m))
    ).sort((a, b) => getFullName(a).localeCompare(getFullName(b)))
  })

  /** Members past the Kids band at all: what "how many are in a group" is out of. */
  const eligible = computed(() => members.value.filter((m) => m.isMember !== false && bandOf(m)?.key !== 'kids'))

  return { canSee, loading, groups, ungrouped, eligible }
}
