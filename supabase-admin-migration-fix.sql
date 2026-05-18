-- Fix: column reference "amount" is ambiguous in admin_user_recent.
--
-- The function's RETURNS TABLE declares a column named `amount`,
-- which collided with `expenses.amount` inside the SELECT. Postgres
-- couldn't tell which one we meant. Qualifying the table column
-- (expenses.amount, weight_logs.weight, etc.) resolves it.
--
-- Safe to re-run.

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
    select 'workout'::text,
           workout_logs.exercise_name::text,
           (case when workout_logs.completed then 'completed' else 'pending' end)::text,
           workout_logs.created_at
    from public.workout_logs
    where workout_logs.user_id = target_user_id
      and workout_logs.created_at > now() - (days_back || ' days')::interval
    order by 4 desc;
end;
$$;

grant execute on function public.admin_user_recent(uuid, int) to authenticated;
