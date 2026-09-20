
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyCqKmBfKJnsAkLdtfAdgvXHDKKqLq4GLLo",
  authDomain: "mein-dienstplan-4dcff.firebaseapp.com",
  projectId: "mein-dienstplan-4dcff",
  storageBucket: "mein-dienstplan-4dcff.firebasestorage.app",
  messagingSenderId: "824579037977",
  appId: "1:824579037977:web:5350b9b12aa562034c0388",
  measurementId: "G-CQPVXY2X9Z"
};

const app = initializeApp(firebaseConfig);

const vapidKey =
  "BCRdKcorc8dj8hkhQnQrgJOVxUwUckv3edZjgxdWGJDhHDkwrKpmxITPUIi9z5nhqcERomv8eDhdbNRGEZBVdjY";

export async function enablePush(): Promise<string> {
  if (!(await isSupported())) {
    throw new Error("Push wird von diesem Browser nicht unterstützt.");
  }

  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    throw new Error("Benachrichtigungen werden nicht unterstützt.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Benachrichtigungen wurden nicht freigegeben.");
  }

  const registration = await navigator.serviceWorker.register(
    `${import.meta.env.BASE_URL}firebase-messaging-sw.js`
  );

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    throw new Error("Es konnte kein Firebase-Push-Token erstellt werden.");
  }

  return token;
}
