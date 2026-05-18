-- Admin dashboard support.
--
-- Adds an is_admin() helper, two admin-only RPC functions
-- (admin_list_users, admin_user_recent), and a read-only RLS
-- policy on every per-user table so the admin can browse
-- (but never modify) other users' rows from the app.
--
-- The "admin" is defined as the oldest auth.users row — same
-- heuristic the multi-user migration used for backfilling.
-- That's you, as long as you don't manually re-create your
-- account.
--
-- Safe to re-run.

-- ─── is_admin() ──────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select coalesce(
    auth.uid() = (select id from auth.users order by created_at asc limit 1),
    false
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- ─── admin_list_users(): all users + per-user activity counts ───────────

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  expenses_count bigint,
  food_logs_count bigint,
  weight_logs_count bigint,
  workout_logs_count bigint,
  goals_count bigint
)
language plpgsql stable security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;
  return query
    select
      u.id,
      u.email::text,
      u.created_at,
      u.last_sign_in_at,
      (select count(*) from public.expenses     where user_id = u.id),
      (select count(*) from public.food_logs    where user_id = u.id),
      (select count(*) from public.weight_logs  where user_id = u.id),
      (select count(*) from public.workout_logs where user_id = u.id),
      (select count(*) from public.goals        where user_id = u.id)
    from auth.users u
    order by u.created_at asc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

-- ─── admin_user_recent(user_id, days): unified activity timeline ────────

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
           coalesce(food_name, '(unnamed)')::text,
           (round(calories) || ' cal')::text,
           logged_at
    from public.food_logs
    where user_id = target_user_id
      and logged_at > now() - (days_back || ' days')::interval
    union all
    select 'expense'::text,
           coalesce(note, category, 'expense')::text,
           ('$' || amount::text)::text,
           created_at
    from public.expenses
    where user_id = target_user_id
      and created_at > now() - (days_back || ' days')::interval
    union all
    select 'weight'::text,
           ('weight entry')::text,
           (weight::text || ' lbs')::text,
           created_at
    from public.weight_logs
    where user_id = target_user_id
      and created_at > now() - (days_back || ' days')::interval
    union all
    select 'workout'::text,
           exercise_name::text,
           (case when completed then 'completed' else 'pending' end)::text,
           created_at
    from public.workout_logs
    where user_id = target_user_id
      and created_at > now() - (days_back || ' days')::interval
    order by 4 desc;
end;
$$;

grant execute on function public.admin_user_recent(uuid, int) to authenticated;

-- ─── Admin read-only RLS policy on every per-user table ────────────────
--
-- Postgres OR's multiple permissive policies together. The existing
-- "user owns <table>" policy still controls writes; this new policy
-- adds SELECT access for the admin on top of it.

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
    execute format('drop policy if exists "admin reads %s" on %I', t, t);
    execute format(
      'create policy "admin reads %s" on %I for select to authenticated using (public.is_admin())',
      t, t
    );
  end loop;
end $$;
