import { nextTick } from 'vue'

// Opening a record from its list, animated as one screen giving way to
// another: on a phone the record slides in over the list, the way a native app
// pushes a page, and the person's photo travels from their row to the top of
// their profile, so the eye is carried to who was opened.
//
// Done with the browser's View Transitions rather than a <Transition> round
// the router view, because the two screens do not share a frame: the record
// is a focus route, which takes the top bar and the bottom bar away with it.
// A transition inside the page would animate the content while the chrome
// jumped. The browser snapshots the whole screen either side instead.
//
// Only on the way in. A snapshot of the way back has to lay out and paint the
// whole list - every row and photo, on screen or not - before the animation
// may start, and on a long roll that was a visible freeze on the profile after
// pressing back. The list plays its own short entrance instead, on a screen
// that is already live (the page-return rule in style.css, set off by
// Members.vue when it is shown again).
//
// Where the browser has no View Transitions (Safari before 18), or the reader
// has asked for less motion, the navigation is simply instant, as before.

/** Pairs of routes that animate when going from the list to the record. */
const PAIRS = [{ list: 'Members', record: 'MemberDetails' }]

// The one element per screen that morphs between them. Each screen carries
// the name on at most one element at a time, or the browser skips the whole
// transition.
const SHARED = 'member-avatar'

const opensRecord = (to, from) =>
  PAIRS.some(({ list, record }) => from.name === list && to.name === record)

const wantsMotion = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** The row's photo for a record, only if it is on screen to fly from. */
const rowAvatar = (id) => {
  if (!id) return null
  const el = document.querySelector(`[data-member-avatar="${CSS.escape(String(id))}"]`)
  if (!el) return null
  const box = el.getBoundingClientRect()
  const onScreen = box.bottom > 0 && box.top < window.innerHeight && box.width > 0
  return onScreen ? el : null
}

export function installViewTransitions(router) {
  // Resolved once the new route's screen is in the DOM, which is when the
  // browser may take its "after" snapshot.
  let rendered = null

  router.beforeResolve((to, from) => {
    if (!opensRecord(to, from) || !wantsMotion()) return

    document.documentElement.dataset.nav = 'forward'

    // The photo leaves from the list row. The profile's own photo carries the
    // name permanently (MemberDetails.vue).
    const named = rowAvatar(to.params.id)
    if (named) named.style.viewTransitionName = SHARED

    let markRendered
    rendered = new Promise((resolve) => {
      markRendered = resolve
    })
    rendered.resolve = markRendered

    return new Promise((allowNavigation) => {
      const transition = document.startViewTransition(async () => {
        // Let the router carry on, then wait for the new screen to be drawn.
        allowNavigation()
        await rendered
        await nextTick()
      })

      transition.finished.finally(() => {
        if (named) named.style.viewTransitionName = ''
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
