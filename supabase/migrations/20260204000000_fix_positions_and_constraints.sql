-- Ensure demo_positions & demo_orders schema align with backend expectations
-- Adds missing columns (if any), normalizes values, installs sync triggers, and adds lowercase check constraints.
-- Run this in Supabase SQL editor (or as a migration). After running, reload PostgREST schema (see the final NOTIFY statement).

BEGIN;

-- 1) Ensure demo_positions columns exist and are non-null where appropriate
ALTER TABLE public.demo_positions ADD COLUMN IF NOT EXISTS qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.demo_positions ADD COLUMN IF NOT EXISTS quantity numeric;

-- Backfill quantity from qty and make sure it is NOT NULL
UPDATE public.demo_positions SET quantity = COALESCE(quantity, qty) WHERE quantity IS NULL;
ALTER TABLE public.demo_positions ALTER COLUMN quantity SET NOT NULL;

-- Create a trigger function to keep qty and quantity in sync for compatibility
CREATE OR REPLACE FUNCTION public.sync_demo_positions_qty_quantity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Prefer explicit incoming values, fall back to each other
  NEW.qty = COALESCE(NEW.qty, NEW.quantity, 0);
  NEW.quantity = COALESCE(NEW.quantity, NEW.qty, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_demo_positions ON public.demo_positions;
CREATE TRIGGER trg_sync_demo_positions BEFORE INSERT OR UPDATE ON public.demo_positions
FOR EACH ROW EXECUTE FUNCTION public.sync_demo_positions_qty_quantity();

-- 2) Ensure RLS and policies for demo_positions exist and allow owner actions
ALTER TABLE public.demo_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Demo positions are viewable by owner" ON public.demo_positions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Demo positions are insertable by owner" ON public.demo_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Demo positions are updatable by owner" ON public.demo_positions
  FOR UPDATE USING (auth.uid() = user_id);

-- 3) Normalize demo_orders to lowercase to align with backend normalization
UPDATE public.demo_orders SET side = lower(side) WHERE side IS NOT NULL;
UPDATE public.demo_orders SET order_type = lower(order_type) WHERE order_type IS NOT NULL;
UPDATE public.demo_orders SET order_type = lower(type) WHERE order_type IS NULL AND type IS NOT NULL;
UPDATE public.demo_orders SET quantity = COALESCE(quantity, qty) WHERE quantity IS NULL;

-- 4) Remove legacy uppercase check constraints if they exist (drop any constraint that references BUY/SELL/MARKET/LIMIT)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint c
      JOIN pg_class cl ON c.conrelid = cl.oid
    WHERE cl.relname = 'demo_orders'
      AND (pg_get_constraintdef(c.oid) ILIKE '%BUY%' OR pg_get_constraintdef(c.oid) ILIKE '%SELL%' OR pg_get_constraintdef(c.oid) ILIKE '%MARKET%' OR pg_get_constraintdef(c.oid) ILIKE '%LIMIT%')
  LOOP
    EXECUTE format('ALTER TABLE public.demo_orders DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;
END$$;

-- 5) Add lowercase-enforcing check constraints if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_side_check') THEN
    ALTER TABLE public.demo_orders ADD CONSTRAINT demo_orders_side_check CHECK (side in ('buy','sell'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_order_type_check') THEN
    ALTER TABLE public.demo_orders ADD CONSTRAINT demo_orders_order_type_check CHECK (order_type in ('market','limit'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_quantity_positive') THEN
    ALTER TABLE public.demo_orders ADD CONSTRAINT demo_orders_quantity_positive CHECK (quantity > 0);
  END IF;
END$$;

-- Ensure demo_orders has quantity non-null (backfilled above)
ALTER TABLE public.demo_orders ALTER COLUMN quantity SET NOT NULL;

-- 6) Ensure RLS policies are present for demo_orders (owner only)
ALTER TABLE public.demo_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Demo orders are viewable by owner" ON public.demo_orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Demo orders are insertable by owner" ON public.demo_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Demo orders are updatable by owner" ON public.demo_orders
  FOR UPDATE USING (auth.uid() = user_id);

COMMIT;

-- After applying the above changes, reload PostgREST schema so its cached view of columns/constraints is updated:
-- Run (in the Supabase SQL editor):
--   NOTIFY pgrst, 'reload schema';

-- You may also restart any dev servers that rely on Supabase REST endpoints to ensure they pick up the new schema.