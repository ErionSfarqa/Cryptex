-- Normalize existing demo_orders values to lowercase and add check constraints for side and order_type
-- Run this in Supabase SQL editor or include as a migration

BEGIN;

-- Ensure compatibility columns exist
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS order_type text;
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS quantity numeric;

-- Normalize existing values to lowercase to satisfy lowercase checks
UPDATE public.demo_orders SET side = lower(side) WHERE side IS NOT NULL;
UPDATE public.demo_orders SET order_type = lower(order_type) WHERE order_type IS NOT NULL;
-- If older 'type' column exists, backfill into order_type
UPDATE public.demo_orders SET order_type = lower(type) WHERE order_type IS NULL AND type IS NOT NULL;

-- Ensure quantity is backfilled from qty when present
UPDATE public.demo_orders SET quantity = COALESCE(quantity, qty) WHERE quantity IS NULL;

-- Add lowercase-enforcing check constraints if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_side_check') THEN
    ALTER TABLE public.demo_orders ADD CONSTRAINT demo_orders_side_check CHECK (side in ('buy','sell'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_order_type_check') THEN
    ALTER TABLE public.demo_orders ADD CONSTRAINT demo_orders_order_type_check CHECK (order_type in ('market','limit'));
  END IF;
END$$;

COMMIT;

-- NOTE: After running migrations you may need to refresh the PostgREST schema cache:
--   notify pgrst, 'reload schema';
-- and restart any dev servers using the Supabase REST API.