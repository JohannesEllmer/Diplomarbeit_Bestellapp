-- =====================================================================
--  APP-SCHEMA FÜR SCHOOL-CATERING (komplett, idempotent)
--  Deckt ab:
--   - Users & Klassen
--   - Kategorien, Allergene, MenuItems (+ m:n Allergene)
--   - Dish / MealPlan / MealPlan↔Dish
--   - Menu (verweist auf MenuItem als "dish" wie im Frontend-Interface)
--   - Orders, OrderItems (mit quantity, note, delivered, delivery_time)
--   - Account/Guthaben (mit View v_user_balance)
--   - Views: v_order_total, v_daily_stats
--   - Delivery Slots
--   - RLS (Orders/Account), Rollen & Rechte
-- =====================================================================

-- ---------- SCHEMA & EXTENSIONS ----------
CREATE SCHEMA IF NOT EXISTS app;

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email

SET search_path TO app, public;

-- ---------- ENUMS ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='order_status') THEN
CREATE TYPE app.order_status AS ENUM ('open','closed');
END IF;
END$$;

-- =====================================================================
-- LOOKUPS / BASIS
-- =====================================================================
CREATE TABLE IF NOT EXISTS app.user_class (
                                              id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE
    );

CREATE TABLE IF NOT EXISTS app.category (
                                            id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name  TEXT NOT NULL UNIQUE
    );

CREATE TABLE IF NOT EXISTS app.allergen (
                                            id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code  TEXT NOT NULL UNIQUE,
    name  TEXT NOT NULL
    );

-- =====================================================================
-- USERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS app.app_user (
                                            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT   NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    email       CITEXT NOT NULL UNIQUE,
    class_id    UUID REFERENCES app.user_class(id) ON UPDATE RESTRICT ON DELETE SET NULL,
    blocked     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_app_user_class ON app.app_user(class_id);

-- =====================================================================
-- MENU ITEMS (entspricht deinem Frontend-MenuItem)
-- =====================================================================
CREATE TABLE IF NOT EXISTS app.menu_item (
                                             id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    description  TEXT,
    price        NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    category_id  UUID REFERENCES app.category(id) ON UPDATE RESTRICT ON DELETE SET NULL,
    available    BOOLEAN NOT NULL DEFAULT TRUE,
    vegetarian   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_menu_item_category  ON app.menu_item(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_available ON app.menu_item(available);

-- m:n Allergene zu MenuItem
CREATE TABLE IF NOT EXISTS app.menuitem_allergen (
                                                     menu_item_id UUID NOT NULL REFERENCES app.menu_item(id) ON DELETE CASCADE,
    allergen_id  UUID NOT NULL REFERENCES app.allergen(id)  ON DELETE RESTRICT,
    PRIMARY KEY (menu_item_id, allergen_id)
    );

CREATE INDEX IF NOT EXISTS idx_mi_allergen_item ON app.menuitem_allergen(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_mi_allergen_all  ON app.menuitem_allergen(allergen_id);

-- =====================================================================
-- DISH / MEAL PLAN / MENU  (Frontend-Modelle)
-- =====================================================================

-- Dish
CREATE TABLE IF NOT EXISTS app.dish (
                                        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    description  TEXT,
    price        NUMERIC(12,2) CHECK (price >= 0)
    );

CREATE INDEX IF NOT EXISTS idx_dish_name ON app.dish(name);

-- MealPlan
CREATE TABLE IF NOT EXISTS app.meal_plan (
                                             id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_meal_plan_title ON app.meal_plan(title);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION app.trg_meal_plan_touch() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
RETURN NEW;
END$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS meal_plan_touch ON app.meal_plan;
CREATE TRIGGER meal_plan_touch
    BEFORE UPDATE ON app.meal_plan
    FOR EACH ROW EXECUTE FUNCTION app.trg_meal_plan_touch();

-- MealPlan↔Dish m:n
CREATE TABLE IF NOT EXISTS app.meal_plan_dish (
                                                  meal_plan_id UUID NOT NULL REFERENCES app.meal_plan(id) ON DELETE CASCADE,
    dish_id      UUID NOT NULL REFERENCES app.dish(id)      ON DELETE RESTRICT,
    position     INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1),
    PRIMARY KEY (meal_plan_id, dish_id)
    );

CREATE INDEX IF NOT EXISTS idx_meal_plan_dish_plan_pos ON app.meal_plan_dish(meal_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_meal_plan_dish_dish     ON app.meal_plan_dish(dish_id);

-- Menu (dish = MenuItem)
CREATE TABLE IF NOT EXISTS app.menu (
                                        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title              TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    dish_menu_item_id  UUID NOT NULL REFERENCES app.menu_item(id) ON DELETE RESTRICT,
    drink              TEXT,
    dessert            TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_menu_title ON app.menu(title);
CREATE INDEX IF NOT EXISTS idx_menu_dish  ON app.menu(dish_menu_item_id);

-- =====================================================================
-- ORDERS
-- =====================================================================
CREATE TABLE IF NOT EXISTS app."order" (
                                           id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES app.app_user(id) ON DELETE RESTRICT,
    status       app.order_status NOT NULL DEFAULT 'open',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    qr_code_url  TEXT,
    stored_total NUMERIC(12,2) CHECK (stored_total >= 0)
    );

CREATE INDEX IF NOT EXISTS idx_order_user     ON app."order"(user_id);
CREATE INDEX IF NOT EXISTS idx_order_created  ON app."order"(created_at);
CREATE INDEX IF NOT EXISTS idx_order_status   ON app."order"(status);

CREATE TABLE IF NOT EXISTS app.order_item (
                                              order_id      UUID NOT NULL REFERENCES app."order"(id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES app.menu_item(id) ON DELETE RESTRICT,
    quantity      INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
    note          TEXT,
    delivered     BOOLEAN NOT NULL DEFAULT FALSE,
    delivery_time TIMESTAMPTZ,
    unit_price    NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    PRIMARY KEY (order_id, menu_item_id)
    );

CREATE INDEX IF NOT EXISTS idx_orderitem_menu ON app.order_item(menu_item_id);

-- =====================================================================
-- ACCOUNT / GUTHABEN
-- =====================================================================
CREATE TABLE IF NOT EXISTS app.account_entry (
                                                 id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES app.app_user(id) ON DELETE RESTRICT,
    order_id    UUID REFERENCES app."order"(id) ON DELETE SET NULL,
    amount      NUMERIC(12,2) NOT NULL,
    reason      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (amount <> 0)
    );

CREATE INDEX IF NOT EXISTS idx_account_user ON app.account_entry(user_id, created_at);

-- =====================================================================
-- DELIVERY SLOTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS app.delivery_slot (
                                                 id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label      TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time   TIME,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    position   INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1)
    );

CREATE INDEX IF NOT EXISTS idx_delivery_slot_active ON app.delivery_slot(active, position);

-- =====================================================================
-- VIEWS
-- =====================================================================
CREATE OR REPLACE VIEW app.v_order_total AS
SELECT
    oi.order_id,
    SUM(oi.unit_price * oi.quantity)::NUMERIC(12,2) AS total
FROM app.order_item oi
GROUP BY oi.order_id;

CREATE OR REPLACE VIEW app.v_user_balance AS
SELECT
    ae.user_id,
    COALESCE(SUM(ae.amount), 0)::NUMERIC(12,2) AS balance
FROM app.account_entry ae
GROUP BY ae.user_id;

CREATE OR REPLACE VIEW app.v_daily_stats AS
WITH totals AS (
  SELECT
    o.id,
    o.user_id,
    (CASE
       WHEN o.stored_total IS NOT NULL THEN o.stored_total
       ELSE (SELECT COALESCE(SUM(oi.unit_price * oi.quantity),0) FROM app.order_item oi WHERE oi.order_id = o.id)
     END)::NUMERIC(12,2) AS total,
    o.created_at::date AS day
  FROM app."order" o
)
SELECT
    t.day AS date,
  SUM(t.total)::NUMERIC(12,2) AS revenue,
  COUNT(*) AS orders,
  COUNT(DISTINCT t.user_id) AS customers
FROM totals t
GROUP BY t.day
ORDER BY t.day DESC;

-- =====================================================================
-- TRIGGER
-- =====================================================================
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

-- =====================================================================
-- RLS HELPER + RLS
-- =====================================================================
CREATE OR REPLACE FUNCTION app.current_user_uuid() RETURNS uuid AS $$
BEGIN
RETURN current_setting('app.current_user_id', true)::uuid;
END$$ LANGUAGE plpgsql STABLE;

ALTER TABLE app."order"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.account_entry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS order_is_owner   ON app."order";
CREATE POLICY order_is_owner
  ON app."order"
  FOR ALL
  TO PUBLIC
  USING (user_id = app.current_user_uuid())
  WITH CHECK (user_id = app.current_user_uuid());

DROP POLICY IF EXISTS account_is_owner ON app.account_entry;
CREATE POLICY account_is_owner
  ON app.account_entry
  FOR ALL
  TO PUBLIC
  USING (user_id = app.current_user_uuid())
  WITH CHECK (user_id = app.current_user_uuid());

-- =====================================================================
-- ROLLEN & RECHTE
-- =====================================================================
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_admin') THEN CREATE ROLE app_admin NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_user')  THEN CREATE ROLE app_user  NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_ro')    THEN CREATE ROLE app_ro    NOINHERIT; END IF;
END$$;

GRANT USAGE ON SCHEMA app TO app_admin, app_user, app_ro;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_ro;

GRANT SELECT ON
    app.category, app.allergen, app.menu_item, app.menuitem_allergen,
    app.dish, app.meal_plan, app.meal_plan_dish,
    app.menu, app.delivery_slot,
    app.v_order_total, app.v_user_balance, app.v_daily_stats
    TO app_user;

GRANT SELECT, INSERT, UPDATE ON
    app.app_user, app."order", app.order_item, app.account_entry
    TO app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO app_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;

-- =====================================================================
-- MINIMALE STAMMDATEN
-- =====================================================================
INSERT INTO app.category(name) VALUES
                                   ('Getränke'),('Snacks'),('Hauptgerichte')
    ON CONFLICT DO NOTHING;

INSERT INTO app.allergen(code, name) VALUES
                                         ('A','Gluten'),('B','Krebstiere'),('C','Eier'),('D','Fisch'),
                                         ('E','Erdnüsse'),('F','Soja'),('G','Milch'),('H','Schalenfrüchte')
    ON CONFLICT DO NOTHING;

INSERT INTO app.user_class(name) VALUES ('1A'),('1B'),('2A')
    ON CONFLICT DO NOTHING;
