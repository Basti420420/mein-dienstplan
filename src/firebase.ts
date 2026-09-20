
import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported
} from "firebase/messaging";

const firebaseConfig = {
  apiKey: "DEIN_FIREBASE_API_KEY",
  authDomain: "mein-dienstplan-4dcff.firebaseapp.com",
  projectId: "mein-dienstplan-4dcff",
  storageBucket: "mein-dienstplan-4dcff.firebasestorage.app",
  messagingSenderId: "824579037977",
  appId: "1:824579037977:web:5350b9b12aa562034c0388",
  measurementId: "G-CQPVXY2X9Z"
};

const app = initializeApp(firebaseConfig);

export const vapidKey =
  "BCRdKcorc8dj8hkhQnQrgJOVxUwUckv3edZjgxdWGJDhHDkwrKpmxITPUIi9z5nhqcERomv8eDhdbNRGEZBVdjY";

export async function enablePush(): Promise<string> {
  if (!(await isSupported())) {
    throw new Error("Push wird von diesem Browser nicht unterstützt.");
  }

  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    throw new Error("Service Worker oder Benachrichtigungen werden nicht unterstützt.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Die Benachrichtigungsberechtigung wurde nicht erteilt.");
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
    throw new Error("Firebase hat keinen Push-Token zurückgegeben.");
  }

  return token;
}
