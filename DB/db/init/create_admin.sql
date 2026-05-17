SET search_path TO app, public;

\set admin_name 'System Administrator'

\set admin_email 'admin.test@htl-saalfelden.at'

\set admin_class 'ADMIN'

\set admin_school 'HTL'

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
