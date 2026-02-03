-- Add role to account_settings
ALTER TABLE public.account_settings 
ADD COLUMN IF NOT EXISTS role text not null default 'user' check (role in ('user', 'admin'));

-- Create a helper function to check admin status (avoids recursion in some cases, though simple select is usually fine)
-- But we can just use the subquery pattern directly in policies.

-- Policy for account_settings: Admins can view ALL rows
CREATE POLICY "Admins can view all account settings" 
ON public.account_settings FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.account_settings WHERE user_id = auth.uid()) = 'admin'
);

-- Policy for demo_positions: Admins can view ALL rows
CREATE POLICY "Admins can view all positions" 
ON public.demo_positions FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.account_settings WHERE user_id = auth.uid()) = 'admin'
);

-- Policy for demo_orders: Admins can view ALL rows
CREATE POLICY "Admins can view all orders" 
ON public.demo_orders FOR SELECT 
TO authenticated 
USING (
  (SELECT role FROM public.account_settings WHERE user_id = auth.uid()) = 'admin'
);
