-- 1. Add SL/TP columns to demo_positions
ALTER TABLE public.demo_positions 
ADD COLUMN IF NOT EXISTS sl numeric,
ADD COLUMN IF NOT EXISTS tp numeric;

-- 2. Add SL/TP columns to demo_orders (for history/initial intent)
ALTER TABLE public.demo_orders
ADD COLUMN IF NOT EXISTS sl numeric,
ADD COLUMN IF NOT EXISTS tp numeric;

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info' check (type in ('info', 'success', 'warning', 'error')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications are viewable by owner" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications are insertable by owner" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id); -- Mostly for server-side, but good to have

CREATE POLICY "Notifications are updatable by owner" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id); -- To mark as read

-- 5. Ensure Last Reset At column exists in account_settings
ALTER TABLE public.account_settings
ADD COLUMN IF NOT EXISTS last_reset_at timestamptz;

-- 6. Add role to profiles if missing (already in schema but good to ensure)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role text not null default 'user';
    END IF;
END $$;
