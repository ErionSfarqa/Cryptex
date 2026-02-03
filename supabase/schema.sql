-- Run this in the Supabase SQL editor to create required tables + RLS policies.

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

alter table public.demo_orders enable row level security;

create policy "Demo orders are viewable by owner" on public.demo_orders
  for select using (auth.uid() = user_id);

create policy "Demo orders are insertable by owner" on public.demo_orders
  for insert with check (auth.uid() = user_id);

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

create policy "Demo positions are viewable by owner" on public.demo_positions
  for select using (auth.uid() = user_id);

create policy "Demo positions are insertable by owner" on public.demo_positions
  for insert with check (auth.uid() = user_id);

create policy "Demo positions are updatable by owner" on public.demo_positions
  for update using (auth.uid() = user_id);

-- Admin policies (allow admins to view/manage all rows)
create policy "Admins can view all profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can update all profiles" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can view all account settings" on public.account_settings
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can update all account settings" on public.account_settings
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can view all demo orders" on public.demo_orders
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can insert demo orders" on public.demo_orders
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can view all demo positions" on public.demo_positions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can update all demo positions" on public.demo_positions
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );

create policy "Admins can delete demo positions" on public.demo_positions
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and lower(p.role) = 'admin'
    )
  );
