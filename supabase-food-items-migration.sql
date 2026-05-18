-- Persist the AI's per-item breakdown on each food_log row.
--
-- Currently the AI returns an items array (e.g. [{name: "bun",
-- portion: "2", calories: 280, ...}, {name: "patty", ...}]) and the
-- Add Food modal shows it in a breakdown card. We've been throwing
-- it away on save. This adds a jsonb column to keep it, so when the
-- user re-opens a past entry they see the same item-by-item math.
--
-- Old entries (logged before this migration) just have items = null
-- and the breakdown card simply doesn't render — graceful degrade.
--
-- Safe to re-run.

alter table public.food_logs add column if not exists items jsonb;

-- Example shape stored in the column:
-- [
--   { "name": "burger bun",      "portion": "2",           "calories": 280,
--     "protein_g": 10, "carbs_g": 52, "fat_g": 6 },
--   { "name": "smash patty",     "portion": "4 x 2 oz",    "calories": 720,
--     "protein_g": 72, "carbs_g": 0,  "fat_g": 44 },
--   { "name": "fries",           "portion": "1 home portion",
--     "calories": 325, "protein_g": 4, "carbs_g": 46, "fat_g": 20 }
-- ]
