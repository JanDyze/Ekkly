import { nextTick } from 'vue'
import { motionLevel } from '../composables/useMotion'

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

// The person's own say comes first (Preferences > Transitions, useMotion):
// off is no animation at all; simple keeps the slides but nothing flies.
const wantsMotion = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
  motionLevel() !== 'off'

const wantsFlight = () => motionLevel() === 'full'

/* ------------------------------------------------------------ the morphs */

// The way into a screen and the screen itself name the same thing twice: an
// app's tile on the home has its picture and its name, and the app, opened,
// has the same picture and name in the top bar; a section's tile has its name,
// and the section's header says it again. So on the way in the tapped tile's
// picture and name travel up into the header, and on the way back they travel
// down into the tile, and the eye follows what it tapped instead of losing it
// in a slide.
//
// Anything can take part by saying what it stands for: `data-morph-icon` or
// `data-morph-label`, set to the path it opens or the path it heads. The tile
// for /schedules/sundays and the header of /schedules/sundays carry the same
// path, and that is the whole pairing — no list of routes to keep in step.

// While a morph is under way <html> carries data-morph, for anything on
// screen that would otherwise play its own animation in the middle of it
// (the top bar's picture, which pops as it changes). An attribute for CSS to
// read rather than state for a component to react to: changing a component's
// transition mid-render is what once broke the top bar.
export const MORPH_PARTS = ['icon', 'label']

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

/**
 * What travels on this navigation. Going in, the screen being left has a tile
 * for where you are going; coming back, it has the header of where you were.
 * Either way the path is one of the two ends, the deeper one, and the tile is
 * tried first so that a section's tile wins over the bar naming its app.
 */
const findMorph = (to, from) => {
  for (const key of [to.path, from.path]) {
    const parts = MORPH_PARTS.map((part) => ({ part, el: morphable(part, key) })).filter((each) => each.el)
    if (parts.length) return { key, parts }
  }
  return null
}

const nameOf = (part) => `morph-${part}`

/**
 * Hands each part's name from the screen that left to the one that arrived.
 * Each name may sit on one element at a time, and the top bar is on both
 * screens, so the old ones are cleared before the new ones are set. What it
 * flew from is never where it lands: on the way back to the home, the bar's
 * old picture may still be on its way out when the tile is looked for.
 */
const landMorph = (morph) => {
  const left = morph.parts.map(({ el }) => el)
  left.forEach((el) => {
    el.style.viewTransitionName = ''
  })
  morph.landed = morph.parts
    .map(({ part }) => ({ part, el: morphable(part, morph.key, left) }))
    .filter((each) => each.el)
  morph.landed.forEach(({ part, el }) => {
    el.style.viewTransitionName = nameOf(part)
    // A tile landed on is already where it belongs. Its own entrance would
    // start it lower and fainter, so the picture would arrive and then the
    // tile would drift up under it.
    el.closest('.animate-rise')?.style.setProperty('animation', 'none')
  })
}

/* ------------------------------------------------- the card becoming the page */

// More than the picture and the name: the card that was tapped turns over as
// it grows from where it sits until it is the page area, so it looks to
// become the page rather than make way for it, and on the way back the page
// shrinks into its card, turning back (style.css draws how). The picture and
// the name still fly on their own (the morphs above), so what can be kept on
// screen is kept; the page's contents then rise in once it has arrived.
//
// A card says which page it opens with `data-morph-card` (HomeCard); the page
// is the area pages appear in, `data-morph-page` (AdminLayout's <main>). One
// name, handed from one to the other the way the morphs' are.
const CARD = 'morph-card'
const pageArea = () => document.querySelector('[data-morph-page]')

/**
 * Going in, the card for where you are going, if it is on screen. Coming back
 * up — to a shallower screen of the same app, or out of an app — the page
 * being left, to shrink into the card for it on the screen arriving.
 */
const findFlip = (to, from) => {
  const card = morphable('card', to.path)
  if (card) return { into: true, from: card, key: to.path }
  const up = appOf(from) && (!appOf(to) || depthOf(to) < depthOf(from))
  const page = up ? pageArea() : null
  return page ? { into: false, from: page, key: from.path } : null
}

/** Hands the card's name to its twin on the screen that arrived. */
const landFlip = (flip) => {
  flip.from.style.viewTransitionName = ''
  const at = flip.into ? pageArea() : morphable('card', flip.key, [flip.from])
  if (!at) return
  at.style.viewTransitionName = CARD
  // As with a tile a morph lands on: already where it belongs.
  at.closest('.animate-rise')?.style.setProperty('animation', 'none')
  flip.landed = at
}

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

    const tagged = wantsFlight() ? pair.tag?.(to) : null
    const named = tagged?.el || null
    if (named) named.style.viewTransitionName = tagged.name

    // A record's photo has its own flight; the two are never both wanted.
    // Nothing flies at all for someone who asked for simple motion.
    const morph = named || !wantsFlight() ? null : findMorph(to, from)
    morph?.parts.forEach(({ part, el }) => {
      el.style.viewTransitionName = nameOf(part)
    })
    if (morph) document.documentElement.dataset.morph = ''

    // And the card it came from, growing into the page (or the page back into
    // it). While it does, the rest of the screen only fades under it
    // (data-nav card, style.css): one thing moving, not a slide behind it.
    const flip = named || !wantsFlight() ? null : findFlip(to, from)
    if (flip) {
      flip.from.style.viewTransitionName = CARD
      document.documentElement.dataset.nav = 'card'
    }

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
        if (morph) landMorph(morph)
        if (flip) landFlip(flip)
        // Opening a page out of a card, the page is pictured as its shell —
        // its ground and its header — so its contents can rise in once it is
        // live (page-arrive, below). The browser shows still pictures until
        // the transition ends, so an entrance played any sooner would be
        // over before anyone saw it.
        if (flip?.into && flip.landed) flip.landed.classList.add('page-entering')
      })

      transition.finished.finally(() => {
        if (named) named.style.viewTransitionName = ''
        morph?.parts.forEach(({ el }) => {
          el.style.viewTransitionName = ''
        })
        morph?.landed?.forEach(({ el }) => {
          el.style.viewTransitionName = ''
        })
        if (flip) flip.from.style.viewTransitionName = ''
        if (flip?.landed) flip.landed.style.viewTransitionName = ''
        // The card has become the page: now its contents come in, one after
        // another (style.css, page-arrive).
        if (flip?.into && flip.landed) {
          const page = flip.landed
          page.classList.remove('page-entering')
          page.classList.add('page-arrive')
          setTimeout(() => page.classList.remove('page-arrive'), 900)
        }
        delete document.documentElement.dataset.morph
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
