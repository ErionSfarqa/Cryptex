-- Profiles + account settings tables used by the app.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  walkthrough_dismissed boolean not null default false,
  walkthrough_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

create table if not exists public.account_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  demo_balance numeric not null default 10000,
  last_reset_at timestamptz,
  first_run_complete boolean not null default false,
  dark_mode boolean not null default false,
  email_alerts boolean not null default true,
  in_app_alerts boolean not null default true
);

alter table public.account_settings enable row level security;

create policy "Account settings are viewable by owner" on public.account_settings
  for select using (auth.uid() = user_id);

create policy "Account settings are insertable by owner" on public.account_settings
  for insert with check (auth.uid() = user_id);

create policy "Account settings are updatable by owner" on public.account_settings
  for update using (auth.uid() = user_id);
