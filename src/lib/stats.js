// src/lib/stats.js — pure helpers for admin dashboard; day-of-week from ISO date string
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

const dayIdx = iso => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return -1;
    return (d.getDay() + 6) % 7; // 0 = Mon
};

export function totals(orders) {
    const completed = orders.filter(o => o.status !== "cancelled");
    const revenue = orders.filter(o => o.status === "delivered").reduce((s, o) => s + (o.total || 0), 0);
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

export function orderShortId(id) {
    if (!id) return "—";
    const num = parseInt(id.replace(/-/g, "").slice(0, 8), 16) % 10000;
    return `FD-${String(num).padStart(4, "0")}`;
}