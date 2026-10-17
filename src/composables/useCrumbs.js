import { computed, toValue } from 'vue'
import { useRoute } from 'vue-router'
import { NAV_ITEMS } from '../data/navigation'

// The way to a screen deep inside an app, for the trail over its title on a
// desktop (AppCrumbs): the app's name, then the section the screen belongs to
// ("People", "Ministries"), each a link. Only two steps in or more — one step
// in, the rail already marks the section — and read off the routes, as the
// rail is (AppRail): the app's name from navigation, the section the one-step
// screen whose drawing this screen borrows (meta.art).
//
// `trail`, [{ label, to }], takes the section's place for a screen whose place
// is not its section's (a session is in its group, not in Sessions).
export function useCrumbs(trail = null) {
  const route = useRoute()
  return computed(() => {
    if (Number(route.meta?.depth) < 2) return []
    const app = route.matched.find((record) => record.meta?.frame === 'app')
    if (!app) return []
    const path = `/${String(app.path).replace(/^\//, '')}`
    const home = app.children?.find((child) => child.meta?.depth === 0)
    const first = {
      key: 'app',
      label: NAV_ITEMS.find((item) => item.path === path)?.name || '',
      to: home?.name ? { name: home.name } : path,
    }
    const given = toValue(trail)
    if (given) return [first, ...given.map((crumb, i) => ({ key: `trail${i}`, ...crumb }))].filter((crumb) => crumb.label)
    const section = (app.children || []).find(
      (child) => child.name && child.meta?.depth === 1 && child.meta?.title && child.meta?.art && child.meta.art === route.meta?.art
    )
    return [first, ...(section ? [{ key: section.name, label: section.meta.title, to: { name: section.name } }] : [])].filter(
      (crumb) => crumb.label
    )
  })
}
