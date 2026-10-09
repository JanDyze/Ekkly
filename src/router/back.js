// Where a back arrow goes: to the page you were on before, wherever that was.
// Videos opened from the Events home goes back to Events, not to the home of
// all apps or to Videos' own home. Only when there is nothing earlier in this
// visit — a link opened cold, a refresh, the page after signing in — does the
// arrow fall back to the place above the screen.
//
// vue-router keeps the previous path in history.state.back. Going back through
// the history rather than pushing the page again matters: a back arrow that
// pushed would make the phone's own back button step forward.

const SIGN_IN = ['/login', '/register']

/** Whether there is a page of this app's to go back to. */
export const hasPrevious = () => {
  const previous = String(window.history.state?.back || '')
  if (!previous || previous === '/') return false
  return !SIGN_IN.some((path) => previous === path || previous.startsWith(`${path}?`) || previous.startsWith(`${path}/`))
}

/** Back one page if there is one, otherwise to `fallback` in its place. */
export const goBack = (router, fallback) => {
  if (hasPrevious()) router.back()
  else if (fallback) router.replace(fallback)
}
