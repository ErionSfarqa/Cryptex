-- Ensure required demo tables + policies exist for Cryptex
-- Run this in Supabase SQL editor (or include in your migrations folder)

-- Profiles (if not present)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user',
  walkthrough_dismissed boolean not null default false,
  walkthrough_completed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Profiles policies
create policy if not exists "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
create policy if not exists "Profiles are insertable by owner" on public.profiles
  for insert with check (auth.uid() = id);
create policy if not exists "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

-- Account settings
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
create policy if not exists "Account settings are viewable by owner" on public.account_settings
  for select using (auth.uid() = user_id);
create policy if not exists "Account settings are insertable by owner" on public.account_settings
  for insert with check (auth.uid() = user_id);
create policy if not exists "Account settings are updatable by owner" on public.account_settings
  for update using (auth.uid() = user_id);

-- Demo trading: orders and positions
create table if not exists public.demo_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('BUY', 'SELL')),
  type text not null check (type in ('MARKET', 'LIMIT')),
  qty numeric not null check (qty > 0),
  price numeric,
  status text not null default 'filled' check (status in ('pending', 'filled', 'cancelled')),
  created_at timestamptz not null default now()
);

-- add compatible column names if they don't exist (for older installs)
alter table public.demo_orders add column if not exists quantity numeric;
alter table public.demo_orders add column if not exists order_type text;

alter table public.demo_orders enable row level security;

-- Policies for demo_orders: only owner can insert/select/update their rows
create policy if not exists "Demo orders are viewable by owner" on public.demo_orders
  for select using (auth.uid() = user_id);
create policy if not exists "Demo orders are insertable by owner" on public.demo_orders
  for insert with check (auth.uid() = user_id);
create policy if not exists "Demo orders are updatable by owner" on public.demo_orders
  for update using (auth.uid() = user_id);

-- Positions
create table if not exists public.demo_positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symbol text not null,
  qty numeric not null default 0,
  avg_price numeric not null default 0,
  unrealized_pnl numeric default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, symbol)
);

alter table public.demo_positions enable row level security;
create policy if not exists "Demo positions are viewable by owner" on public.demo_positions
  for select using (auth.uid() = user_id);
create policy if not exists "Demo positions are insertable by owner" on public.demo_positions
  for insert with check (auth.uid() = user_id);
create policy if not exists "Demo positions are updatable by owner" on public.demo_positions
  for update using (auth.uid() = user_id);

-- NOTE: If you see PostgREST / schema cache errors in Supabase, run:
--   notify pgrst, 'reload schema';
-- and restart any dev servers. This ensures the restful API schema is current.
