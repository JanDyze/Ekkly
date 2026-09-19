import { auth } from './firebase'
import { churchHeaders } from './church'

// The browser's side of /api/mcp-token: this account's Claude connector link.
// A link belongs to the account that made it, so making one never touches
// anybody else's. The token is only ever shown once, in the response that
// issues it — the server keeps nothing it could show again.

const call = async (method, { body, query } = {}) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in required')

  const response = await fetch(`/api/mcp-token${query || ''}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...churchHeaders(),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (HTTP ${response.status})`)
  return payload
}

/** `{ isAdmin, mine, links }` — `links` is every link in the church, for administrators. */
export const getConnectorStatus = () => call('GET')

/** `{ token, url }` — replaces this account's link, if it had one. */
export const issueConnectorToken = (allowWrites) =>
  call('POST', { body: { allowWrites: Boolean(allowWrites) } })

/** This account's own link. */
export const revokeConnectorToken = () => call('DELETE')

/** Somebody else's link, by id. Administrators only. */
export const revokeConnectorLink = (id) =>
  call('DELETE', { query: `?id=${encodeURIComponent(id)}` })
