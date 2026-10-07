// Fetching a page's code before it is opened.
//
// Loading a route's code is the slow part of moving to it, and a tap is a
// good hundred milliseconds from press to release, so a tile starts the fetch
// as the finger comes down and the router's own load then finds it already
// there. The bottom bar did this for its tabs; the home of all apps and each
// app's tiles do it now (AppShortcut).

const prefetched = new Set()

export function prefetchRoute(router, to) {
  const key = typeof to === 'string' ? to : JSON.stringify(to)
  if (!to || prefetched.has(key)) return
  prefetched.add(key)
  let matched = []
  try {
    matched = router.resolve(to).matched
  } catch {
    return
  }
  matched.forEach((record) => {
    const load = record.components?.default
    // A route not yet visited holds a loader function; a visited one holds
    // the component itself, and there is nothing to fetch.
    if (typeof load !== 'function') return
    Promise.resolve(load()).catch(() => prefetched.delete(key))
  })
}
