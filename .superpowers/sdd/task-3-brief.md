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

