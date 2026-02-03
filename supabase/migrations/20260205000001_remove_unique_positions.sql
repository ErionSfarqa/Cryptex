ALTER TABLE demo_positions DROP CONSTRAINT IF EXISTS demo_positions_user_symbol_unique;
DROP INDEX IF EXISTS demo_positions_user_symbol_unique;
ALTER TABLE demo_positions DROP CONSTRAINT IF EXISTS demo_positions_user_id_symbol_key;
ALTER TABLE demo_positions DROP CONSTRAINT IF EXISTS demo_positions_symbol_user_id_key;
