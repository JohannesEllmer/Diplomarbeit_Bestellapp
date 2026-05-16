CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- QR-bestätigte Guthaben-Änderungen 
CREATE TABLE IF NOT EXISTS app.balance_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('add', 'flush')),
  delta numeric(12,2), 
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  used_by text,
  is_used boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_balance_change_requests_user_id
  ON app.balance_change_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_balance_change_requests_is_used
  ON app.balance_change_requests(is_used);

CREATE TABLE IF NOT EXISTS app.balance_logs (
  id bigserial PRIMARY KEY,
  user_id text NOT NULL,
  delta numeric(12,2) NOT NULL,
  balance_after numeric(12,2) NOT NULL,
  reason text NOT NULL,        
  ref_type text,               
  ref_id text,
  actor text,                 
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_balance_logs_user_id_created_at
  ON app.balance_logs(user_id, created_at DESC);
