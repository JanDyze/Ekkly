/* global importScripts, firebase, self, clients */
// Firebase Cloud Messaging service worker — handles push messages while the
// app is closed or in the background. The FCM SDK registers this file
// automatically at its own scope, separate from the PWA service worker.
//
// The project's web config arrives in this file's own URL, put there by
// src/composables/useNotifications.js from the VITE_FIREBASE_* env. They are
// public identifiers (they ship in the client bundle too); passing them in
// keeps the worker from naming a Firebase project of its own.
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js");

const config = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: config.get("apiKey"),
  projectId: config.get("projectId"),
  messagingSenderId: config.get("messagingSenderId"),
  appId: config.get("appId"),
});

const messaging = firebase.messaging();

// Data-only messages don't display automatically — show them here.
// (Messages with a `notification` payload are displayed by the SDK itself.)
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  if (payload.notification) return; // SDK already displayed it

  self.registration.showNotification(data.title || "Ekkly", {
    body: data.body || "",
    icon: "/icons/pwa-192x192.png",
    badge: "/icons/badge-96x96.png",
    data: { url: data.url || "/dashboard" },
  });
});

// Focus or open the app when a notification is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(url);
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
