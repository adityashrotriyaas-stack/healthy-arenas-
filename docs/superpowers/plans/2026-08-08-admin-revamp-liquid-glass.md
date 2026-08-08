# Admin Revamp — Liquid Glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two admin surfaces with one unified full-screen, mobile-first glass-UI admin panel; fix dish-edit saves, categories, menu sync to customers, and stats; remove dead code.

**Architecture:** Single `AdminPanel.jsx` full-screen admin (bottom tab bar on phones, left sidebar desktop). Server PUT/POST whitelist dish columns. Customer menu loads from DB on boot (fallback static). Pure helpers (`dishSanitize`, `weeklyTotals`) extracted for node:test unit tests. Local code has no test runner; `npm test` runs `node --test` (zero new dependencies).

**Tech Stack:** React 18 SPA (Vite), Vercel serverless API (`api/`), Supabase, `node --test` for pure functions.

## Global Constraints

- Dish table columns (supabase/schema.sql:1-13): `id, name, price, category, rating, time, tag, veg, image_url, available, created_at`. **No `prices`, `description`, `initial`, `color` columns** — API must never send these up.
- PIN auth stays unchanged; `X-Admin-Pin` header from `localStorage.ha_pin` (src/api/client.js:5-6).
- Palette: `C` from `src/lib/colors.js` (bg `#09090B`, cream `#E8E2D8`, orange `#E8590C`, green `#2DA85E`, amber `#E09520`, red `#D33`). Glass effect subtle, accent orange.
- No new npm dependencies. Tests run via `node --test` with `node:assert` — no jest/vitest.
- Commands: `npm test` (node --test `tests/`), `npm run build` (vite build).
- Every fetch that previously swallowed errors (`catch (e) {}`) must set visible error state with Retry.
- Spec: `docs/superpowers/specs/2026-08-08-admin-revamp-liquid-glass-design.md` (approved).

---

### Task 1: Dish API sanitization (fixes "edit dish won't save")

**Files:**
- Create: `api/_lib/dishFields.js`
- Modify: `api/dishes/index.js:14-33`
- Test: `tests/dishFields.test.js`
- Modify: `package.json` (add test script)

**Interfaces:**
- Consumes: nothing
- Produces: `DISH_FIELDS` (array), `sanitizeDish(obj)` → picks only known fields; exported from `api/_lib/dishFields.js`. Later tasks rely on the PUT/POST handlers using it.

- [ ] **Step 1: Write the failing test**

```js
// tests/dishFields.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDish } from "../api/_lib/dishFields.js";

test("sanitizeDish drops non-schema fields", () => {
    const out = sanitizeDish({
        name: "Paneer Wrap", price: "₹120", category: "Rolls",
        rating: 4.5, time: "12 min", tag: "", veg: true,
        image_url: "", available: false,
        prices: { half: "70", full: "140" }, description: "yum", initial: "P", color: "#fff",
    });
    assert.deepEqual(out, {
        name: "Paneer Wrap", price: "₹120", category: "Rolls",
        rating: 4.5, time: "12 min", tag: "", veg: true,
        image_url: "", available: false,
    });
    assert.equal("description" in out, false);
    assert.equal("initial" in out, false);
});

test("sanitizeDish keeps id when present", () => {
    const out = sanitizeDish({ id: 7, name: "X", price: "1", category: "C" });
    assert.equal(out.id, 7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/dishFields.test.js`
Expected: FAIL — `api/_lib/dishFields.js` cannot be imported (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Implement the sanitizer**

```js
// api/_lib/dishFields.js
const DISH_FIELDS = ["name", "price", "category", "rating", "time", "tag", "veg", "image_url", "available"];
export function sanitizeDish(obj) {
    const out = {};
    for (const f of DISH_FIELDS) if (obj[f] !== undefined) out[f] = obj[f];
    if (obj.id !== undefined) out.id = obj.id;
    return out;
}
```

- [ ] **Step 4: Add test script to package.json**

```jsonc
// package.json scripts
"test": "node --test tests/"
```

- [ ] **Step 5: Run test to verify passes**

Run: `npm test`
Expected: 2 passing.

- [ ] **Step 6: Rewire POST and PUT in api/dishes/index.js to use the sanitizer**

Replace lines 14-33 (`POST`/`PUT` blocks) with:

```js
if (req.method === "POST") {
    const { parseBody } = await import("../_lib/body.js");
    const fields = sanitizeDish(parseBody(req));
    if (!fields.name || !fields.price || !fields.category) return res.status(400).json({ error: "Missing required fields" });
    const dish = { ...fields, rating: fields.rating, time: fields.time || "10 min", tag: fields.tag || "", veg: fields.veg !== false, image_url: fields.image_url || "", available: fields.available !== undefined ? fields.available : true };
    const { data, error } = await supabase.from("dishes").insert(dish).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ dish: data });
}

if (req.method === "PUT") {
    const { parseBody } = await import("../_lib/body.js");
    const fields = sanitizeDish(parseBody(req));
    if (!fields.id) return res.status(400).json({ error: "Missing id" });
    const { id, ...updates } = fields;
    const { data, error } = await supabase.from("dishes").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ dish: data });
}
```

Add import at top of `api/dishes/index.js` after the existing isAdmin import:

```js
const { sanitizeDish } = await import("../_lib/dishFields.js");
```

Also update the GET response — leave as-is.

- [ ] **Step 7: Verify build + tests**

Run: `npm test` and `npm run build`
Expected: tests pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add api/_lib/dishFields.js api/dishes/index.js tests/dishFields.test.js package.json
git commit -m "fix: whitelist dish fields on POST/PUT so edits save"
```

---

## Task 2: Remove dead categories API + load menu from DB on boot

**Files:**
- Modify: `src/api/client.js` (remove `categoriesApi`)
- Modify: `src/lib/contexts.jsx:46-71` (DishesProvider — auto-load from API on mount)
- Modify: `src/data/dishes.js` (unchanged — DISHES stays as fallback)

**Interfaces:**
- Consumes: `dishesApi.list()` (exists)
- Produces: no new exports; DishesProvider now calls `loadFromApi()` in a mount effect. Customer menu (uses `getDishes()`) therefore sees DB dishes after boot.

- [ ] **Step 1: Delete categoriesApi block from client.js**

Remove lines 49-53 (the `categoriesApi` export). Nothing imports it (verified: not referenced anywhere in `src/`).

- [ ] **Step 2: Wire loadFromApi into DishesProvider**

Replace in `src/lib/contexts.jsx` the DishesProvider body:

```jsx
function DishesProvider({ children }) {
    const [version, setVersion] = useState(0);
    useEffect(() => {
        dishesApi.list().then(data => {
            if (data?.dishes?.length) {
                localStorage.setItem("admin_dishes", JSON.stringify(data.dishes));
                setVersion(v => v + 1);
            }
        }).catch(() => {});
    }, []);
    // getDishes / saveDishes / loadFromApi unchanged
    ...
}
```

Remove `loadFromApi` from the exported context value (no longer used) but keep the function body if any other code uses it — first grep `loadFromApi`; if only here, inline it as above and drop the export.

- [ ] **Step 3: Verify**

Run: `npm run build` — must pass. Grep to confirm no `categoriesApi` references remain.

- [ ] **Step 4: Commit**

```bash
git add src/api/client.js src/lib/contexts.jsx
git commit -m "fix: menu loads from DB on boot, drop dead categories API"
```

---

## Task 3: Extract weekly stats helper (real chart data)

**Files:**
- Create: `src/lib/stats.js`
- Test: `tests/stats.test.js`

**Interfaces:**
- Consumes: nothing
- Produces: `totals(orders)` → `{ revenue, avgOrder, pendingCount, completedCount }`; `weeklyTotals(orders)` → `[{ day, amount }, …]` 7 entries Mon..Sun with real sums; `maxBar(weekly)` → max amount. Task 7 (Home tab) imports these. `orders` is an array shaped like Order rows: `{ status, total, created_at }`.

- [ ] **Step 1: Write failing test**

```js
// tests/stats.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { totals, weeklyTotals, maxAmount } from "../src/lib/stats.js";

const orders = [
    { status: "delivered", total: 300, created_at: "2026-08-03T10:00:00Z" }, // Mon
    { status: "cancelled", total: 500, created_at: "2026-08-03T11:00:00Z" },
    { status: "confirmed", total: 200, created_at: "2026-08-05T10:00:00Z" }, // Wed
];

test("totals: revenue excludes cancelled, pending counts confirmed", () => {
    const t = totals(orders);
    assert.equal(t.revenue, 300);
    assert.equal(t.pendingCount, 1);
    assert.equal(t.completedCount, 2);
});

test("weeklyTotals: real sums, zero days not random", () => {
    const w = weeklyTotals(orders);
    assert.equal(w.length, 7);
    assert.deepEqual(w.map(d => d.label), ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]);
    assert.equal(w[0].amount, 300);
    assert.equal(w[2].amount, 200);
    assert.equal(w[1].amount, 0);
});

test("maxAmount returns at least 1", () => {
    assert.equal(maxAmount(weeklyTotals([])), 1);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/stats.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement**

```js
// src/lib/stats.js — pure helpers for admin dashboard; day-of-week from ISO date string
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const dayIdx = iso => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return -1;
    return (d.getDay() + 6) % 7; // 0 = Mon
};

export function totals(orders) {
    const completed = orders.filter(o => o.status !== "cancelled");
    const revenue = completed.reduce((s, o) => s + (o.total || 0), 0);
    return {
        revenue,
        completedCount: completed.length,
        pendingCount: orders.filter(o => o.status === "confirmed").length,
    };
}

export function weeklyTotals(orders) {
    if (!orders.length) return DAYS.map(label => ({ label, amount: 0 }));
    const perDay = new Array(7).fill(0);
    for (const o of orders) {
        const d = dayIdx(o.created_at);
        if (d >= 0 && o.status !== "cancelled") perDay[d] += o.total || 0;
    }
    return DAYS.map((label, i) => ({ label, amount: perDay[i] }));
}

export function maxAmount(weekly) {
    return Math.max(1, ...weekly.map(d => d.amount));
}
```

Note: `dayIdx` normalizes to Mon=0 so bars align with the `DAYS` label order.

- [ ] **Step 4: Run**

Run: `npm test` → all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.js tests/stats.test.js
git commit -m "feat: real weekly revenue stats, no fake data"
```

---

## Task 4: Unified AdminPanel shell — full screen glass, tabs, delete AdminDashboard, rewire App

**Files:**
- Modify: `src/components/AdminPanel.jsx` (shell + tabs: dashboard/dishes/orders/users)
- Modify: `src/components/AdminDashboard.jsx` → replaced by Home tab; **delete the file**
- Modify: `src/App.jsx` (imports, `showAdmin` semantics, remove `showDashboard`, remove `onDashboardOpen` in Nav arrow props)

**Interfaces:**
- Consumes: `useDishes` (`getDishes`,`saveDishes`,`version`) from contexts; `ordersApi.list(null,true)`, `usersApi.list()`; `StatusBadge`, `Icon`, `C`.
- Produces: `AdminPanel({ onClose, initialTab })` — full-screen layout with bottom tab bar (mobile) / left rail (desktop); internal tab components rendered from one switch. `window.__openAdmin` unchanged; AdminDashboard fully removed.

### Home tab (was dashboard page) — real stats

**imports** inside the component file:

```js
import { totals, weeklyTotals, maxAmount } from "../lib/stats";
```

### Layout skeleton (replaces modal + maxWidth wrapper)

Inside `AdminPanel`, replace the modal wrapper (currently lines 124-135) with:

```jsx
const NAV_TABS = [
    ["dashboard", "Home", "home"],
    ["dishes", "Dishes", "dish"],
    ["orders", "Orders", "clipboard"],
    ["users", "Users", "chat"],
];

return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: C.bg, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflow: "auto", padding: "20px 16px 90px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 20, color: C.cream }}>
                    Admin {tab === "dashboard" ? "" : "· " + tab}
                </div>
                <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 10, padding: "8px 14px", fontFamily: "Inter", fontSize: 12, color: C.creamDim }}>
                    ← Back to Site
                </button>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 16, padding: "20px" }}>
                {tabContent()}
            </div>
        </div>
        <div style={{ background: "rgba(9,9,11,0.6)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", zIndex: 610 }}>
            {TAB_DEFS.map(...bottom tab buttons, same style as existing pill tabs)}
        </div>
    </div>
);
```

Use `.grid-stats` for 4 stat-card layout (already in CSS at App.jsx:1749 — 4→2→1 responsive).

### Tab content map

- `dashboard`: 4 stat cards (query `totals()`), weekly bar chart (real amounts), Quick actions (Open Orders, Add Dish, View Site), Recent 5 orders (list w/ StatusBadge). Error banner (if orders fetch failed) + Retry.
- `dishes`: (Task 5)
- `orders`: (Task 6)
- `users`: (Task 7)

Keep existing `fetchOrders`/`fetchUsers` behavior but add `const [err, setErr] = useState(null)` set in catch; Retry button calls the failing fn again.

- [ ] **Step 1: Rewire App.jsx — stop rendering AdminDashboard**

In `src/App.jsx`:

- Replace `showDashboard` state decl (line 1722) `const [showDashboard, setShowDashboard] = useState(false);` → remove it. Keep `showAdmin` (string tab).
- Remove `window.__openDashboard` lines (1725, 1728 in the effect + cleanup).
- In render: remove the `showDashboard ? <Suspense>…<AdminDashboard/>… : <>` ternary — always render site content; keep `{showAdmin && <Suspense…/>}` for panel.
- Nav/BottomNav props: change `onDashboardOpen={setShowDashboard}` to `onDashboardOpen={() => setShowAdmin("dashboard")}` everywhere (`Nav` line 1806, bottom nav), and delete the `AdminDashboard` import from the lazy block (line 8-9: keep `AdminPanel` only).
- `AdminPinModal` onUnlock unchanged.
- Add `Suspense` behavior preserving.

- [ ] **Step 2: Rebuild AdminPanel shell**

Re-implement the file per above skeleton: name the existing tab-nav inline into the bottom bar (reuse the existing tab button styles from lines 152-160, repackaged for bottom bar); move all existing tab content into the `tabContent()` switch. Add the err/retry states. Ensure imports from Task 3 exist.

- [ ] **Step 3: Delete AdminDashboard.jsx**

`git rm src/components/AdminDashboard.jsx`

- [ ] **Step 4: Verify**

Run: `npm run build` — pass. Grep to ensure `AdminDashboard` is gone (no imports).

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPanel.jsx src/App.jsx
git rm src/components/AdminDashboard.jsx
git commit -m "feat: unify admin into one glass full-screen panel; real stats"
```

---

## Task 5: Dishes tab — fixing dish edit save UX

**Files:**
- Modify: `src/components/AdminPanel.jsx` (dishes tab section)

**Interfaces:**
- Consumes: `getDishes`, `saveDishes`, `version`; `dishesApi.create/update/delete`.
- Produces: Dishes tab with per-dish edit card (existing form), "Save" per row, category field as free text w/ `<datalist>` of existing categories (renames create new), availability toggle button, delete button; optimistic UI.

- [ ] **Step 1: Replace saveToApi with per-row save**

Replace the save-to-api loop with per-dish save (create → use returned dish w/ id; update → use sanitized fields):

```js
async function saveDishRow(dish) {
    setSaving(true);
    try {
        if (dish.id) {
            await dishesApi.update(dish.id, dish);
        } else {
            const created = await dishesApi.create(dish);
            dish.id = created.dish.id; // capture DB id
        }
        const updated = dishes.map(d => d.id === dish.id || d === dish ? dish : d);
        setDishes(updated);
        saveDishes(updated);
        toast("Saved!", "success");
    } catch (e) { toast("Save failed", "info"); }
    setSaving(false);
    setEditIdx(null);
    fetchDishes();
}
```

(Edit existing `saveToApi` accordingly. `fetchDishes` is a small re-fetch from `getDishes()` + `setDishes` to keep UI in sync after save.)

- [ ] **Step 2: Category select — free text via datalist**

Replace the edit-form `<select>` (line 242-244) with:

```jsx
<input list="dish-cats" value={dish.category} onChange={e => updateDish(i, "category", e.target.value)} ... />
<datalist id="dish-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
```

`categories` derived (line 25) already: `[...new Set(getDishes().map(d => d.category))].sort()`.

- [ ] **Step 3: Row display — availability toggle + remove delete-only row**

In the row view (lines 294-311): keep Edit/Delete buttons; add an inline availability pill toggle button: `onClick={() => updateDish(i, "available", !dish.available)}` showing "Available/Unavailable" (orange when available).

- [ ] **Step 4: Remove old multi-save button**

Delete the "Save All" footer button (lines 285-290) — replaced by per-row Save in edit card. In edit card, footer buttons become Cancel + Save (calls `saveDishRow(dish)`).

- [ ] **Step 5: Category tab removal**

Delete the entire `{tab === "categories" …}` block; remove `newCat`/`addCategory`/`removeCategory`/`categories` initialization referencing those. Keep `categories` derived state for datalist.

- [ ] **Step 6: Verify**

Run: `npm run build`; open admin Dishes tab in app manually if possible.

- [ ] **Step 7: Commit**

```bash
git add src/components/AdminPanel.jsx
git commit -m "feat: dishes tab per-row save, category datalist, available toggle"
```

---

## Task 6: Orders tab — real status updates, retry, phone/maps

**Files:**
- Modify: `src/components/AdminPanel.jsx` (orders tab)

**Interfaces:**
- Consumes: `ordersApi.list(null,true)`, `ordersApi.updateStatus(id, status)`; `StatusBadge`.
- Produces: order list with status-filter chips, next-step button, error/empty states.

- [ ] **Step 1: Add refetch + error retry**

`fetchOrders` catch → `setOrderErr("Couldn't load orders")`. UI: when `orderErr`, render message + Retry button (calls fetchOrders). Add a "Refresh" icon button next to filter chips always.

- [ ] **Step 2: Status buttons per order — replace flat pill-strips**

Keep filter chips; per order, show current StatusBadge + exactly one primary action button that advances; plus Cancel when status not in (`delivered`/`cancelled`):

```js
const NEXT = { pending: "confirmed", confirmed: "preparing", preparing: "delivering", delivering: "delivered" };
// button: onClick={() => updateOrderStatus(o.id, NEXT[o.status] || ...)} label `→ ${NEXT[o.status] || "delivered"}`
```

Cancel button separate with red tint (reuse lines 399-403 pattern).

- [ ] **Step 3: Phone + address links, items expandable**

Wrap phone in `tel:` link and address in `maps:` link (as today lines 406-414, keep). Items list: keep joined as today. (No new behavior needed; page still foldable.)

- [ ] **Step 4: Run build**

`npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPanel.jsx
git commit -m "feat: orders tab next-step status, retry, refresh"
```

---

## Task 7: Users tab + role button fix

**Files:**
- Modify: `src/components/AdminPanel.jsx` (users tab)

**Interfaces:**
- Consumes: `usersApi.list()`, `usersApi.updateRole(id, role)`.
- Produces: existing list + glass styling, functional `setUsers` updates (no stale-closure), error toast on failure, confirm dialog kept.

- [ ] **Step 1: Functional user update in `updateUserRole`**

```js
async function updateUserRole(targetUserId, role) {
    if (!confirm(`Set this user as ${role}?`)) return;
    try {
        await usersApi.updateRole(targetUserId, role);
        setUsers(u => u.map(u2 => u2.id === targetUserId ? { ...u2, role } : u2));
        toast(`User role updated to ${role}`, "success");
    } catch (e) { toast("Failed to update role", "info"); fetchUsers(); }
}
```

- [ ] **Step 2: Users list error + retry**

Same err/retry wiring as orders; show count.

- [ ] **Step 3: Build + commit**

```bash
npm run build  # must pass
git add src/components/AdminPanel.jsx
git commit -m "fix: users role updates functional state, retry, error surfacing"
```

---

## Task 8: Verification pass

**Files:** none required

- [ ] **Step 1: Run tests**

`npm test` → all green.

- [ ] **Step 2: Build**

`npm run build` → success.

- [ ] **Step 3: Manual smoke (user)**

- Admin unlock → Home tab shows real stat cards (no fake chart).
- Dishes: edit a dish, save → toast "Saved!"; verify row persisted (refresh).
- Dishes: create dish; give it a new category name → appears; customer Menu shows it on reload.
- Orders: filter chips; advance status of an order → badge updates.
- Users: toggle admin role → role pill + DB.
- All tabs on mobile-width (DevTools phone emulation): bottom tab bar tappable.
- [ ] **Step 4: Commit any leftover**

```bash
git add -A
git commit -m "chore: verify admin revamp"
```

---

## Self-Review Notes

- Spec → task mapping: dish save fix (T1), DB menu (T2), fake chart/real stats (T3+T4), unified surface + glass (T4), categories derived + datalist (T5+4), order status UX + silent errors (T6+4), user roles (T7), phone-first glass (T4/T5), verification (T8).
- No placeholders: all steps carry concrete code.
- Names consistent: `sanitizeDish`, `totals`, `weeklyTotals`, `maxAmount`, `updateUserRole`, `saveDishRow`, `fetchOrders`, `orderErr`.