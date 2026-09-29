# Supabase-Einrichtung für Mein Dienstplan

1. SQL aus `migrations/0001_init.sql` im Supabase SQL Editor ausführen.
2. Unter Authentication → Sign In / Providers **Anonymous Sign-Ins** aktivieren.
3. Supabase CLI installieren/anmelden, Projekt verknüpfen und deployen:
   `supabase link --project-ref pqcavhanbresibptvtof`
   `supabase functions deploy send-evening-reminders`
4. Secrets setzen (private Werte nur lokal eingeben):
   `supabase secrets set SUPABASE_SERVICE_ROLE_KEY="…" VAPID_PUBLIC_KEY="…" VAPID_PRIVATE_KEY="…"`
5. In Supabase Cron einen Aufruf der Edge Function alle 5 Minuten einrichten. Die Function prüft die jeweilige Geräte-Zeitzone und sendet nur um 20:00 Uhr; `reminder_log` verhindert doppelte Sendungen.

Wichtig: Für den Cron-Aufruf muss die Edge Function mit gültiger Authentifizierung aufgerufen werden. Den Service-Role-Key niemals in Frontend-Code, `.env.local` für Vite oder GitHub eintragen. Speichere ihn serverseitig, z. B. in Supabase Vault, und verwende ihn nur im Cron-Aufruf.

## Frontend-Konfiguration
`.env.local` benötigt `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` und `VITE_VAPID_PUBLIC_KEY`. Nur der öffentliche VAPID-Key gehört ins Frontend. Der private VAPID-Key bleibt ein Supabase-Secret.
