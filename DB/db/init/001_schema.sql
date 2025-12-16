CREATE SCHEMA IF NOT EXISTS app;
SET search_path TO app, public;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

----------------------
-- USERS
----------------------
CREATE TABLE users (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  class      TEXT,
  school_type VARCHAR(10) NOT NULL,
  balance    NUMERIC(10,2) NOT NULL DEFAULT 0,
  blocked    BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  role       TEXT NOT NULL,            -- KUNDE | INHABER | ADMIN 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_blocked ON users(blocked);

CREATE TABLE auth_credentials (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  auth_token    UUID NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX idx_auth_token ON auth_credentials(auth_token);

CREATE TABLE menu_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT,
  available   BOOLEAN NOT NULL DEFAULT TRUE,
  vegetarian  BOOLEAN NOT NULL DEFAULT FALSE,
  allergens   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE dishes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2),
  allergenes  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
);

CREATE TABLE menus (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  dish_menu_item_id UUID REFERENCES menu_items(id),
  drink             TEXT,
  dessert           TEXT
);

CREATE TABLE meal_plans (
  id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL
);

CREATE TABLE meal_plan_dishes (
  meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  dish_id      UUID NOT NULL REFERENCES dishes(id) ON DELETE RESTRICT,
  PRIMARY KEY (meal_plan_id, dish_id)
);

CREATE TABLE orders (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  total_price NUMERIC(10,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  status      TEXT NOT NULL,           -- "open" | "closed"
  qr_code_url TEXT
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

CREATE TABLE order_items (
  id            BIGSERIAL PRIMARY KEY,
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES menu_items(id),
  user_id       UUID NOT NULL REFERENCES users(id),
  note          TEXT,
  quantity      INT  NOT NULL CHECK (quantity > 0),
  delivered     BOOLEAN NOT NULL DEFAULT FALSE,
  delivery_time TIMESTAMPTZ
);

CREATE TABLE app.auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('EMAIL_VERIFY', 'PASSWORD_RESET')),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_auth_tokens_user
    FOREIGN KEY (user_id)
    REFERENCES app.users(id)
    ON DELETE CASCADE
);

-- Für gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app.pending_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  email text NOT NULL UNIQUE,
  payload jsonb NOT NULL,
  password_hash text NOT NULL,

  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_reg_token_hash
  ON app.pending_registrations(token_hash);

CREATE INDEX IF NOT EXISTS idx_pending_reg_expires
  ON app.pending_registrations(expires_at);


CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_menu_item_id ON order_items(menu_item_id);
CREATE INDEX idx_order_items_user_id ON order_items(user_id);
