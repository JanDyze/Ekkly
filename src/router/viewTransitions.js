import { nextTick } from 'vue'
import { motionLevel } from '../composables/useMotion'

// The one animation between pages: a card turning over as it grows into the
// page it opens, and the page turning back into its card on the way out.
//
// Everything else between pages was taken out — the slide between an app's
// screens, the settling of any other page, a record pushing in over its list
// with the photo flying, the list sliding back, the public page's window
// growing into its preview, and the contents of a page rising in after the
// card. They each moved differently, so going from one screen to the next
// felt different depending on where you were; now a page simply appears,
// unless a card on screen is what opened it.
//
// Done with the browser's View Transitions, because the two screens do not
// share a frame: the browser snapshots the whole screen either side. Where
// the browser has no View Transitions (Safari before 18), or the reader has
// asked for less motion, the navigation is instant.

// The person's own say comes first (Preferences > Transitions, useMotion).
const wantsMotion = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  motionLevel() === 'full'

/**
 * The app frame a route sits in (meta.frame: 'app'), by the path its routes
 * hang off — not by meta.app, which is the plan a church buys and is shared:
 * Schedules and Presentation are one purchase and two apps.
 */
const appOf = (route) => route.matched.find((record) => record.meta.frame === 'app')?.path || null

/* ------------------------------------------------------- finding the card */

const onScreen = (el) => {
  const box = el.getBoundingClientRect()
  return box.width > 0 && box.bottom > 0 && box.top < window.innerHeight && box.right > 0 && box.left < window.innerWidth
}

/**
 * The one element on screen showing this part of this path, if any, other
 * than those in `skip`.
 */
const morphable = (part, key, skip = []) =>
  [...document.querySelectorAll(`[data-morph-${part}="${CSS.escape(key)}"]`)].find(
    (el) => !skip.includes(el) && onScreen(el)
  ) || null

/* ------------------------------------------------- the card becoming the page */

// The card that was tapped turns over as it grows from where it sits until it
// is the page area, so it looks to become the page rather than make way for
// it, and on the way back the page shrinks into its card, turning back
// (style.css draws how).
//
// A card says which page it opens with `data-morph-card` (HomeCard); the page
// is the area pages appear in, `data-morph-page` (AdminLayout's <main>). One
// name, handed from one to the other.
const CARD = 'morph-card'
const pageArea = () => document.querySelector('[data-morph-page]')

/**
 * Going in, the card for where you are going, if it is on screen. Coming back
 * out of an app, the page being left, to shrink into the card for it on the
 * screen arriving.
 *
 * Never between the screens of one app. They stand on the same ground, so a
 * page turning over to become another page that looks just like it is motion
 * that says nothing.
 */
const findFlip = (to, from) => {
  if (!from.matched.length || to.path === from.path) return null
  if (to.meta?.projector || from.meta?.projector) return null
  if (appOf(to) && appOf(to) === appOf(from)) return null
  const card = morphable('card', to.path)
  if (card) return { into: true, from: card, key: to.path }
  const page = appOf(from) && !appOf(to) ? pageArea() : null
  return page ? { into: false, from: page, key: from.path } : null
}

/** Hands the card's name to its twin on the screen that arrived. */
const landFlip = (flip) => {
  flip.from.style.viewTransitionName = ''
  const at = flip.into ? pageArea() : morphable('card', flip.key, [flip.from])
  if (!at) return
  at.style.viewTransitionName = CARD
  flip.landed = at
}

export function installViewTransitions(router) {
  // Resolved once the new route's screen is in the DOM, which is when the
  // browser may take its "after" snapshot.
  let rendered = null

  router.beforeResolve((to, from) => {
    if (!wantsMotion()) return
    const flip = findFlip(to, from)
    if (!flip) return

    // While the card turns, the rest of the screen only fades under it
    // (data-nav card, style.css): one thing moving.
    flip.from.style.viewTransitionName = CARD
    document.documentElement.dataset.nav = 'card'

    let markRendered
    rendered = new Promise((resolve) => {
      markRendered = resolve
    })
    rendered.resolve = markRendered

    return new Promise((allowNavigation) => {
      const transition = document.startViewTransition(async () => {
        // Let the router carry on, then wait for the new screen to be drawn:
        // once for it to mount, and once more for what it measures on
        // mounting to be drawn.
        allowNavigation()
        await rendered
        await nextTick()
        await nextTick()
        landFlip(flip)
      })

      transition.finished.finally(() => {
        flip.from.style.viewTransitionName = ''
        if (flip.landed) flip.landed.style.viewTransitionName = ''
        delete document.documentElement.dataset.nav
      })
    })
  })

  router.afterEach(() => {
    rendered?.resolve?.()
    rendered = null
  })

  // A navigation that is cancelled or fails still has to let the snapshot go,
  // or the screen would hang frozen until the browser gave up on it.
  router.onError(() => {
    rendered?.resolve?.()
    rendered = null
  })
}
