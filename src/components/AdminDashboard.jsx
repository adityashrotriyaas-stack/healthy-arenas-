import { useState, useEffect } from "react";
import { C } from "../lib/colors";
import { Icon } from "../lib/icons";
import { useDishes } from "../lib/contexts";
import { ordersApi, usersApi } from "../api/client";
import { StatusBadge } from "./StatusBadge";

function AdminDashboard({ onClose, onAdminOpen }) {
    const { getDishes, version } = useDishes();
    const [dishes, setDishes] = useState([]);
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => { setDishes(getDishes()); fetchData(); }, [version, getDishes]);

    async function fetchData() {
        try {
            const [o, u] = await Promise.all([ordersApi.list(null, true), usersApi.list()]);
            setOrders(o.orders);
            setUsers(u.users);
        } catch (e) {}
    }

    const completedOrders = orders.filter(o => o.status !== "cancelled");
    const totalRev = completedOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder = completedOrders.length ? Math.round(totalRev / completedOrders.length) : 0;
    const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "confirmed").length;

    const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = completedOrders.length > 0
        ? DAYS.map((d, i) => ({
            day: d,
            amount: completedOrders.filter(o => {
                const day = o.created_at ? new Date(o.created_at).getDay() : -1;
                return day === (i + 1) % 7;
            }).reduce((s, o) => s + (o.total || 0), 0)
        }))
        : DAYS.map((d, i) => ({ day: d, amount: Math.floor(Math.random() * 8000) + 2000 }));

    const maxAmt = Math.max(...weeklyData.map(d => d.amount), 1);

    return (
        <div style={{ minHeight: "100vh", background: C.bg, display: "flex", flexDirection: "column" }}>
            <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "16px 5vw", borderBottom: `1px solid ${C.border}`,
                background: C.bgCard, position: "sticky", top: 0, zIndex: 100,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 11, color: "#fff" }}>HA</div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 14, color: C.cream }}>Admin Dashboard</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" onClick={() => onAdminOpen("dashboard")}
                        style={{ background: "rgba(232,89,12,0.15)", border: `1px solid ${C.borderO}`, cursor: "pointer", borderRadius: 8, padding: "8px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.orange }}
                    ><Icon name="settings" size={13} style={{ marginRight: 4 }} /> Admin Panel</button>
                    <button type="button" onClick={onClose}
                        style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 8, padding: "8px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500, color: C.creamDim }}
                    >← Back to Site</button>
                </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "32px 5vw" }}>
                <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 28, color: C.cream, margin: "0 0 28px" }}>
                        Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, Admin
                    </h2>

                    <div className="grid-4" style={{ gap: 14, marginBottom: 36 }}>
                        {[
                            ["Total Revenue", `₹${totalRev.toLocaleString()}`, C.orange, "₹" + (totalRev > 0 ? (totalRev / (completedOrders.length || 1)).toFixed(0) : "0"), "avg per order"],
                            ["Total Orders", completedOrders.length, C.green, pendingOrders, "pending"],
                            ["Active Dishes", dishes.filter(d => d.available !== false).length, C.amber, dishes.length, "total items"],
                            ["Registered Users", users.length, C.cream, users.filter(u => u.role === "admin").length, "admins"],
                        ].map(([label, val, color, sub, subLabel]) => (
                            <div key={label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "22px" }}>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, marginBottom: 6 }}>{label}</div>
                                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 30, color, lineHeight: 1.1 }}>{val}</div>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginTop: 4 }}>{sub} {subLabel}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, marginBottom: 36 }}>
                        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "0 0 20px" }}>Weekly Revenue</h3>
                            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                                {weeklyData.map((d, i) => (
                                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                        <div style={{
                                            width: "100%", borderRadius: "6px 6px 0 0",
                                            height: `${(d.amount / maxAmt) * 100}%`,
                                            background: `linear-gradient(to top, ${C.orange}, ${C.amber})`,
                                            opacity: 0.8, transition: "opacity 0.2s", minHeight: 4,
                                        }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                            onMouseLeave={e => e.currentTarget.style.opacity = "0.8"}
                                        />
                                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.creamDim }}>{d.day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "0 0 16px" }}>Quick Actions</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {[
                                    { label: "Open Admin Panel", icon: "settings", action: () => onAdminOpen("dashboard"), color: C.orange },
                                        { label: "Add New Dish", icon: "plus", action: () => onAdminOpen("dishes"), color: C.green },
                                        { label: "View All Orders", icon: "clipboard", action: () => onAdminOpen("orders"), color: C.amber },
                                ].map(item => (
                                    <button key={item.label} type="button" onClick={item.action}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 10,
                                            background: C.bg, border: `1px solid ${C.border}`,
                                            borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                                            fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream,
                                            transition: "all 0.2s",
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderO; e.currentTarget.style.background = "rgba(232,89,12,0.05)"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}
                                    >
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            <Icon name={item.icon} size={14} style={{ color: item.color }} />
                                        </div>
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: 0 }}>Recent Orders</h3>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>{orders.length} total</span>
                        </div>
                        {orders.slice(0, 8).length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.creamDim }}>No orders yet</div>
                        ) : (
                            <div>
                                {orders.slice(0, 8).map(o => (
                                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: C.cream }}>#{o.id}</span>
                                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {o.items?.slice(0, 2).map(item => item.name).join(", ")}{o.items?.length > 2 ? "..." : ""}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: C.orange }}>₹{o.total}</span>
                                            <StatusBadge status={o.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export { AdminDashboard };
