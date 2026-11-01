# Vita mobile UI/UX audit (read-only) — 2026-10-31
Repo commit ed6e8a3 (Kingsman2277/Vita main). Live: https://vita-life-os.vercel.app (login only).
In-app screens rendered locally with a mocked Supabase client + demo data (repo/.audit/), no prod data/auth touched.

Stack: Vite 5 + React 19 SPA, react-router 7, Tailwind v4 (@tailwindcss/vite) + big hand-rolled app.css (no shadcn), recharts, react-hot-toast, Supabase (auth+DB), /api/openai.js Vercel function. Dark-only (html class="dark" hard-coded).
Routes: /login(gate) /dashboard /food /workout /finance /budget /goals /body-goals /summary /settings /admin  (feature-gated per user).

## Root-cause bugs
1. src/app.css: unlayered `* {margin:0;padding:0}` and `header{display:block}` override Tailwind v4 (layered) utilities → every p-*/m-*/px-*/mt-* class is 0 and `<header class="flex ...">` is block. Verified computed styles on prod too. Causes stacked headers (Dashboard gear under date, Workout/BodyGoals buttons under title) and ~430 inline style={{}} workarounds.
2. public/icons/ missing → manifest icons 192/512 return index.html (SPA rewrite). No apple-touch-icon. Home-screen icon is broken/generic. manifest theme #0a0a0a vs meta #0C0F14.
3. formatCurrency minimumFractionDigits:0 → "$220.9 spent", "-$22.4 left" (Budget). Currency USD (guess: should be CAD?).
4. Raw ISO date "projected 2027-02-23" next to "goal Feb 28" (BodyGoals/Goals).
## Mobile UX
- 7-item bottom nav (BottomNav.jsx) ~55px/item, 10px labels; Settings only via 40px gear on Dashboard; Admin only from Settings.
- Primary "add" actions at top-right of each page (Finance "+ Expense", Food "+ Log Food", BodyGoals "+ Weight") — worst thumb zone; Finance header buttons wrap ("📊 / Summary", "+ / Expense"). Dashboard "Log Expense" only navigates to /finance (no sheet) and quick actions sit below the fold at 844px.
- Finance category filter pills shrink + wrap emoji over label (flex items need shrink-0/nowrap).
- Modal (Modal.jsx): bottom sheet ok, but 20x20 close button, no drag handle, no safe-area bottom padding, 85vh.
- Forms: good — inputMode=decimal/numeric everywhere, native date inputs, 16px font (no iOS zoom). Reimbursable toggle stored in `is_recurring` column (naming mismatch).
- Goals vs Body Goals overlap (body goal card + inline edit forms on Goals page; BodyGoals is 3,400px tall).
- Contrast: .text-hint at 30% alpha (~3:1) fails; muted 55% ok.
- Light palette in :root is an unused leftover brown theme.
- Perf: single 1.04 MB JS chunk (294 KB gz), no route lazy-loading; recharts in main bundle. Google Fonts render-blocking.
- PWA: SW network-first cache (fine), standalone, viewport-fit=cover + safe-area padding present (good).
