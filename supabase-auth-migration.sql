-- Lock the app down to authenticated users only.
-- Run this AFTER you create your own Supabase auth user in the dashboard.
-- Safe to re-run: uses `drop policy if exists` before re-creating.

-- Helper macro: enable RLS, drop any permissive policy, and
-- replace it with "authenticated users only" read/write.
do $$
declare
  t text;
  tables text[] := array[
    'expenses', 'food_logs', 'recurring_expenses',
    'budget', 'goals', 'weight_logs', 'body_metrics'
  ];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);

    -- Drop the previous wide-open policies if they exist.
    execute format('drop policy if exists "anon all %s" on %I', t, t);
    execute format('drop policy if exists "public read %s" on %I', t, t);
    execute format('drop policy if exists "public write %s" on %I', t, t);
    execute format('drop policy if exists "auth all %s" on %I', t, t);

    -- Single policy: any authenticated user can read/write everything.
    -- Single-tenant design — fine because signup is disabled in the
    -- dashboard, so the only authenticated user is you.
    execute format(
      'create policy "auth all %s" on %I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- After this migration:
--   • The anon role (unsigned-in visitors) gets 0 rows / errors on writes.
--   • Any logged-in user sees everything.
--   • Sign-ups must be disabled in Authentication → Providers → Email
--     so nobody else can create an account.
