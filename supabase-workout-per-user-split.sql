-- Per-user workout_templates split.
--
-- Before this migration, workout_templates was a shared table (no
-- user_id), which meant any user editing the Program Editor wrote to
-- everyone's program. This makes templates per-user with RLS scoping.
--
-- Backfills existing rows to matteo (the only user who'd started
-- entering exercises). No default-program seeding — empty programs
-- are filled in by the user via the Program Editor.
--
-- Safe to re-run.

-- 1. Add user_id column (nullable while we backfill)
alter table public.workout_templates
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2. Backfill any pre-existing rows to the admin (matteo).
update public.workout_templates
set user_id = 'e6ef5e16-5953-4579-ac2e-3f86c91ca70e'
where user_id is null;

-- 3. NOT NULL + default auth.uid() so client inserts (which don't
--    pass user_id) automatically pick up the caller's id.
alter table public.workout_templates alter column user_id set default auth.uid();
alter table public.workout_templates alter column user_id set not null;

-- 4. Swap UNIQUE from (day, order) → (user, day, order) so each user
--    can have their own row at any (day, order) slot.
alter table public.workout_templates
  drop constraint if exists workout_templates_day_of_week_exercise_order_key;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_templates_user_day_order_key'
  ) then
    alter table public.workout_templates
      add constraint workout_templates_user_day_order_key
      unique (user_id, day_of_week, exercise_order);
  end if;
end $$;

create index if not exists workout_templates_user_id_idx
  on public.workout_templates(user_id);

-- 5. Replace the shared "auth all" RLS with a single user-scoped
--    policy. Intentionally NO "admin reads" policy — that pattern
--    leaks every user's templates into the admin's personal Workout
--    page (Postgres OR's the policies). Cross-user admin reads should
--    go through SECURITY DEFINER RPCs instead.
alter table public.workout_templates enable row level security;
drop policy if exists "auth all workout_templates" on public.workout_templates;
drop policy if exists "user owns workout_templates" on public.workout_templates;
drop policy if exists "admin reads workout_templates" on public.workout_templates;
create policy "user owns workout_templates" on public.workout_templates
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
