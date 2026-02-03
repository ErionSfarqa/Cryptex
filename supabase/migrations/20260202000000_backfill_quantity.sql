-- Backfill `quantity` from `qty` and enforce NOT NULL with positive check
-- Run this in Supabase SQL editor or as a migration

BEGIN;

-- If quantity column is missing, add it (compatible with older installs)
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS quantity numeric;
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS order_type text;

-- Backfill quantity from qty when possible, otherwise set a safe default (1)
UPDATE public.demo_orders SET quantity = COALESCE(qty, 1) WHERE quantity IS NULL;

-- Backfill order_type from type when possible
UPDATE public.demo_orders SET order_type = type WHERE order_type IS NULL AND type IS NOT NULL;

-- Make quantity NOT NULL and ensure positive values
ALTER TABLE public.demo_orders ALTER COLUMN quantity SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_quantity_positive'
  ) THEN
    ALTER TABLE public.demo_orders ADD CONSTRAINT demo_orders_quantity_positive CHECK (quantity > 0);
  END IF;
END$$;

COMMIT;

-- NOTE: After running migrations you may need to refresh the PostgREST schema cache:
--   notify pgrst, 'reload schema';
-- and restart any dev servers using the Supabase REST API.