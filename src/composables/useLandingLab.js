import { reactive, watch } from 'vue'
import { MOCK, blankSection } from '../data/landingLabMock'

// The prototype's shared model, for /landing-lab and /landing-lab/preview.
//
// PROTOTYPE — see src/data/landingLabMock.js. Nothing here touches Firestore,
// and no church's real settings can be reached from it.
//
// Module-level, because the builder and the preview are two pages now rather
// than two halves of one screen, and the work has to survive walking between
// them. Mirrored into sessionStorage as well, so a reload of either page does
// not throw the arrangement away mid-review — which is the whole point of the
// thing being here.

const KEY = 'landing-lab.model'

const restored = () => {
  try {
    const saved = sessionStorage.getItem(KEY)
    if (saved) return JSON.parse(saved)
  } catch {
    // Private window, or a shape from an older version of this file. The mock
    // is a fine place to start either way.
  }
  return null
}

export const model = reactive(restored() || MOCK())

watch(
  model,
  (now) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(now))
    } catch {
      // Out of quota or blocked. The model still works for this page's life.
    }
  },
  { deep: true }
)

/** Back to the mock, for when an experiment has gone somewhere silly. */
export const resetModel = () => {
  Object.assign(model, MOCK())
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}

export const moveSection = (index, by) => {
  const to = index + by
  if (to < 0 || to >= model.sections.length) return
  const [section] = model.sections.splice(index, 1)
  model.sections.splice(to, 0, section)
}

export const removeSection = (index) => {
  model.sections.splice(index, 1)
}

/** Adds one and hands back its id, so the caller can open it. */
export const addSection = (type) => {
  const section = blankSection(type)
  model.sections.push(section)
  return section.id
}
