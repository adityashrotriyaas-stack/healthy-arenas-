# Admin Dashboard Redesign — Liquid Glass Admin Panel

**Date:** 2026-08-08
**Status:** Approved (design review passed)
**Scope:** Unify both admin surfaces into one full-screen, mobile-first admin panel with subtle frosted-glass UI; fix the broken admin functions; make menu edits actually reach customers.

## Problem

Two admin surfaces exist: `AdminDashboard.jsx` (full-page stats) and `AdminPanel.jsx` (modal with tabs). Broken functions:

1. **Edit dish won't save** — `putDish` sends `prices`/`description`/`initial`/`color`, which are not columns in the `dishes` table → Supabase rejects → "Failed to sync" toast.
2. **Categories don't persist** — add/remove category is local-only state, never stored anywhere.
3. **User role buttons appear broken** — client→server wiring looks correct statically; must be verified live and fixed.
4. **Menu edits never reach customers** — `DishesProvider.loadFromApi` is never called; customer menu reads only localStorage/static `DISHES`. Admin DB edits do nothing on the live site.
5. **Stats wrong/misleading** — weekly chart uses `Math.random()` fabricated data when no orders; pending counter counts "confirmed" as pending; fetch errors are silently swallowed.

## Design

### A. Root-cause fixes

1. **Dish save** — `api/dishes/index.js` PUT must whitelist columns exactly like POST does (id, name, price, category, rating, time, tag, veg, image_url, available). Client keeps sending full objects; server drops unknown keys. Verify `available` is honored on POST too (currently dropped, always defaults true).
2. **DB-backed menu** — `DishesProvider` fetches `/api/dishes` on boot (call `loadFromApi`), falls back to static `DISHES` on failure. Admin `saveToApi` keeps pushing to the API and localStorage cache; customer site now receives edits. Cache stays as offline fallback only.
3. **Categories = derived** — delete the Categories tab. Category is the set of values currently on dishes. Rename happens by editing a dish's category; dish form's category select gains a "New category…" free-text option.
4. **Weekly chart** — replace `Math.random()` with real sums grouped by weekday from `orders`; when no data, show an empty state ("No orders this week yet").
5. **Error transparency** — `fetchOrders`/`fetchUsers`/dish fetch: visible error state with Retry button; auto-refetch on panel open. No more silent `catch {}`.
6. **User role buttons** — live-test against API; fix whatever actually breaks (look at env PIN on the caller + the API's isAdmin path before assuming UI). Keep confirm() and optimistic patch, add error toast on failure.

## B. Structure

One full-screen component `AdminPanel.jsx` (replaces modal shell + `AdminDashboard.jsx` which is deleted). Internal sub-components in the same file or co-located: `TabsNav`, `DishesTab`, `OrdersTab`, `UsersTab`, `StatsGrid`, `GlassCard`.

App.jsx changes:
- `showAdmin` (string tab) becomes the only toggle; `showDashboard` removed; `window.__openDashboard` removed.
- All entry points (Navbar pill, nav dropdown, BottomNav profile) route to `AdminPanel` with tab `"dashboard"`.
- `AdminDashboard.jsx` deleted; `App.jsx` lazy import for AdminPanel remains.

## Layout (mobile-first)

- **Phone:** full-screen vertical layout: glass header (title + back), bottom tab bar with 4 tabs (Home / Dishes / Orders / Users) — thumb-reachable, sticky. Content scrolls above.
- **Desktop (≥1024px):** left glass sidebar with the 4 tabs, content on the right.

Tab behavior:
- Home: 4 stat cards (Revenue [non-cancelled], Orders, Pending orders, Users) in 2x2 grid on phone, 4-across on desktop; weekly bars chart; quick actions (Open Site, Mark all confirmed? — no, keep minimal: back to site + refresh); recent 5 orders list.
- Dishes: grouped by category like today; row = image thumb, name, price, veg/NV dot, available toggle (quick switch without edit form), Edit / Delete. Edit expands in-place; Save persists across the API. Add dish = same default row, opened in edit mode.
- Orders: filter chips (all, pending, confirmed, preparing, delivering, delivered, cancelled, paid?) — keep existing status filter set. Order card shows id, time, items summary (expandable), total, payment status, status buttons (next-step flow: confirmed→preparing→delivering→delivered; cancel button), address (tap→Maps), phone (tap→call).
- Users: list with name/email/phone, role pill, Make Admin / Revoke Admin buttons (unchanged logic, verified working).

## C. Glass UI

- Palette stays `C` (dark cream/orange café identity).
- Add glass primitives as inline style helpers (no new CSS library):
  - `glassCard`: `rgba(255,255,255,0.04)` bg + `backdrop-filter: blur(16px)` + 1px `rgba(255,255,255,0.08)` border + subtle inner highlight (`inset 0 1px 0 rgba(255,255,255,0.06)` + soft shadow).
  - `glassHeader`: fixed top bar with `blur(20px)` at heavy translucency.
  - Shell background: dark gradient (bg → slightly lighter) behind all content so blur shows.
- Subtle frosted: blur only on the shell/headers and cards that sit over content; inner text stays high-contrast cream. Orange accent for active states.

## Data flow

Admin loads: dishes (local cache → API), orders (API), users (API). Any admin action → API call → optimistic UI update → toast on failure + refetch. Customer site loads menu from API on boot (with cache fallback). No new endpoints needed; `categoriesApi` dead code removed (client.js + any usage).

## Out of scope (YAGNI)

- No /admin route or react-router usage.
- No order pagination / infinite scroll.
- No auth overhaul (PIN login stays).
- No multi-image dishes, no drag-reorder.
- No toast library change.
- No batch endpoints (sequential save is fine at this scale).

## Testing

- `npm run build` passes.
- Live check against deployed API: dish edit (verify DB row), order status update, role toggle, customer home shows newly-created dish.
- Manual: all 4 tabs load on phone-width (simulate mobile view) and desktop.