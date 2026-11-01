-- 7-day workout program support.
--
-- Two things bundled:
--   1. Extend day_of_week from 1..5 (Mon-Fri) to 1..7 (Mon-Sun) on
--      workout_templates and workout_logs so Saturday and Sunday can
--      hold real exercises instead of being hardcoded as "rest day".
--   2. Add wipe_my_workout_data() — clears the calling user's entire
--      workout history (templates + ALL logs, past and future). Used
--      by the new "Wipe everything" button in the Program Editor for
--      a clean-slate restart.
--
-- Safe to re-run.

-- ─── 1. Extend day_of_week constraint to 1..7 ───────────────────────────

alter table public.workout_templates
  drop constraint if exists workout_templates_day_of_week_check;
alter table public.workout_templates
  add constraint workout_templates_day_of_week_check
  check (day_of_week between 1 and 7);

alter table public.workout_logs
  drop constraint if exists workout_logs_day_of_week_check;
alter table public.workout_logs
  add constraint workout_logs_day_of_week_check
  check (day_of_week between 1 and 7);

-- ─── 2. wipe_my_workout_data() RPC ──────────────────────────────────────
-- Fully resets the caller's workout state. Templates AND all logs go.
-- The user is expected to manually rebuild their program afterwards
-- via the Program Editor.

create or replace function public.wipe_my_workout_data()
returns void
language plpgsql security definer
set search_path = public, auth
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.workout_logs where user_id = uid;
  delete from public.workout_templates where user_id = uid;
end;
$$;

grant execute on function public.wipe_my_workout_data() to authenticated;
