-- Add missing qty column to demo_positions (idempotent), backfill from quantity, and keep them in sync
-- Run this in Supabase SQL editor or include in your migrations

BEGIN;

-- Add 'qty' if missing
ALTER TABLE public.demo_positions ADD COLUMN IF NOT EXISTS qty numeric;

-- Ensure 'quantity' exists too (compat)
ALTER TABLE public.demo_positions ADD COLUMN IF NOT EXISTS quantity numeric;

-- Backfill both directions where possible
UPDATE public.demo_positions SET qty = COALESCE(qty, quantity, 0) WHERE qty IS NULL;
UPDATE public.demo_positions SET quantity = COALESCE(quantity, qty, 0) WHERE quantity IS NULL;

-- Make columns NOT NULL with sensible defaults
ALTER TABLE public.demo_positions ALTER COLUMN qty SET DEFAULT 0;
ALTER TABLE public.demo_positions ALTER COLUMN qty SET NOT NULL;
ALTER TABLE public.demo_positions ALTER COLUMN quantity SET DEFAULT 0;
ALTER TABLE public.demo_positions ALTER COLUMN quantity SET NOT NULL;

-- Trigger function to keep qty and quantity synchronized on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.sync_demo_positions_qty_quantity()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.qty = COALESCE(NEW.qty, NEW.quantity, 0);
  NEW.quantity = COALESCE(NEW.quantity, NEW.qty, 0);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_demo_positions ON public.demo_positions;
CREATE TRIGGER trg_sync_demo_positions BEFORE INSERT OR UPDATE ON public.demo_positions
FOR EACH ROW EXECUTE FUNCTION public.sync_demo_positions_qty_quantity();

-- Ensure RLS/policies exist (idempotent)
ALTER TABLE public.demo_positions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'demo_positions' AND policyname = 'Demo positions are viewable by owner') THEN
    EXECUTE 'CREATE POLICY "Demo positions are viewable by owner" ON public.demo_positions FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'demo_positions' AND policyname = 'Demo positions are insertable by owner') THEN
    EXECUTE 'CREATE POLICY "Demo positions are insertable by owner" ON public.demo_positions FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'demo_positions' AND policyname = 'Demo positions are updatable by owner') THEN
    EXECUTE 'CREATE POLICY "Demo positions are updatable by owner" ON public.demo_positions FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END$$;

COMMIT;

-- After running this migration, reload PostgREST schema cache in Supabase SQL editor (manual step):
--   NOTIFY pgrst, 'reload schema';
-- Then restart any dev servers using the Supabase REST API to ensure they pick up the changed schema.