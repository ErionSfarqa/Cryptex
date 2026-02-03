-- Quick schema diagnostic for trading tables
-- Run this in Supabase SQL editor to verify tables, columns, constraints, and RLS policies used by the order flow.
-- It is read-only (no data changes) except for the final suggested NOTIFY command which you run manually when you're ready.

-- 1) List columns for demo_orders and demo_positions
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('demo_orders', 'demo_positions')
ORDER BY table_name, ordinal_position;

-- 2) Quick boolean checks for required columns
SELECT
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_orders' AND column_name='quantity')) AS demo_orders_has_quantity,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_orders' AND column_name='order_type')) AS demo_orders_has_order_type,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_orders' AND column_name='side')) AS demo_orders_has_side,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_orders' AND column_name='price')) AS demo_orders_has_price,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_orders' AND column_name='user_id')) AS demo_orders_has_user_id,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_positions' AND column_name='qty')) AS demo_positions_has_qty,
  (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='demo_positions' AND column_name='quantity')) AS demo_positions_has_quantity;

-- 3) Show constraints on demo_orders (checks / other constraints)
SELECT conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
WHERE cl.relname = 'demo_orders'
  AND c.contype IN ('c','p','f')
ORDER BY conname;

-- 4) Check for lowercase-enforcing check constraints specifically
SELECT conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class cl ON c.conrelid = cl.oid
WHERE cl.relname = 'demo_orders'
  AND (pg_get_constraintdef(c.oid) ILIKE '%buy%' OR pg_get_constraintdef(c.oid) ILIKE '%sell%' OR pg_get_constraintdef(c.oid) ILIKE '%market%' OR pg_get_constraintdef(c.oid) ILIKE '%limit%');

-- 5) Show RLS policies for the two tables (owner checks)
SELECT policyname AS polname, qual AS using_expression, with_check AS with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('demo_orders', 'demo_positions')
ORDER BY tablename, policyname;

-- 6) Sanity-select to validate permission to SELECT from tables (returns 0 rows if allowed)
SELECT * FROM public.demo_orders LIMIT 0;
SELECT * FROM public.demo_positions LIMIT 0;

-- 7) (Manual) After you apply any schema changes run this in SQL editor to reload PostgREST schema cache:
-- NOTIFY pgrst, 'reload schema';

-- NOTES:
-- - If any of the boolean checks in section (2) return false, the corresponding column is missing and you should apply the migration to add it (see repository migrations).
-- - If check constraints appear uppercase (e.g., 'BUY','SELL'), consider normalizing data to lowercase and adding lowercase checks to avoid PostgREST returning unexpected messages.
-- - The final NOTIFY command is provided for convenience and must be run manually after schema changes.