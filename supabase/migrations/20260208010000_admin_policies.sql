-- Grant admin access to all tables
-- Note: This assumes 'profiles' table has a 'role' column and the user has 'admin' role.

-- Helper function to check if user is admin (optional, but cleaner)
-- CREATE OR REPLACE FUNCTION public.is_admin()
-- RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE id = auth.uid() AND role = 'admin'
--   );
-- $$;

-- Profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Demo Orders
CREATE POLICY "Admins can view all orders" ON public.demo_orders
  FOR SELECT USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can insert demo orders" ON public.demo_orders
  FOR INSERT WITH CHECK (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Demo Positions
CREATE POLICY "Admins can view all positions" ON public.demo_positions
  FOR SELECT USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all positions" ON public.demo_positions
  FOR UPDATE USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete demo positions" ON public.demo_positions
  FOR DELETE USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Account Settings
CREATE POLICY "Admins can view all account settings" ON public.account_settings
  FOR SELECT USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can update all account settings" ON public.account_settings
  FOR UPDATE USING (
    (SELECT lower(role) FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );
