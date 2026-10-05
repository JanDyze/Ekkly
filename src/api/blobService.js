import { put } from '@vercel/blob/client'
import { auth } from './firebase'
import { churchHeaders } from './church'

// The browser's side of /api/blob. The store's credentials never leave the
// server, so a photograph goes up through our own route rather than straight
// to Blob, and the caller proves who they are the same way every other
// authenticated endpoint expects.

const authed = async (method, body) => {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Sign in required')

  const response = await fetch('/api/blob', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...churchHeaders() },
    body: JSON.stringify(body),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not reach the image store')
  return payload
}

/**
 * Stores one compressed image and resolves the public URL it now lives at.
 *
 * `folder` is where it lands in the store — "members", or
 * "gallery/<albumId>". `dataUrl` is what compressImageToBase64 already
 * produces, so the upload path did not have to change on the way in. It costs a third more on this one
 * request than posting raw bytes would; what matters is that every *read*
 * afterwards is a plain file on a CDN instead of a Firestore document being
 * decoded by a function.
 */
export const uploadImage = async (dataUrl, folder) => {
  const { url } = await authed('POST', { dataUrl, folder })
  return url
}

/**
 * Stores a song for the announcement videos and resolves its public URL.
 *
 * Not through the route like a photograph: a song is too big for one request
 * to a function. The route hands back a token good for one path in this
 * church's folder, and the file goes from the browser straight to Blob with
 * it. `onProgress` is called with how far it has got, 0 to 100.
 */
export const uploadAudio = async (file, onProgress, { use, date } = {}) => {
  // `use: 'sermon'` with a `date` files a Sunday's recording with its slides,
  // and allows the length a whole message runs to.
  const { token, pathname } = await authed('POST', { action: 'upload-token', kind: 'audio', name: file.name, use, date })
  const blob = await put(pathname, file, {
    access: 'public',
    token,
    contentType: file.type || 'audio/mpeg',
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress?.(Math.round(percentage)),
  })
  return blob.url
}

/**
 * Removes stored images. Takes a list because deleting an album deletes all of
 * its photographs at once, and is safe to call with URLs that are already
 * gone. Anything that is not a stored URL — a legacy base64 photo that has not
 * been migrated — is ignored by the route.
 */
export const deleteImages = async (urls) => {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(
    (url) => typeof url === 'string' && url.startsWith('https://')
  )
  if (!list.length) return 0
  const { deleted } = await authed('DELETE', { urls: list })
  return deleted
}
