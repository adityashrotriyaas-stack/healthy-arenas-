import { useState, useEffect, useRef } from "react";
import { C } from "../lib/colors";
import { Icon } from "../lib/icons";
import { useDishes, useToast } from "../lib/contexts";
import { dishesApi, ordersApi, usersApi } from "../api/client";
import { StatusBadge } from "./StatusBadge";
import { totals, weeklyTotals, maxAmount, orderShortId } from "../lib/stats";

const NAV_TABS = [
    ["dashboard", "Home", "home"],
    ["dishes", "Dishes", "dish"],
    ["orders", "Orders", "clipboard"],
    ["users", "Users", "chat"],
];

const NEXT = { pending: "confirmed", confirmed: "preparing", preparing: "delivering", delivering: "delivered" };

function AdminPanel({ onClose, initialTab = "dashboard" }) {
    const { getDishes, saveDishes, version } = useDishes();
    const { toast } = useToast();
    const [dishes, setDishes] = useState([]);
    const [editIdx, setEditIdx] = useState(null);
    const [tab, setTab] = useState(initialTab);
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [orderFilter, setOrderFilter] = useState("all");
    const [ordersError, setOrdersError] = useState(false);
    const [usersError, setUsersError] = useState(false);
    useEffect(() => {
        setDishes(getDishes());
        fetchOrders();
        fetchUsers();
    }, [version, getDishes]);

    useEffect(() => {
        const id = setInterval(fetchOrders, 10000);
        return () => clearInterval(id);
    }, []);

    async function fetchOrders() {
        try {
            const data = await ordersApi.list(null, true);
            setOrders(data.orders || []);
            setOrdersError(false);
        } catch (e) { setOrdersError(true); }
    }

    async function fetchUsers() {
        try { const data = await usersApi.list(); setUsers(data.users); setUsersError(false); } catch (e) { setUsersError(true); }
    }

    const fetchDishes = () => setDishes(getDishes());

    async function persistDish(dish) {
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
            return true;
        } catch (e) { toast("Save failed", "info"); return false; }
    }

    async function saveDishRow(dish) {
        setSaving(true);
        await persistDish(dish);
        setSaving(false);
        setEditIdx(null);
        fetchDishes();
    }

    const toggleAvailability = async (i) => {
        const dish = dishes[i];
        if (!dish.id) { updateDish(i, "available", !dish.available); return; }
        if (saving) return;
        setSaving(true);
        updateDish(i, "available", !dish.available);
        await persistDish({ ...dish, available: !dish.available });
        setSaving(false);
    };

    const addDish = () => {
        const newDish = { name: "New Dish", price: "₹50", category: "Snacks & Starters", rating: 4.5, time: "10 min", tag: "", veg: true, image_url: "", prices: null, description: "", available: true };
        const updated = [...dishes, newDish];
        setDishes(updated);
        setEditIdx(updated.length - 1);
    };

    const deleteDish = async (i) => {
        if (!confirm("Delete this dish?")) return;
        const dish = dishes[i];
        try {
            if (dish.id) await dishesApi.delete(dish.id);
            const updated = dishes.filter((_, idx) => idx !== i);
            setDishes(updated);
            saveDishes(updated);
        } catch (e) { toast("Delete failed", "info"); }
    };

    const updateDish = (i, field, value) => {
        const updated = dishes.map((d, idx) => idx === i ? { ...d, [field]: value } : d);
        setDishes(updated);
    };

    async function updateOrderStatus(id, status) {
        try {
            await ordersApi.updateStatus(id, status);
            setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
            toast(`Order #${orderShortId(id)} → ${status}`, "success");
        } catch (e) { toast("Failed to update", "info"); }
    }

    async function updateUserRole(targetUserId, role) {
        if (!confirm(`Set this user as ${role}?`)) return;
        try {
            await usersApi.updateRole(targetUserId, role);
            setUsers(users.map(u => u.id === targetUserId ? { ...u, role } : u));
            toast(`User role updated to ${role}`, "success");
        } catch (e) { toast("Failed to update", "info"); }
    }

    const categories = [...new Set(dishes.map(d => d.category))].sort();

    const grouped = {};
    dishes.forEach(d => {
        if (!grouped[d.category]) grouped[d.category] = [];
        grouped[d.category].push(d);
    });

    const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);

    const t = totals(orders);
    const weekly = weeklyTotals(orders);
    const maxAmt = maxAmount(weekly);
    const weeklyEmpty = weekly.every(d => d.amount === 0);

    const retry = () => { fetchOrders(); fetchUsers(); };

    const dashboardTab = (
        <div>
            {(ordersError || usersError) && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(221,51,51,0.08)", border: `1px solid rgba(221,51,51,0.25)`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.red }}>
                        {ordersError && usersError ? "Failed to load orders and users" : ordersError ? "Failed to load orders" : "Failed to load users"}
                    </span>
                    <button type="button" onClick={retry}
                        style={{ background: "rgba(221,51,51,0.15)", border: `1px solid rgba(221,51,51,0.3)`, cursor: "pointer", borderRadius: 50, padding: "5px 14px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.red }}
                    >Retry</button>
                </div>
            )}
            <div className="grid-stats" style={{ gap: 14 }}>
                {[
                    ["Total Revenue", `₹${t.revenue.toLocaleString()}`, C.orange],
                    ["Total Orders", t.completedCount, C.green],
                    ["Pending", t.pendingCount, C.amber],
                    ["Dishes", dishes.length, C.cream],
                ].map(([label, val, color]) => (
                    <div key={label} style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, marginBottom: 6 }}>{label}</div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 26, color, lineHeight: 1.1 }}>{val}</div>
                    </div>
                ))}
            </div>

            <div className="admin-split" style={{ display: "grid", gap: 20, marginTop: 20 }}>
                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
                    <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "0 0 16px" }}>Weekly Revenue</h3>
                    {weeklyEmpty ? (
                        <div style={{ textAlign: "center", padding: "40px 20px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.creamDim }}>No orders this week yet</div>
                    ) : (
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
                            {weekly.map((d, i) => (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                                    <div style={{
                                        width: "100%", borderRadius: "6px 6px 0 0", marginTop: "auto",
                                        height: `${Math.max((d.amount / maxAmt) * 104, d.amount > 0 ? 4 : 2)}px`,
                                        background: `linear-gradient(to top, ${C.orange}, ${C.amber})`,
                                        opacity: d.amount > 0 ? 0.8 : 0.12, transition: "opacity 0.2s",
                                    }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                                        onMouseLeave={e => e.currentTarget.style.opacity = d.amount > 0 ? "0.8" : "0.12"}
                                    />
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.creamDim }}>{d.label}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px" }}>
                    <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "0 0 16px" }}>Quick Actions</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                            { label: "Open Orders", icon: "clipboard", action: () => setTab("orders"), color: C.amber },
                            { label: "Add Dish", icon: "plus", action: () => { setTab("dishes"); addDish(); }, color: C.green },
                            { label: "View Site", icon: "home", action: onClose, color: C.orange },
                        ].map(item => (
                            <button key={item.label} type="button" onClick={item.action}
                                style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}`,
                                    borderRadius: 10, padding: "12px 16px", cursor: "pointer",
                                    fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream,
                                    transition: "all 0.2s",
                                }}
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

            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "24px 0 16px" }}>Recent Orders</h3>
            {orders.slice(0, 5).length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.creamDim }}>No orders yet</div>
            ) : (
                orders.slice(0, 5).map(o => (
                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream }}>#{orderShortId(o.id)} — ₹{o.total}</span>
                        <StatusBadge status={o.status} />
                    </div>
                ))
            )}
        </div>
    );

    const dishesTab = (
        <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>{dishes.length} dishes</span>
                <button type="button" onClick={addDish}
                    style={{ background: C.orange, border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff", padding: "8px 18px", borderRadius: 8 }}
                >+ Add Dish</button>
            </div>

            {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat} style={{ marginBottom: 32 }}>
                    <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: C.cream, margin: "0 0 12px", borderBottom: `1px solid ${C.border}`, paddingBottom: 8, display: "flex", justifyContent: "space-between" }}>
                        <span>{cat} <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>({items.length})</span></span>
                    </h3>
                    {items.map((dish, gi) => {
                        const i = dishes.indexOf(dish);
                        return (
                            <div key={i} style={{
                                background: editIdx === i ? C.bgLight : C.bg,
                                border: `1px solid ${editIdx === i ? C.borderO : C.border}`,
                                borderRadius: 12, marginBottom: 8,
                                transition: "all 0.2s",
                            }}>
                                {editIdx === i ? (
                                    <div className="admin-form-grid" style={{ padding: 16, display: "grid", gap: 10 }}>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Name
                                            <input value={dish.name} onChange={e => updateDish(i, "name", e.target.value)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Price
                                            <input value={dish.price || ""} onChange={e => updateDish(i, "price", e.target.value)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Half Price (leave empty if none)
                                            <input value={dish.prices?.half || ""} onChange={e => updateDish(i, "prices", e.target.value ? { ...(dish.prices || {}), half: e.target.value } : null)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Full Price (leave empty if none)
                                            <input value={dish.prices?.full || ""} onChange={e => updateDish(i, "prices", e.target.value ? { ...(dish.prices || {}), full: e.target.value } : null)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Category
                                            <input list="dish-cats" value={dish.category} onChange={e => updateDish(i, "category", e.target.value)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <datalist id="dish-cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Tag (e.g. Bestseller, Chef's Special)
                                            <input value={dish.tag || ""} onChange={e => updateDish(i, "tag", e.target.value)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Image URL (optional)
                                            <input value={dish.image_url || ""} onChange={e => updateDish(i, "image_url", e.target.value)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Description (optional)
                                            <textarea value={dish.description || ""} onChange={e => updateDish(i, "description", e.target.value)} rows={2}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4, resize: "vertical" }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, display: "flex", alignItems: "center", gap: 20, marginTop: 12 }}>
                                            <span style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                                <input type="checkbox" checked={dish.veg} onChange={e => updateDish(i, "veg", e.target.checked)} /> Veg
                                            </span>
                                            <span style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                                                <input type="checkbox" checked={dish.available !== false} onChange={e => updateDish(i, "available", e.target.checked)} /> Available
                                            </span>
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Rating
                                            <input type="number" step="0.1" min="0" max="5" value={dish.rating} onChange={e => updateDish(i, "rating", parseFloat(e.target.value))}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>
                                            Time
                                            <input value={dish.time} onChange={e => updateDish(i, "time", e.target.value)}
                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                            />
                                        </label>
                                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", justifyContent: "flex-end", marginTop: 12, gridColumn: "1 / -1" }}>
                                            <button type="button" onClick={() => setEditIdx(null)}
                                                style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 8, padding: "8px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}
                                            >Cancel</button>
                                            <button type="button" disabled={saving} onClick={() => saveDishRow(dish)}
                                                style={{ background: saving ? "rgba(52,184,106,0.5)" : C.green, border: "none", cursor: saving ? "default" : "pointer", borderRadius: 8, padding: "8px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "#fff" }}
                                            >{saving ? "Saving..." : "Save"}</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", flexWrap: "wrap" }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: C.bgLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                            {dish.image_url ? <img src={dish.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="dish" size={16} style={{ color: C.creamDim }} />}
                                        </div>
                                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {dish.name}
                                            <span style={{ color: C.creamDim, fontSize: 11, marginLeft: 8 }}>{dish.price || dish.prices?.full}</span>
                                            {!dish.veg && <span style={{ color: C.red, fontSize: 10, marginLeft: 6 }}>NV</span>}
                                        </span>
                                        {dish.prices?.half && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.creamDim }}>½ {dish.prices.half}</span>}
                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dish.veg ? C.green : C.red }} />
                                        <button type="button" disabled={saving} onClick={() => toggleAvailability(i)}
                                            style={{
                                                background: dish.available ? "rgba(232,89,12,0.15)" : "none",
                                                border: `1px solid ${dish.available ? C.borderO : C.border}`,
                                                cursor: saving ? "default" : "pointer", borderRadius: 50, padding: "4px 10px",
                                                fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                                                color: dish.available ? C.orange : C.creamDim, transition: "all 0.2s",
                                                opacity: saving ? 0.6 : 1,
                                            }}
                                        >{dish.available ? "Available" : "Unavailable"}</button>
                                        <button type="button" onClick={() => setEditIdx(i)}
                                            style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 6, padding: "4px 12px", fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.amber }}
                                        >Edit</button>
                                        <button type="button" onClick={() => deleteDish(i)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: C.red, padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
                                        ><Icon name="close" size={14} style={{ color: C.red }} /></button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </>
    );

    const ordersTab = (
        <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>{filteredOrders.length} orders</span>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" onClick={fetchOrders} title="Refresh"
                        style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 50, padding: "5px 10px", fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, transition: "all 0.2s" }}
                    >⟳</button>
                    {["all", "pending", "confirmed", "preparing", "delivering", "delivered", "cancelled"].map(s => (
                        <button key={s} type="button" onClick={() => setOrderFilter(s)}
                            style={{
                                background: orderFilter === s ? "rgba(232,89,12,0.15)" : "none",
                                border: `1px solid ${orderFilter === s ? C.borderO : C.border}`,
                                cursor: "pointer", borderRadius: 50, padding: "5px 12px",
                                fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500,
                                color: orderFilter === s ? C.orange : C.creamDim, transition: "all 0.2s",
                            }}
                        >{s}</button>
                    ))}
                </div>
            </div>
            {ordersError && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(221,51,51,0.08)", border: `1px solid rgba(221,51,51,0.25)`, borderRadius: 10, padding: "12px 16px", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.red }}>Couldn't load orders</span>
                    <button type="button" onClick={fetchOrders}
                        style={{ background: "rgba(221,51,51,0.15)", border: `1px solid rgba(221,51,51,0.3)`, cursor: "pointer", borderRadius: 50, padding: "5px 14px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.red }}
                    >Retry</button>
                </div>
            )}
            {filteredOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.creamDim }}>No orders found</div>
            ) : (
                filteredOrders.map(o => (
                    <div key={o.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 14, color: C.cream }}>Order #{orderShortId(o.id)}</span>
                                <StatusBadge status={o.status} />
                            </div>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</span>
                        </div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, lineHeight: 1.6, overflowWrap: "anywhere" }}>
                            {o.items?.map(item => `${item.name} x${item.qty}`).join(", ")}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", minWidth: 0 }}>
                                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.orange }}>₹{o.total}</span>
                                {o.payment_status && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: o.payment_status === "paid" ? C.green : C.creamDim, display: "flex", alignItems: "center", gap: 4 }}>
                                    {o.payment_status === "paid" ? <><Icon name="check" size={10} /> Paid</> : <><Icon name="close" size={10} /> {o.payment_status}</>}
                                </span>}
                            </div>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {NEXT[o.status] && (
                                    <button type="button" onClick={() => updateOrderStatus(o.id, NEXT[o.status])}
                                        style={{ background: C.orange, border: "none", cursor: "pointer", borderRadius: 50, padding: "4px 10px", fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: "#fff", transition: "all 0.2s" }}
                                    >→ {NEXT[o.status]}</button>
                                )}
                                {o.status !== "cancelled" && o.status !== "delivered" && (
                                    <button type="button" onClick={() => updateOrderStatus(o.id, "cancelled")}
                                        style={{ background: "rgba(221,51,51,0.15)", border: "none", cursor: "pointer", borderRadius: 50, padding: "4px 10px", fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: C.red }}
                                    >cancel</button>
                                )}
                            </div>
                        </div>
                        {(o.address || o.phone) && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginTop: 6, overflowWrap: "anywhere", minWidth: 0 }}>
                            {o.address && <div>📍 {o.address.split("📍 ")[0]}</div>}
                            {o.address?.includes("📍 https://maps.google.com") && (
                                <a href={o.address.split("📍 ")[1]} target="_blank" rel="noreferrer"
                                    style={{ color: C.orange, textDecoration: "underline", fontSize: 11, fontWeight: 600 }}
                                >View on Google Maps ↗</a>
                            )}
                            {o.phone && <div>📞 <a href={`tel:${o.phone}`} style={{ color: C.orange, textDecoration: "underline", fontSize: 11, fontWeight: 600 }}>{o.phone}</a></div>}
                        </div>}
                    </div>
                ))
            )}
        </div>
    );

    const usersTab = (
        <div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream, margin: "0 0 16px" }}>Manage Users</h3>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, marginBottom: 16 }}>
                {users.length} user{users.length !== 1 ? "s" : ""}
            </div>
            {users.map(u => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0, wordBreak: "break-word" }}>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.cream }}>{u.name || "Unnamed"}</div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>{u.email || "—"}</div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "rgba(200,184,154,0.5)" }}>{u.phone ? `📞 ${u.phone}` : "—"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{
                            fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                            color: u.role === "admin" ? C.orange : C.creamDim,
                            background: u.role === "admin" ? "rgba(232,89,12,0.15)" : "rgba(255,255,255,0.06)",
                            borderRadius: 50, padding: "3px 12px",
                        }}>{u.role}</span>
                        {u.role === "user" ? (
                            <button type="button" onClick={() => updateUserRole(u.id, "admin")}
                                style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 6, padding: "5px 12px", fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.orange }}
                            >Make Admin</button>
                        ) : (
                            <button type="button" onClick={() => updateUserRole(u.id, "user")}
                                style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 6, padding: "5px 12px", fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.red }}
                            >Revoke Admin</button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    const tabContent = () => {
        if (tab === "dashboard") return dashboardTab;
        if (tab === "dishes") return dishesTab;
        if (tab === "orders") return ordersTab;
        if (tab === "users") return usersTab;
        return null;
    };

    const tabButtons = NAV_TABS.map(([key, label, icon]) => (
        <button key={key} type="button" onClick={() => { setTab(key); fetchOrders(); }}
            style={{
                flex: 1, padding: "12px 8px", background: tab === key ? "rgba(232,89,12,0.15)" : "none",
                border: "none", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 600,
                color: tab === key ? C.orange : C.creamDim, transition: "all 0.2s", borderRadius: 10,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            }}
        ><Icon name={icon} size={16} /> {label}</button>
    ));

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 600, background: C.bg, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, overflow: "auto", padding: "20px 16px 90px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
                <div className="admin-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 20, color: C.cream }}>
                        Admin {tab === "dashboard" ? "" : "· " + tab}
                    </div>
                    <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 10, padding: "8px 14px", fontFamily: "Inter", fontSize: 12, color: C.creamDim }}>
                        ← Back to Site
                    </button>
                </div>
                <div className="admin-desktop-tabs" style={{ gap: 6, marginBottom: 20, padding: 6, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 16 }}>
                    {tabButtons}
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: 16, padding: "20px" }}>
                    {tabContent()}
                </div>
            </div>
            <div className="admin-bottombar" style={{ background: "rgba(9,9,11,0.6)", backdropFilter: "blur(20px)", borderTop: `1px solid ${C.border}`, position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 610 }}>
                {tabButtons}
            </div>
        </div>
    );
}

export { AdminPanel };