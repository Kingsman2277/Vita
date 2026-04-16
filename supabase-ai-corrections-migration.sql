-- AI corrections learning loop.
-- Stores (AI estimate, user final) pairs so future prompts can include
-- "you've adjusted similar items this way" as context.
-- Safe to re-run.

create table if not exists ai_corrections (
  id uuid default gen_random_uuid() primary key,
  -- Input the AI saw: 'photo:<food_name>' or 'text:<original query>'
  source text not null,
  -- Normalized dish name AI returned, used for lookups
  ai_food_name text,
  ai_description text,
  ai_calories numeric,
  ai_protein numeric,
  ai_carbs numeric,
  ai_fat numeric,
  -- What the user actually saved
  user_food_name text,
  user_calories numeric,
  user_protein numeric,
  user_carbs numeric,
  user_fat numeric,
  created_at timestamptz default now()
);

create index if not exists ai_corrections_food_name_idx on ai_corrections using gin (to_tsvector('english', coalesce(ai_food_name, '')));
create index if not exists ai_corrections_created_at_idx on ai_corrections (created_at desc);

alter table ai_corrections enable row level security;
drop policy if exists "auth all ai_corrections" on ai_corrections;
create policy "auth all ai_corrections" on ai_corrections
  for all to authenticated
  using (true) with check (true);
