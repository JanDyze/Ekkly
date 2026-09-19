// Who is allowed to receive a notification.
//
// This is the server-side twin of usePermissions.capabilities: an account's
// rights come from the ministries on its member record, mapped through
// rolePermissions, on top of the baseline every signed-in account holds.
// Administrators bypass the whole thing. Keep the two in step — a rule that
// only exists in the browser would let a push carry something to a device
// whose owner cannot open the page it links to.

import { ALL_CAPABILITIES, BASELINE_CAPABILITIES } from './capabilities.js'

/** Managing an area implies seeing it, so a role only ever ticks manage. */
const withImpliedViews = (granted) => {
  ;[...granted].forEach((cap) => {
    if (cap.endsWith('.manage')) granted.add(cap.replace(/\.manage$/, '.view'))
  })
  return granted
}

/**
 * Reads the three collections access is derived from and returns a resolver.
 * One read of each per notification, which is the price of not blasting
 * prayer concerns at the whole congregation.
 *
 * @param church the church's document reference (lib/tenant.js churchRef) —
 *               roles are a church's own, and so are its administrators
 */
export async function loadAudience(church) {
  const [adminsSnap, rolesSnap, membersSnap] = await Promise.all([
    church.collection('appAdmins').get(),
    church.collection('rolePermissions').get(),
    church.collection('members').select('uid', 'ministries').get(),
  ])

  const admins = new Set(adminsSnap.docs.map((d) => d.id))

  const roleMap = {}
  rolesSnap.docs.forEach((d) => {
    const caps = d.data().capabilities
    roleMap[d.id] = Array.isArray(caps) ? caps : []
  })

  // uid -> ministries. A member record without a uid has no account attached
  // to it yet, so it grants nothing.
  const ministriesByUid = new Map()
  membersSnap.docs.forEach((d) => {
    const { uid, ministries } = d.data()
    if (uid) ministriesByUid.set(uid, Array.isArray(ministries) ? ministries : [])
  })

  const cache = new Map()

  const capabilitiesFor = (uid) => {
    if (cache.has(uid)) return cache.get(uid)
    const granted = new Set(BASELINE_CAPABILITIES)
    ;(ministriesByUid.get(uid) || []).forEach((ministry) => {
      ;(roleMap[ministry] || []).forEach((cap) => granted.add(cap))
    })
    withImpliedViews(granted)
    cache.set(uid, granted)
    return granted
  }

  return {
    isAdmin: (uid) => admins.has(uid),
    capabilitiesFor,
    /** The shape lib/notifications.js canReceive() expects. */
    contextFor: (uid) =>
      uid
        ? { isAdmin: admins.has(uid), capabilities: capabilitiesFor(uid) }
        : // A device that registered before tokens carried an owner. It gets
          // what any signed-in account gets and nothing gated beyond that,
          // rather than being cut off until someone next opens the app.
          { isAdmin: false, capabilities: new Set(BASELINE_CAPABILITIES) },
  }
}

/**
 * The same answer for one account, without reading the whole roll.
 *
 * loadAudience pays three full-collection reads so it can answer for everyone
 * at once, which is right for a notification going out to a congregation and
 * wrong for the MCP connector, where every tool call would pay for the roll
 * again. This asks only about the account in front of it: three documents and,
 * where the person actually holds a ministry, the roles.
 *
 * Returns null when the account is not part of the church any more, which is
 * how a connector link outlives its issuer no longer.
 *
 * @param church the church's document reference (lib/tenant.js churchRef)
 * @returns `{ isAdmin, capabilities }` or null
 */
export async function accessFor(church, uid) {
  if (!uid) return null

  const [adminSnap, accessSnap, memberSnap] = await Promise.all([
    church.collection('appAdmins').doc(uid).get(),
    church.collection('access').doc(uid).get(),
    church.collection('members').where('uid', '==', uid).limit(1).select('ministries').get(),
  ])

  // An administrator need not be on the roll; everybody else needs the access
  // document, which is the same thing requireChurchUser asks for.
  if (!adminSnap.exists && !accessSnap.exists) return null
  if (adminSnap.exists) return { isAdmin: true, capabilities: new Set(ALL_CAPABILITIES) }

  const granted = new Set(BASELINE_CAPABILITIES)
  const ministries = memberSnap.docs[0]?.data()?.ministries
  if (Array.isArray(ministries) && ministries.length) {
    const rolesSnap = await church.collection('rolePermissions').get()
    const roleMap = {}
    rolesSnap.docs.forEach((d) => {
      const caps = d.data().capabilities
      roleMap[d.id] = Array.isArray(caps) ? caps : []
    })
    ministries.forEach((ministry) => (roleMap[ministry] || []).forEach((cap) => granted.add(cap)))
  }

  return { isAdmin: false, capabilities: withImpliedViews(granted) }
}
