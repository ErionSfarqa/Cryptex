-- Enforce positive SL/TP values when provided (nullable allowed).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_positions_sl_positive'
  ) THEN
    ALTER TABLE public.demo_positions
      ADD CONSTRAINT demo_positions_sl_positive CHECK (sl IS NULL OR sl > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_positions_tp_positive'
  ) THEN
    ALTER TABLE public.demo_positions
      ADD CONSTRAINT demo_positions_tp_positive CHECK (tp IS NULL OR tp > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_sl_positive'
  ) THEN
    ALTER TABLE public.demo_orders
      ADD CONSTRAINT demo_orders_sl_positive CHECK (sl IS NULL OR sl > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demo_orders_tp_positive'
  ) THEN
    ALTER TABLE public.demo_orders
      ADD CONSTRAINT demo_orders_tp_positive CHECK (tp IS NULL OR tp > 0);
  END IF;
END $$;

-- To refresh the PostgREST schema cache after running migrations:
-- NOTIFY pgrst, 'reload schema';
