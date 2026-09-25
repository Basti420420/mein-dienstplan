# Mein Dienstplan

Mobile-first React/PWA für Dienstpläne mit:
- Fotoaufnahme und deutscher OCR (Tesseract)
- manueller Schichtverwaltung
- lokaler Speicherung
- Firebase Cloud Messaging Web-Push-Anmeldung
- PWA-Service-Worker
- GitHub-Pages-Deployment

## Lokal starten

```bash
npm install
npm run dev
```

## GitHub Pages

Die Vite-Basis ist auf `/mein-dienstplan/` gesetzt. Der Workflow unter
`.github/workflows/static.yml` baut und veröffentlicht die App auf GitHub Pages.

## Firebase Web Push

`src/firebase.ts` enthält die Firebase-Webkonfiguration und den VAPID Public Key.
Über **Push aktivieren** wird die Browser-Berechtigung angefragt, der FCM-Service-Worker
registriert und ein FCM-Token erzeugt. Der Token wird aktuell lokal im Browser gespeichert.

Wichtig: Der automatische tägliche Versand um 20:30 Uhr ist damit noch nicht serverseitig
aktiv. Dafür braucht es einen Backend-/Cloud-Functions-Dienst, der die gespeicherten
Schichtdaten und FCM-Tokens verwaltet und den Versand zeitgesteuert ausführt.

## Wichtiger Service-Worker-Hinweis

`public/firebase-messaging-sw.js` ist ausschließlich der Firebase-Messaging-Service-Worker.
`public/sw.js` ist der normale PWA-Service-Worker. Beide haben unterschiedliche Aufgaben.

## Sicherheit

Die Firebase-Web-Konfiguration und der VAPID Public Key sind für Web-Apps bestimmt.
Keine Firebase Service-Account-Dateien oder private Schlüssel in das Repository hochladen.
