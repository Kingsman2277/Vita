-- Add micronutrient tracking to food_logs.
-- Uses a JSONB column so we can add new micronutrients without schema changes.
-- Safe to re-run.

alter table food_logs add column if not exists micronutrients jsonb;

-- Example shape stored in the column:
-- {
--   "fiber_g": 5.2,
--   "sugar_g": 12,
--   "sodium_mg": 450,
--   "cholesterol_mg": 200,
--   "saturated_fat_g": 8,
--   "vitamin_a_mcg": 300,
--   "vitamin_c_mg": 15,
--   "vitamin_d_mcg": 2,
--   "calcium_mg": 200,
--   "iron_mg": 4.5,
--   "potassium_mg": 500,
--   "magnesium_mg": 80
-- }
