-- SCHEMA & EXTENSIONS
CREATE SCHEMA IF NOT EXISTS app;
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email

SET search_path TO app, public;

-- ENUMS
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='order_status') THEN
CREATE TYPE app.order_status AS ENUM ('open','closed','cancelled');
END IF;
END$$;

-- LOOKUPS
CREATE TABLE IF NOT EXISTS app.category (
                                            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE
    );

CREATE TABLE IF NOT EXISTS app.allergen (
                                            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL
    );

CREATE TABLE IF NOT EXISTS app.user_class (
                                              id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE
    );

-- CORE
CREATE TABLE IF NOT EXISTS app.app_user (
                                            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    email       CITEXT NOT NULL UNIQUE,
    class_id    UUID REFERENCES app.user_class(id) ON UPDATE RESTRICT ON DELETE SET NULL,
    blocked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS app.menu_item (
                                             id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    description TEXT,
    price       NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    category_id UUID REFERENCES app.category(id) ON UPDATE RESTRICT ON DELETE SET NULL,
    available   BOOLEAN NOT NULL DEFAULT TRUE,
    vegetarian  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- m:n Allergene für MenuItem
CREATE TABLE IF NOT EXISTS app.menuitem_allergen (
                                                     menu_item_id UUID NOT NULL REFERENCES app.menu_item(id) ON DELETE CASCADE,
    allergen_id  UUID NOT NULL REFERENCES app.allergen(id)  ON DELETE RESTRICT,
    PRIMARY KEY (menu_item_id, allergen_id)
    );

CREATE TABLE IF NOT EXISTS app."order" (
                                           id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES app.app_user(id) ON DELETE RESTRICT,
    status       app.order_status NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qr_code_url  TEXT,
    stored_total NUMERIC(12,2) CHECK (stored_total >= 0)
    );

-- Wenn du mehrere gleiche Artikel als eigene Zeilen brauchst:
-- ersetze den PK unten durch (order_id, line_no) und füge line_no SERIAL/BIGINT hinzu.
CREATE TABLE IF NOT EXISTS app.order_item (
                                              order_id      UUID NOT NULL REFERENCES app."order"(id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES app.menu_item(id) ON DELETE RESTRICT,
    quantity      INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
    note          TEXT,
    delivered     BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_time TIMESTAMPTZ,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0), -- Preis-Snapshot
    PRIMARY KEY (order_id, menu_item_id)
    );

-- Kontoauszüge / Guthabenbewegungen (Saldo über View)
CREATE TABLE IF NOT EXISTS app.account_entry (
                                                 id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app.app_user(id) ON DELETE RESTRICT,
    order_id    UUID REFERENCES app."order"(id) ON DELETE SET NULL,
    amount      NUMERIC(12,2) NOT NULL,
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (amount <> 0)
    );

-- VIEWS
CREATE OR REPLACE VIEW app.v_order_total AS
SELECT oi.order_id,
       SUM(oi.unit_price * oi.quantity)::NUMERIC(12,2) AS total
FROM app.order_item oi
GROUP BY oi.order_id;

CREATE OR REPLACE VIEW app.v_user_balance AS
SELECT ae.user_id,
       COALESCE(SUM(ae.amount), 0)::NUMERIC(12,2) AS balance
FROM app.account_entry ae
GROUP BY ae.user_id;

-- TRIGGER zur Pflege von stored_total (optional)
CREATE OR REPLACE FUNCTION app.trg_order_total_refresh() RETURNS TRIGGER AS $$
BEGIN
UPDATE app."order" o
SET stored_total = (
    SELECT COALESCE(SUM(unit_price*quantity),0)::NUMERIC(12,2)
    FROM app.order_item WHERE order_id = o.id
)
WHERE o.id = COALESCE(NEW.order_id, OLD.order_id);
RETURN NULL;
END$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS order_item_aiud ON app.order_item;
CREATE TRIGGER order_item_aiud
    AFTER INSERT OR UPDATE OR DELETE ON app.order_item
    FOR EACH ROW EXECUTE FUNCTION app.trg_order_total_refresh();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_order_user     ON app."order"(user_id);
CREATE INDEX IF NOT EXISTS idx_order_created  ON app."order"(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status   ON app."order"(status);
CREATE INDEX IF NOT EXISTS idx_orderitem_menu ON app.order_item(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_available ON app.menu_item(available);
CREATE INDEX IF NOT EXISTS idx_account_user   ON app.account_entry(user_id, created_at);

-- RLS HELPER
CREATE OR REPLACE FUNCTION app.current_user_uuid() RETURNS uuid AS $$
BEGIN
RETURN current_setting('app.current_user_id', true)::uuid;
END$$ LANGUAGE plpgsql STABLE;
