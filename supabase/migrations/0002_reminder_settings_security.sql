create table if not exists public.reminder_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default true,
  reminder_time time not null default '20:00',
  timezone text not null default 'Europe/Berlin',
  updated_at timestamptz not null default now()
);

alter table public.reminder_settings enable row level security;
create policy "own reminder settings select" on public.reminder_settings for select to authenticated using (auth.uid() = user_id);
create policy "own reminder settings insert" on public.reminder_settings for insert to authenticated with check (auth.uid() = user_id);
create policy "own reminder settings update" on public.reminder_settings for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.reminder_log enable row level security;
-- reminder_log is server-only; do not grant it to anon/authenticated.
revoke all on public.reminder_log from anon, authenticated;
