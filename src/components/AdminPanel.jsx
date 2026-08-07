import { useState, useEffect } from "react";
import { C } from "../lib/colors";
import { Icon } from "../lib/icons";
import { useDishes, useToast } from "../lib/contexts";
import { dishesApi, ordersApi, usersApi } from "../api/client";
import { StatusBadge } from "./StatusBadge";

function AdminPanel({ onClose }) {
    const { getDishes, saveDishes, version } = useDishes();
    const { toast } = useToast();
    const [dishes, setDishes] = useState([]);
    const [editIdx, setEditIdx] = useState(null);
    const [tab, setTab] = useState("dashboard");
    const [orders, setOrders] = useState([]);
    const [users, setUsers] = useState([]);
    const [saving, setSaving] = useState(false);
    const [orderFilter, setOrderFilter] = useState("all");
    const [newCat, setNewCat] = useState("");
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        setDishes(getDishes());
        fetchOrders();
        fetchUsers();
        const cats = [...new Set(getDishes().map(d => d.category))].sort();
        setCategories(cats);
    }, [version, getDishes]);

    async function fetchOrders() {
        try { const data = await ordersApi.list(null, true); setOrders(data.orders); } catch (e) {}
    }

    async function fetchUsers() {
        try { const data = await usersApi.list(); setUsers(data.users); } catch (e) {}
    }

    async function saveToApi(updated) {
        setSaving(true);
        try {
            const existing = getDishes();
            for (const dish of updated) {
                if (!dish.id) {
                    await dishesApi.create(dish);
                } else {
                    const orig = existing.find(d => d.id === dish.id);
                    if (JSON.stringify(orig) !== JSON.stringify(dish)) {
                        await dishesApi.update(dish.id, dish);
                    }
                }
            }
            const deleted = existing.filter(e => !updated.find(u => u.id === e.id));
            for (const d of deleted) await dishesApi.delete(d.id);
            saveDishes(updated);
            setDishes(updated);
            toast("Dishes synced to database!", "success");
        } catch (e) { toast("Failed to sync", "info"); }
        setSaving(false);
        setEditIdx(null);
    }

    const addDish = () => {
        const newDish = { name: "New Dish", price: "₹50", category: "Snacks & Starters", rating: 4.5, time: "10 min", tag: "", veg: true, image_url: "", prices: null, description: "", available: true };
        const updated = [...dishes, newDish];
        setDishes(updated);
        setEditIdx(updated.length - 1);
    };

    const deleteDish = (i) => {
        if (!confirm("Delete this dish?")) return;
        const updated = dishes.filter((_, idx) => idx !== i);
        setDishes(updated);
    };

    const updateDish = (i, field, value) => {
        const updated = dishes.map((d, idx) => idx === i ? { ...d, [field]: value } : d);
        setDishes(updated);
    };

    const addCategory = () => {
        if (!newCat.trim()) return;
        if (categories.includes(newCat.trim())) { toast("Category already exists", "info"); return; }
        setCategories([...categories, newCat.trim()]);
        setNewCat("");
        toast(`Category "${newCat.trim()}" added`, "success");
    };

    const removeCategory = (cat) => {
        const used = dishes.some(d => d.category === cat);
        if (used) { toast(`Cannot remove "${cat}" — dishes use it`, "info"); return; }
        if (!confirm(`Remove category "${cat}"?`)) return;
        setCategories(categories.filter(c => c !== cat));
        toast(`Category "${cat}" removed`, "success");
    };

    async function updateOrderStatus(id, status) {
        try {
            await ordersApi.updateStatus(id, status);
            setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
            toast(`Order #${id} → ${status}`, "success");
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

    const grouped = {};
    dishes.forEach(d => {
        if (!grouped[d.category]) grouped[d.category] = [];
        grouped[d.category].push(d);
    });

    const totalRev = orders.filter(o => o.status !== "cancelled").reduce((s, o) => s + (o.total || 0), 0);
    const avgOrder = orders.filter(o => o.status !== "cancelled").length
        ? Math.round(totalRev / orders.filter(o => o.status !== "cancelled").length) : 0;

    const filteredOrders = orderFilter === "all" ? orders : orders.filter(o => o.status === orderFilter);

    const modalStyle = {
        position: "fixed", inset: 0, zIndex: 600, display: "flex",
        background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)",
    };

    return (
        <div style={modalStyle}>
            <div style={{
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 0,
                width: "100%", maxWidth: 960, margin: "0 auto",
                display: "flex", flexDirection: "column", maxHeight: "100vh",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 28px", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Icon name="settings" size={20} style={{ color: C.cream }} />
                        <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20, color: C.cream, margin: 0 }}>Admin Panel</h2>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.creamDim, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}><Icon name="close" /></button>
                </div>

                <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, overflow: "auto" }}>
                    {[
                        ["dashboard", "Home", "home"],
                        ["dishes", "Dishes", "dish"],
                        ["categories", "Categories", "menu"],
                        ["orders", "Orders", "clipboard"],
                        ["users", "Users", "chat"],
                    ].map(([key, label, icon]) => (
                        <button key={key} type="button" onClick={() => setTab(key)}
                            style={{
                                flex: "0 0 auto", padding: "14px 20px", background: tab === key ? "rgba(232,89,12,0.15)" : "none",
                                border: "none", borderBottom: tab === key ? `2px solid ${C.orange}` : "2px solid transparent",
                                cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
                                color: tab === key ? C.orange : C.creamDim, transition: "all 0.2s",
                                display: "flex", alignItems: "center", gap: 6,
                            }}
                        ><Icon name={icon} size={14} /> {label}</button>
                    ))}
                </div>

                <div style={{ flex: 1, overflow: "auto", padding: "20px 28px" }}>
                    {tab === "dashboard" && (
                        <div>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream, margin: "0 0 20px" }}>Overview</h3>
                            <div className="grid-4" style={{ gap: 14 }}>
                                {[
                                    ["Total Dishes", dishes.length, C.orange],
                                    ["Total Orders", orders.length, C.green],
                                    ["Revenue", `₹${totalRev.toLocaleString()}`, C.amber],
                                    ["Avg. Order", `₹${avgOrder.toLocaleString()}`, C.cream],
                                ].map(([label, val, color]) => (
                                    <div key={label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "20px" }}>
                                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, marginBottom: 6 }}>{label}</div>
                                        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 28, color }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "28px 0 16px" }}>Recent Orders</h3>
                            {orders.slice(0, 5).map(o => (
                                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", marginBottom: 8 }}>
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream }}>#{o.id} — ₹{o.total}</span>
                                    <StatusBadge status={o.status} />
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === "dishes" && (
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
                                                    <div style={{ padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
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
                                                            <select value={dish.category} onChange={e => updateDish(i, "category", e.target.value)}
                                                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 10px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none", marginTop: 4 }}
                                                            >{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                                                        </label>
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
                                                            <button type="button" disabled={saving} onClick={() => saveToApi(dishes)}
                                                                style={{ background: saving ? "rgba(52,184,106,0.5)" : C.green, border: "none", cursor: saving ? "default" : "pointer", borderRadius: 8, padding: "8px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: "#fff" }}
                                                            >{saving ? "Saving..." : "Save All"}</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px" }}>
                                                        <div style={{ width: 36, height: 36, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: C.bgLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                            {dish.image_url ? <img src={dish.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Icon name="dish" size={16} style={{ color: C.creamDim }} />}
                                                        </div>
                                                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, flex: 1 }}>
                                                            {dish.name}
                                                            <span style={{ color: C.creamDim, fontSize: 11, marginLeft: 8 }}>{dish.price || dish.prices?.full}</span>
                                                            {!dish.veg && <span style={{ color: C.red, fontSize: 10, marginLeft: 6 }}>NV</span>}
                                                            {dish.available === false && <span style={{ color: C.red, fontSize: 10, marginLeft: 6 }}>Unavailable</span>}
                                                        </span>
                                                        {dish.prices?.half && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: C.creamDim }}>½ {dish.prices.half}</span>}
                                                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: dish.veg ? C.green : C.red }} />
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
                    )}

                    {tab === "categories" && (
                        <div>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream, margin: "0 0 16px" }}>Manage Categories</h3>
                            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                                <input value={newCat} onChange={e => setNewCat(e.target.value)}
                                    placeholder="New category name"
                                    onKeyDown={e => e.key === "Enter" && addCategory()}
                                    style={{ flex: 1, maxWidth: 300, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, outline: "none" }}
                                />
                                <button type="button" onClick={addCategory}
                                    style={{ background: C.orange, border: "none", cursor: "pointer", borderRadius: 8, padding: "10px 20px", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: "#fff" }}
                                >Add</button>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {categories.map(cat => (
                                    <div key={cat} style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 50, padding: "6px 12px 6px 16px" }}>
                                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream }}>{cat}</span>
                                        <button type="button" onClick={() => removeCategory(cat)}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: C.creamDim, padding: 2, display: "flex", alignItems: "center" }}
                                        ><Icon name="close" size={12} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {tab === "orders" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>{filteredOrders.length} orders</span>
                                <div style={{ display: "flex", gap: 6 }}>
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
                            {filteredOrders.length === 0 ? (
                                <div style={{ textAlign: "center", padding: "60px 20px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.creamDim }}>No orders found</div>
                            ) : (
                                filteredOrders.map(o => (
                                    <div key={o.id} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", marginBottom: 12 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 14, color: C.cream }}>Order #{o.id}</span>
                                                <StatusBadge status={o.status} />
                                            </div>
                                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</span>
                                        </div>
                                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, lineHeight: 1.6 }}>
                                            {o.items?.map(item => `${item.name} x${item.qty}`).join(", ")}
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, flexWrap: "wrap", gap: 8 }}>
                                            <div style={{ display: "flex", gap: 16 }}>
                                                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.orange }}>₹{o.total}</span>
                                                {o.payment_status && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: o.payment_status === "paid" ? C.green : C.creamDim, display: "flex", alignItems: "center", gap: 4 }}>
                                                    {o.payment_status === "paid" ? <><Icon name="check" size={10} /> Paid</> : <><Icon name="close" size={10} /> {o.payment_status}</>}
                                                </span>}
                                            </div>
                                            <div style={{ display: "flex", gap: 6 }}>
                                                {["confirmed", "preparing", "delivering", "delivered"].map(s => (
                                                    <button key={s} type="button" onClick={() => updateOrderStatus(o.id, s)}
                                                        style={{
                                                            background: o.status === s ? C.orange : "rgba(255,255,255,0.06)",
                                                            border: "none", cursor: "pointer", borderRadius: 50, padding: "4px 10px",
                                                            fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600,
                                                            color: o.status === s ? "#fff" : C.creamDim, transition: "all 0.2s",
                                                        }}
                                                    >{s}</button>
                                                ))}
                                                {o.status !== "cancelled" && o.status !== "delivered" && (
                                                    <button type="button" onClick={() => updateOrderStatus(o.id, "cancelled")}
                                                        style={{ background: "rgba(221,51,51,0.15)", border: "none", cursor: "pointer", borderRadius: 50, padding: "4px 10px", fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: C.red }}
                                                    >cancel</button>
                                                )}
                                            </div>
                                        </div>
                                        {(o.address || o.phone) && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginTop: 6 }}>
                                            {o.address && <div>📍 {o.address.split("📍 ")[0]}</div>}
                                            {o.address?.includes("📍 https://maps.google.com") && (
                                                <a href={o.address.split("📍 ")[1]} target="_blank" rel="noreferrer"
                                                    style={{ color: C.orange, textDecoration: "underline", fontSize: 11, fontWeight: 600 }}
                                                >View on Google Maps ↗</a>
                                            )}
                                            {o.phone && <div>📞 {o.phone}</div>}
                                        </div>}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {tab === "users" && (
                        <div>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream, margin: "0 0 16px" }}>Manage Users</h3>
                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, marginBottom: 16 }}>
                                {users.length} user{users.length !== 1 ? "s" : ""}
                            </div>
                            {users.map(u => (
                                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 8 }}>
                                    <div>
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
                    )}
                </div>
            </div>
        </div>
    );
}

export { AdminPanel };
