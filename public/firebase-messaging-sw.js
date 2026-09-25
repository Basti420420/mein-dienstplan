/* Firebase Cloud Messaging Service Worker */
importScripts(
  "https://www.gstatic.com/firebasejs/12.3.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.3.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyCqKmBfKJnsAkLdtfAdgvXHDKKqLq4GLLo",
  authDomain: "mein-dienstplan-4dcff.firebaseapp.com",
  projectId: "mein-dienstplan-4dcff",
  storageBucket: "mein-dienstplan-4dcff.firebasestorage.app",
  messagingSenderId: "824579037977",
  appId: "1:824579037977:web:5350b9b12aa562034c0388",
  measurementId: "G-CQPVXY2X9Z"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || "Mein Dienstplan";
  const options = {
    body: payload.notification?.body || "Schau dir deinen nächsten Dienst an.",
    data: {
      url: payload.data?.url || "/mein-dienstplan/"
    }
  };

  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || "/mein-dienstplan/",
    self.location.origin
  ).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow(target);
    })
  );
});
