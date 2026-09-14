import { auth } from './firebase'
import { churchHeaders } from './church'

// The browser's side of /api/mcp-token: this church's Claude connector token.
// The token is only ever shown once, in the response that issues it — the
// server keeps nothing it could show again.

const call = async (method, body) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in required')

  const response = await fetch('/api/mcp-token', {
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

/** { exists, allowWrites, createdAt, createdByEmail } */
export const getConnectorStatus = () => call('GET')

/** { token, url } — replaces the church's existing token, if it had one. */
export const issueConnectorToken = (allowWrites) => call('POST', { allowWrites: Boolean(allowWrites) })

export const revokeConnectorToken = () => call('DELETE')
