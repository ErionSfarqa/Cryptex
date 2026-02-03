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
