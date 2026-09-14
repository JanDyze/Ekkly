// The church this page is serving, decided once, before anything reads data.
//
// Held here rather than in a composable because src/api/firestore.js needs it
// synchronously, every time a reference is built: `collection(db, 'members')`
// becomes churches/{id}/members at that moment. Nothing in this file imports
// Firebase, so the wrapper can import it without a cycle.
//
// The id never changes for the life of the page. Moving to another church is a
// different address, and so a full page load — which is also what guarantees
// no listener, cache or module-level list carries one congregation's records
// into another's.

import { isValidChurchId } from '../../lib/churchId.js'

let resolved = false
let churchId = null
let publicName = ''

/** Called once by resolveChurch() in churchService.js. */
export const setChurchId = (id) => {
  churchId = isValidChurchId(id) ? id : null
  resolved = true
  return churchId
}

/** The church id, or null when this page is the platform's own front door. */
export const getChurchId = () => churchId

export const isChurchResolved = () => resolved

/**
 * The name on the church's public profile. The sign-in and join screens are
 * drawn before the church's settings may be read, and without this they would
 * wear the built-in defaults — another congregation's name.
 */
export const setChurchName = (name) => {
  publicName = String(name || '')
}

export const getChurchName = () => publicName

/** True on church.app / app.church.app, where no church is being served. */
export const isPlatformMode = () => resolved && !churchId

/**
 * Headers for the app's own API routes. The server checks the caller's access
 * to this church itself; the header only says which church is being asked about.
 */
export const churchHeaders = () => (churchId ? { 'X-Church-Id': churchId } : {})

/** `/api/public` -> `/api/public?church=uec`, for the routes that take no headers. */
export const withChurchParam = (url) => {
  if (!churchId) return url
  return `${url}${url.includes('?') ? '&' : '?'}church=${encodeURIComponent(churchId)}`
}
