// Turns a drawn video into a file, in the browser, by playing it once while a
// MediaRecorder listens to the canvas and the music.
//
// It records in real time, so a one-minute video takes a minute. That is the
// price of needing nothing but the browser: no server renders anything, and
// the app's twelve serverless functions stay twelve. Browsers slow a hidden
// tab's animation to a crawl, so the screen recording it has to stay open.

// MP4 first, because it is what every phone and every site accepts. Recent
// Chrome, Edge and Safari can all write it; older Chrome and Firefox write
// WebM, which Facebook and YouTube take and some phones will not play.
const TYPES = [
  'video/mp4;codecs=avc1.640028,mp4a.40.2',
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
]

export const canRecord = () =>
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder === 'function' &&
  typeof HTMLCanvasElement.prototype.captureStream === 'function'

export const pickType = () => TYPES.find((type) => window.MediaRecorder?.isTypeSupported?.(type)) || ''

export const extensionOf = (type) => (String(type).startsWith('video/mp4') ? 'mp4' : 'webm')

/**
 * Records the video and resolves a Blob.
 *
 * `audioContext` is made by the caller inside the tap that started this —
 * Safari will only let sound play from a context created in a gesture, and by
 * the time music has been prepared the gesture is over.
 */
export const recordVideo = ({ video, music, volume = 0.7, audioContext, onProgress, signal }) =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = video.width
    canvas.height = video.height
    // On the page but out of sight: some browsers will not produce frames
    // from a canvas that is not in the document at all.
    canvas.style.cssText = 'position:fixed;left:-99999px;top:0;width:2px;height:2px;pointer-events:none;'
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    video.draw(ctx, 0)

    const stream = canvas.captureStream(30)
    let source = null
    if (music && audioContext) {
      const destination = audioContext.createMediaStreamDestination()
      const gain = audioContext.createGain()
      gain.gain.value = volume
      source = audioContext.createBufferSource()
      source.buffer = music
      source.connect(gain).connect(destination)
      destination.stream.getAudioTracks().forEach((track) => stream.addTrack(track))
    }

    const type = pickType()
    const recorder = new MediaRecorder(stream, {
      ...(type ? { mimeType: type } : {}),
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 160_000,
    })
    const chunks = []
    let frame = 0
    let finished = false

    const cleanUp = () => {
      cancelAnimationFrame(frame)
      try {
        source?.stop()
      } catch {
        // Already stopped.
      }
      stream.getTracks().forEach((track) => track.stop())
      canvas.remove()
    }

    recorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data)
    }
    recorder.onstop = () => {
      cleanUp()
      if (signal?.aborted) {
        reject(new DOMException('Recording stopped', 'AbortError'))
        return
      }
      resolve(new Blob(chunks, { type: (recorder.mimeType || type || 'video/webm').split(';')[0] }))
    }
    recorder.onerror = (event) => {
      cleanUp()
      reject(event.error || new Error('The recording failed'))
    }

    const stop = () => {
      if (finished) return
      finished = true
      if (recorder.state !== 'inactive') recorder.stop()
    }
    signal?.addEventListener('abort', stop, { once: true })

    // The clock is the audio's when there is music, so picture and sound
    // cannot drift apart however the frames are paced.
    const startedAt = audioContext ? audioContext.currentTime + 0.15 : performance.now() / 1000 + 0.15
    const now = () => (audioContext ? audioContext.currentTime : performance.now() / 1000)

    const tick = () => {
      const t = now() - startedAt
      video.draw(ctx, Math.max(0, t))
      onProgress?.(Math.min(1, Math.max(0, t) / video.duration), Math.max(0, t))
      if (t >= video.duration + 0.1) stop()
      else frame = requestAnimationFrame(tick)
    }

    recorder.start(1000)
    source?.start(startedAt)
    frame = requestAnimationFrame(tick)
  })

/** A file name a church would recognise in its downloads: "October 2026 announcements.mp4". */
export const fileNameFor = (title, type) => `${title} announcements.${extensionOf(type)}`
