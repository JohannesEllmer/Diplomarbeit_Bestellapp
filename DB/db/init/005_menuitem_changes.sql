ALTER TABLE app.meal_plan_dishes
ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- optional (empfohlen), falls nicht vorhanden:
-- sorgt dafür, dass ein Dish nicht doppelt im gleichen Plan ist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'app'
      AND indexname = 'meal_plan_dishes_unique'
  ) THEN
    CREATE UNIQUE INDEX meal_plan_dishes_unique
    ON app.meal_plan_dishes (meal_plan_id, dish_id);
  END IF;
END $$;
