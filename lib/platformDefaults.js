// What the platform looks like and what a new church starts with, before the
// platform's administrators have changed anything — and the rules for cleaning
// what they do change.
//
// Pure, and shared: the browser draws the front door and the colours from the
// same merges the server uses when it saves them, so what the console previews
// is what a church sees.

export const PLATFORM_COLLECTION = 'platform'
export const PLATFORM_PUBLIC_DOC = 'public'
export const PLATFORM_PRIVATE_DOC = 'private'

/* -------------------------------------------------------------- branding */

export const DEFAULT_BRANDING = {
  name: '',
  tagline: 'For churches of every size',
  contactEmail: '',
  frontDoor: {
    headline: 'Your church, in one app',
    intro:
      'Members, events, attendance, schedules, minutes and finances — kept for your congregation alone, at an address of its own.',
  },
  // The chat bubble on the front door. `hostEmail` is whose being signed in
  // somewhere in Ekkly counts as "online now", and where a message left while
  // they are away is emailed. `phone` and `messenger` are optional ways to
  // reach them straight away, shown only when filled in.
  chat: {
    enabled: true,
    hostName: '',
    hostEmail: 'jdmalaluan2@gmail.com',
    phone: '',
    messenger: '',
  },
}

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

// Only a web address, so a link on the front door cannot run script.
const webLink = (value) => {
  const link = text(value, 200)
  return /^https:\/\/[^\s]+$/i.test(link) ? link : ''
}

// Digits, spaces and the usual phone punctuation, nothing a tel: link chokes on.
const phoneNumber = (value) => text(value, 30).replace(/[^\d+\-() ]/g, '')

/** The chat settings with every gap filled. */
export const withChatDefaults = (stored) => ({
  enabled: stored?.enabled !== false,
  hostName: text(stored?.hostName, 40),
  hostEmail: (text(stored?.hostEmail, 120) || DEFAULT_BRANDING.chat.hostEmail).toLowerCase(),
  phone: phoneNumber(stored?.phone),
  messenger: webLink(stored?.messenger),
})

/**
 * The branding with every gap filled. `fallbackName` is the build's
 * VITE_PLATFORM_NAME, so a platform that has never saved a name still has one.
 */
export const withBrandingDefaults = (stored, fallbackName = 'Ekkly') => {
  const frontDoor = stored?.frontDoor || {}
  return {
    name: text(stored?.name, 60) || fallbackName,
    tagline: text(stored?.tagline, 120) || DEFAULT_BRANDING.tagline,
    contactEmail: text(stored?.contactEmail, 120),
    frontDoor: {
      headline: text(frontDoor.headline, 120) || DEFAULT_BRANDING.frontDoor.headline,
      intro: text(frontDoor.intro, 400) || DEFAULT_BRANDING.frontDoor.intro,
    },
    chat: withChatDefaults(stored?.chat),
  }
}

/** What is stored: only what was actually typed, so a blank falls back. */
export const brandingForStorage = (input) => ({
  name: text(input?.name, 60),
  tagline: text(input?.tagline, 120),
  contactEmail: text(input?.contactEmail, 120),
  frontDoor: {
    headline: text(input?.frontDoor?.headline, 120),
    intro: text(input?.frontDoor?.intro, 400),
  },
  chat: {
    enabled: input?.chat?.enabled !== false,
    hostName: text(input?.chat?.hostName, 40),
    hostEmail: text(input?.chat?.hostEmail, 120).toLowerCase(),
    phone: phoneNumber(input?.chat?.phone),
    messenger: webLink(input?.chat?.messenger),
  },
})

/* ---------------------------------------------------------------- colours */

// Ekkly's own colours, and what src/style.css draws before any are chosen: the
// blue of the logo's lower-left pane. `primary` is the accent on a light page
// (5.4:1 under white text), `primaryDark` the accent on a dark one — a lighter
// shade, because the light page's blue sinks into gray-900 (6.5:1 there).
export const DEFAULT_THEME = {
  primary: '#1d64d8',
  primaryDark: '#5b9dff',
}

const HEX = /^#[0-9a-f]{6}$/i

export const isHexColor = (value) => typeof value === 'string' && HEX.test(value.trim())

/** Only valid colours survive; anything else is left out, so it falls back. */
export const themeForStorage = (input) => {
  const out = {}
  if (isHexColor(input?.primary)) out.primary = input.primary.trim().toLowerCase()
  if (isHexColor(input?.primaryDark)) out.primaryDark = input.primaryDark.trim().toLowerCase()
  return out
}

/**
 * The colours a page wears: the church's own where it chose some, then the
 * platform's, then the built-in ones. Each colour falls back on its own, so a
 * church that only changed the light accent keeps the platform's dark one.
 */
export const resolveTheme = (platformTheme, churchTheme) => {
  const platform = themeForStorage(platformTheme)
  const church = themeForStorage(churchTheme)
  return {
    primary: church.primary || platform.primary || DEFAULT_THEME.primary,
    primaryDark: church.primaryDark || platform.primaryDark || DEFAULT_THEME.primaryDark,
  }
}

const channel = (hex, start) => parseInt(hex.slice(start, start + 2), 16) / 255

const luminance = (hex) => {
  const linear = [1, 3, 5].map((start) => {
    const c = channel(hex, start)
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

/** WCAG contrast ratio between two #rrggbb colours, 1 to 21. */
export const contrastRatio = (a, b) => {
  if (!isHexColor(a) || !isHexColor(b)) return 1
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/* --------------------------------------------------------- a new church */

export const DEFAULT_NEW_CHURCH = {
  timezone: 'Asia/Manila',
  // The public page starts off: its default words and service times are a
  // starting point to edit, not something to publish on the first day.
  landingEnabled: false,
  // null: every app. A list narrows a new church to those.
  apps: null,
  ministries: [],
  tags: ['First Timer'],
  trialDays: 30,
}

const nameList = (value, max) =>
  [...new Set((Array.isArray(value) ? value : []).map((v) => text(v, 60)).filter(Boolean))].slice(0, max)

export const withNewChurchDefaults = (stored) => ({
  timezone: text(stored?.timezone, 60) || DEFAULT_NEW_CHURCH.timezone,
  landingEnabled: stored?.landingEnabled === true,
  apps: Array.isArray(stored?.apps) ? stored.apps.filter((k) => typeof k === 'string') : null,
  ministries: Array.isArray(stored?.ministries) ? nameList(stored.ministries, 50) : DEFAULT_NEW_CHURCH.ministries,
  tags: Array.isArray(stored?.tags) ? nameList(stored.tags, 50) : DEFAULT_NEW_CHURCH.tags,
  trialDays: Number.isFinite(Number(stored?.trialDays))
    ? Math.min(365, Math.max(0, Math.trunc(Number(stored.trialDays))))
    : DEFAULT_NEW_CHURCH.trialDays,
})

/* ----------------------------------------------------------- billing */

export const BILLING_STATUSES = [
  { key: 'none', label: 'No plan yet' },
  { key: 'trial', label: 'Trial' },
  { key: 'active', label: 'Paid up' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'free', label: 'Free' },
]

export const isBillingStatus = (key) => BILLING_STATUSES.some((s) => s.key === key)

export const billingStatusLabel = (key) =>
  BILLING_STATUSES.find((s) => s.key === key)?.label || 'No plan yet'

/* ------------------------------------------------------ support requests */

export const SUPPORT_KINDS = [
  { key: 'custom-app', label: 'A new app' },
  { key: 'change', label: 'A change to something' },
  { key: 'bug', label: 'Something is broken' },
  { key: 'feedback', label: 'Feedback' },
]

export const SUPPORT_STATUSES = [
  { key: 'new', label: 'New' },
  { key: 'planned', label: 'Planned' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
  { key: 'declined', label: 'Declined' },
]

export const supportKindLabel = (key) => SUPPORT_KINDS.find((k) => k.key === key)?.label || 'Request'
export const supportStatusLabel = (key) => SUPPORT_STATUSES.find((s) => s.key === key)?.label || 'New'

/** A calendar month key, in a timezone: '2026-09'. Usage counters are kept per month. */
export const monthKey = (date = new Date(), timeZone = 'Asia/Manila') => {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(date)
    const get = (type) => parts.find((p) => p.type === type)?.value
    return `${get('year')}-${get('month')}`
  } catch {
    return date.toISOString().slice(0, 7)
  }
}

/** Today as YYYY-MM-DD in a timezone. */
export const dateKey = (date = new Date(), timeZone = 'Asia/Manila') => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

export const isValidTimezone = (zone) => {
  if (typeof zone !== 'string' || !zone) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    return true
  } catch {
    return false
  }
}
