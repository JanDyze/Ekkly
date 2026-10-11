// Finds the thing in a photograph, off the main thread, so the Inventory app
// can cut an item out of its background on the phone that took the picture
// (removeBackground.js is the page's side of this).
//
// The model is U²-Netp, the small U²-Net, chosen for its licence and its size
// together:
//
//   - Apache License 2.0 (github.com/xuebinqin/U-2-Net), which allows a paid
//     product like Ekkly to use it. The well-known background removers that do
//     a little better on hair and fur — BRIA's RMBG-1.4 and RMBG-2.0 — are
//     licensed for non-commercial use only, and the ISNet build most
//     transformers.js demos use is AGPL. BiRefNet-lite (MIT) is the best of
//     the permissive ones, but it is 115 MB even at half precision and wants
//     WebGPU to finish in reasonable time; a church admin photographing chairs
//     on a prepaid phone plan should not have to fetch a model that size.
//   - 4.6 MB, about a second on a mid-range phone, and good at what an
//     inventory photo is: one object, in the middle, on a floor or a table.
//
// It is served from the app itself (public/models/u2netp, with its licence
// and where it came from), not fetched from Hugging Face, so it keeps working
// if that site moves the file and nobody's photos are tied to a third party.
// The browser keeps it once fetched (transformers.js's own cache, and the
// service worker's), so it is downloaded once per device. Nothing is loaded
// until somebody actually takes a photo of an item.
//
// transformers.js has no class of its own for U²-Net, so it opens the file as
// a plain model and this worker does the rest by hand: the input is packed and
// the answer cleaned in cutoutMask.js, which is pure and tested on its own.
import { AutoModel, Tensor, env } from '@huggingface/transformers'
import { MODEL_SIZE, cleanMask } from './cutoutMask'

env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = '/models/'

const MODEL = 'u2netp'

let model = null
let loading = null

// On the processor (WebAssembly), which every browser that can run Ekkly has.
// Not on the graphics chip (WebGPU), though it would be quicker: its runtime
// cannot yet run U²-Net's pooling layers ("ceil() in shape computation is not
// yet supported for MaxPool"), which was tried and fails on every photo.
const load = () => {
  if (model) return Promise.resolve(model)
  if (!loading) {
    loading = AutoModel.from_pretrained(MODEL, {
      dtype: 'fp32',
      device: 'wasm',
      // How far the download has got, so the page can say so.
      progress_callback: (p) => {
        if (p?.status === 'progress' && p.total) {
          self.postMessage({ type: 'progress', loaded: p.loaded, total: p.total, file: p.file })
        }
      },
    }).then((made) => {
      model = made
      self.postMessage({ type: 'ready', device: 'wasm' })
      return made
    })
  }
  return loading
}

const cutOut = async (input) => {
  const run = await load()
  const session = run.sessions.model
  const out = await run({
    [session.inputNames[0]]: new Tensor('float32', new Float32Array(input), [1, 3, MODEL_SIZE, MODEL_SIZE]),
  })
  // The first output is the model's finished answer; the rest are the
  // rougher guesses it made on the way, used only while it was trained.
  return cleanMask(out[session.outputNames[0]].data)
}

self.onmessage = async ({ data }) => {
  const { id, input } = data || {}
  try {
    if (!input) {
      await load()
      self.postMessage({ type: 'result', id, alpha: null, coverage: 0 })
      return
    }
    const answer = await cutOut(input)
    const { alpha, coverage } = answer
    self.postMessage({ type: 'result', id, alpha: alpha.buffer, coverage }, [alpha.buffer])
  } catch (error) {
    loading = null
    self.postMessage({ type: 'error', id, message: String(error?.message || error) })
  }
}
