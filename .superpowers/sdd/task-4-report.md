# Task 4 Report — Unified AdminPanel shell

## What changed

**`src/components/AdminPanel.jsx`** (rewritten shell, tabs preserved)
- Replaced the fixed modal + black-backdrop + 960px card with a full-viewport glass shell: `position:fixed; inset:0; z-index:600`, own `C.bg` background, content column `maxWidth:1100`, top bar ("Admin · tab" title + "← Back to Site"), content card `rgba(255,255,255,0.04)`.
- Bottom tab bar (`className="admin-bottombar"`, fixed bottom, blurred glass, 4 tabs: Home/Dishes/Orders/Users) shown on mobile, hidden by CSS at >=900px; top bar (`className="admin-topbar"`) hidden at <=480px.
- Added new `"dashboard"` tab: 4 `.grid-stats` cards from `totals()` (Total Revenue = delivered-only, Total Orders = completedCount, Pending = pendingCount, Dishes = dishes.length); real weekly bar chart from `weeklyTotals()`/`maxAmount()` (labels from `stats.js`, "No orders this week yet" when all zero); Quick Actions (Open Orders, Add Dish, View Site); Recent 5 orders with `StatusBadge`; error banner + Retry wired to `ordersError`/`usersError` set in `fetchOrders`/`fetchUsers` catch blocks.
- Removed the "categories" tab entirely (JSX, `newCat`/`addCategory`/`removeCategory` state+functions). Dishes tab category select now uses derived `categories = [...new Set(dishes.map(d => d.category))].sort()`.
- All existing data logic and dishes/orders/users tab JSX kept byte-identical (fetch/update/save/add/delete functions, filters, editors).

**`src/App.jsx`**
- Removed `AdminDashboard` lazy import, `showDashboard` state, `window.__openDashboard` (effect + cleanup).
- `showAdmin` now a tab string; `onDashboardOpen` props (Nav) remapped to `() => setShowAdmin("dashboard")`; removed the `showDashboard ? <AdminDashboard/> …` ternary — site always renders, AdminPanel overlays fixed full-screen.
- Footer profile "Dashboard" button now calls `window.__openAdmin?.()` (single admin surface).
- Added global CSS: `@media (min-width: 900px) { .admin-bottombar { display:none; } }` and `@media (max-width: 480px) { .admin-topbar { display:none; } }`.

**`src/components/AdminDashboard.jsx`**: `git rm` — no remaining references anywhere (grep confirmed only App.jsx before removal).

Not touched: api/, checkout, hero, cart, order placement.

## Build output

`npm run build` (vite 6.4.3) — PASS, 672ms, 35 modules, no warnings. AdminPanel chunk 22.66 kB (5.18 kB gzip).

## Commit

`74d5b79` — "feat: unify admin into one glass full-screen panel; real stats" (3 files, +373/-518).

## Fix 1 report

**F1 — Desktop tab navigation missing.** Extracted the 4 tab buttons in `AdminPanel.jsx` into a single `tabButtons` array (one source of truth), rendered in both the mobile bottom bar and a new `.admin-desktop-tabs` pill row placed under the topbar inside the content column. CSS: `.admin-desktop-tabs { display:none }` on mobile, `display:flex` at ≥900px, where `.admin-bottombar` is hidden. Users tab now reachable on desktop; Home reachable from any tab.

**F2 — No close on ≤480px.** Deleted the `@media (max-width:480px){.admin-topbar{display:none}}` rule entirely; the "← Back to Site" button is now always visible. Also moved `.admin-bottombar` display control into CSS (removed inline `display:flex`, added base `.admin-bottombar{display:flex}`) — the old inline style was defeating the class-based hide rule.

No tab content or data logic touched.

Build: `npm run build` (vite 6.4.3) — PASS, 616ms, 35 modules, no warnings.

Commit: `da6e4be` — "fix: admin desktop tab nav + always-visible back button" (3 files, +59/-13).