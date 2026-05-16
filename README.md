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
OPENAI_API_KEY=your_openai_key   # server-side only (no VITE_ prefix), set in Vercel env vars
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

### 3d. AI corrections learning loop (optional but recommended)

Enables the food-log AI to learn from your manual edits. Run
[supabase-ai-corrections-migration.sql](./supabase-ai-corrections-migration.sql) in the SQL Editor — or paste this:

```sql
create table if not exists ai_corrections (
  id uuid default gen_random_uuid() primary key,
  source text not null,
  ai_food_name text,
  ai_description text,
  ai_calories numeric,
  ai_protein numeric,
  ai_carbs numeric,
  ai_fat numeric,
  user_food_name text,
  user_calories numeric,
  user_protein numeric,
  user_carbs numeric,
  user_fat numeric,
  created_at timestamptz default now()
);
create index if not exists ai_corrections_food_name_idx on ai_corrections using gin (to_tsvector('english', coalesce(ai_food_name, '')));
create index if not exists ai_corrections_created_at_idx on ai_corrections (created_at desc);
alter table ai_corrections enable row level security;
create policy "auth all ai_corrections" on ai_corrections for all to authenticated using (true) with check (true);
```

If you skip this, the app still works — saves just fall through
silently instead of being recorded.

### 3c. Lock the app down to authenticated users only

Once you're ready to deploy publicly, run [supabase-auth-migration.sql](./supabase-auth-migration.sql) in the SQL Editor. It drops all the wide-open policies and replaces them with "authenticated users only" read/write on every table.

Then in the Supabase dashboard:

1. **Authentication → Providers → Email** — turn **Confirm email OFF** (since the app uses fake `username@vita.local` emails internally).
2. **Authentication → Providers → Email** — turn **Allow new users to sign up OFF**. This means only accounts you manually create can exist.
3. **Authentication → Users → Add user** — create your own login:
   - Email: `matteo@vita.local` (any `username@vita.local` — this is just internal)
   - Password: pick a strong one
   - Tick **Auto Confirm User**
4. Sign in at your deployed URL with just the **username part** (e.g. `matteo`) and your password. The app will convert it to the internal email automatically.

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
