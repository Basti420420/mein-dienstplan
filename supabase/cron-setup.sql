-- Run after the Edge Function is deployed.
-- Recommended: every 5 minutes. The function itself checks each device timezone and only sends at its configured reminder time.
-- Store the project URL and publishable key in Supabase Vault, then use the values below.
select cron.schedule(
  'send-shift-reminders-every-5-min',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://pqcavhanbresibptvtof.supabase.co/functions/v1/send-evening-reminders',
    headers := jsonb_build_object('Content-Type','application/json','apikey',(select decrypted_secret from vault.decrypted_secrets where name='publishable_key')),
    body := jsonb_build_object('source','cron')
  );
  $$
);
