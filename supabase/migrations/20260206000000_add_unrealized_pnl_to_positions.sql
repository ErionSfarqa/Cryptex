-- Add missing unrealized_pnl to demo_positions (idempotent)
-- Run this in Supabase SQL editor or as a migration

BEGIN;

ALTER TABLE public.demo_positions ADD COLUMN IF NOT EXISTS unrealized_pnl numeric DEFAULT 0;
UPDATE public.demo_positions SET unrealized_pnl = COALESCE(unrealized_pnl, 0) WHERE unrealized_pnl IS NULL;
ALTER TABLE public.demo_positions ALTER COLUMN unrealized_pnl SET NOT NULL;

-- Ensure default remains for future inserts
ALTER TABLE public.demo_positions ALTER COLUMN unrealized_pnl SET DEFAULT 0;

COMMIT;

-- After running this migration, reload PostgREST schema cache in Supabase SQL editor (manual step):
--   NOTIFY pgrst, 'reload schema';
-- Then restart any dev servers using the Supabase REST API to ensure they pick up the changed schema.