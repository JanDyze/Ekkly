import { computed, ref } from 'vue'

// Whether a visitor to the front door has agreed to be counted.
//
// The page keeps two numbers — how many people looked, and which church names
// they tried — and asks before it keeps either. Until someone answers, nothing
// is sent; if they say no, nothing is ever sent and the answer is remembered so
// they are not asked again.
//
// What is stored, on their own device and nowhere else:
//   ekkly.frontDoor.consent  'allowed' or 'refused'
//   ekkly.frontDoor.visitor  a random id, made only after they allow it, so
//                            the same person typing the same name twice is one
//                            row in the console rather than twenty. It means
//                            nothing outside this page and follows nobody
//                            anywhere else.
//
// Private windows and locked-down browsers throw on localStorage, so every
// read and write here is allowed to fail: the worst case is being asked again.

const CONSENT_KEY = 'ekkly.frontDoor.consent'
const VISITOR_KEY = 'ekkly.frontDoor.visitor'

const read = (key) => {
  try {
    return localStorage.getItem(key) || ''
  } catch {
    return ''
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // A visitor who cannot be remembered is asked again next time. That is all.
  }
}

// '' until they answer.
const consent = ref(read(CONSENT_KEY))

const newVisitorId = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)

export function useFrontDoorConsent() {
  const answered = computed(() => consent.value === 'allowed' || consent.value === 'refused')
  const allowed = computed(() => consent.value === 'allowed')

  const allow = () => {
    consent.value = 'allowed'
    write(CONSENT_KEY, 'allowed')
    if (!read(VISITOR_KEY)) write(VISITOR_KEY, newVisitorId())
  }

  const refuse = () => {
    consent.value = 'refused'
    write(CONSENT_KEY, 'refused')
    try {
      localStorage.removeItem(VISITOR_KEY)
    } catch {
      // Nothing to undo if it was never stored.
    }
  }

  /** The id to send with a signal, or '' when they have not agreed. */
  const visitor = () => (allowed.value ? read(VISITOR_KEY) : '')

  return { consent, answered, allowed, allow, refuse, visitor }
}
