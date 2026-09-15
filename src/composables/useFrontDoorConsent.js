import { computed, ref } from 'vue'

// Whether a visitor to the front door has agreed to be counted.
//
// The page keeps two numbers — how many people looked, and how many pressed a
// call to action — and asks before it keeps either. Until someone answers,
// nothing is sent; if they say no, nothing is ever sent and the answer is
// remembered so they are not asked again.
//
// What is stored, on their own device and nowhere else:
//   ekkly.frontDoor.consent  'allowed' or 'refused'
//
// Private windows and locked-down browsers throw on localStorage, so every
// read and write here is allowed to fail: the worst case is being asked again.

const CONSENT_KEY = 'ekkly.frontDoor.consent'

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

// An id this page once kept to tell repeated church names apart. Nothing reads
// it any more, so it is cleared from browsers that still have it.
try {
  localStorage.removeItem('ekkly.frontDoor.visitor')
} catch {
  // Nothing to clear.
}

export function useFrontDoorConsent() {
  const answered = computed(() => consent.value === 'allowed' || consent.value === 'refused')
  const allowed = computed(() => consent.value === 'allowed')

  const allow = () => {
    consent.value = 'allowed'
    write(CONSENT_KEY, 'allowed')
  }

  const refuse = () => {
    consent.value = 'refused'
    write(CONSENT_KEY, 'refused')
  }

  return { consent, answered, allowed, allow, refuse }
}
