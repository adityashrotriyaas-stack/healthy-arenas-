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