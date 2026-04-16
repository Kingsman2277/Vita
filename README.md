# Vita — Life OS

Personal life operating system for tracking food, finances, budgets, and goals.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env` and fill in your values:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_GEMINI_API_KEY=your_gemini_key
```

### 3. Create Supabase tables
Go to your Supabase project > SQL Editor and run:

```sql
create table expenses (
  id uuid default gen_random_uuid() primary key,
  amount numeric not null,
  category text check (category in ('food','groceries','girlfriend','fun','necessities','other')),
  note text,
  date date default current_date,
  created_at timestamptz default now()
);

create table food_logs (
  id uuid default gen_random_uuid() primary key,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  food_name text,
  calories numeric,
  protein numeric,
  carbs numeric,
  fat numeric,
  photo_url text,
  logged_at timestamptz default now()
);

create table recurring_expenses (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  amount numeric not null,
  day_of_month integer check (day_of_month between 1 and 31),
  category text
);

create table budget (
  id uuid default gen_random_uuid() primary key,
  monthly_income numeric,
  savings_target numeric,
  updated_at timestamptz default now()
);

create table goals (
  id uuid default gen_random_uuid() primary key,
  type text check (type in ('body','financial')),
  data jsonb,
  target_date date,
  created_at timestamptz default now()
);
```

### 3b. Body Goals tables (required for the Body Goals page)

Run the migration in [supabase-migrations.sql](./supabase-migrations.sql) — or paste this into the SQL Editor:

```sql
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
```

### 4. Run dev server
```bash
npm run dev
```

### 5. Add to iPhone
Open Safari on iPhone, go to `http://YOUR_MAC_IP:5173`, tap Share > Add to Home Screen.

## Deploy to Vercel
```bash
npm install -g vercel
vercel
```
Add env vars in Vercel dashboard > Project Settings > Environment Variables.
