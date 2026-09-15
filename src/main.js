import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'
import './style.css'
import App from './App.vue'
import { createAppRouter } from './router'
import { resolveChurch } from './api/churchService'
import { loadChurchProfile } from './composables/useChurchAccess'
import { initPlatformConfig } from './composables/usePlatformConfig'

// PWA service worker — auto-updates when a new version is deployed.
//
// `autoUpdate` already handles the swap: once a new worker takes control the
// plugin reloads the page. What it does not do is go looking. A browser only
// checks for a new worker on a hard navigation or roughly every 24 hours, and
// a phone that resumes the installed app from the home screen does neither —
// so a deploy could sit unnoticed for a day while the congregation kept
// running the old build. These three triggers are what actually close that gap.
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000 // hourly, for sessions left open

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return

    const checkForUpdate = () => {
      // update() throws when offline or when the worker is mid-install; a
      // failed check is never worth surfacing, the next trigger will retry.
      if (navigator.onLine) registration.update().catch(() => {})
    }

    // The one that matters most on a phone: coming back to the app.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    })
    window.addEventListener('online', checkForUpdate)
    setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL)
  },
})

// Which church this address is, before anything else happens: every Firestore
// reference the app builds is placed inside that church, so nothing may build
// one until it is known. The church's settings and the account's app order are
// no longer started here — they wait for access to the church to be confirmed
// (useChurchAccess), because the rules refuse them until then and a refused
// listener does not come back on its own.
const bootstrap = async () => {
  // The platform's name and colours, for the front door and every church.
  // Waited for alongside the church, but never for long: a slow or refused
  // read gives up after a moment and the page carries on, taking the colours
  // whenever they do arrive. Colours from a previous visit are already on
  // screen by now (index.html), so this mainly spares a first visit the flash.
  const platformConfig = Promise.race([initPlatformConfig(), new Promise((resolve) => setTimeout(resolve, 1500))])

  const churchId = await resolveChurch()
  if (churchId) await loadChurchProfile()
  await platformConfig

  const app = createApp(App)
  app.use(createAppRouter())
  app.mount('#app')
}

bootstrap()
