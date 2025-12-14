SET search_path TO app, public;

-- Extension (falls nicht vorhanden)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- users: email_verified
ALTER TABLE app.users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- tokens table
CREATE TABLE IF NOT EXISTS app.auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,

  token_type TEXT NOT NULL CHECK (token_type IN ('EMAIL_VERIFY','PASSWORD_RESET')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_type ON app.auth_tokens(user_id, token_type);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON app.auth_tokens(token_hash);
