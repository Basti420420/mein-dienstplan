# Mein Dienstplan – iPhone & Android (PWA)

Die App ist als installierbare Web-App (PWA) vorbereitet. Sie kann auf iPhone und Android zum Home-Bildschirm hinzugefügt werden. Eine signierte iOS-App-Datei (.ipa) oder Android-APK wird dadurch nicht erzeugt; diese benötigen separate native Builds und ggf. Store-/Signing-Konten.

## Enthalten
- Dienstplan manuell erfassen oder Foto/OCR verwenden
- Abteilung, Uhrzeit, Pause und Notiz speichern
- Supabase-Datenbank und anonyme Anmeldung
- Push-Abo im Browser
- Kalenderexport (.ics)
- Vorabend-Erinnerung um 20:00 Uhr mit dem Dienst des Folgetags (nach Supabase-Servereinrichtung)

## Lokal starten / bauen
1. `npm install`
2. `.env.example` nach `.env.local` kopieren und Werte eintragen.
3. `npm run build`
4. `npm run dev` für die lokale Vorschau.

## iPhone installieren
1. Die veröffentlichte App in **Safari** öffnen.
2. Teilen → **Zum Home-Bildschirm**.
3. Die App über das neue Home-Bildschirm-Symbol öffnen.
4. In der App **Push aktivieren** antippen und Mitteilungen erlauben.

Web-Push auf iOS benötigt eine unterstützte iOS-Version und die zum Home-Bildschirm hinzugefügte Web-App. Die Website muss über HTTPS erreichbar sein.

## Android installieren
Die veröffentlichte App in Chrome öffnen → Menü (⋮) → **App installieren** bzw. **Zum Startbildschirm hinzufügen**. Danach Push in der App erlauben.

## Supabase: einmalige Einrichtung
1. Im Supabase SQL Editor `supabase/migrations/0001_init.sql` ausführen.
2. Authentication → Sign In / Providers → Anonymous Sign-Ins aktivieren.
3. Edge Function `send-evening-reminders` deployen.
4. Migration `0002_reminder_settings_security.sql` ausführen.
5. `cron-setup.sql` nach Einrichtung von Vault ausführen.
4. `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` als Function-Secrets setzen. Den privaten VAPID-Key niemals in die App oder ins Repository schreiben.
5. Supabase Cron so einrichten, dass die Function alle 5 Minuten aufgerufen wird. Die Function sendet nur um 20:00 Uhr lokaler Gerätezeit und protokolliert pro Benutzer/Schichtdatum, damit es keine doppelten Erinnerungen gibt.

Die Supabase-URL und der Publishable Key sind öffentliche Frontend-Konfiguration. Die Datenbank muss mit den mitgelieferten RLS-Regeln abgesichert sein.


## Fertigstellen in Supabase

1. In Supabase → SQL Editor die Datei `supabase/migrations/0002_reminder_settings_security.sql` ausführen.
2. Für die Edge Function folgende Secrets setzen:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`
   - `VAPID_SUBJECT` (z. B. `mailto:deine-mailadresse@example.com`)
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Die Function `send-evening-reminders` deployen.
4. `supabase/cron-setup.sql` ausführen. Der Cron läuft jede Minute; die Function sendet nur zur individuell gespeicherten Uhrzeit.
5. GitHub Pages: Repository Settings → Pages → Source `GitHub Actions`.
6. Repository Secrets anlegen:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_VAPID_PUBLIC_KEY`

**Wichtig:** Niemals `VAPID_PRIVATE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` oder `.env.local` in GitHub committen.
