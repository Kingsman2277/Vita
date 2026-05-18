-- Multi-user migration (Phase 1).
--
-- Adds a user_id column to every per-user table, backfills your
-- existing rows to your account, replaces the wide-open "auth all"
-- RLS policies with strict user-scoped ones, and updates UNIQUE
-- constraints to be composite (user_id + the previous unique col).
--
-- After running this, every existing piece of data still belongs to
-- you and the app behaves identically. New accounts created in the
-- Supabase dashboard see zero data — their own clean slate. You can
-- still read/write everything via the app for your own account.
--
-- Safe to re-run — uses IF NOT EXISTS and `where user_id is null`
-- guards everywhere.
--
-- workout_templates intentionally stays shared (the 5-day program is
-- the same for everyone).

-- ─── 1. Add user_id columns ──────────────────────────────────────────────

alter table expenses           add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table food_logs          add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table recurring_expenses add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table budget             add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table goals              add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table weight_logs        add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table body_metrics       add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table workout_logs       add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table ai_corrections     add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- ─── 2. Backfill existing rows to the original account ──────────────────
--
-- Picks the oldest auth user (= you, since you're currently the only
-- one). Uses `where user_id is null` so re-runs don't reassign.

do $$
declare
  owner_id uuid;
  t text;
  tables text[] := array[
    'expenses', 'food_logs', 'recurring_expenses', 'budget',
    'goals', 'weight_logs', 'body_metrics', 'workout_logs',
    'ai_corrections'
  ];
begin
  select id into owner_id
  from auth.users
  order by created_at asc
  limit 1;

  if owner_id is null then
    raise exception 'No auth users found. Create your account in the Supabase dashboard before running this migration.';
  end if;

  raise notice 'Backfilling existing rows to user_id = %', owner_id;

  foreach t in array tables loop
    execute format('update %I set user_id = $1 where user_id is null', t) using owner_id;
  end loop;
end $$;

-- ─── 3. NOT NULL + default auth.uid() so future inserts auto-populate ───

alter table expenses           alter column user_id set not null;
alter table expenses           alter column user_id set default auth.uid();
alter table food_logs          alter column user_id set not null;
alter table food_logs          alter column user_id set default auth.uid();
alter table recurring_expenses alter column user_id set not null;
alter table recurring_expenses alter column user_id set default auth.uid();
alter table budget             alter column user_id set not null;
alter table budget             alter column user_id set default auth.uid();
alter table goals              alter column user_id set not null;
alter table goals              alter column user_id set default auth.uid();
alter table weight_logs        alter column user_id set not null;
alter table weight_logs        alter column user_id set default auth.uid();
alter table body_metrics       alter column user_id set not null;
alter table body_metrics       alter column user_id set default auth.uid();
alter table workout_logs       alter column user_id set not null;
alter table workout_logs       alter column user_id set default auth.uid();
alter table ai_corrections     alter column user_id set not null;
alter table ai_corrections     alter column user_id set default auth.uid();

-- ─── 4. Composite UNIQUE constraints ────────────────────────────────────
-- Previous unique constraints were on `date` alone (or date + order),
-- which would prevent two users from logging weight on the same day.
-- Replace with composite constraints scoped by user.

-- weight_logs.date → (user_id, date)
alter table weight_logs drop constraint if exists weight_logs_date_key;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'weight_logs_user_date_key'
  ) then
    alter table weight_logs add constraint weight_logs_user_date_key unique (user_id, date);
  end if;
end $$;

-- body_metrics.date → (user_id, date)
alter table body_metrics drop constraint if exists body_metrics_date_key;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'body_metrics_user_date_key'
  ) then
    alter table body_metrics add constraint body_metrics_user_date_key unique (user_id, date);
  end if;
end $$;

-- workout_logs (date, exercise_order) → (user_id, date, exercise_order)
alter table workout_logs drop constraint if exists workout_logs_date_exercise_order_key;
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'workout_logs_user_date_order_key'
  ) then
    alter table workout_logs add constraint workout_logs_user_date_order_key unique (user_id, date, exercise_order);
  end if;
end $$;

-- ─── 5. Indexes on user_id for query speed ───────────────────────────────

create index if not exists expenses_user_id_idx           on expenses(user_id);
create index if not exists food_logs_user_id_idx          on food_logs(user_id);
create index if not exists recurring_expenses_user_id_idx on recurring_expenses(user_id);
create index if not exists budget_user_id_idx             on budget(user_id);
create index if not exists goals_user_id_idx              on goals(user_id);
create index if not exists weight_logs_user_id_idx        on weight_logs(user_id);
create index if not exists body_metrics_user_id_idx       on body_metrics(user_id);
create index if not exists workout_logs_user_id_idx       on workout_logs(user_id);
create index if not exists ai_corrections_user_id_idx     on ai_corrections(user_id);

-- ─── 6. Replace permissive RLS with user-scoped policies ────────────────
-- Drops the old "auth all <table>" policies (anyone authenticated can
-- read/write everything) and replaces them with strict ownership
-- checks. workout_templates keeps its shared policy — the 5-day
-- program is the same for everyone.

do $$
declare
  t text;
  tables text[] := array[
    'expenses', 'food_logs', 'recurring_expenses', 'budget',
    'goals', 'weight_logs', 'body_metrics', 'workout_logs',
    'ai_corrections'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth all %s" on %I', t, t);
    execute format('drop policy if exists "user owns %s" on %I', t, t);
    execute format(
      'create policy "user owns %s" on %I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end $$;

-- ─── Done. Verify with: ─────────────────────────────────────────────────
--   select email, count(*) as expense_rows
--   from auth.users u
--   left join expenses e on e.user_id = u.id
--   group by email;
--
-- Should show your account with all the existing rows.
