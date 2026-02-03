 CREATE TABLE IF NOT EXISTS admin_actions (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   admin_id uuid NOT NULL,
   action_type text NOT NULL,
   target_user_id uuid NOT NULL,
   metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
   created_at timestamptz NOT NULL DEFAULT now()
 );
 
 ALTER TABLE account_settings
   ADD COLUMN IF NOT EXISTS trading_disabled boolean NOT NULL DEFAULT false;
