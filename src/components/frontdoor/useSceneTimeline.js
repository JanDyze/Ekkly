import { onUnmounted } from 'vue'

// The clock a hero scene plays to. A scene lists what happens when
// (`at(900, () => …)`), and this runs it and cancels whatever is still waiting
// when the scene leaves, so a scene that is skipped part way never changes a
// screen that is gone.
//
// Someone who has asked their device for less motion gets every step at once,
// in order, so they see the finished screen rather than an empty one.

export const prefersStill = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export function useSceneTimeline() {
  const still = prefersStill()
  const timers = new Set()

  const at = (ms, fn) => {
    if (still) {
      fn()
      return
    }
    const timer = setTimeout(() => {
      timers.delete(timer)
      fn()
    }, ms)
    timers.add(timer)
  }

  // Types `text` into a ref one letter at a time, starting at `ms`. Returns the
  // moment it finishes, so the next step can follow on from it.
  const type = (target, text, ms, speed = 45) => {
    if (still) {
      target.value = text
      return ms
    }
    for (let i = 1; i <= text.length; i++) at(ms + i * speed, () => (target.value = text.slice(0, i)))
    return ms + text.length * speed
  }

  // Deletes `text`, which the ref will hold by `ms`, one letter at a time from
  // the end. The text is passed in because every step is scheduled up front,
  // before the typing that puts it there has happened.
  const erase = (target, text, ms, speed = 25) => {
    if (still) {
      target.value = ''
      return ms
    }
    for (let i = 1; i <= text.length; i++) at(ms + i * speed, () => (target.value = text.slice(0, -i)))
    return ms + text.length * speed
  }

  onUnmounted(() => {
    timers.forEach(clearTimeout)
    timers.clear()
  })

  return { at, type, erase, still }
}
