-- Workout tracker migration.
-- Creates two tables (workout_templates, workout_logs), enables RLS,
-- and seeds the 5-day full-body machine-based program.
-- Safe to re-run.

-- ─── Schema ───────────────────────────────────────────────────────────────

create table if not exists workout_templates (
  id uuid default gen_random_uuid() primary key,
  day_of_week integer not null check (day_of_week between 1 and 5), -- 1=Mon, 5=Fri
  day_label text not null,
  exercise_order integer not null,
  exercise_name text not null,
  sets_reps text not null,
  cue text,
  muscle_group text,
  created_at timestamptz default now(),
  unique(day_of_week, exercise_order)
);

create table if not exists workout_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  day_of_week integer not null check (day_of_week between 1 and 5),
  exercise_order integer not null,
  exercise_name text not null,
  sets_reps text not null,
  completed boolean default false,
  weight_used text,
  note text,
  created_at timestamptz default now(),
  unique(date, exercise_order)
);

create index if not exists workout_logs_date_idx on workout_logs (date desc);

-- ─── RLS — auth-only access (matches the rest of the app) ─────────────────

do $$
declare
  t text;
  tables text[] := array['workout_templates', 'workout_logs'];
begin
  foreach t in array tables loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "auth all %s" on %I', t, t);
    execute format(
      'create policy "auth all %s" on %I for all to authenticated using (true) with check (true)',
      t, t
    );
  end loop;
end $$;

-- ─── Seed: 5-day machine-based full-body program ──────────────────────────
-- Uses ON CONFLICT DO NOTHING so re-running won't duplicate or overwrite.

insert into workout_templates (day_of_week, day_label, exercise_order, exercise_name, sets_reps, cue, muscle_group) values
  -- Monday — Full Body A
  (1, 'Full Body A', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                  'cardio'),
  (1, 'Full Body A', 2, 'Leg Press',                  '4 x 12',     'Moderate weight, full ROM, push through heels', 'legs'),
  (1, 'Full Body A', 3, 'Chest Press Machine',        '3 x 12',     'Control the negative — 3 seconds down',         'push'),
  (1, 'Full Body A', 4, 'Lat Pulldown',               '3 x 12',     'Wide grip, squeeze at bottom',                  'pull'),
  (1, 'Full Body A', 5, 'Cable Rows (seated)',        '3 x 12',     'Keep back straight, pull to belly',             'pull'),
  (1, 'Full Body A', 6, 'Bicep Curls (cable)',        '3 x 15',     'Slow curl, squeeze at top',                     'arms'),
  (1, 'Full Body A', 7, 'Tricep Pushdown (cable)',    '3 x 15',     'Lock elbows, full extension',                   'arms'),
  (1, 'Full Body A', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),

  -- Tuesday — Full Body B
  (2, 'Full Body B', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                   'cardio'),
  (2, 'Full Body B', 2, 'Leg Extensions',             '4 x 15',     'Squeeze at top, 2 sec hold',                    'legs'),
  (2, 'Full Body B', 3, 'Chest Fly Machine',          '3 x 12',     'Slow controlled arc',                           'push'),
  (2, 'Full Body B', 4, 'Chest Pull / Reverse Fly',   '3 x 12',     'Pinch shoulder blades',                         'pull'),
  (2, 'Full Body B', 5, 'Cable Lateral Raises',       '3 x 15',     'Light weight, slow, no swinging',               'push'),
  (2, 'Full Body B', 6, 'Cable Curls (rope)',         '3 x 15',     'Twist at top for peak',                         'arms'),
  (2, 'Full Body B', 7, 'Overhead Tricep Ext (cable)','3 x 12',     'Keep elbows locked forward',                    'arms'),
  (2, 'Full Body B', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),

  -- Wednesday — Full Body C
  (3, 'Full Body C', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                   'cardio'),
  (3, 'Full Body C', 2, 'Leg Press (wide stance)',    '4 x 12',     'Feet high + wide for glutes/hams',              'legs'),
  (3, 'Full Body C', 3, 'Bench Machine (incline)',    '3 x 12',     'Upper chest focus',                             'push'),
  (3, 'Full Body C', 4, 'Lat Pulldown (close grip)',  '3 x 12',     'Underhand grip, pull to chest',                 'pull'),
  (3, 'Full Body C', 5, 'Cable Face Pulls',           '3 x 15',     'High cable, pull to face, elbows high',         'pull'),
  (3, 'Full Body C', 6, 'Cable Hammer Curls (rope)',  '3 x 12',     'Neutral grip',                                  'arms'),
  (3, 'Full Body C', 7, 'Tricep Pushdown (bar)',      '3 x 15',     'Straight bar, full lockout',                    'arms'),
  (3, 'Full Body C', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),

  -- Thursday — Full Body D
  (4, 'Full Body D', 1, 'Incline Treadmill Walk',     '15 min',     '12-15% incline, 3.0-3.5 mph',                   'cardio'),
  (4, 'Full Body D', 2, 'Leg Extensions',             '3 x 15',     'Light, high reps for burn',                     'legs'),
  (4, 'Full Body D', 3, 'Leg Press',                  '3 x 12',     'Go heavier than Monday',                        'legs'),
  (4, 'Full Body D', 4, 'Chest Press Machine',        '4 x 10',     'Heavier weight, lower reps',                    'push'),
  (4, 'Full Body D', 5, 'Cable Rows (wide grip)',     '3 x 12',     'Wide handle attachment',                        'pull'),
  (4, 'Full Body D', 6, 'Cable Curls (single arm)',   '3 x 12/arm', 'Focus on squeeze',                              'arms'),
  (4, 'Full Body D', 7, 'Dips Machine',               '3 x 12',     'Or tricep pushdown if not available',           'arms'),
  (4, 'Full Body D', 8, 'Incline Treadmill Walk',     '10 min',     '12-15% incline, 3.5 mph — cooldown',            'cardio'),

  -- Friday — Full Body E
  (5, 'Full Body E', 1, 'Incline Treadmill Walk',     '20 min',     '15% incline, 3.5 mph — extended cardio',        'cardio'),
  (5, 'Full Body E', 2, 'Leg Press',                  '4 x 15',     'Lighter weight, higher reps, burn out',         'legs'),
  (5, 'Full Body E', 3, 'Chest Fly Machine',          '3 x 15',     'Light, feel the stretch',                       'push'),
  (5, 'Full Body E', 4, 'Lat Pulldown (wide)',        '3 x 15',     'Light, full stretch at top',                    'pull'),
  (5, 'Full Body E', 5, 'Chest Pull / Reverse Fly',   '3 x 15',     'Light, high reps',                              'pull'),
  (5, 'Full Body E', 6, 'Cable Curl + Pushdown SS',   '3 x 15 each','Superset — no rest between',                    'arms'),
  (5, 'Full Body E', 7, 'Cable Woodchops',            '3 x 12/side','High to low, engage core',                      'arms'),
  (5, 'Full Body E', 8, 'Incline Treadmill Walk',     '10 min',     '12% incline, 3.0 mph — easy cooldown',          'cardio')
on conflict (day_of_week, exercise_order) do nothing;
