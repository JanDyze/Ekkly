import { watch } from 'vue'
import { getPlatformTheme, usePlatformConfig } from './usePlatformConfig'
import { getChurchTheme, useAppSettings } from './useAppSettings'
import { getChurchId } from '../api/church'
import { resolveTheme } from '../../lib/platformDefaults.js'

/** The colours in use right now, read once — for a spreadsheet being built. */
export const currentTheme = () => resolveTheme(getPlatformTheme(), getChurchTheme())

/**
 * The light accent as a spreadsheet colour, `{ rgb: '1D64D8' }`. The exporters
 * read it through getters on their style objects, so a workbook carries the
 * church's colour at the moment it is exported, not the one the app loaded with.
 */
export const accentCell = () => ({ rgb: currentTheme().primary.slice(1).toUpperCase() })

// The app's accent colour, chosen at run time.
//
// Every `bg-primary`, `text-primary` and `ring-primary/30` in the app reads a
// CSS variable (Tailwind v4 emits utilities against var(--color-primary)), and
// style.css sets those variables on :root and .dark. Overriding the same
// variables from a style element of our own re-colours the whole app in one
// place, dark mode included, with no class changed anywhere.
//
// Whose colours: the church's own if it chose some, then the platform's, then
// the ones the app was built in (lib/platformDefaults.js resolveTheme).
//
// `html:root` and `html.dark` are one step more specific than style.css's
// `:root` and `.dark`, so these win whatever order the stylesheets load in.

const STYLE_ID = 'brand-theme'

// The colours are also remembered, per address, so the next visit starts in
// them. Both sources arrive late — the platform's from a live document, the
// church's only once the account is known to belong to the church — and
// without this every load opened in the built-in blue and then changed colour
// a second later, loading screen and all. index.html reads this back in a
// small script before anything is drawn; keep the key's shape the same there.
//
// The key is the host, plus the church a test address was switched to (see
// devChurchOverride), so localhost's front door and localhost's church do not
// share colours.
const REMEMBER_PREFIX = 'ekkly.brandTheme:'

const rememberKey = () => {
  let church = ''
  try {
    church = sessionStorage.getItem('dev.church') ?? ''
  } catch {
    // A private window: the host alone.
  }
  return `${REMEMBER_PREFIX}${window.location.host}|${church}`
}

const remember = (theme) => {
  try {
    localStorage.setItem(rememberKey(), JSON.stringify({ css: themeCss(theme), primary: theme.primary }))
  } catch {
    // Nowhere to keep it; the next visit loads the colours the slow way.
  }
}

export const themeCss = ({ primary, primaryDark }) => `
html:root {
  --color-primary: ${primary};
  --color-primary-hover: color-mix(in oklab, ${primary} 78%, black);
  --color-primary-light: ${primaryDark};
  --scrollbar-thumb: color-mix(in srgb, ${primary} 35%, transparent);
  --scrollbar-thumb-hover: color-mix(in srgb, ${primary} 65%, transparent);
}
html.dark {
  --color-primary: ${primaryDark};
  --color-primary-hover: color-mix(in oklab, ${primaryDark} 82%, white);
  --scrollbar-thumb: color-mix(in srgb, ${primaryDark} 30%, transparent);
  --scrollbar-thumb-hover: color-mix(in srgb, ${primaryDark} 60%, transparent);
}
html body { color: ${primary}; }
html.dark body { color: ${primaryDark}; }
`

const apply = (theme) => {
  if (typeof document === 'undefined') return
  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.appendChild(style)
  }
  style.textContent = themeCss(theme)

  // The phone's status bar and the installed app's title bar.
  const meta = document.querySelector("meta[name='theme-color']")
  if (meta) meta.setAttribute('content', theme.primary)
}

/**
 * Called once, from App.vue. Follows both sources live.
 *
 * Until every source that can still change the answer has spoken, a
 * remembered theme is left alone: the platform's colour arriving before the
 * church's would otherwise paint over the church's remembered colour, which is
 * the flash this exists to prevent. With nothing remembered, the best answer
 * so far is shown, and only a settled answer is remembered.
 */
export function useBrandTheme() {
  const { platformTheme, loaded: platformLoaded } = usePlatformConfig()
  const { theme: churchTheme, isConfigured: churchLoaded } = useAppSettings()
  const startedRemembered = typeof document !== 'undefined' && document.getElementById(STYLE_ID)?.dataset.remembered === 'true'

  watch(
    [platformTheme, churchTheme, platformLoaded, churchLoaded],
    ([platform, church, platformReady, churchReady]) => {
      const theme = resolveTheme(platform, church)
      const settled = platformReady && (!getChurchId() || churchReady)
      if (!settled) {
        if (!startedRemembered) apply(theme)
        return
      }
      apply(theme)
      remember(theme)
    },
    { immediate: true, deep: true }
  )
}
