import { computed, onActivated, onDeactivated, ref, toValue, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAV_ITEMS } from '../data/navigation'
import { usePermissions } from './usePermissions'

// How deep you are: the way from an app down to this screen, which the top
// bar draws as a trail beside its mark ("People › Ministries › Worship"),
// with every step above this one a link up to it. The mark is the way to the
// home of all apps, so the trail starts at the app.
//
// It is read off the routes, so it is the same however you arrived: the home,
// the app, the section the screen belongs to (the one-step screen whose
// drawing it borrows, meta.art, as AppRail and useCrumbs find it), any screen
// between that and this one (an album, above a photo in it), and this screen.
//
// The routes know a section's name (meta.title) but not a record's — a
// person, an album, a Sunday — so a screen says its own once it has loaded
// (nameThisScreen; AppScreen does it for every screen with a header). The
// names are remembered by address for the tab's session, so a screen further
// in can name the record above it after a reload, and cleared on signing out,
// since they are the church's.

// Versioned: names saved before a screen was kept to its own route (below)
// could be wrong (People's home saved as "Everyone"), so they are let go.
const STORE = 'ekkly:trail-names:2'

const load = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORE) || '{}')
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

// Path -> the name its screen gave itself.
const names = ref(load())
// The way a screen gave for itself, where its place is not its section's
// (AppScreen's `trail`, [{ label, to }]): a session is in its group.
const given = ref({ path: '', steps: null })

const save = () => {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(names.value))
  } catch {
    // Private windows and full storage: names last until a reload.
  }
}

export const clearTrail = () => {
  names.value = {}
  save()
}

/** The app a path belongs to, longest match first, as the top bar finds it. */
const appOf = (path) =>
  NAV_ITEMS.filter((item) => path === item.path || path.startsWith(`${item.path}/`)).sort(
    (a, b) => b.path.length - a.path.length
  )[0] || null

/**
 * For a screen: its own name on the trail once it knows it, and the way to
 * it where that is not its section (`steps`, [{ label, to }]). Only while the
 * screen is the one shown: a list kept alive behind a record (AdminLayout's
 * KEPT_ALIVE) would otherwise go on naming whatever is open in front of it.
 */
export function nameThisScreen(source, steps = null) {
  const route = useRoute()
  const onScreen = ref(true)
  // The route this screen is for. Leaving it, the address changes a moment
  // before a kept-alive screen is put away, and it used to name the screen
  // being opened with its own name: People's home called "Everyone".
  // The same route with other values (one record, then another) is still
  // this screen.
  const own = route.matched[route.matched.length - 1]

  watchEffect(() => {
    if (!onScreen.value) return
    if (route.matched[route.matched.length - 1] !== own) return
    const path = route.path
    const label = String(source() || '').trim()
    if (label && names.value[path] !== label) {
      names.value = { ...names.value, [path]: label }
      save()
    }
    const way = toValue(steps)
    given.value = { path, steps: Array.isArray(way) && way.length ? way : null }
  })

  onActivated(() => (onScreen.value = true))
  onDeactivated(() => (onScreen.value = false))
}

/**
 * For the top bar: the steps from the app down to this screen, the last
 * being this screen. Empty on the home of all apps, which is the top.
 */
export function useTrail() {
  const route = useRoute()
  const router = useRouter()
  const { can, isAdmin, hasNoAdmins } = usePermissions()

  // A step above this screen that this person may not open is left off: a
  // member reading their own record (People's ownRecord) sees their name, not
  // "People › Everyone" leading to screens that would only send them home.
  // The same checks as the router's guard.
  const reachable = (to) => {
    const target = router.resolve(to)
    if (target.matched.some((record) => record.meta?.adminOnly) && !isAdmin.value && !hasNoAdmins.value) return false
    const capability = target.matched.reduce((cap, record) => record.meta?.capability || cap, null)
    return !capability || can(capability)
  }

  return computed(() => {
    if (route.meta?.root) return []
    const path = route.path
    // No step for the home of all apps: the bar's mark, just before the
    // trail, is already the way there, and "Home ›" beside it said it twice.
    const steps = []

    const app = appOf(path)
    const appRecord = route.matched.find((record) => record.meta?.frame === 'app')
    if (app && app.path !== path) steps.push({ key: 'app', label: app.name, to: app.path, art: app.art })

    // The section, two steps in or more: the screen whose drawing this one
    // borrows. A screen that said where it belongs instead has its own way.
    const depth = Number(route.meta?.depth) || 0
    const way = given.value.path === path ? given.value.steps : null
    let above = app?.path || ''
    if (way) {
      way.forEach((step, i) => steps.push({ key: `given${i}`, ...step }))
    } else if (appRecord && depth >= 2) {
      const section = (appRecord.children || []).find(
        (child) => child.name && child.meta?.depth === 1 && child.meta?.title && child.meta?.art && child.meta.art === route.meta?.art
      )
      if (section) {
        const to = router.resolve({ name: section.name })
        steps.push({ key: section.name, label: section.meta.title, to: { name: section.name } })
        if (path.startsWith(`${to.path}/`)) above = to.path
      }

      // Any screen between that and this one, by address: /gallery/a1 above
      // /gallery/a1/v/p9. Only a screen of this app, shallower than this one,
      // and with a name to show.
      const parts = path.slice(above.length).split('/').filter(Boolean)
      for (let i = 1; i < parts.length; i++) {
        const at = `${above}/${parts.slice(0, i).join('/')}`
        const resolved = router.resolve(at)
        const record = resolved.matched[resolved.matched.length - 1]
        const d = Number(record?.meta?.depth)
        if (!record || !resolved.matched.includes(appRecord) || !(d >= 1 && d < depth)) continue
        const label = names.value[at] || record.meta?.title
        if (label) steps.push({ key: at, label, to: at })
      }
    }

    steps.push({
      key: 'here',
      label: names.value[path] || route.meta?.title || app?.name || String(route.name || 'Page').replace(/([a-z])([A-Z])/g, '$1 $2'),
      to: route.fullPath,
      here: true,
    })
    return steps.filter((step) => step.here || reachable(step.to))
  })
}
