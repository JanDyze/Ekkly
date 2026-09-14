import { db } from './firebase'
import { doc, onSnapshot } from './firestore'

// What the church pays for: subscription/apps (which apps are on) is read by
// everyone in the church, because it decides which pages they see. Only
// /api/platform writes it — a church's administrators change their apps
// through callPlatform('setMyApps'), never directly.

export const subscribeToChurchApps = (callback) =>
  onSnapshot(
    doc(db, 'subscription', 'apps'),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    (error) => {
      // Refused or offline: every app stays on. Hiding a church's pages over a
      // failed read would look like its records had gone.
      console.error('Error loading which apps this church has:', error)
      callback(null)
    }
  )
