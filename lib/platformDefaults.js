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
      'Members, events, attendance, schedules, minutes and finances — kept for your congregation alone, with a link of its own.',
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
  font: 'system',
}

const HEX = /^#[0-9a-f]{6}$/i

export const isHexColor = (value) => typeof value === 'string' && HEX.test(value.trim())

/* ------------------------------------------------------------------- type */

// The faces a platform or a church can set the whole app in. A short list
// rather than a free text box: every one here is a licensed-to-embed Google
// face that holds up at row-title size on a phone, so no choice can make the
// app unreadable, and nothing arbitrary is ever fetched from the network.
//
// `spec` is the axis part of a Google Fonts css2 request. The weights go up to
// what the app actually sets — `font-black` on the front door, `font-semibold`
// in the app — and italics come along on the variable faces, where they cost
// one more file. `stack` always ends in the system stack, so a face that never
// arrives leaves the app looking as it does today.
export const BRAND_FONTS = [
  {
    key: 'system',
    label: 'System default',
    note: 'Whatever the phone or computer already uses. Nothing to download.',
    stack: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
  },
  {
    key: 'inter',
    label: 'Inter',
    note: 'Plain and very legible. Drawn for screens.',
    family: 'Inter',
    spec: 'ital,wght@0,400..900;1,400..900',
    stack: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  {
    key: 'poppins',
    label: 'Poppins',
    note: 'Round and geometric. Ekkly’s own wordmark is set in it.',
    family: 'Poppins',
    spec: 'wght@400;500;600;700;800',
    stack: "Poppins, system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  {
    key: 'nunito',
    label: 'Nunito',
    note: 'Soft, with rounded ends. Warm rather than corporate.',
    family: 'Nunito',
    spec: 'ital,wght@0,400..900;1,400..900',
    stack: "Nunito, system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  {
    key: 'work-sans',
    label: 'Work Sans',
    note: 'Steady and a little wide. Good in long lists.',
    family: 'Work Sans',
    spec: 'ital,wght@0,400..900;1,400..900',
    stack: "'Work Sans', system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  {
    key: 'jakarta',
    label: 'Plus Jakarta Sans',
    note: 'Modern and slightly narrow. Fits more into a row.',
    family: 'Plus Jakarta Sans',
    spec: 'ital,wght@0,400..800;1,400..800',
    stack: "'Plus Jakarta Sans', system-ui, Avenir, Helvetica, Arial, sans-serif",
  },
  {
    key: 'lora',
    label: 'Lora',
    note: 'A serif, for a church that wants a more traditional page.',
    family: 'Lora',
    spec: 'ital,wght@0,400..700;1,400..700',
    stack: "Lora, Georgia, 'Times New Roman', serif",
  },
]

export const isBrandFont = (key) => BRAND_FONTS.some((f) => f.key === key)

/* ------------------------------------------------------- a face of your own */

// The list above is five faces somebody vetted. It is also, for a church whose
// letterhead has been set in something else for thirty years, five faces that
// are not theirs — so 'custom' takes a Google Fonts family by name.
//
// What is given up is the vetting, and only that: the stack still ends in the
// system fonts, so a name that does not exist leaves the app looking as it does
// today rather than broken. What is not given up is the shape of the request —
// the name is matched against this before it is ever put in a URL, so nothing
// arbitrary reaches fonts.googleapis.com and nothing at all reaches anywhere
// else.
export const CUSTOM_FONT = 'custom'

// Letters, digits, spaces and the few marks real families use. Long enough for
// "Libre Baskerville", short enough not to be a paragraph.
const FAMILY = /^[A-Za-z0-9][A-Za-z0-9 '+\-]{1,39}$/

export const isCustomFamily = (name) => typeof name === 'string' && FAMILY.test(name.trim())

// No axes at all, unlike the vetted five. Google answers a css2 request with
// 400 Bad Request when a family has not got the axis being asked for — no
// italic, or weights that are not a variable range — so asking a name nobody
// has checked for "400..900 with italics" is the one way to reliably break the
// very faces this exists for. A bare family always resolves, and `font-synthesis`
// (switched back on in themeCss) leans and thickens what the file does not carry.
const CUSTOM_SPEC = ''

const customFace = (family) => {
  const name = family.trim()
  return {
    key: CUSTOM_FONT,
    label: name,
    note: 'Your own, from Google Fonts.',
    family: name,
    spec: CUSTOM_SPEC,
    stack: `'${name}', system-ui, Avenir, Helvetica, Arial, sans-serif`,
  }
}

/**
 * A font by key, falling back to the system stack for anything unknown.
 *
 * 'custom' needs the family alongside it, because the key alone does not say
 * which face it means. A custom key with no usable family is not a face at all,
 * so it falls back like any other unknown.
 */
export const brandFont = (key, family) => {
  if (key === CUSTOM_FONT) return isCustomFamily(family) ? customFace(family) : BRAND_FONTS[0]
  return BRAND_FONTS.find((f) => f.key === key) || BRAND_FONTS[0]
}

/**
 * One Google Fonts stylesheet for however many faces are named — one request
 * for the whole picker's preview, one for the face actually in use. Empty when
 * nothing named needs downloading, which is the system default's whole point.
 */
export const fontsUrl = (keys) => {
  const families = [...new Set(keys)]
    // A key, or a face already resolved — which is how a custom family, whose
    // key says nothing on its own, gets into a request.
    .map((key) => (typeof key === 'string' ? brandFont(key) : key))
    .filter((font) => font?.family)
    .map((font) => {
      const name = font.family.replace(/ /g, '+')
      return font.spec ? `family=${name}:${font.spec}` : `family=${name}`
    })
  return families.length ? `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap` : ''
}

/** Only valid colours and a usable face survive; anything else is left out, so it falls back. */
export const themeForStorage = (input) => {
  const out = {}
  if (isHexColor(input?.primary)) out.primary = input.primary.trim().toLowerCase()
  if (isHexColor(input?.primaryDark)) out.primaryDark = input.primaryDark.trim().toLowerCase()
  if (isBrandFont(input?.font)) out.font = input.font
  // A named family is only kept with the key that means "use it", and only in a
  // shape that could be a family name. The two are stored together or not at
  // all: a key with nothing to name is a face nobody can draw.
  else if (input?.font === CUSTOM_FONT && isCustomFamily(input?.fontFamily)) {
    out.font = CUSTOM_FONT
    out.fontFamily = input.fontFamily.trim()
  }
  return out
}

/**
 * The look a page wears: the church's own where it chose some, then the
 * platform's, then the built-in ones. Each part falls back on its own, so a
 * church that only changed the light accent keeps the platform's dark one and
 * the platform's face.
 */
export const resolveTheme = (platformTheme, churchTheme) => {
  const platform = themeForStorage(platformTheme)
  const church = themeForStorage(churchTheme)
  // The face travels as a pair: whoever supplies the key supplies the family,
  // or a church that chose Poppins would be drawn in the platform's custom
  // family name.
  const face = church.font ? church : platform.font ? platform : DEFAULT_THEME
  return {
    primary: church.primary || platform.primary || DEFAULT_THEME.primary,
    primaryDark: church.primaryDark || platform.primaryDark || DEFAULT_THEME.primaryDark,
    font: face.font || DEFAULT_THEME.font,
    fontFamily: face.fontFamily || '',
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

// No landing switch here any more: every church's address opens on its own
// public page from the day it is made. The starting words are an example to
// edit, and the sections a church has not filled in — service times, address,
// phone — stay hidden until it does, so nothing invented is ever published.
export const DEFAULT_NEW_CHURCH = {
  timezone: 'Asia/Manila',
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
