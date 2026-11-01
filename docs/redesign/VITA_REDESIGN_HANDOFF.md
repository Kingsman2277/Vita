# Vita Redesign — Handoff for Claude Code

> **Setup:** copy this whole folder into the repo as `docs/redesign/` (so this file is `docs/redesign/VITA_REDESIGN_HANDOFF.md`). All paths below marked *(bundle)* are relative to that folder; paths starting with `src/`, `public/`, etc. are repo paths.
>
> Bundle contents: `mockups/` (approved design “D”), `references/` (3 style references from Matteo), `AUDIT.md` (mobile UX audit of the current app).

---

## 1. Goal & context

**Vita** is Matteo's personal "life OS": food log (incl. AI photo/text analysis), workouts, expenses, budget, goals/body weight, monthly summary. It's used **mainly on a phone** (installed as a PWA). It works, but looks and feels "not at its best". Matteo approved a **premium dark fitness-app look** (near-black, charcoal cards, one orange-red accent) — design **"D"**, mocked in `mockups/d1–d4` *(bundle)*.

**Current stack (keep it):**
- Vite 5 + React 19 SPA, react-router-dom 7 (`src/App.jsx`)
- Tailwind v4 via `@tailwindcss/vite` + a large hand-written `src/app.css` (no shadcn)
- recharts (charts), react-hot-toast (toasts)
- Supabase JS (auth + Postgres via RLS) — `src/lib/supabase.js`, hooks in `src/hooks/*`
- Vercel serverless function `api/openai.js` (AI food analysis; client in `src/lib/ai.js`)
- Service worker `public/sw.js`, manifest `public/manifest.json`
- Per-user module toggles: `src/lib/features.js` (`food, workout, finance, budget, goals, summary, ai_food_analysis`), read by `src/hooks/useFeatures.js`; routes wrapped in `src/components/RequireFeature.jsx`. Admin always has all features.

**Must not break:** username+password login (`src/hooks/useAuth.js`, usernames map to `<name>@vita.local`), all data reads/writes in `src/hooks/*`, the Supabase schema, RLS assumptions, the `api/openai.js` function, CSV export, feature gating, the admin page.

---

## 2. Ground rules

- **No DB schema changes or migrations** unless Matteo explicitly asks. Do not touch the `supabase-*.sql` files.
- **No new data fields.** Design around what's tracked. In particular there is **no workout duration, calories burned, or heart rate** — the reference images show those; don't add them. Workouts track: per-weekday templates (`workout_templates`: `day_of_week` 1–7, `day_label`, `exercise_name`, `sets_reps` text like `3 x 10`, `cue`, `muscle_group`) and daily logs (`workout_logs`: completed, weight used, note).
- **Keep every existing feature working** (camera/photo food log, AI analyze, servings, micronutrients, program editor, recurring expenses, budget allocation, CSV export, body metrics, username/password change, admin feature toggles & password reset).
- Work on a **branch** (e.g. `redesign/d`), **small commits per phase**.
- After each phase: `npm run build` must pass. ⚠️ There is **no lint script/ESLint config** in `package.json` today — either add a minimal ESLint setup in Phase 1 (separate commit) or skip lint; don't block on it.
- **Verify every touched screen at 390×844** in a real browser (Playwright MCP recommended; the `frontend-design` plugin is optional). Also sanity-check 360px wide and ≥768px (desktop sidebar must still work).
- **Do not push to `main` without Matteo's OK** — pushes to `main` auto-deploy to production on Vercel (project `vita-life-os`). Preview deploys from the branch are fine.
- **Never commit secrets** (`.env`, Supabase keys, `OPENAI_API_KEY`).
- Testing data: use your own local dev login; don't create/reset users or write test rows into prod data.

---

## 3. Phase 0 — fix the CSS cascade bug (do this first)

**Bug:** `src/app.css` has *unlayered* rules that beat Tailwind v4's *layered* utilities (Tailwind v4 puts utilities in `@layer utilities`; any unlayered CSS wins regardless of specificity):

```css
/* ─── RESET ─── */
* { margin: 0; padding: 0; box-sizing: border-box; }   /* kills every p-*, px-*, m-*, mt-* … */
...
header { display: block; margin: 0; padding: 0; }       /* kills <header className="flex ..."> */
section { display: block; }
```

Verified effect (current prod too): computed `padding` of `.p-3` = `0px`, `<header class="flex items-start justify-between">` computes `display:block`. Visible symptoms: Dashboard settings gear drops under the date; Workout/BodyGoals header buttons stack under the title; Finance header buttons wrap. It's why the code has **~430 inline `style={{…}}`** overrides.

**Fix:**
1. Delete the `* {margin:0;padding:0;box-sizing:border-box}` rule — Tailwind's preflight already does this inside `@layer base`. If anything must stay, wrap it in `@layer base { … }`.
2. Delete the `header {…}` and `section {…}` rules.
3. Also wrap other element-level rules (`body`, `input, select, textarea`, focus styles, `html`) in `@layer base` so utilities can override them.
4. Rebuild and **re-screenshot every screen**: the fix will *change* layouts (some inline styles + previously dead utilities now both apply). Fix regressions that look broken; don't polish yet.
5. Going forward, **remove inline style patches as each screen is rebuilt** (Phases 3–6), replacing them with utilities/components. Target: near-zero `style={{` except for truly dynamic values (widths %, chart colors).

**Acceptance:** `.p-3` computes 12px; `<header class="flex">` is flex; Dashboard gear sits right of the greeting; build passes; no screen visibly broken at 390×844.

---

## 4. Design system (from the approved mockups)

Source of truth: `mockups/d-style.css` + `mockups/d1-home.html … d4-quickadd.html` *(bundle)*. Style refs: `references/*.png`.

### 4.1 Color tokens
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0B0C` | app background |
| `--card` | `#18181A` | cards, stat tiles, nav pills |
| `--card-2` | `#212124` | inputs, icon circles, chips, sheet controls |
| `--sheet` | `#141416` | bottom-sheet surface |
| `--keypad` | `#1C1C1F` | keypad keys |
| `--seg-track` | `#161618` | segmented control track |
| `--line` | `#2A2A2E` | progress track, ring track, dividers (`#232326` for list dividers) |
| `--fg` | `#F5F5F7` | primary text |
| `--fg-2` | `#C9C9CE` | secondary text on dark controls |
| `--muted` | `#8E8E93` | labels, captions |
| `--muted-2` | `#5E5E63` | axis labels only (not body text) |
| `--accent` | `#FF5A1F` | THE accent: rings, chart lines, check badges, "VIEW ALL", active nav indicator, cursor |
| `--accent-soft` | `rgba(255,90,31,.16)` | tag-pill fill (text = `--accent`) |
| `--danger` | `#FF3B30` | over-budget bar only |
| `--white-btn` | `#FFFFFF` on text `#0B0B0C` | primary buttons, active segment, "+" nav button, completed week-day |

Rules: **orange is used sparingly** (one or two accents per card). No borders on cards. No heavy shadows except the sheet and the orange check badge (`0 10px 40px rgba(255,90,31,.45)`). Charts: area under orange line = linear gradient `#FF5A1F` @ 0.5–0.55 opacity → 0. Grid lines `#26262A`, dashed `2 4`.
Keep module colours out — the old per-category chart colours (`--cat-*`) should collapse to orange + greys (or one orange ramp) for charts; emoji stay as category icons.

### 4.2 Typography
- Family: **Work Sans** (Google Fonts, weights 400/500/600/700). Replace Manrope in `index.html` + `--font-sans`. Use `font-variant-numeric: tabular-nums` on all money/stat numbers.
- Scale (px / weight / tracking):
  - Display number (hero money): 28–30 / 700 / −0.02em
  - Page title (`h1`): 26 / 700 / −0.02em (greeting 24)
  - Completion title: 26 / 700
  - Section/card title (`h2`): 17 / 600 (15 inside dense cards)
  - Stat value (tile): 20–22 / 700
  - Body / list title: 15 / 600
  - Label: 12 / 500 / `--muted`
  - Caption (date above greeting, "SATURDAY, 31 OCTOBER"): 11 / 600 / 0.1em / uppercase / `--muted`
  - Link ("VIEW ALL"): 12 / 700 / 0.08em / uppercase / `--accent`
  - Inputs stay **≥16px** (prevents iOS zoom).

### 4.3 Shape & spacing
- Radii: card **18px**; sheet top **26px**; stat tile **14px**; buttons/inputs/chips **12–14px**; segmented track 12 / segment 9; tag pill **6px**; keypad key 12; nav "+" **14px**; avatar/week circles full.
- Page padding **16px** horizontal (+ safe-area insets). Card padding **16px** (dense tiles 14×12). Gap between cards **10px**; section gap 16px.
- Min tap target **44×44** (nav items 52, buttons 54 tall, segments 40 + 4 track padding, chips 36).

### 4.4 Components to build (`src/components/ui/`)
| Component | Props | Notes |
|---|---|---|
| `Card` (replace existing) | `as`, `onClick`, `padding="md|sm"`, `className` | `bg-card rounded-[18px]`; renders `<button>` when clickable (keep existing a11y behaviour) |
| `TagPill` | `children`, `tone="accent|neutral"`, `icon?` | accent: `--accent-soft` bg + `--accent` text; neutral: `#26262A` bg + `--fg-2`; 12px/600, `px-2 py-[3px] rounded-md` |
| `SegmentedControl` | `options[{value,label}]`, `value`, `onChange` | track `#161618` p-1 r-12; active = white bg, `#0B0B0C` text |
| `WeekRow` | `days[{date, label, state:'done'|'missed'|'rest'|'today'|'future', progress?}]`, `onSelect` | 42px circles; done = white circle + dark check; missed = card + ✕ + `#3A3A3F` 1.5px ring; rest = card + "–"; today = card + white progress arc + dot under label; future = card |
| `StatTile` | `icon`, `label`, `value`, `sub?` | 34px icon circle `--card-2`; label 12 muted; value 20–22/700 |
| `ProgressRing` (replace) | `value 0–1`, `size=86`, `stroke=8`, `label`, `sub?` | track `--line`, arc `--accent`, round caps, starts at 12 o'clock |
| `ProgressBar` | `value`, `max`, `tone="accent|danger"` | 6px tall, r-4, track `--line` |
| `AreaChart` | `data`, `xKey`, `yKey`, `refLine?{y,label}`, `height` | recharts `AreaChart` + `Area type="monotone"` (or linear) stroke `#FF5A1F` 2.2, gradient fill (defs `linearGradient` 0.5→0), dashed `CartesianGrid` `#26262A` horizontal only, axis ticks 11px `--muted-2`, no axis lines, last point dot r4 orange w/ 1.5 white stroke, optional dashed `ReferenceLine` (budget/goal) `#8E8E93` |
| `SectionHeader` | `title`, `action?{label,onClick}` | title 15–17/600 + orange uppercase link |
| `ListRow` | `icon`, `title`, `meta` (node: TagPill + date), `amount`, `onClick` | 40px icon tile `--card-2` r-12; amount right 15/700 tabular; divider `#232326` |
| `Button` | `variant="primary|secondary|ghost"`, `size`, `full` | primary: white bg, `#0B0B0C` text, 54px, r-14, 16/700; secondary: `--card` bg, white text |
| `IconButton` | `icon`, `label` (aria) | 44×44, `--card` bg, r-12 |
| `BottomSheet` (replace `Modal` on mobile) | `open`, `onClose`, `title`, `children` | `--sheet` bg, top radius 26, grab handle 40×5 `#3A3A3F`, close IconButton 36, padding-bottom `env(safe-area-inset-bottom)`, max-height ~80dvh, backdrop `rgba(0,0,0,.55)` + blur(2px); keep the existing focus-trap/Escape logic from `Modal.jsx`; centered dialog ≥640px |
| `BottomNav` (replace) | uses `useFeatures` | see §5 |
| `AppHeader` | `title` or greeting variant (`avatarInitial`, `caption`, `title`, `right`) | |
| `EmptyState`, `Skeleton` | `icon`, `title`, `desc`, `action?` | dark versions; skeleton shimmer `--card`→`--card-2` |
| `AmountKeypad` (optional, see §6.4) | `value`, `onChange`, `decimals=2` | 3×4 grid, keys 46px, `--keypad` bg |

Implement tokens via Tailwind v4 `@theme` in `src/app.css`, e.g.:
```css
@import "tailwindcss";
@theme {
  --color-bg: #0B0B0C; --color-card: #18181A; --color-card-2: #212124; --color-sheet: #141416;
  --color-line: #2A2A2E; --color-fg: #F5F5F7; --color-fg-2: #C9C9CE; --color-muted: #8E8E93;
  --color-muted-2: #5E5E63; --color-accent: #FF5A1F; --color-accent-soft: rgb(255 90 31 / .16);
  --color-danger: #FF3B30;
  --font-sans: "Work Sans", ui-sans-serif, system-ui, sans-serif;
  --radius-card: 18px; --radius-sheet: 26px; --radius-tile: 14px;
}
```
The app is **dark-only** (`<html class="dark">`). The `:root` light palette in `app.css` is an unused leftover — remove it (no light mode in scope).

---

## 5. Information architecture

**Bottom nav (mobile, <768px):** `Home` · `Money` · **[+]** · `Body` · `Me` — 4 icons + centre white rounded-square "+" (52×52, r-14, dark "+" icon). Inactive icons `#7A7A80`, active white + 18×3px orange bar under it. No text labels in the mockup — **add `aria-label`s**; (optional: tiny labels if Matteo prefers — uncertain). Nav bar sits on a gradient fade `transparent → #0B0B0C`, height 92 incl. safe area.

| Current route / screen | New home |
|---|---|
| `/dashboard` (Dashboard) | **Home** tab (`/` → `/home` or keep `/dashboard`; keep old path as redirect) |
| `/finance` (Finance) | **Money** tab — default view |
| `/budget` (Budget) | **Money** → segment "Budget" (or `/money/budget`); recurring expenses live here |
| `/summary` (Summary + CSV export) | **Money** → "Insights/Month" section *and* reachable from **Me** → "Monthly summary & export" (Summary mixes food + money; keep one screen, link from both) |
| `/workout` (Workout) | **Body** tab → "Training" segment |
| `/goals` + `/body-goals` | **merge** into **Body** → "Progress" (weight log, trend, body metrics, body goal) + financial goal card moves to **Money** (savings goal) |
| `/food` (Food log) | **Body** → "Food" segment *(decision: food = nutrition = body; uncertain — alternative is to give Food its own tab instead of Me and move Me to the header avatar. Ask Matteo if unsure.)* |
| `/settings` | **Me** tab |
| `/admin` | **Me** → "Admin" row (only if `useIsAdmin().isAdmin`) |
| Login | stays as-is functionally; restyle in Phase 6 |

Keep old URLs working via `<Navigate>` redirects (PWA users may have them cached/bookmarked).

**Feature toggles:** a tab shows only if the user has ≥1 enabled module inside it: Money = `finance|budget|summary`; Body = `workout|food|goals`. Segments inside a tab follow the same per-feature filter. Home cards for disabled modules are hidden. Quick-add options likewise (`finance`→Expense, `food`→Food, `goals`→Weight, `workout`→Workout). Home and Me are always on. While `useFeatures().loading`, render nav without gated tabs (current behaviour) to avoid flicker.

Desktop (≥768px): keep a left sidebar (restyle to tokens) with the same 4 destinations + "+".

---

## 6. Screen specs

All numbers in mockups are demo data. Data sources are existing hooks — don't add queries that need new columns.

### 6.1 Home — `mockups/d1-home.png`
Top→bottom:
1. **Greeting header:** 50px avatar circle (orange radial gradient `#FF8A55→#B8380F`, initial letter of username), caption `SATURDAY, 31 OCTOBER` (uppercase, `en-CA` long date), title `Hi, {Username}` (capitalize `useAuth().username`), settings `IconButton` → Me.
2. **SegmentedControl** `Today | Weekly`. Today = cards below for today. Weekly = same cards with 7-day aggregates (avg calories, week spend, sessions done) — *Weekly content is a proposal; keep it simple or hide the control if out of scope.*
3. **WeekRow** (Sun→Sat or Mon→Sun — match current `DayPicker`): state from `useWorkoutLogs` — done = all exercises completed that day; missed = past scheduled day not completed; rest = no templates for that weekday; today = progress arc = completed/total. Tapping a day could select it for Today view (optional).
4. **Money card** (`finance`/`budget`): ProgressRing = discretionary **left** % (`(discretionary − monthlyTotal) / discretionary`), centre "47% / left"; label "Discretionary left · Oct", `TagPill` "On track"/"Over" (over when left < 0; "On track" logic: left% ≥ remaining-days% of month — *proposal*), value `$1,069.05`, sub `$1,196.96 spent of $2,266.01`. Data: `useBudget().discretionary`, `useExpenses().monthlyTotal`. Tap → Money.
5. **3 StatTiles:** Spent today (`todayTotal`, sub "N expenses"), Calories (`todayCalories`, sub `P{protein}·C{carbs}·F{fat}`), Streak (`useWorkoutLogs().streak` — rest days already skipped, sub "Rest day"/"x/y done"). Each taps to its screen.
6. **Weight trend card:** title + sub `181.2 lb · −0.6 lb/wk · on pace for 172` (from `useWeightLogs` + body goal; reuse `src/lib/bodyAnalysis.js` for trend/pace), "VIEW ALL" → Body/Progress, `AreaChart` of last ~60 days, last point dotted.
Remove: the old "Quick Actions" grid (replaced by "+").

### 6.2 Money — `mockups/d2-money.png`
1. Header: title `Money` + month picker pill (`October 2026 ▾`, opens month list; reuse `useMonthNavigation`).
2. **Spend card:** "Spent this month" `$1,196.96` + right "Discretionary left `$1,069.05`"; `AreaChart` of **cumulative discretionary spend by day** with dashed reference line at discretionary budget ("Budget $2,266"); x labels Oct 1 / 15 / 31.
3. **Category filter pills** (horizontal scroll, bleeds off right edge on purpose): `All` (white active) + `EXPENSE_CATEGORIES` from `src/lib/helpers.js` (🛒 Groceries, 🍽️ Eating Out, 🚗 Transport, 🛍️ Shopping & Ent, 🐾 Pet, 📦 Other). Pills must not shrink/wrap (`shrink-0 whitespace-nowrap`).
4. **Budgets card:** SectionHeader "Budgets" + VIEW ALL (→ Budget view). Top 3 rows by % used: name, `$spent / $budgeted` (spent bold, budget muted), `ProgressBar`; over budget → danger bar + TagPill `Over $22.40`. Data: existing Budget allocation logic in `src/pages/Budget.jsx` / `src/lib/helpers.js` (`BUDGET_ALLOCATION` percents) — reuse, don't re-derive.
5. **Recent:** SectionHeader + ListRows: emoji tile, note (or category), TagPill (category, accent), date ("Today", "Fri, Oct 30"), amount `−$42.18`. Reimbursable expenses (`is_recurring === true` — the column is misnamed; it means "work reimbursable") get a neutral TagPill "Reimbursable". Tap → edit sheet (existing edit/delete flow).
6. The full list with DayPicker/filters stays available (VIEW ALL / scroll). Keep MonthPicker/DayPicker behaviour, restyled.
Budget view: same tokens — income/savings edit, allocation list with ProgressBars, recurring expenses grouped (existing collapsible groups), "+ Add" as secondary button. Savings (financial) goal card from Goals moves here.

### 6.3 Body — Workout logged — `mockups/d3-workout.png`
**Completion screen** shown when the last exercise of today's checklist is ticked complete in Workout (*trigger is a proposal*; also reachable by tapping a completed day). Full-screen, no nav:
- Close `IconButton` (✕) top-left.
- Sunburst: `repeating-conic-gradient(from 0deg at 50% 46%, rgba(255,255,255,.07) 0 9deg, transparent 9deg 18deg)` masked by `radial-gradient(circle at 50% 46%, #000 30%, transparent 72%)`, plus orange radial glow `rgba(255,90,31,.28)→0`.
- 88px orange check badge with glow shadow; title `Workout logged!`; sub `Friday's session done — 7-day streak 🔥`.
- **Workout Summary card** (+ TagPill with dumbbell + the day's `day_label` from `workout_templates`, e.g. "Upper"; `muscle_group` also exists per exercise): Exercises `5 / 5`, Sets finished (sum of sets parsed from `sets_reps` like `3x10` — *parse defensively; hide if unparseable*), Total reps (sets×reps), Volume (Σ sets×reps×`weight_used`, only when weights present), Top weight (max `weight_used` + exercise), This week (`x of y days`).
- 3 StatTiles (exercises, streak, current weight).
- Body-weight `AreaChart` card with dashed goal line ("Goal 172"), sub "−4.8 lb since {first log date}".
- Primary `Button` "Done" pinned bottom (safe area).
**Body tab itself** (not mocked): AppHeader "Body" + SegmentedControl `Training | Food | Progress` (filtered by features). Training = restyled Workout checklist (rows with completed check circle, weight field, note) + "Edit program" secondary button (keep `ProgramEditor`). Progress = merged Goals + BodyGoals: pace card, weight AreaChart, logging streak, body metrics list, body goal edit in a BottomSheet (not inline forms). Food = see 6.5.

### 6.4 Quick-add sheet — `mockups/d4-quickadd.png`
Opened by the nav "+" from any screen. `BottomSheet` titled "Quick add":
- 4 type tiles (66px tall, grid 4, r-14; active = white): **Expense** (`finance`), **Food** (`food`), **Weight** (`goals`), **Workout** (`workout`). Remember last used type.
- **Expense:** big amount `$24.50` (46/700; `$` 30 muted; orange 3px caret), category chips (wrap, active = accent-soft + 1px accent inset ring), row: "Add note" + date ("Today, Oct 31" → native date input), reimbursable toggle (existing), **AmountKeypad** *or* native `<input inputMode="decimal">` (keypad is the mockup; native is an acceptable simpler fallback), primary button `Save expense · $24.50`. Calls `useExpenses().addExpense` with the existing payload shape (`amount, category, note, date, is_recurring`).
- **Food:** reuse the existing Food add flow (manual name/cal/P/C/F, servings, 📷 photo via `CameraModal`, AI analyze when `ai_food_analysis`) inside the sheet — restyled, same logic.
- **Weight:** numeric weight (decimal keypad), date, note → `useWeightLogs().saveEntry`.
- **Workout:** shortcut to today's checklist (open Body/Training for today) — there is no free-form workout entry in the data model.
- On save: toast (restyled dark), close sheet, refetch.

### 6.5 Remaining screens (follow the system)
- **Food** (Body → Food): header + DayPicker (WeekRow style), daily calories card with ProgressRing(s) for macros (orange + greys; drop the 3-colour macro rings), meals grouped by `meal_type` as ListRows (`420 cal · 32p · 48c · 10f`), add via "+" sheet. Keep Photo, AI analyze, AI corrections, micronutrients (collapsible), servings, edit/delete sheets.
- **Budget:** see 6.2.
- **Summary:** month picker; spending breakdown = horizontal ProgressBars per category or a single-colour donut (orange ramp), avg daily calories, totals as StatTiles; Export CSV buttons as secondary Buttons (keep `src/lib/csvExport.js`).
- **Me / Settings:** grouped list cards: Account (username, change username, change password — existing flows in BottomSheets), Monthly summary & export, Admin (if admin), Sign out (destructive text). Version + username footer.
- **Admin:** restyle only; keep feature toggles, password reset RPC.
- **Login:** dark card, Work Sans, white primary button; replace 🔒 emoji with the app icon.
- **Locked feature** (`RequireFeature`): dark EmptyState.

---

## 7. Mobile / PWA / correctness fixes
- **Icons:** `public/icons/` does **not exist** — manifest's `/icons/icon-192.png` & `icon-512.png` currently return `index.html` (SPA rewrite). Create `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (`"purpose":"maskable"`, safe zone), and `public/apple-touch-icon.png` (180×180) + `<link rel="apple-touch-icon">` in `index.html`. Simple mark: orange `#FF5A1F` "V" on `#0B0B0C` (*design uncertain — keep it minimal*). Ensure `vercel.json` rewrite doesn't swallow them (static files are served first on Vercel; verify after deploy-preview).
- **Theme colour:** unify to `#0B0B0C` in `index.html` `<meta name="theme-color">` and `manifest.json` (`theme_color`, `background_color`; currently `#0C0F14` vs `#0a0a0a`). Bump `CACHE_NAME` in `public/sw.js` when shipping.
- **Safe areas:** keep `viewport-fit=cover`; top padding `env(safe-area-inset-top)`, nav & sheets & pinned buttons `env(safe-area-inset-bottom)`.
- **Tap targets ≥44px** (current Modal close is 20×20; header buttons 37–40px).
- **Contrast:** no text below ~4.5:1 on `#0B0B0C/#18181A` — remove `.text-hint` at 30% alpha and `opacity: 0.55` labels; use `--muted #8E8E93` minimum for text, `--muted-2` only for chart axes.
- **Money formatting:** `formatCurrency` in `src/lib/helpers.js` uses `minimumFractionDigits: 0` → shows `$220.9`. Always 2 decimals (`minimumFractionDigits: 2, maximumFractionDigits: 2`). Exception allowed: compact axis labels.
- **Currency = CAD (display only):** Matteo logs everything in CAD. Change `formatCurrency` to `Intl.NumberFormat('en-CA', { style:'currency', currency:'CAD' })` (renders `$1,069.05`). Also check the 4 hand-built `` `$${…}` `` strings and the `toFixed` call sites (`SpendingChart.jsx`, `BodyGoalProgressCard.jsx`, `WeightChart.jsx`, `csvExport.js`, `bodyAnalysis.js`, `financeReconciliation.js`, `Goals.jsx`, `BodyGoals.jsx`, `Finance.jsx`, `Summary.jsx`) to route through one formatter. **Do not convert or migrate stored amounts** — values are already CAD numbers. ⚠️ Flag to Matteo if you find any code assuming USD (e.g. the AI prompt in `src/lib/ai.js`, CSV headers).
- **Friendly dates:** one `formatDate` helper (en-CA style but readable: "Today", "Yesterday", "Fri, Oct 30", "Feb 23, 2027"). Fix raw ISO like `projected 2027-02-23` in BodyGoals/Goals. Many `toLocaleDateString('en-US', …)` calls exist — centralize.
- **Code splitting:** current build is one **1.04 MB JS chunk (294 KB gzip)**. Use `React.lazy` + `Suspense` per route (pages in `src/pages/*`), lazy-load recharts-heavy screens and `CameraModal`/`ProgramEditor`/Admin. Target: initial JS < 300 KB raw.
- **Fonts:** load Work Sans with `display=swap` + preconnect (already pattern in `index.html`); consider self-hosting later.
- **Loading/empty states:** every list/card has a dark skeleton and an EmptyState with a single primary action.
- **Respect reduced motion** for sheet/ring animations.

---

## 8. Phased plan & acceptance checklists

**Phase 0 — CSS cascade bug** (§3)
- [ ] Unlayered reset + `header/section` rules removed/layered; base element rules in `@layer base`
- [ ] Utilities verified (`p-3`=12px, header flex) ; all screens screenshot-checked at 390×844
- [ ] `npm run build` passes; commit `fix(css): let Tailwind utilities apply`

**Phase 1 — Tokens + components**
- [ ] `@theme` tokens, Work Sans, light leftovers removed
- [ ] `src/components/ui/*` per §4.4 (+ a hidden `/dev/ui` route or Storybook-free gallery page to eyeball them; remove or gate before merge)
- [ ] Recharts `AreaChart` wrapper matches mockup (gradient, dashed grid, end dot, ref line)
- [ ] `formatCurrency` (CAD, 2 dp) + `formatDate` helpers with quick unit checks
- [ ] (optional) ESLint added in its own commit

**Phase 2 — Navigation + Quick add**
- [ ] New BottomNav (Home/Money/+/Body/Me) honoring feature toggles; desktop sidebar restyled
- [ ] Routes restructured; all old paths redirect
- [ ] Quick-add sheet: Expense (full), Weight, Food (reusing existing flow), Workout shortcut; saves via existing hooks; toasts
- [ ] Every nav/sheet target ≥44px; safe-area padding OK on notch devices

**Phase 3 — Home** (§6.1)
- [ ] Matches `mockups/d1-home.png` at 390×844 (spacing, sizes, colours)
- [ ] All values from real hooks; hidden cards for disabled modules; loading + empty states
- [ ] Inline styles removed from Dashboard

**Phase 4 — Money + Budget** (§6.2)
- [ ] Matches `mockups/d2-money.png`; cumulative spend chart + budget ref line
- [ ] Pills don't wrap; budgets top-3 + over-budget state; reimbursable tag
- [ ] Add/edit/delete expense, recurring expenses, income/savings edit all still work; totals equal pre-redesign numbers (`financeReconciliation` untouched)

**Phase 5 — Body: Workout, Progress (Goals+BodyGoals merged), Food** (§6.3, §6.5)
- [ ] Workout checklist restyled; ProgramEditor works; completion screen matches `mockups/d3-workout.png` and only shows tracked data
- [ ] Goals + Body Goals merged; weight/metrics/goal CRUD works; no raw ISO dates
- [ ] Food: photo, AI analyze (with `ai_food_analysis`), manual, servings, micros, edit/delete all work; `api/openai.js` unchanged

**Phase 6 — Summary, Me/Settings, Admin, Login**
- [ ] Summary restyled; CSV export works
- [ ] Me hub: username/password change, sign-out, admin link (admins only)
- [ ] Admin feature toggles + password reset still work
- [ ] Login restyled; login/logout/session persistence verified

**Phase 7 — PWA + perf + polish**
- [ ] Icons (192/512/maskable/apple-touch) served as `image/png` on a preview deploy; install to home screen shows the icon
- [ ] theme-color unified; SW cache bumped
- [ ] Route code-splitting; initial JS < ~300 KB raw; build warning gone
- [ ] Contrast pass (no text < 4.5:1), tap-target pass, reduced-motion
- [ ] Inline `style={{` count near zero (`grep -c "style={{" src -r`)
- [ ] Final 390×844 screenshot set of every screen attached to the PR; Matteo approves before merge to `main`

---

## 9. Reference files *(bundle-relative)*
- `mockups/d-all.png` — all four approved screens side by side
- `mockups/d1-home.png` + `mockups/d1-home.html` — Home/Today
- `mockups/d2-money.png` + `mockups/d2-money.html` — Money
- `mockups/d3-workout.png` + `mockups/d3-workout.html` — Workout logged
- `mockups/d4-quickadd.png` + `mockups/d4-quickadd.html` — Quick-add sheet (its HTML iframes `d1-home.html`)
- `mockups/d/` — mockup sources (`d1–d4.src.html`, shared status bar/nav partials, `build.py` assembles the final HTML)
- `mockups/d-style.css` — shared tokens/styles used by the mockups (open the HTML files in a browser at 390×844 to inspect exact values)
- `references/ref-1-training-complete.png`, `references/ref-2-ai-builder.png`, `references/ref-3-home-weekly.png` — Matteo's style references (third-party marketing shots; style inspiration only — don't copy their imagery/photos)
- `AUDIT.md` — mobile UX audit of the current app (bugs, file citations)

Mockup data is demo data (e.g. "$1,069.05 left", "Metro run −$42.18", exercise names "Chest press…", "Upper" tag) — real values come from the user's data.
