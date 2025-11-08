-- Laufzeit-Logins anlegen und Rollen zuweisen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'api_app_user') THEN
CREATE ROLE api_app_user LOGIN PASSWORD 'api_app_user_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
GRANT app_user TO api_app_user;
ALTER ROLE api_app_user IN DATABASE appdb SET search_path = app, public;
END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin_app_user') THEN
CREATE ROLE admin_app_user LOGIN PASSWORD 'admin_app_user_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
GRANT app_admin TO admin_app_user;
ALTER ROLE admin_app_user IN DATABASE appdb SET search_path = app, public;
END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ro_app_user') THEN
CREATE ROLE ro_app_user LOGIN PASSWORD 'ro_app_user_pw' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT;
GRANT app_ro TO ro_app_user;
ALTER ROLE ro_app_user IN DATABASE appdb SET search_path = app, public;
END IF;
END$$;
