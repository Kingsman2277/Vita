-- Customizable per-user workout programs.
--
-- Three things bundled here so it's one SQL paste:
--   1. Dedupe any existing workout_logs duplicates (root cause was
--      a race in the auto-populate; the hook fix prevents new ones).
--   2. Move workout_templates from a shared table to per-user. Each
--      user gets their own 5-day program they can edit/clear/reset.
--      Trigger seeds defaults on signup; existing users without
--      templates get them backfilled. Admin keeps read access.
--   3. Update admin_user_recent to only show COMPLETED workouts in
--      the activity timeline.
--
-- Safe to re-run.

-- ─── 1. Dedupe existing workout_logs ────────────────────────────────────
-- Keep one row per (user, date, exercise_order). Preference order:
-- completed first, then rows with weight or note, then oldest.

with ranked as (
  select id,
    row_number() over (
      partition by user_id, date, exercise_order
      order by
        completed desc,
        (case when weight_used is not null then 1 else 0 end) desc,
        (case when note is not null then 1 else 0 end) desc,
        created_at asc
    ) as rn
  from public.workout_logs
)
delete from public.workout_logs
where id in (select id from ranked where rn > 1);

-- ─── 2. Per-user workout_templates ──────────────────────────────────────

-- 2a. Add user_id column (nullable while we backfill)
alter table public.workout_templates
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2b. Backfill any pre-existing rows (the shared ones) to the admin
update public.workout_templates
set user_id = (select id from auth.users order by created_at asc limit 1)
where user_id is null;

-- 2c. NOT NULL + default auth.uid() for future inserts
alter table public.workout_templates alter column user_id set not null;
alter table public.workout_templates alter column user_id set default auth.uid();

-- 2d. Swap UNIQUE from (day, order) → (user, day, order)
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

-- 2e. Replace the shared "auth all" RLS with user-scoped policies
alter table public.workout_templates enable row level security;
drop policy if exists "auth all workout_templates" on public.workout_templates;
drop policy if exists "user owns workout_templates" on public.workout_templates;
drop policy if exists "admin reads workout_templates" on public.workout_templates;
create policy "user owns workout_templates" on public.workout_templates
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "admin reads workout_templates" on public.workout_templates
  for select to authenticated
  using (public.is_admin());

-- 2f. Seed function — inserts the default 5-day program for a user.
-- Idempotent via ON CONFLICT DO NOTHING.

create or replace function public.seed_default_workout_program(p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
begin
  insert into public.workout_templates
    (user_id, day_of_week, day_label, exercise_order, exercise_name, sets_reps, cue, muscle_group)
  values
    -- Monday — Full Body A
    (p_user_id, 1, 'Full Body A', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                  'cardio'),
    (p_user_id, 1, 'Full Body A', 2, 'Leg Press',                  '4 x 12',     'Moderate weight, full ROM, push through heels', 'legs'),
    (p_user_id, 1, 'Full Body A', 3, 'Chest Press Machine',        '3 x 12',     'Control the negative — 3 seconds down',         'push'),
    (p_user_id, 1, 'Full Body A', 4, 'Lat Pulldown',               '3 x 12',     'Wide grip, squeeze at bottom',                  'pull'),
    (p_user_id, 1, 'Full Body A', 5, 'Cable Rows (seated)',        '3 x 12',     'Keep back straight, pull to belly',             'pull'),
    (p_user_id, 1, 'Full Body A', 6, 'Bicep Curls (cable)',        '3 x 15',     'Slow curl, squeeze at top',                     'arms'),
    (p_user_id, 1, 'Full Body A', 7, 'Tricep Pushdown (cable)',    '3 x 15',     'Lock elbows, full extension',                   'arms'),
    (p_user_id, 1, 'Full Body A', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),
    -- Tuesday — Full Body B
    (p_user_id, 2, 'Full Body B', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                   'cardio'),
    (p_user_id, 2, 'Full Body B', 2, 'Leg Extensions',             '4 x 15',     'Squeeze at top, 2 sec hold',                    'legs'),
    (p_user_id, 2, 'Full Body B', 3, 'Chest Fly Machine',          '3 x 12',     'Slow controlled arc',                           'push'),
    (p_user_id, 2, 'Full Body B', 4, 'Chest Pull / Reverse Fly',   '3 x 12',     'Pinch shoulder blades',                         'pull'),
    (p_user_id, 2, 'Full Body B', 5, 'Cable Lateral Raises',       '3 x 15',     'Light weight, slow, no swinging',               'push'),
    (p_user_id, 2, 'Full Body B', 6, 'Cable Curls (rope)',         '3 x 15',     'Twist at top for peak',                         'arms'),
    (p_user_id, 2, 'Full Body B', 7, 'Overhead Tricep Ext (cable)','3 x 12',     'Keep elbows locked forward',                    'arms'),
    (p_user_id, 2, 'Full Body B', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),
    -- Wednesday — Full Body C
    (p_user_id, 3, 'Full Body C', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                   'cardio'),
    (p_user_id, 3, 'Full Body C', 2, 'Leg Press (wide stance)',    '4 x 12',     'Feet high + wide for glutes/hams',              'legs'),
    (p_user_id, 3, 'Full Body C', 3, 'Bench Machine (incline)',    '3 x 12',     'Upper chest focus',                             'push'),
    (p_user_id, 3, 'Full Body C', 4, 'Lat Pulldown (close grip)',  '3 x 12',     'Underhand grip, pull to chest',                 'pull'),
    (p_user_id, 3, 'Full Body C', 5, 'Cable Face Pulls',           '3 x 15',     'High cable, pull to face, elbows high',         'pull'),
    (p_user_id, 3, 'Full Body C', 6, 'Cable Hammer Curls (rope)',  '3 x 12',     'Neutral grip',                                  'arms'),
    (p_user_id, 3, 'Full Body C', 7, 'Tricep Pushdown (bar)',      '3 x 15',     'Straight bar, full lockout',                    'arms'),
    (p_user_id, 3, 'Full Body C', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),
    -- Thursday — Full Body D
    (p_user_id, 4, 'Full Body D', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                   'cardio'),
    (p_user_id, 4, 'Full Body D', 2, 'Leg Extensions',             '3 x 15',     'Light, high reps for burn',                     'legs'),
    (p_user_id, 4, 'Full Body D', 3, 'Leg Press',                  '3 x 12',     'Go heavier than Monday',                        'legs'),
    (p_user_id, 4, 'Full Body D', 4, 'Chest Press Machine',        '4 x 10',     'Heavier weight, lower reps',                    'push'),
    (p_user_id, 4, 'Full Body D', 5, 'Cable Rows (wide grip)',     '3 x 12',     'Wide handle attachment',                        'pull'),
    (p_user_id, 4, 'Full Body D', 6, 'Cable Curls (single arm)',   '3 x 12/arm', 'Focus on squeeze',                              'arms'),
    (p_user_id, 4, 'Full Body D', 7, 'Dips Machine',               '3 x 12',     'Or tricep pushdown if not available',           'arms'),
    (p_user_id, 4, 'Full Body D', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),
    -- Friday — Full Body E
    (p_user_id, 5, 'Full Body E', 1, 'Incline Treadmill Walk',     '20 min',     '15% incline, 3.5 mph — extended cardio',        'cardio'),
    (p_user_id, 5, 'Full Body E', 2, 'Leg Press',                  '4 x 15',     'Lighter weight, higher reps, burn out',         'legs'),
    (p_user_id, 5, 'Full Body E', 3, 'Chest Fly Machine',          '3 x 15',     'Light, feel the stretch',                       'push'),
    (p_user_id, 5, 'Full Body E', 4, 'Lat Pulldown (wide)',        '3 x 15',     'Light, full stretch at top',                    'pull'),
    (p_user_id, 5, 'Full Body E', 5, 'Chest Pull / Reverse Fly',   '3 x 15',     'Light, high reps',                              'pull'),
    (p_user_id, 5, 'Full Body E', 6, 'Cable Curl + Pushdown SS',   '3 x 15 each','Superset — no rest between',                    'arms'),
    (p_user_id, 5, 'Full Body E', 7, 'Cable Woodchops',            '3 x 12/side','High to low, engage core',                      'arms'),
    (p_user_id, 5, 'Full Body E', 8, 'Incline Treadmill Walk',     '10 min',     '12% incline, 3.0 mph — easy cooldown',          'cardio')
  on conflict (user_id, day_of_week, exercise_order) do nothing;
end;
$$;

grant execute on function public.seed_default_workout_program(uuid) to authenticated;

-- 2g. Admin-only RPC users call to reset their own program. They could
-- also just call the seed function themselves, but going through this
-- keeps the surface area small.

create or replace function public.reset_my_workout_program()
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.workout_templates where user_id = uid;
  perform public.seed_default_workout_program(uid);
end;
$$;

grant execute on function public.reset_my_workout_program() to authenticated;

-- 2h. Wipe the user's program entirely (no re-seed).
-- Also clears upcoming (date >= today) workout_logs so the auto-
-- populate doesn't re-seed empty rows for past templates.

create or replace function public.clear_my_workout_program()
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.workout_templates where user_id = uid;
  delete from public.workout_logs
   where user_id = uid
     and date >= (current_date at time zone 'UTC')::date;
end;
$$;

grant execute on function public.clear_my_workout_program() to authenticated;

-- 2i. Backfill: seed the default program for any existing auth user
-- who doesn't yet have templates. matteo's pre-existing 40 rows will
-- be no-ops thanks to ON CONFLICT; partner gets 40 fresh rows.

do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform public.seed_default_workout_program(u.id);
  end loop;
end $$;

-- 2j. Trigger: every new signup gets the default program automatically.

create or replace function public.seed_program_for_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  perform public.seed_default_workout_program(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_seed_workout on auth.users;
create trigger on_auth_user_created_seed_workout
  after insert on auth.users
  for each row execute procedure public.seed_program_for_new_user();

-- ─── 3. Admin sees only COMPLETED workouts in activity timeline ─────────

create or replace function public.admin_user_recent(
  target_user_id uuid,
  days_back int default 14
)
returns table (
  kind text,
  item text,
  amount text,
  ts timestamptz
)
language plpgsql stable security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;
  return query
    select 'food'::text,
           coalesce(food_logs.food_name, '(unnamed)')::text,
           (round(food_logs.calories) || ' cal')::text,
           food_logs.logged_at
    from public.food_logs
    where food_logs.user_id = target_user_id
      and food_logs.logged_at > now() - (days_back || ' days')::interval
    union all
    select 'expense'::text,
           coalesce(expenses.note, expenses.category, 'expense')::text,
           ('$' || expenses.amount::text)::text,
           expenses.created_at
    from public.expenses
    where expenses.user_id = target_user_id
      and expenses.created_at > now() - (days_back || ' days')::interval
    union all
    select 'weight'::text,
           ('weight entry')::text,
           (weight_logs.weight::text || ' lbs')::text,
           weight_logs.created_at
    from public.weight_logs
    where weight_logs.user_id = target_user_id
      and weight_logs.created_at > now() - (days_back || ' days')::interval
    union all
    -- Only show COMPLETED exercises. Pending rows from auto-populate
    -- aren't activity — they're empty checklist slots.
    select 'workout'::text,
           workout_logs.exercise_name::text,
           'completed'::text,
           workout_logs.created_at
    from public.workout_logs
    where workout_logs.user_id = target_user_id
      and workout_logs.created_at > now() - (days_back || ' days')::interval
      and workout_logs.completed = true
    order by 4 desc;
end;
$$;

grant execute on function public.admin_user_recent(uuid, int) to authenticated;
