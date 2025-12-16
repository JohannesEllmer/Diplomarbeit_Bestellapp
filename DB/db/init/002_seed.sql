SET search_path TO app, public;

-- Extensions (falls noch nicht vorhanden)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO app.users
  (id, name, email, class, school_type, balance, blocked, email_verified, role, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Max Mustermann', 'max@example.com', '3A', 'HTL', 25.00, FALSE, TRUE, 'KUNDE', now() - interval '30 days', now() - interval '1 day'),
  ('22222222-2222-2222-2222-222222222222', 'Anna Schmidt', 'anna@example.com', '4B', 'HAK', 15.50, FALSE, TRUE, 'KUNDE', now() - interval '20 days', now() - interval '2 days'),
  ('33333333-3333-3333-3333-333333333333', 'Kantinen Chef', 'chef@example.com', 'Küche', 'HTL', 100.00, FALSE, TRUE, 'INHABER', now() - interval '200 days', now()),
  ('99999999-9999-9999-9999-999999999999', 'Admin User', 'admin@example.com', 'Admin', 'HAK', 0.00, FALSE, TRUE, 'ADMIN', now() - interval '365 days', now())
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  email=EXCLUDED.email,
  class=EXCLUDED.class,
  school_type=EXCLUDED.school_type,
  balance=EXCLUDED.balance,
  blocked=EXCLUDED.blocked,
  email_verified=EXCLUDED.email_verified,
  role=EXCLUDED.role,
  updated_at=now();

INSERT INTO app.auth_credentials (user_id, password_hash, auth_token, created_at, last_used_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '$2b$10$q7n3cU0G9t3Iu8aS8hHj2eVjE4gF3Q8tG3YwR0w0o0yH6c9r7cN7u', gen_random_uuid(), now() - interval '30 days', now() - interval '1 day'),
  ('22222222-2222-2222-2222-222222222222', '$2b$10$9lF0z6m7mHqN4q7y7jGgC.Ox3w7fNQ3uE6T7w0aJm7gqk9oZBvB7S', gen_random_uuid(), now() - interval '20 days', now() - interval '2 days'),
  ('33333333-3333-3333-3333-333333333333', '$2b$10$0a8xjQeXc1v0zj8mQHh8Oe2yYB0jv6m9bCwQw7r1x8fJw1m0k2m0u', gen_random_uuid(), now() - interval '200 days', now() - interval '1 day'),
  ('99999999-9999-9999-9999-999999999999', '$2b$10$3GJk8mGQ1c1cQ5R2m1d9k.8m7uG3o8P1i7u7P5n7xQ0y0m3w2Wl9e', gen_random_uuid(), now() - interval '365 days', now() - interval '3 days')
ON CONFLICT (user_id) DO UPDATE SET
  password_hash=EXCLUDED.password_hash,
  auth_token=EXCLUDED.auth_token;

INSERT INTO app.menu_items (id, name, description, price, category, available, vegetarian, allergens)
VALUES
  ('44444444-4444-4444-4444-444444444441', 'Spaghetti Bolognese', 'mit Rindfleischsauce', 5.50, 'Hauptgericht', TRUE, FALSE, ARRAY['GLUTEN']::TEXT[]),
  ('44444444-4444-4444-4444-444444444442', 'Gemüselasagne', 'vegetarische Lasagne mit Käse', 5.20, 'Hauptgericht', TRUE, TRUE, ARRAY['GLUTEN','MILCH']::TEXT[]),
  ('44444444-4444-4444-4444-444444444443', 'Salatbox', 'gemischter Salat mit Dressing', 3.00, 'Beilage', TRUE, TRUE, ARRAY['SENF']::TEXT[]),
  ('44444444-4444-4444-4444-444444444444', 'Wiener Schnitzel', 'paniert, mit Kartoffeln', 6.90, 'Hauptgericht', TRUE, FALSE, ARRAY['GLUTEN','EI']::TEXT[]),
  ('44444444-4444-4444-4444-444444444445', 'Cola 0,5l', 'kalt serviert', 1.80, 'Getränk', TRUE, TRUE, ARRAY[]::TEXT[]),
  ('44444444-4444-4444-4444-444444444446', 'Mineralwasser 0,5l', 'still/prickelnd', 1.20, 'Getränk', TRUE, TRUE, ARRAY[]::TEXT[]),
  ('44444444-4444-4444-4444-444444444447', 'Apfelstrudel', 'mit Vanillesauce', 2.90, 'Dessert', TRUE, TRUE, ARRAY['GLUTEN','EI','MILCH']::TEXT[])
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  price=EXCLUDED.price,
  category=EXCLUDED.category,
  available=EXCLUDED.available,
  vegetarian=EXCLUDED.vegetarian,
  allergens=EXCLUDED.allergens;

INSERT INTO app.dishes (id, name, description, price, allergenes)
VALUES
  ('55555555-5555-5555-5555-555555555551', 'Pizzastück Margherita', 'mit Tomate und Käse', 2.50, ARRAY['GLUTEN','MILCH']::TEXT[]),
  ('55555555-5555-5555-5555-555555555552', 'Hühnerschnitzel', 'paniert, mit Pommes', 6.20, ARRAY['GLUTEN','EI']::TEXT[]),
  ('55555555-5555-5555-5555-555555555553', 'Obstteller', 'frische Früchte', 2.00, ARRAY[]::TEXT[])
ON CONFLICT (id) DO UPDATE SET
  name=EXCLUDED.name,
  description=EXCLUDED.description,
  price=EXCLUDED.price,
  allergenes=EXCLUDED.allergenes;

INSERT INTO app.menus (id, title, dish_menu_item_id, drink, dessert)
VALUES
  ('66666666-6666-6666-6666-666666666661', 'Montagsmenü', '44444444-4444-4444-4444-444444444441', 'Apfelsaft', 'Pudding'),
  ('66666666-6666-6666-6666-666666666662', 'Dienstagsmenü', '44444444-4444-4444-4444-444444444442', 'Wasser', 'Joghurt'),
  ('66666666-6666-6666-6666-666666666663', 'Mittwochsmenü', '44444444-4444-4444-4444-444444444443', 'Tee', 'Obstsalat'),
  ('66666666-6666-6666-6666-666666666664', 'Donnerstagsmenü', '44444444-4444-4444-4444-444444444444', 'Mineralwasser', 'Apfelstrudel'),
  ('66666666-6666-6666-6666-666666666665', 'Freitagsmenü', '44444444-4444-4444-4444-444444444441', 'Cola', 'Joghurt')
ON CONFLICT (id) DO UPDATE SET
  title=EXCLUDED.title,
  dish_menu_item_id=EXCLUDED.dish_menu_item_id,
  drink=EXCLUDED.drink,
  dessert=EXCLUDED.dessert;

INSERT INTO app.meal_plans (id, title)
VALUES
  ('77777777-7777-7777-7777-777777777771', 'Wochenplan KW01'),
  ('77777777-7777-7777-7777-777777777772', 'Wochenplan KW02'),
  ('77777777-7777-7777-7777-777777777773', 'Wochenplan KW03')
ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title;

INSERT INTO app.meal_plan_dishes (meal_plan_id, dish_id)
VALUES
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555551'),
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555552'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555552'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555553'),
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555551'),
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555553')
ON CONFLICT DO NOTHING;

INSERT INTO app.orders (id, user_id, total_price, created_at, status, qr_code_url)
VALUES
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', 8.50,  now() - interval '2 days',  'closed', 'https://example.com/qr/1'),
  ('88888888-8888-8888-8888-888888888882', '22222222-2222-2222-2222-222222222222', 5.20,  now() - interval '1 days',  'closed', 'https://example.com/qr/2'),
  ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', 10.70, now(),                 'open',   'https://example.com/qr/3'),

  -- zusätzliche Orders für bessere Statistik (letzte 14 Tage)
  ('88888888-8888-8888-8888-888888888884', '22222222-2222-2222-2222-222222222222', 12.10, now() - interval '4 days',  'closed', 'https://example.com/qr/4'),
  ('88888888-8888-8888-8888-888888888885', '11111111-1111-1111-1111-111111111111',  7.40, now() - interval '6 days',  'closed', 'https://example.com/qr/5'),
  ('88888888-8888-8888-8888-888888888886', '11111111-1111-1111-1111-111111111111',  9.10, now() - interval '9 days',  'closed', 'https://example.com/qr/6'),
  ('88888888-8888-8888-8888-888888888887', '22222222-2222-2222-2222-222222222222',  4.20, now() - interval '12 days', 'closed', 'https://example.com/qr/7')
ON CONFLICT (id) DO UPDATE SET
  user_id=EXCLUDED.user_id,
  total_price=EXCLUDED.total_price,
  created_at=EXCLUDED.created_at,
  status=EXCLUDED.status,
  qr_code_url=EXCLUDED.qr_code_url;


INSERT INTO app.order_items (order_id, menu_item_id, user_id, note, quantity, delivered, delivery_time)
VALUES
  -- Order 1 (Max)
  ('88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'ohne Käse', 1, TRUE,  now() - interval '2 days'),
  ('88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '',         1, TRUE,  now() - interval '2 days'),

  -- Order 2 (Anna)
  ('88888888-8888-8888-8888-888888888882', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'extra Käse', 1, TRUE, now() - interval '1 days'),

  -- Order 3 (Max, heute offen)
  ('88888888-8888-8888-8888-888888888883', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '',          1, FALSE, NULL),
  ('88888888-8888-8888-8888-888888888883', '44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'ohne Sauce', 1, FALSE, NULL),
  ('88888888-8888-8888-8888-888888888883', '44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', 'Dressing extra', 1, FALSE, NULL),

  -- Order 4 (Anna)
  ('88888888-8888-8888-8888-888888888884', '44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', '', 1, TRUE, now() - interval '4 days'),
  ('88888888-8888-8888-8888-888888888884', '44444444-4444-4444-4444-444444444445', '22222222-2222-2222-2222-222222222222', '', 1, TRUE, now() - interval '4 days'),

  -- Order 5 (Max)
  ('88888888-8888-8888-8888-888888888885', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '', 1, TRUE, now() - interval '6 days'),
  ('88888888-8888-8888-8888-888888888885', '44444444-4444-4444-4444-444444444446', '11111111-1111-1111-1111-111111111111', '', 1, TRUE, now() - interval '6 days'),

  -- Order 6 (Max)
  ('88888888-8888-8888-8888-888888888886', '44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'extra Käse', 1, TRUE, now() - interval '9 days'),

  -- Order 7 (Anna)
  ('88888888-8888-8888-8888-888888888887', '44444444-4444-4444-4444-444444444447', '22222222-2222-2222-2222-222222222222', '', 1, TRUE, now() - interval '12 days')
ON CONFLICT DO NOTHING;

