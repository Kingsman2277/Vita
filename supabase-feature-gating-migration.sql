-- Per-user feature gating.
--
-- Adds a user_profiles table with an enabled_features text[] column,
-- backfills every existing user with sensible defaults, auto-creates
-- profiles for new signups via trigger, gives the admin (oldest user)
-- the full feature set, and exposes an admin_set_user_features RPC
-- so the admin dashboard can toggle features per user.
--
-- The feature key catalog (kept in src/lib/features.js too):
--   food, workout, finance, budget, goals, summary, ai_food_analysis
--
-- Home/Dashboard and Settings/Account are intentionally NOT gated —
-- they're always available, otherwise users couldn't sign in usefully.
--
-- Safe to re-run.

-- ─── Table ─────────────────────────────────────────────────────────────

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled_features text[] not null
    default array['food','finance','budget','goals','summary'],
  updated_at timestamptz default now()
);

-- ─── RLS ───────────────────────────────────────────────────────────────

alter table public.user_profiles enable row level security;

-- Reads: a user can see their own profile; admin can see all.
drop policy if exists "user_profiles read" on public.user_profiles;
create policy "user_profiles read" on public.user_profiles
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Writes: admin only. Users can't escalate their own features.
drop policy if exists "user_profiles admin write" on public.user_profiles;
create policy "user_profiles admin write" on public.user_profiles
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Trigger: auto-create profile when a new auth user signs up ───────

create or replace function public.create_default_user_profile()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.create_default_user_profile();

-- ─── Backfill: every existing auth user gets a default profile ────────

insert into public.user_profiles (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ─── Admin (oldest user) gets ALL features ─────────────────────────────

update public.user_profiles
set enabled_features = array[
  'food','workout','finance','budget','goals','summary','ai_food_analysis'
],
    updated_at = now()
where user_id = (select id from auth.users order by created_at asc limit 1);

-- ─── Admin RPC: set a user's feature list ─────────────────────────────

create or replace function public.admin_set_user_features(
  target_user_id uuid,
  new_features text[]
)
returns void
language plpgsql security definer
set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;
  if target_user_id is null then
    raise exception 'target user id is required';
  end if;
  insert into public.user_profiles (user_id, enabled_features)
  values (target_user_id, coalesce(new_features, array[]::text[]))
  on conflict (user_id) do update
    set enabled_features = excluded.enabled_features,
        updated_at = now();
end;
$$;

grant execute on function public.admin_set_user_features(uuid, text[]) to authenticated;
