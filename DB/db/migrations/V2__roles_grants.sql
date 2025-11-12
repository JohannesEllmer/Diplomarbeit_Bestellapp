SET search_path TO app, public;

-- ROLES
DO $$BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_admin') THEN CREATE ROLE app_admin NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_user')  THEN CREATE ROLE app_user  NOINHERIT; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_ro')    THEN CREATE ROLE app_ro    NOINHERIT; END IF;
END$$;

-- SCHEMA USAGE
GRANT USAGE ON SCHEMA app TO app_admin, app_user, app_ro;

-- PRIVILEGES
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_admin;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_ro;

-- App-Rechte (minimal)
GRANT SELECT ON app.category, app.allergen, app.menu_item, app.menuitem_allergen TO app_user;
GRANT SELECT, INSERT, UPDATE ON app.app_user, app."order", app.order_item, app.account_entry TO app_user;

-- Default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO app_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_admin;

-- RLS einschalten
ALTER TABLE app."order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.account_entry ENABLE ROW LEVEL SECURITY;

-- Policies: Benutzer sieht/bearbeitet nur seine eigenen Daten
DROP POLICY IF EXISTS order_is_owner ON app."order";
CREATE POLICY order_is_owner
  ON app."order"
  FOR ALL
  TO app_user
  USING (user_id = app.current_user_uuid())
  WITH CHECK (user_id = app.current_user_uuid());

DROP POLICY IF EXISTS account_is_owner ON app.account_entry;
CREATE POLICY account_is_owner
  ON app.account_entry
  FOR ALL
  TO app_user
  USING (user_id = app.current_user_uuid())
  WITH CHECK (user_id = app.current_user_uuid());
