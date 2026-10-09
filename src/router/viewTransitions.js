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
// The public page builder is the exception, and goes both ways: on a phone its
// small floating window grows into the full preview, and the preview shrinks
// back into the window. Neither screen is a long list, so the way back costs
// nothing to snapshot, and a window that grew out of the corner but did not go
// back into it would leave the eye nowhere to follow.
//
// Any other change of page settles in over the one it replaces (pageMove).
//
// Where the browser has no View Transitions (Safari before 18), or the reader
// has asked for less motion, the navigation is simply instant, as before.

/**
 * The pairs of routes that animate, and how.
 *
 * `nav` is what style.css keys the animation of the whole screen on. `tag`,
 * where there is one, names the element on the screen being left that morphs
 * into its twin on the screen arriving. Each screen carries a name on at most
 * one element at a time, or the browser skips the whole transition.
 *
 * The public page's two screens name their own elements (the floating window
 * in PublicPageBuilder.vue, the open part in PublicPagePreview.vue), because
 * both are there for both directions.
 */
const PAIRS = [
  {
    from: 'Members',
    to: 'MemberDetails',
    nav: 'forward',
    // The photo leaves from the list row. The profile's own photo carries the
    // name permanently (MemberDetails.vue).
    tag: (to) => ({ el: rowAvatar(to.params.id), name: 'member-avatar' }),
  },
  // Back from a record to the roll is still instant, inside the People app as
  // it was before it: an app's own slide back would snapshot the whole roll,
  // which is the freeze described above. The roll plays its own entrance.
  { from: 'MemberDetails', to: 'Members', still: true },
  { from: 'PublicPageBuilder', to: 'PublicPagePreview', nav: 'grow' },
  { from: 'PublicPagePreview', to: 'PublicPageBuilder', nav: 'shrink' },
]

/**
 * The app frame a route sits in (meta.frame: 'app'), by the path its routes
 * hang off — not by meta.app, which is the plan a church buys and is shared:
 * Schedules and Presentation are one purchase and two apps.
 */
const appOf = (route) => route.matched.find((record) => record.meta.frame === 'app')?.path || null

/** How far into its app a route is: 0 for the app's home, 1 for a section… */
const depthOf = (route) => route.matched.reduce((depth, record) => record.meta.depth ?? depth, 0)

/**
 * Moving inside an app, or into or out of one.
 *
 * An app's screens are a stack — its home, a section off it, a Sunday off
 * that — so going deeper slides forward and coming up slides back, the way an
 * app on a phone does. Opening an app from Ekkly is going in, and leaving it
 * is coming out.
 */
const appMove = (to, from) => {
  const into = appOf(to)
  const outOf = appOf(from)
  if (!into && !outOf) return null
  if (into && outOf && into === outOf) {
    const by = depthOf(to) - depthOf(from)
    if (!by) return null
    return { nav: by > 0 ? 'app-forward' : 'app-back' }
  }
  return { nav: into ? 'app-forward' : 'app-back' }
}

/**
 * Every other change of page: the new one settles in over the old, which
 * holds still beneath it, so the screen is never blank or dimmed between the
 * two. Not the first navigation of the session (index.html's boot screen
 * covers that), not a change of query alone (a search or an open tab written
 * into the address), and never the projector's window.
 */
const pageMove = (to, from) => {
  if (!from.matched.length) return null
  if (to.path === from.path) return null
  if (to.meta?.projector || from.meta?.projector) return null
  return { nav: 'page' }
}

const pairFor = (to, from) => {
  const pair = PAIRS.find((each) => from.name === each.from && to.name === each.to)
  if (pair) return pair.still ? null : pair
  return appMove(to, from) || pageMove(to, from)
}

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
    const pair = pairFor(to, from)
    if (!pair || !wantsMotion()) return

    document.documentElement.dataset.nav = pair.nav

    const tagged = pair.tag?.(to)
    const named = tagged?.el || null
    if (named) named.style.viewTransitionName = tagged.name

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
        // Twice: once for the new screen to mount, and once more for what it
        // measures on mounting to be drawn. The builder's floating window only
        // knows where it sits after it has measured itself, and a snapshot
        // taken a tick early would morph into it before it had arrived.
        await nextTick()
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
