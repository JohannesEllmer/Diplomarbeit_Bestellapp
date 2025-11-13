-- 004_menu.sql
SET search_path TO app, public;

-- =========================
-- MENÜ-PLAN & ZUORDNUNGEN
-- =========================

-- Menü-Plan (z. B. "Tagesmenü", "Vegetarisches Menü", "Bayerische Spezialitäten")
CREATE TABLE IF NOT EXISTS app.menu_plan (
                                             id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title         TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
    description   TEXT,
    is_published  BOOLEAN NOT NULL DEFAULT FALSE,
    created_by    UUID REFERENCES app.app_user(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

-- Zuordnung: welche MenuItems gehören zu welchem Plan (+ sortierbare Position)
CREATE TABLE IF NOT EXISTS app.menu_plan_item (
                                                  menu_plan_id  UUID NOT NULL REFERENCES app.menu_plan(id) ON DELETE CASCADE,
    menu_item_id  UUID NOT NULL REFERENCES app.menu_item(id) ON DELETE RESTRICT,
    position      INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1),
    note          TEXT,
    PRIMARY KEY (menu_plan_id, menu_item_id)
    );

CREATE INDEX IF NOT EXISTS idx_menu_plan_item_plan  ON app.menu_plan_item(menu_plan_id, position);
CREATE INDEX IF NOT EXISTS idx_menu_plan_item_item  ON app.menu_plan_item(menu_item_id);

-- Tagesmenü: optional – welcher Plan gilt an welchem Datum
CREATE TABLE IF NOT EXISTS app.daily_menu (
                                              id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date          DATE NOT NULL UNIQUE,
    menu_plan_id  UUID NOT NULL REFERENCES app.menu_plan(id) ON DELETE RESTRICT,
    published     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE INDEX IF NOT EXISTS idx_daily_menu_plan ON app.daily_menu(menu_plan_id);

-- Optionale Lieferzeitfenster (für FE-Dropdown "12:20", "13:10", etc.)
CREATE TABLE IF NOT EXISTS app.delivery_slot (
                                                 id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label         TEXT NOT NULL,                -- z.B. "12:20"
    start_time    TIME NOT NULL,                -- 12:20:00
    end_time      TIME,                         -- optional
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    position      INTEGER NOT NULL DEFAULT 1 CHECK (position >= 1)
    );

CREATE INDEX IF NOT EXISTS idx_delivery_slot_active ON app.delivery_slot(active, position);

-- View: veröffentlichte Menü-Pläne mit ihren Items (für public/ro Zugriffe)
CREATE OR REPLACE VIEW app.v_menu_plan_with_items AS
SELECT
    mp.id AS menu_plan_id,
    mp.title,
    mp.description,
    mp.is_published,
    jsonb_agg(
            jsonb_build_object(
                    'id', mi.id,
                    'name', mi.name,
                    'description', mi.description,
                    'price', mi.price,
                    'category', c.name,
                    'available', mi.available,
                    'vegetarian', mi.vegetarian,
                    'allergens', (
                        SELECT jsonb_agg(a.code ORDER BY a.code)
                        FROM app.menuitem_allergen ma
                                 JOIN app.allergen a ON a.id = ma.allergen_id
                        WHERE ma.menu_item_id = mi.id
                    ),
                    'position', mpi.position
            )
                ORDER BY mpi.position
    ) AS items
FROM app.menu_plan mp
         JOIN app.menu_plan_item mpi ON mpi.menu_plan_id = mp.id
         JOIN app.menu_item mi ON mi.id = mpi.menu_item_id
         LEFT JOIN app.category c ON c.id = mi.category_id
WHERE mp.is_published = TRUE
GROUP BY mp.id;

-- View: Tagesmenü (heute/Datum) direkt mit aufgelöstem Plan
CREATE OR REPLACE VIEW app.v_daily_menu_full AS
SELECT
    dm.date,
    dm.published,
    mp.id   AS menu_plan_id,
    mp.title,
    mp.description,
    (SELECT items FROM app.v_menu_plan_with_items x WHERE x.menu_plan_id = mp.id) AS items
FROM app.daily_menu dm
         JOIN app.menu_plan mp ON mp.id = dm.menu_plan_id;

-- =========================
-- RECHTE / GRANTS / RLS
-- =========================

-- Menü-Daten sind "öffentlich lesbar" (für app_user und app_ro).
GRANT SELECT ON app.menu_plan, app.menu_plan_item, app.daily_menu, app.delivery_slot TO app_user, app_ro;
GRANT SELECT ON app.v_menu_plan_with_items, app.v_daily_menu_full TO app_user, app_ro;

-- Für Admin-Tools:
GRANT INSERT, UPDATE, DELETE ON app.menu_plan, app.menu_plan_item, app.daily_menu, app.delivery_slot TO app_admin;

-- Optional: Wenn du RLS auch auf Menü-Tabellen willst (meist nicht nötig):
-- ALTER TABLE app.menu_plan ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY menu_plan_ro ON app.menu_plan FOR SELECT TO app_user, app_ro USING (is_published);
-- (meist reicht aber SELECT-Grant + is_published-Filter in Views)

-- =========================
-- SEEDS (Beispiele)
-- =========================

-- Beispiel-Plan
INSERT INTO app.menu_plan (title, description, is_published)
VALUES ('Tagesmenü', 'Standard-Tagesauswahl', TRUE)
    ON CONFLICT DO NOTHING;

-- Ein paar Items an Plan hängen (wenn es sie gibt)
DO $$
DECLARE
plan_id UUID;
  mi_id UUID;
BEGIN
SELECT id INTO plan_id FROM app.menu_plan WHERE title = 'Tagesmenü' LIMIT 1;

-- Füge einige vorhandene menu_item per Name hinzu (nur wenn vorhanden)
FOR mi_id IN
SELECT mi.id FROM app.menu_item mi WHERE mi.available = TRUE LIMIT 5
  LOOP
INSERT INTO app.menu_plan_item (menu_plan_id, menu_item_id, position)
VALUES (plan_id, mi_id, COALESCE((SELECT MAX(position)+1 FROM app.menu_plan_item WHERE menu_plan_id = plan_id), 1))
ON CONFLICT DO NOTHING;
END LOOP;
END$$;

-- Tagesmenü für heute veröffentlichen
INSERT INTO app.daily_menu (date, menu_plan_id, published)
SELECT CURRENT_DATE, id, TRUE
FROM app.menu_plan
WHERE title = 'Tagesmenü'
    ON CONFLICT (date) DO NOTHING;

-- Liefer-Slots
INSERT INTO app.delivery_slot (label, start_time, position)
VALUES ('12:20', TIME '12:20', 1),
       ('13:10', TIME '13:10', 2)
    ON CONFLICT DO NOTHING;
