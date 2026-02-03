-- Fix schema for SL/TP and Admin

-- 1. Add SL/TP to demo_orders
ALTER TABLE public.demo_orders 
ADD COLUMN IF NOT EXISTS sl numeric,
ADD COLUMN IF NOT EXISTS tp numeric;

-- 2. Add SL/TP to demo_positions
ALTER TABLE public.demo_positions 
ADD COLUMN IF NOT EXISTS sl numeric,
ADD COLUMN IF NOT EXISTS tp numeric;

-- 3. Ensure role exists in account_settings (redundant safety check)
ALTER TABLE public.account_settings 
ADD COLUMN IF NOT EXISTS role text not null default 'user' check (role in ('user', 'admin'));

-- 4. Auto-promote users with 'admin' in their email to admin role
-- This is a one-time fix for the demo environment
UPDATE public.account_settings
SET role = 'admin'
FROM auth.users
WHERE public.account_settings.user_id = auth.users.id
AND auth.users.email ILIKE '%admin%';

-- 5. Force schema cache reload
NOTIFY pgrst, 'reload schema';
