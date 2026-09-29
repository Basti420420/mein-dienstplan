create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start text not null,
  "end" text not null,
  department text not null default 'Ware',
  pause boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reminder_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  shift_date date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, shift_date)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'Europe/Berlin',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.shifts enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own shifts select" on public.shifts for select using (auth.uid() = user_id);
create policy "own shifts insert" on public.shifts for insert with check (auth.uid() = user_id);
create policy "own shifts update" on public.shifts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own shifts delete" on public.shifts for delete using (auth.uid() = user_id);

create policy "own push select" on public.push_subscriptions for select using (auth.uid() = user_id);
create policy "own push insert" on public.push_subscriptions for insert with check (auth.uid() = user_id);
create policy "own push update" on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own push delete" on public.push_subscriptions for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.shifts to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- Run the following after creating your Supabase project and replacing the placeholders.
-- This invokes the reminder Edge Function every 15 minutes. The function itself
-- only sends notifications once at 20:00 local time (Europe/Berlin by default).
-- Store URL and publishable key in Vault rather than putting secrets into SQL.
