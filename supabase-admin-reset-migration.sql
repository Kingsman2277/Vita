-- Admin password reset.
--
-- Adds an admin-only RPC that sets a new bcrypt-hashed password on
-- any user's auth.users row. Pairs with the Admin dashboard's
-- "Reset password" button so the owner can hand out a temp password
-- when someone forgets, without leaving the app.
--
-- Why this exists instead of "show me their password": passwords are
-- one-way bcrypt hashes — never recoverable by design. Reset is the
-- only way.
--
-- Safe to re-run.

create or replace function public.admin_reset_password(
  target_user_id uuid,
  new_password text
)
returns void
language plpgsql security definer
set search_path = public, auth, extensions
as $$
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;
  if new_password is null or length(new_password) < 8 then
    raise exception 'password must be at least 8 characters';
  end if;
  if target_user_id is null then
    raise exception 'target user id is required';
  end if;

  update auth.users
  set encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'user not found';
  end if;
end;
$$;

grant execute on function public.admin_reset_password(uuid, text) to authenticated;
