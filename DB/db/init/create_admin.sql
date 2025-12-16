-- Erstellt einen Admin-Benutzer in der Datenbank

SET search_path TO app, public;

-- Anzeigename
\set admin_name 'System Administrator'

-- Mailadresse
\set admin_email 'admin.test@htl-saalfelden.at'

-- Klasse
\set admin_class 'ADMIN'

-- Schultyp
\set admin_school 'HTL'

-- Beispiel-Hash für Passwort "admin123"
\set admin_hash '$2b$10$GvBzLfR7dNhha0tU4G/dao1Fpg/Hv0N5bC0mujWhABfA7pBEV79bi'

-- Neue UUIDs generieren lassen
SELECT gen_random_uuid() AS admin_id \gset
SELECT gen_random_uuid() AS session_id \gset

INSERT INTO users (id, name, email, class, school_type, balance, blocked, role)
VALUES (
  :'admin_id',
  :'admin_name',
  :'admin_email',
  :'admin_class',
  :'admin_school',
  0,
  FALSE,
  'ADMIN'
);

INSERT INTO auth_credentials (user_id, password_hash, auth_token)
VALUES (
  :'admin_id',
  :'admin_hash',
  :'session_id'
);

SELECT 'Admin-Account erfolgreich erstellt!' AS message;
SELECT :'admin_email' AS email, :'admin_id' AS user_id;
