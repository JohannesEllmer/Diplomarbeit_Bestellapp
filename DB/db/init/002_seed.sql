SET search_path TO app, public;

----------------------
-- USERS
----------------------
INSERT INTO users (id, name, email, class, balance, blocked, role, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Max Mustermann', 'max@example.com', '3A', 25.00, FALSE, 'KUNDE', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Anna Schmidt', 'anna@example.com', '4B', 15.50, FALSE, 'KUNDE', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'Kantinen Chef', 'chef@example.com', 'Küche', 100.00, FALSE, 'INHABER', now(), now());

----------------------
-- AUTH CREDENTIALS
-- (Passwort-Hashes sind hier nur Platzhalter!)
----------------------
INSERT INTO auth_credentials (user_id, password_hash, auth_token, created_at, last_used_at) VALUES
  ('11111111-1111-1111-1111-111111111111', '$2b$10$max_hash_hash_hash_hashhash1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', now(), NULL),
  ('22222222-2222-2222-2222-222222222222', '$2b$10$anna_hash_hash_hash_hashhash2', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', now(), NULL),
  ('33333333-3333-3333-3333-333333333333', '$2b$10$chef_hash_hash_hash_hashhash3', 'cccccccc-cccc-cccc-cccc-cccccccccccc', now(), NULL);

----------------------
-- MENU ITEMS
----------------------
INSERT INTO menu_items (id, name, description, price, category, available, vegetarian, allergens) VALUES
  ('44444444-4444-4444-4444-444444444441', 'Spaghetti Bolognese', 'mit Rindfleischsauce', 5.50, 'Hauptgericht', TRUE, FALSE, ARRAY['GLUTEN']::TEXT[]),
  ('44444444-4444-4444-4444-444444444442', 'Gemüselasagne', 'vegetarische Lasagne mit Käse', 5.20, 'Hauptgericht', TRUE, TRUE, ARRAY['GLUTEN','MILCH']::TEXT[]),
  ('44444444-4444-4444-4444-444444444443', 'Salatbox', 'gemischter Salat mit Dressing', 3.00, 'Beilage', TRUE, TRUE, ARRAY['SENF']::TEXT[]);

----------------------
-- DISHES
----------------------
INSERT INTO dishes (id, name, description, price, allergenes) VALUES
  ('55555555-5555-5555-5555-555555555551', 'Pizzastück Margherita', 'mit Tomate und Käse', 2.50, ARRAY['GLUTEN','MILCH']::TEXT[]),
  ('55555555-5555-5555-5555-555555555552', 'Hühnerschnitzel', 'paniert, mit Pommes', 6.20, ARRAY['GLUTEN','EI']::TEXT[]),
  ('55555555-5555-5555-5555-555555555553', 'Obstteller', 'verschiedene frische Früchte', 2.00, ARRAY[]::TEXT[]);

----------------------
-- MENUS
----------------------
INSERT INTO menus (id, title, dish_menu_item_id, drink, dessert) VALUES
  ('66666666-6666-6666-6666-666666666661', 'Montagsmenü', '44444444-4444-4444-4444-444444444441', 'Apfelsaft', 'Pudding'),
  ('66666666-6666-6666-6666-666666666662', 'Dienstagsmenü', '44444444-4444-4444-4444-444444444442', 'Wasser', 'Joghurt'),
  ('66666666-6666-6666-6666-666666666663', 'Mittwochsmenü', '44444444-4444-4444-4444-444444444443', 'Tee', 'Obstsalat');

----------------------
-- MEAL PLANS
----------------------
INSERT INTO meal_plans (id, title) VALUES
  ('77777777-7777-7777-7777-777777777771', 'Wochenplan KW01'),
  ('77777777-7777-7777-7777-777777777772', 'Wochenplan KW02'),
  ('77777777-7777-7777-7777-777777777773', 'Wochenplan KW03');

----------------------
-- MEAL PLAN DISHES
----------------------
INSERT INTO meal_plan_dishes (meal_plan_id, dish_id) VALUES
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555551'),
  ('77777777-7777-7777-7777-777777777771', '55555555-5555-5555-5555-555555555552'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555552'),
  ('77777777-7777-7777-7777-777777777772', '55555555-5555-5555-5555-555555555553'),
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555551'),
  ('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555553');

----------------------
-- ORDERS
----------------------
INSERT INTO orders (id, user_id, total_price, created_at, status, qr_code_url) VALUES
  ('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', 8.50, now() - INTERVAL '2 days', 'closed', 'https://example.com/qr/1'),
  ('88888888-8888-8888-8888-888888888882', '22222222-2222-2222-2222-222222222222', 5.20, now() - INTERVAL '1 days', 'closed', 'https://example.com/qr/2'),
  ('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', 10.70, now(), 'open', 'https://example.com/qr/3');

----------------------
-- ORDER ITEMS
----------------------
INSERT INTO order_items (order_id, menu_item_id, user_id, note, quantity, delivered, delivery_time) VALUES
  -- Order 1 (Max)
  ('88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', 'ohne Käse', 1, TRUE, now() - INTERVAL '2 days'),
  ('88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', '', 1, TRUE, now() - INTERVAL '2 days'),

  -- Order 2 (Anna)
  ('88888888-8888-8888-8888-888888888882', '44444444-4444-4444-4444-444444444442', '22222222-2222-2222-2222-222222222222', 'extra Käse', 1, TRUE, now() - INTERVAL '1 days'),

  -- Order 3 (Max, heute, noch offen)
  ('88888888-8888-8888-8888-888888888883', '44444444-4444-4444-4444-444444444441', '11111111-1111-1111-1111-111111111111', '', 1, FALSE, NULL),
  ('88888888-8888-8888-8888-888888888883', '44444444-4444-4444-4444-444444444442', '11111111-1111-1111-1111-111111111111', 'ohne Sauce', 1, FALSE, NULL),
  ('88888888-8888-8888-8888-888888888883', '44444444-4444-4444-4444-444444444443', '11111111-1111-1111-1111-111111111111', 'Dressing extra', 1, FALSE, NULL);
