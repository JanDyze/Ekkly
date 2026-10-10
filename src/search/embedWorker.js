// Turns text into vectors of its meaning, off the main thread, for search by
// meaning (useGlobalSearch). Runs a small sentence model on the device itself
// (all-MiniLM-L6-v2, about 23 MB once quantised), so nothing anyone searches
// for leaves their phone.
//
// The model is fetched from Hugging Face the first time and kept by the
// browser after that, so it is downloaded once and then works offline. The
// page asks before that first download; this worker only starts when it may.
import { env, pipeline } from '@huggingface/transformers'

env.allowLocalModels = false

const MODEL = 'Xenova/all-MiniLM-L6-v2'

let extractor = null
let loading = null

const load = () => {
  if (extractor) return Promise.resolve(extractor)
  if (!loading) {
    loading = pipeline('feature-extraction', MODEL, {
      dtype: 'q8',
      // How far the download has got, so the page can say so.
      progress_callback: (p) => {
        if (p?.status === 'progress' && p.total) {
          self.postMessage({ type: 'progress', loaded: p.loaded, total: p.total, file: p.file })
        }
      },
    }).then((made) => {
      extractor = made
      self.postMessage({ type: 'ready' })
      return made
    })
  }
  return loading
}

self.onmessage = async ({ data }) => {
  const { id, texts } = data || {}
  try {
    const run = await load()
    if (!texts?.length) {
      self.postMessage({ type: 'result', id, vectors: [] })
      return
    }
    // Mean-pooled and normalised, so the likeness of two texts is just the
    // dot product of their vectors.
    const out = await run(texts, { pooling: 'mean', normalize: true })
    self.postMessage({ type: 'result', id, vectors: out.tolist() })
  } catch (error) {
    loading = null
    self.postMessage({ type: 'error', id, message: String(error?.message || error) })
  }
}
