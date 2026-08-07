import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { C } from "./colors";
import { Icon } from "./icons";
import { DISHES } from "../data/dishes";
import { dishesApi } from "../api/client";

const CartContext = createContext();
function CartProvider({ children }) {
    const [items, setItems] = useState({});
    const [drawerOpen, setDrawerOpen] = useState(false);
    const add = useCallback((name, price) => setItems(p => {
        const key = name.replace(/\s/g, "_");
        const existing = p[key];
        return { ...p, [key]: { name, price, qty: (existing ? existing.qty : 0) + 1 } };
    }), []);
    const remove = useCallback((name) => setItems(p => {
        const key = name.replace(/\s/g, "_");
        const existing = p[key];
        if (!existing) return p;
        if (existing.qty > 1) return { ...p, [key]: { ...existing, qty: existing.qty - 1 } };
        const next = { ...p };
        delete next[key];
        return next;
    }), []);
    const vals = Object.values(items);
    const count = vals.reduce((a, b) => a + b.qty, 0);
    const total = vals.reduce((a, b) => a + parseInt(b.price.replace(/[^0-9]/g, "")) * b.qty, 0);
    return <CartContext.Provider value={{ items, add, remove, count, total, drawerOpen, setDrawerOpen }}>{children}</CartContext.Provider>;
}
function useCart() { return useContext(CartContext); }

const FavContext = createContext();
function FavProvider({ children }) {
    const [favs, setFavs] = useState(() => {
        try { return JSON.parse(localStorage.getItem("favs") || "[]"); } catch (e) { return []; }
    });
    const toggle = useCallback((name) => setFavs(p => {
        const next = p.includes(name) ? p.filter(f => f !== name) : [...p, name];
        localStorage.setItem("favs", JSON.stringify(next));
        return next;
    }), []);
    return <FavContext.Provider value={{ favs, toggle }}>{children}</FavContext.Provider>;
}
function useFav() { return useContext(FavContext); }

const DishesContext = createContext();
function DishesProvider({ children }) {
    const [version, setVersion] = useState(0);
    const getDishes = useCallback(() => {
        try {
            const saved = localStorage.getItem("admin_dishes");
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return DISHES;
    }, []);
    const saveDishes = useCallback((dishes) => {
        localStorage.setItem("admin_dishes", JSON.stringify(dishes));
        setVersion(v => v + 1);
    }, []);
    const loadFromApi = useCallback(async () => {
        try {
            const data = await dishesApi.list();
            if (data?.dishes?.length) {
                localStorage.setItem("admin_dishes", JSON.stringify(data.dishes));
                setVersion(v => v + 1);
            }
        } catch (e) {}
    }, []);
    return <DishesContext.Provider value={{ version, getDishes, saveDishes, setVersion, loadFromApi }}>{children}</DishesContext.Provider>;
}
function useDishes() { return useContext(DishesContext); }

const AuthContext = createContext();
function AuthProvider({ children }) {
    const [admin, setAdmin] = useState(() => !!localStorage.getItem("ha_pin"));

    const unlock = useCallback(async (pin) => {
        const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "verify-pin", pin }),
        });
        const text = await res.text();
        if (!text) throw new Error("Server error — try again");
        let data;
        try { data = JSON.parse(text); } catch (e) { throw new Error("Unexpected server response — try again"); }
        if (!res.ok) throw new Error(data.error || "Invalid code");
        localStorage.setItem("ha_pin", pin);
        setAdmin(true);
    }, []);

    const lock = useCallback(() => {
        localStorage.removeItem("ha_pin");
        setAdmin(false);
    }, []);

    const user = admin ? { id: "admin", name: "Admin", phone: "", avatar: "A", isAdmin: true } : null;
    return <AuthContext.Provider value={{ user, unlock, logout: lock, loading: false }}>{children}</AuthContext.Provider>;
}
function useAuth() { return useContext(AuthContext); }

const ToastContext = createContext();
function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const toast = useCallback((msg, type = "info") => {
        const id = Date.now() + Math.random();
        setToasts(p => [...p, { id, msg, type }]);
        setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 2400);
    }, []);
    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div style={{
                position: "fixed", top: 80, left: "50%", transform: "translateX(-50%)", zIndex: 300,
                display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none", alignItems: "center",
            }}>
                {toasts.map(t => (
                    <div key={t.id} style={{
                        background: C.bgCard, border: `1px solid ${t.type === "success" ? "rgba(46,204,113,0.4)" : C.borderO}`,
                        borderRadius: 12, padding: "10px 20px",
                        fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        animation: "toast-in 0.35s ease-out",
                        display: "flex", alignItems: "center", gap: 8,
                        pointerEvents: "auto", whiteSpace: "nowrap",
                    }}>
                        <span style={{
                            width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                            background: t.type === "success" ? "rgba(46,204,113,0.2)" : "rgba(255,94,20,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, color: t.type === "success" ? C.green : C.orange,
                        }}>{t.type === "success" ? <Icon name="check" size={10} /> : <span style={{ width: 4, height: 4, borderRadius: "50%", background: C.orange }} />}</span>
                        {t.msg}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}
function useToast() { return useContext(ToastContext); }

export { CartProvider, useCart, FavProvider, useFav, DishesProvider, useDishes, AuthProvider, useAuth, ToastProvider, useToast };
