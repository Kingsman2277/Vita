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
