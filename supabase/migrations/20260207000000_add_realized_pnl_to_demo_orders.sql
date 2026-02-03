-- Add realized_pnl column to demo_orders to record realized profit/loss for fills
ALTER TABLE public.demo_orders ADD COLUMN IF NOT EXISTS realized_pnl numeric;
-- No NOT NULL constraint intentionally: historical rows may not have values
