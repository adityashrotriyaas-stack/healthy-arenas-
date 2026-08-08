
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
            {tabNavButtons.map(b => b)}
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
