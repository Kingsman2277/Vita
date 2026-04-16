-- Body Goals migration — run once in Supabase SQL Editor.
-- Safe to re-run: uses create table if not exists.

create table if not exists weight_logs (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  weight numeric not null check (weight > 0),
  mood integer check (mood between 1 and 5),
  energy integer check (energy between 1 and 5),
  note text,
  created_at timestamptz default now()
);

create index if not exists weight_logs_date_idx on weight_logs (date desc);

create table if not exists body_metrics (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  waist numeric,
  chest numeric,
  hips numeric,
  body_fat numeric,
  note text,
  created_at timestamptz default now()
);

create index if not exists body_metrics_date_idx on body_metrics (date desc);
