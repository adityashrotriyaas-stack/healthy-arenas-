import { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
import { C } from "./lib/colors";
import { CartProvider, FavProvider, DishesProvider, AuthProvider, ToastProvider, useAuth, useCart, useFav, useDishes, useToast } from "./lib/contexts";
import { DISHES, FEATURED_TAGS } from "./data/dishes";
import { ordersApi } from "./api/client";
import { Icon } from "./lib/icons";

const AdminPanel = lazy(() => import("./components/AdminPanel").then(m => ({ default: m.AdminPanel })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));

function AdminPinModal({ onClose, onUnlock }) {
    const { unlock } = useAuth();
    const { toast } = useToast();
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        if (pin.replace(/\D/g, "").length < 4) { toast("Enter the 4-digit admin code", "info"); return; }
        setLoading(true);
        setError("");
        try {
            await unlock(pin.replace(/\D/g, ""));
            toast("Welcome, Admin!", "success");
            onUnlock?.();
        } catch (err) {
            setError((err.message && !err.message.includes("Failed to fetch"))
                ? err.message
                : "Couldn't reach the server. Check your connection and try again.");
            setLoading(false);
        }
    };

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", padding: 12 }}>
            <div style={{
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24,
                width: "min(100%, 380px)", padding: "clamp(28px, 6vw, 40px) clamp(20px, 6vw, 36px)",
                position: "relative", boxSizing: "border-box",
            }}>
                <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", cursor: "pointer", color: C.creamDim, display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}><Icon name="close" /></button>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 12, color: "#fff" }}>HA</div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 16, color: C.cream }}>Admin access</span>
                </div>
                <form onSubmit={submit}>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, marginBottom: 24 }}>Enter the admin code to open the dashboard.</p>
                    {error && (
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.red, marginBottom: 16, padding: "8px 12px", background: "rgba(221,51,51,0.1)", borderRadius: 8, border: "1px solid rgba(221,51,51,0.2)" }}>{error}</div>
                    )}
                    <input
                        type="tel" inputMode="numeric" autoFocus maxLength={6}
                        value={pin.replace(/\D/g, "")}
                        onChange={e => setPin(e.target.value)}
                        placeholder="••••"
                        style={{
                            width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10,
                            padding: "14px", fontFamily: "'Inter',sans-serif", fontSize: 16, color: C.cream,
                            outline: "none", boxSizing: "border-box", letterSpacing: 10, textAlign: "center", fontWeight: 700,
                        }}
                    />
                    <button type="submit" disabled={loading}
                        style={{
                            width: "100%", background: loading ? "rgba(232,89,12,0.5)" : C.orange,
                            border: "none", cursor: loading ? "default" : "pointer",
                            fontFamily: "'Inter',sans-serif", fontSize: 16, fontWeight: 700,
                            color: "#fff", padding: "14px", borderRadius: 12, marginTop: 20, minHeight: 48,
                        }}
                    >{loading ? "Checking..." : "Open Dashboard"}</button>
                </form>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, textAlign: "center" }}>
                    For cafe staff only.
                </div>
            </div>
        </div>
    );
}

function SupportModal({ onClose }) {
    const [sent, setSent] = useState(false);
    const [msg, setMsg] = useState("");
    const handleSend = (e) => { e.preventDefault(); if (!msg) return; setSent(true); };
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24, padding: "36px", width: "90%", maxWidth: 420, position: "relative" }}>
                <button type="button" onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", cursor: "pointer", color: C.creamDim, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}><Icon name="close" /></button>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Icon name="chat" size={24} /></div>
                <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 22, color: C.cream, margin: "0 0 6px" }}>Contact Support</h2>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, marginBottom: 24 }}>We typically respond within 15 minutes.</p>
                {sent ? (
                    <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <div style={{ marginBottom: 12 }}><Icon name="check" size={40} style={{ color: C.green }} /></div>
                        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream }}>Message sent!</div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, marginTop: 6 }}>We'll get back to you shortly.</div>
                    </div>
                ) : (
                    <form onSubmit={handleSend}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, display: "block", marginBottom: 6 }}>Your message</label>
                            <textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="How can we help you?" rows={4}
                                style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.cream, outline: "none", resize: "vertical" }}
                            />
                        </div>
                        <button type="submit" disabled={!msg}
                            style={{ width: "100%", background: msg ? C.orange : "rgba(255,94,20,0.3)", border: "none", cursor: msg ? "pointer" : "default", fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#fff", padding: "14px", borderRadius: 12, transition: "background 0.2s" }}
                        >Send Message</button>
                    </form>
                )}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, textAlign: "center" }}>
                    Or email us at <span style={{ color: C.orange }}>support@swiftbite.app</span>
                </div>
            </div>
        </div>
    );
}

function ViewAllDishes({ onClose }) {
    const { version, getDishes } = useDishes();
    const allDishes = useMemo(() => getDishes(), [version, getDishes]);
    const [filter, setFilter] = useState("All");
    const filters = ["All", ...new Set(allDishes.map(d => d.category))];
    const shown = filter === "All" ? allDishes : allDishes.filter(d => d.category === filter);
    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 24, width: "90%", maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", position: "relative" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 28px 16px", borderBottom: `1px solid ${C.border}` }}>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20, color: C.cream, margin: 0 }}>
                        Full Menu <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 400, color: C.creamDim }}>({shown.length} items)</span>
                    </h2>
                    <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.creamDim, display: "flex", alignItems: "center", justifyContent: "center", padding: 4 }}><Icon name="close" /></button>
                </div>
                <div style={{ padding: "16px 28px 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {filters.map(f => (
                        <button key={f} type="button" onClick={() => setFilter(f)} style={{
                            background: filter === f ? C.orange : "rgba(255,255,255,0.05)", border: `1px solid ${filter === f ? C.orange : C.border}`,
                            cursor: "pointer", borderRadius: 50, padding: "6px 16px", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500,
                            color: filter === f ? "#fff" : C.creamDim, transition: "all 0.2s",
                        }}>{f}</button>
                    ))}
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "16px 28px 24px" }}>
                    {shown.map((dish, i) => (
                        <div key={dish.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < shown.length - 1 ? `1px solid ${C.border}` : "none" }}>
                            <div>
                                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 14, color: C.cream }}>{dish.name}</div>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>{dish.resto} · {dish.category}</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.orange }}>{dish.price}</div>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.amber }}><Icon name="star" /> {dish.rating} · {dish.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TAGLINES = [
    ["Healthy food,", "delicious taste."],
    ["Fresh ingredients,", "every single day."],
    ["Taste the goodness,", "feel the energy."],
    ["Eat fresh,", "live well."],
];

const HERO_SHOT = [
    "https://upload.wikimedia.org/wikipedia/commons/7/71/Healthy_Lentil_Salad_%28Unsplash%29.jpg",
    "https://images.pexels.com/photos/1624487/pexels-photo-1624487.jpeg",
    "https://images.pexels.com/photos/1092730/pexels-photo-1092730.jpeg",
    "https://images.pexels.com/photos/674574/pexels-photo-674574.jpeg",
];

const CATEGORY_GRADIENTS = {
    Breakfast: "linear-gradient(135deg, #F5A623, #D4870A)",
    "Main Course": "linear-gradient(135deg, #E8590C, #A83030)",
    Rice: "linear-gradient(135deg, #D4870A, #A86508)",
    "Lunch & Dinner": "linear-gradient(135deg, #34B86A, #1A7A42)",
    Maggie: "linear-gradient(135deg, #F5A623, #E8590C)",
    Noodles: "linear-gradient(135deg, #34B86A, #C04A08)",
    Rolls: "linear-gradient(135deg, #F5A623, #C04A08)",
    "Snacks & Starters": "linear-gradient(135deg, #E54848, #A83030)",
    Juices: "linear-gradient(135deg, #F5A623, #D4870A)",
    Coolers: "linear-gradient(135deg, #34B86A, #1A7A42)",
    Shakes: "linear-gradient(135deg, #E54848, #7A2020)",
    Beverages: "linear-gradient(135deg, #A83030, #7A2020)",
    Soups: "linear-gradient(135deg, #34B86A, #0F4D28)",
    "Healthy Diet": "linear-gradient(135deg, #34B86A, #0F4D28)",
    "Add-ons": "linear-gradient(135deg, #D4870A, #A86508)",
};

function dishImg(initial, color, category) {
    const colors = (color || CATEGORY_GRADIENTS[category] || "linear-gradient(135deg, #E8590C, #C04A08)").match(/#[0-9A-Fa-f]{6}/g) || ["#E8590C", "#C04A08"];
    const letter = (initial || "?").charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${colors[0]}"/><stop offset="100%" stop-color="${colors[1]}"/></linearGradient></defs>
        <rect width="200" height="200" fill="url(#g)"/>
        <circle cx="100" cy="100" r="52" fill="rgba(255,255,255,0.12)"/>
        <circle cx="100" cy="100" r="44" fill="rgba(255,255,255,0.10)"/>
        <text x="100" y="104" text-anchor="middle" dominant-baseline="central" font-family="Georgia, serif" font-size="58" font-weight="700" fill="#fff" letter-spacing="1">${letter}</text>
    </svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function HeroShot({ src, style }) {
    const [current, setCurrent] = useState(src);
    return <img src={current} alt="" style={style} loading="lazy" onError={() => {
        const rest = HERO_SHOT.filter(s => s !== current);
        if (rest.length) setCurrent(rest[0]);
    }} />;
}

const STORE = { lat: 30.3429, lon: 77.9860, name: "Healthy Arena's Cafe", maxKm: 10 };

async function checkLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy, source: "gps" }),
            () => resolve(null),
            { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
        );
    });
}

const MAX_LOC_ACCURACY_M = 500;

function useInView(threshold = 0.15) {
    const ref = useRef(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, inView];
}

function useCounter(end, duration = 1600, trigger) {
    const [n, setN] = useState(0);
    useEffect(() => {
        if (!trigger || end === 0) return;
        let startTime = null;
        let raf;
        const animate = (now) => {
            if (!startTime) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            setN(Math.round(progress * end));
            if (progress < 1) raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(raf);
    }, [trigger, end, duration]);
    return n;
}

function OrderTracker() {
    const steps = [
        { icon: "1", label: "Order placed", sub: "Just now" },
        { icon: "2", label: "Preparing", sub: "Est. 8 min" },
        { icon: "3", label: "On the way", sub: "~12 min left" },
        { icon: "✓", label: "Delivered", sub: "Your door" },
    ];
    const [activeStep, setActiveStep] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setActiveStep(s => s >= 3 ? 0 : s + 1), 3000);
        return () => clearInterval(t);
    }, []);

    return (
        <div style={{
            background: C.bgCard, border: `1px solid ${C.borderO}`,
            borderRadius: 20, padding: "24px 24px 20px", minWidth: 300,
            boxShadow: `0 0 60px rgba(255,94,20,0.12)`,
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, color: C.cream }}>Order #FD-2847</div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim, marginTop: 2 }}>Spice Garden · Butter Chicken + 2</div>
                </div>
                <div style={{
                    background: "rgba(46,204,113,0.15)", border: "1px solid rgba(46,204,113,0.3)",
                    borderRadius: 20, padding: "4px 12px",
                    fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.green,
                }}>Live</div>
            </div>

            {steps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: i === activeStep
                                ? `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})`
                                : i < activeStep ? "rgba(255,94,20,0.25)" : "rgba(255,255,255,0.06)",
                            border: `2px solid ${i <= activeStep ? C.orange : "rgba(255,255,255,0.1)"}`,
                            boxShadow: i === activeStep ? `0 0 12px rgba(255,94,20,0.4)` : "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: i < activeStep ? 13 : 16,
                            transition: "all 0.5s",
                        }}>
                            {i < activeStep ? <Icon name="check" size={13} /> : step.icon === "✓" ? <Icon name="check" size={13} /> : step.icon}
                        </div>
                        {i < 3 && (
                            <div style={{
                                width: 2, height: 28,
                                background: i < activeStep
                                    ? `linear-gradient(to bottom, ${C.orange}, rgba(255,94,20,0.3))`
                                    : "rgba(255,255,255,0.07)",
                                transition: "all 0.5s",
                            }} />
                        )}
                    </div>
                    <div style={{ paddingTop: 7 }}>
                        <div style={{
                            fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: i === activeStep ? 600 : 400,
                            color: i === activeStep ? C.cream : i < activeStep ? "rgba(255,248,239,0.5)" : "rgba(255,248,239,0.3)",
                            transition: "all 0.5s",
                        }}>{step.label}</div>
                        <div style={{
                            fontFamily: "'Inter',sans-serif", fontSize: 12,
                            color: i === activeStep ? C.orange : "rgba(255,248,239,0.25)",
                            transition: "all 0.5s",
                        }}>{step.sub}</div>
                    </div>
                </div>
            ))}

            <div style={{ marginTop: 20, background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "12px 14px", display: "flex", justifyContent: "space-between" }}>
                <div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>Estimated arrival</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.amber }}>12–18 min</div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>Delivery fee</div>
                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.green }}>Free</div>
                </div>
            </div>
        </div>
    );
}

function TiffinServiceCard() {
    return (
        <div style={{
            background: `linear-gradient(135deg, ${C.bgCard}, ${C.bgLight})`,
            border: `1.5px solid ${C.borderO}`,
            borderRadius: 20, padding: "24px", marginTop: 20,
            boxShadow: "0 10px 30px rgba(255,94,20,0.08)",
            display: "flex", flexDirection: "column", gap: 12,
            position: "relative", overflow: "hidden", width: "100%", maxWidth: 380
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="box" size={24} style={{ color: C.orange }} />
                <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, color: C.cream, margin: 0 }}>
                    Tiffin Service Available
                </h3>
            </div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, lineHeight: 1.5, color: C.creamDim, margin: 0 }}>
                Enjoy nutritious, hygienic, and home-style double meals delivered daily to your home or office.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, display: "block" }}>Monthly Plan (2 meals/day)</span>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 22, color: C.amber }}>₹4,500<span style={{ fontSize: 13, fontWeight: 500, color: C.creamDim }}>/month</span></span>
                </div>
                <button type="button" onClick={() => window.open("tel:9634038986")} style={{
                    background: C.orange, border: "none", cursor: "pointer", borderRadius: 50,
                    padding: "8px 16px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 700,
                    color: "#fff", transition: "all 0.2s"
                }}
                    onMouseEnter={e => e.currentTarget.style.background = C.orangeDim}
                    onMouseLeave={e => e.currentTarget.style.background = C.orange}
                >Subscribe Now</button>
            </div>
        </div>
    );
}

function AddressAutocomplete({ value, onChange, placeholder }) {
    const [suggestions, setSuggestions] = useState([]);
    const timer = useRef(null);
    const abort = useRef(null);

    const search = (q) => {
        clearTimeout(timer.current);
        abort.current?.abort();
        if (q.trim().length < 3) { setSuggestions([]); return; }
        timer.current = setTimeout(async () => {
            try {
                const ctrl = new AbortController();
                abort.current = ctrl;
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
                    { signal: ctrl.signal, headers: { "Accept-Language": "en" } }
                );
                const data = await res.json();
                if (Array.isArray(data)) setSuggestions(data.slice(0, 5).map(d => ({ label: d.display_name, lat: d.lat, lon: d.lon })));
            } catch (e) { /* network failure -> fall back to manual typing */ }
        }, 300);
    };

    return (
        <div style={{ position: "relative" }}>
            <div className="input-focus" style={{ display: "flex", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <span style={{ display: "flex", alignItems: "center", padding: "0 12px", color: C.orange }}><Icon name="pin" size={14} /></span>
                <input
                    value={value}
                    onChange={e => { onChange(e.target.value); search(e.target.value); }}
                    placeholder={placeholder}
                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, padding: "12px 12px", minWidth: 0 }}
                />
            </div>
            {suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, marginTop: 6, maxHeight: 240, overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.5)" }}>
                    {suggestions.map((s, i) => (
                        <button key={i} type="button" onClick={() => { onChange(s.label); setSuggestions([]); }}
                            style={{ width: "100%", background: "none", border: "none", borderBottom: i < suggestions.length - 1 ? `1px solid ${C.border}` : "none", padding: "10px 14px", fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.cream, textAlign: "left", cursor: "pointer" }}>
                            {s.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function CheckoutView() {
    const { items, add, remove, count, total, drawerOpen, setDrawerOpen } = useCart();
    const { toast } = useToast();
    const [checkingOut, setCheckingOut] = useState(false);
    const [address, setAddress] = useState("");
    const [phone, setPhone] = useState("");
    const [loc, setLoc] = useState(null);
    const [gettingLoc, setGettingLoc] = useState(false);
    const [mode, setMode] = useState("delivery");
    const vals = Object.values(items);

    const useMyLocation = async () => {
        setGettingLoc(true);
        try {
            const pos = await checkLocation();
            if (!pos) { toast("Location unavailable — please type your address", "info"); return; }
            if (pos.accuracy > MAX_LOC_ACCURACY_M) {
                toast(`Location too imprecise (${Math.round(pos.accuracy)} m) — type your address instead`, "info");
                return;
            }
            setLoc(pos);
            setAddress(`✓ Location captured (${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)})`);
            toast("Current location captured", "success");
        } finally { setGettingLoc(false); }
    };

    const placeOrder = async () => {
        if (checkingOut) return;
        if (mode === "delivery" && !address) { toast("Enter your delivery address", "info"); return; }
        if (phone.replace(/\D/g, "").length !== 10) { toast("Enter a valid 10-digit mobile number", "info"); return; }
        const fullAddress = mode === "delivery"
            ? (loc ? `${address}\n📍 https://maps.google.com/?q=${loc.lat},${loc.lon}` : address)
            : `Pickup — ${STORE.name}`;
        setCheckingOut(true);
        try {
            await ordersApi.create({ items: vals, total, address: fullAddress, phone, payment: null });
            toast(mode === "delivery" ? "Order placed! Pay on delivery." : "Pickup order placed! Pay at counter.", "success");
            setDrawerOpen(false);
        } catch (e) { toast("Order failed", "info"); setCheckingOut(false); }
    };

    if (!drawerOpen) return null;

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 450, background: C.bg, overflowY: "auto" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", padding: "24px 5vw 80px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0 20px" }}>
                    <button type="button" onClick={() => setDrawerOpen(false)}
                        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: C.orange }}>
                        <Icon name="chevronDown" size={16} style={{ transform: "rotate(90deg)" }} /> Back to menu
                    </button>
                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream }}>Checkout · {count} items</span>
                </div>

                {vals.length === 0 ? (
                    <div style={{ textAlign: "center", marginTop: 80, color: C.creamDim }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px",
                            background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}><Icon name="cart" size={22} style={{ color: C.creamDim }} /></div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 14 }}>Your cart is empty</div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "rgba(200,184,154,0.4)", marginTop: 6 }}>Add some dishes from the menu first</div>
                    </div>
                ) : (
                    <div className="checkout-grid">
                        <div className="checkout-details">
                            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                                {[["delivery", "Delivery", "scooter"], ["pickup", "Pickup", "box"]].map(([k, lbl, ic]) => (
                                    <button key={k} type="button" onClick={() => setMode(k)}
                                        style={{ flex: 1, background: mode === k ? "rgba(255,94,20,0.12)" : C.bgCard, border: `1px solid ${mode === k ? C.borderO : C.border}`, borderRadius: 12, padding: "14px", cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 700, color: mode === k ? C.orange : C.cream, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                                        <Icon name={ic} size={14} /> {lbl}
                                    </button>
                                ))}
                            </div>

                            {mode === "delivery" && (
                                <>
                                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.creamDim, marginBottom: 8 }}>Delivery address</div>
                                    <AddressAutocomplete value={address} onChange={setAddress} placeholder="Search your address or area..." />
                                    <button type="button" onClick={useMyLocation} disabled={gettingLoc}
                                        style={{ width: "100%", marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "rgba(52,184,106,0.1)", border: `1px dashed ${loc ? "rgba(52,184,106,0.5)" : "rgba(52,184,106,0.3)"}`, cursor: gettingLoc ? "default" : "pointer", borderRadius: 10, padding: "10px", fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.green }}>
                                        <Icon name="pin" size={14} />
                                        {gettingLoc ? "Getting location..." : loc ? "Location attached — tap to retry" : "Use Current Location"}
                                    </button>
                                </>
                            )}

                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.creamDim, margin: "18px 0 8px" }}>Contact</div>
                            <div className="input-focus" style={{ display: "flex", marginTop: 8, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                                <span style={{ display: "flex", alignItems: "center", padding: "0 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, borderRight: `1px solid ${C.border}` }}>+91</span>
                                <input type="tel" inputMode="numeric"
                                    value={phone.replace(/\D/g, "").slice(0, 10)}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="Mobile number *"
                                    style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, padding: "12px 14px", minWidth: 0 }}
                                />
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", margin: "18px 0 12px" }}>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, color: C.cream }}>Total</span>
                                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 22, color: C.orange }}>₹{total.toLocaleString()}</span>
                            </div>
                            <button type="button" disabled={checkingOut} onClick={placeOrder}
                                style={{ width: "100%", background: checkingOut ? "rgba(232,89,12,0.5)" : C.orange, border: "none", cursor: checkingOut ? "default" : "pointer", fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 700, color: "#fff", padding: "14px", borderRadius: 12, transition: "all 0.2s" }}
                            >{checkingOut ? "Placing order..." : `Place Order (${mode === "delivery" ? "COD" : "Pickup"}) · ₹${total.toLocaleString()}`}</button>
                            <div style={{ textAlign: "center", fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginTop: 10 }}>
                                Online payments coming soon — COD only for now
                            </div>
                        </div>

                        <div>
                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: C.creamDim, marginBottom: 8 }}>Your order</div>
                            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, padding: "8px 20px" }}>
                                {vals.map(({ name, price, qty }) => (
                                    <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 14, color: C.cream }}>{name}</div>
                                            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>₹{parseInt(price.replace(/[^0-9]/g, "")) * qty}</div>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <button type="button" onClick={() => remove(name)} style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: C.orange }}><Icon name="minus" /></button>
                                            <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: C.cream, minWidth: 20, textAlign: "center" }}>{qty}</span>
                                            <button type="button" onClick={() => add(name, price)} style={{ background: C.orange, border: "none", cursor: "pointer", width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="plus" /></button>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0 6px" }}>
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>Subtotal ({count} items)</span>
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream }}>₹{total.toLocaleString()}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>{mode === "delivery" ? "Delivery" : "Pickup"}</span>
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.green }}>Free</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function BackToTop() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const fn = () => setShow(window.scrollY > 400);
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);
    if (!show) return null;
    return (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
                position: "fixed", bottom: 76, right: 24, zIndex: 150,
                width: 44, height: 44, borderRadius: "50%",
                background: C.orange, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, boxShadow: "0 4px 20px rgba(255,94,20,0.3)",
                transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(255,94,20,0.4)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,94,20,0.3)"; }}
        ><Icon name="arrowUp" /></button>
    );
}

function ScrollProgress() {
    const [progress, setProgress] = useState(0);
    useEffect(() => {
        const fn = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
        };
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);
    return (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 9999, background: "rgba(255,255,255,0.05)" }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(to right, ${C.orange}, ${C.amber})`, transition: "width 0.1s", borderRadius: "0 2px 2px 0" }} />
        </div>
    );
}



function Nav({ onAdminOpen, onDashboardOpen }) {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const { count, setDrawerOpen } = useCart();
    const { user, logout } = useAuth();
    const [badgePulse, setBadgePulse] = useState(false);
    const prevCount = useRef(count);
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (count !== prevCount.current) {
            setBadgePulse(true);
            prevCount.current = count;
            setTimeout(() => setBadgePulse(false), 400);
        }
    }, [count]);
    useEffect(() => {
        const fn = () => { setScrolled(window.scrollY > 50); };
        window.addEventListener("scroll", fn);
        return () => window.removeEventListener("scroll", fn);
    }, []);
    useEffect(() => {
        const fn = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
        document.addEventListener("mousedown", fn);
        return () => document.removeEventListener("mousedown", fn);
    }, []);

    const scroll = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };
    useEffect(() => { window.__toggleDropdown = () => setShowDropdown(o => !o); return () => { window.__toggleDropdown = undefined; }; }, []);

    const links = [
        ["Menu", "menu"], ["How it works", "how"],
    ];
    const mobileItems = useMemo(() => [...links, ["Cart", "cart"]], []);

    return (
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            padding: "0 5vw",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: scrolled ? "rgba(15,10,0,0.92)" : "transparent",
            backdropFilter: scrolled ? "blur(16px)" : "none",
            borderBottom: scrolled ? `1px solid ${C.border}` : "none",
            transition: "all 0.35s",
            minHeight: 66,
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: C.orange, display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 13, color: "#fff",
                }}>HA</div>
                <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 15, color: C.cream, letterSpacing: -0.3 }}>
                    Healthy <span style={{ color: C.orange }}>Arena's</span>
                </span>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div className="nav-links" style={{ display: "flex", gap: 32, alignItems: "center" }}>
                    {links.map(([label, id]) => (
                        <button key={id} type="button" onClick={() => scroll(id)} className="nav-link" style={{
                            background: "none", border: "none", cursor: "pointer",
                            fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500,
                            color: C.creamDim, transition: "color 0.2s",
                        }}
                            onMouseEnter={e => e.target.style.color = C.cream}
                            onMouseLeave={e => e.target.style.color = C.creamDim}
                        >{label}</button>
                    ))}
                    {user?.isAdmin && (
                        <button type="button" onClick={() => onDashboardOpen(true)}
                            style={{
                                background: "rgba(232,89,12,0.12)", border: `1px solid ${C.borderO}`,
                                cursor: "pointer", borderRadius: 50, padding: "7px 16px",
                                fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
                                color: C.orange, display: "flex", alignItems: "center", gap: 5,
                                transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,89,12,0.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(232,89,12,0.12)"; }}
                        ><Icon name="home" size={13} /> Dashboard</button>
                    )}
                </div>

                <button type="button" onClick={() => setDrawerOpen(true)}
                    style={{
                        background: "none", border: `1px solid ${C.border}`,
                        cursor: "pointer", borderRadius: 50, padding: "7px 14px",
                        position: "relative", display: "flex", alignItems: "center", gap: 6,
                        transition: "border 0.2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.border = `1px solid ${C.orange}`}
                    onMouseLeave={e => e.currentTarget.style.border = `1px solid ${C.border}`}
                >
                    <Icon name="cart" size={15} style={{ color: C.orange }} />
                    {count > 0 && (
                        <span style={{
                            fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 13, color: C.orange,
                            animation: badgePulse ? "badge-pulse 0.4s ease" : "none",
                        }}>{count}</span>
                    )}
                </button>

                {user ? (
                    <div className="hide-mobile" ref={dropdownRef} style={{ position: "relative" }}>
                        <button type="button" onClick={() => setShowDropdown(o => !o)}
                            style={{
                                display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                                background: "rgba(255,94,20,0.15)", border: `1px solid ${C.borderO}`,
                                borderRadius: 50, padding: "5px 16px 5px 5px",
                                fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 13, color: C.cream,
                                transition: "all 0.2s",
                            }}
                        >
                            <div style={{
                                width: 30, height: 30, borderRadius: "50%",
                                background: C.orange, display: "flex", alignItems: "center", justifyContent: "center",
                                fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 12, color: "#fff",
                            }}>{user.avatar}</div>
                            {user.name}
                        </button>
                        {showDropdown && (
                            <div style={{
                                position: "absolute", top: "100%", right: 0, marginTop: 8, zIndex: 200,
                                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
                                minWidth: 180, overflow: "hidden",
                            }}>
                                <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 14, color: C.cream }}>{user.name}</div>
                                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginTop: 2 }}>{user.phone}{user.isAdmin ? <span style={{ color: C.amber, marginLeft: 6 }}>● Admin</span> : ""}</div>
                                </div>
                                {user.isAdmin && (
                                    <button type="button" onClick={() => { onDashboardOpen(true); setShowDropdown(false); }}
                                        style={{
                                            width: "100%", background: "none", border: "none", cursor: "pointer",
                                            padding: "12px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                                            fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.orange,
                                            borderBottom: `1px solid ${C.border}`,
                                            transition: "background 0.2s",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(232,89,12,0.1)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                                    ><Icon name="home" size={14} /> Dashboard</button>
                                )}
                                {user.isAdmin && (
                                    <button type="button" onClick={() => { onAdminOpen("dashboard"); setShowDropdown(false); }}
                                        style={{
                                            width: "100%", background: "none", border: "none", cursor: "pointer",
                                            padding: "12px 16px", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                                            fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.amber,
                                            transition: "background 0.2s",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "rgba(245,166,35,0.1)"}
                                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                                    ><Icon name="settings" size={14} /> Admin Panel</button>
                                )}
                                <button type="button" onClick={() => { logout(); setShowDropdown(false); }}
                                    style={{
                                        width: "100%", background: "none", border: "none", cursor: "pointer",
                                        padding: "12px 16px", textAlign: "left",
                                        fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.red,
                                        transition: "background 0.2s",
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,68,68,0.1)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}
                                >Sign out</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button type="button" className="hide-mobile" onClick={() => window.__openPin?.()}
                        style={{
                            background: "transparent", border: `1.5px solid ${C.borderO}`,
                            cursor: "pointer", fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600,
                            color: C.orange, padding: "7px 18px", borderRadius: 50,
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,94,20,0.1)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >Admin</button>
                )}

                <a href="tel:9634038986" className="nav-links" style={{
                    background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                    borderRadius: 50, padding: "8px 16px", textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
                    fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, fontWeight: 600
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F0EDE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    <span>9634038986</span>
                </a>
            </div>

            <button type="button" className="hamburger" onClick={() => setMenuOpen(o => !o)}
                style={{
                    display: "none", background: "none", border: "none", cursor: "pointer",
                    fontSize: 24, color: C.cream, padding: 8,
                }}
            >{menuOpen ? <Icon name="close" /> : <Icon name="menu" />}</button>

            <div className="mobile-menu" style={{
                position: "fixed", top: 66, left: 0, right: 0,
                background: "rgba(15,10,0,0.97)", backdropFilter: "blur(16px)",
                padding: menuOpen ? "20px 5vw" : "0 5vw",
                borderBottom: menuOpen ? `1px solid ${C.border}` : "1px solid transparent",
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? "translateY(0)" : "translateY(-12px)",
                pointerEvents: menuOpen ? "auto" : "none",
                transition: "all 0.3s",
                display: "flex", flexDirection: "column", gap: 16, overflow: "hidden",
                maxHeight: menuOpen ? 300 : 0,
            }}>
                {mobileItems.map(([label, id], idx) => (
                    <button key={id} type="button" onClick={() => { id === "cart" ? setDrawerOpen(true) : scroll(id); }} style={{
                        background: id === "order" ? C.orange : "transparent",
                        border: `1px solid ${id === "order" ? C.orange : C.border}`,
                        cursor: "pointer", borderRadius: 8, padding: "12px 20px",
                        opacity: menuOpen ? 1 : 0,
                        transform: menuOpen ? "translateY(0)" : "translateY(-8px)",
                        transition: `all 0.25s ${0.05 + 0.04 * idx}s`,
                        fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 600,
                        color: id === "order" ? "#fff" : C.cream, textAlign: "left",
                    }}>{label}</button>
                ))}
                <a href="tel:9634038986" style={{
                    background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                    borderRadius: 8, padding: "12px 20px", textDecoration: "none",
                    opacity: menuOpen ? 1 : 0,
                    transform: menuOpen ? "translateY(0)" : "translateY(-8px)",
                    transition: `all 0.25s ${0.05 + 0.04 * mobileItems.length}s`,
                    fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 600, color: C.cream,
                    display: "flex", alignItems: "center", gap: 8
                }}>
                    <Icon name="phone" size={14} /> Call Us: 9634038986
                </a>
                {user ? (
                    <button type="button" onClick={() => { logout(); setMenuOpen(false); }} style={{
                        background: "transparent", border: `1px solid ${C.border}`,
                        cursor: "pointer", borderRadius: 8, padding: "12px 20px",
                        opacity: menuOpen ? 1 : 0,
                        transform: menuOpen ? "translateY(0)" : "translateY(-8px)",
                        transition: `all 0.25s ${0.05 + 0.04 * mobileItems.length}s`,
                        fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 600,
                        color: C.red, textAlign: "left",
                    }}>Sign out</button>
                ) : (
                    <button type="button" onClick={() => { window.__openPin?.(); setMenuOpen(false); }} style={{
                        background: C.orange, border: "none",
                        cursor: "pointer", borderRadius: 8, padding: "12px 20px",
                        opacity: menuOpen ? 1 : 0,
                        transform: menuOpen ? "translateY(0)" : "translateY(-8px)",
                        transition: `all 0.25s ${0.05 + 0.04 * mobileItems.length}s`,
                        fontFamily: "'Inter',sans-serif", fontSize: 15, fontWeight: 600,
                        color: "#fff", textAlign: "center",
                    }}>Admin</button>
                )}
            </div>
        </nav>
    );
}

function SplashScreen({ onDismiss }) {
    const [show, setShow] = useState(true);
    const [phase, setPhase] = useState("letters");
    const brand = "Healthy Arena's";
    useEffect(() => {
        const t1 = setTimeout(() => setPhase("subtitle"), 1600);
        const t2 = setTimeout(() => {
            setShow(false);
            setTimeout(onDismiss, 500);
        }, 2600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [onDismiss]);
    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "#0B0B0D", opacity: show ? 1 : 0,
            transition: "opacity 0.5s",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "40px 5vw",
        }}>
            <div style={{ position: "absolute", inset: 0, background: "url('https://cdn.vectorstock.com/i/500p/72/29/polygonal-mesh-uttarakhand-state-map-vector-23857229.jpg') 50% 55%/140% no-repeat", opacity: 0.55, filter: "invert(1)", mixBlendMode: "screen" }} />
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, rgba(11,11,13,0.2) 0%, rgba(11,11,13,1) 70%)` }} />
            <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ fontSize: 40, marginBottom: 32, animation: "float 3s ease-in-out infinite", lineHeight: 1, willChange: "transform" }}>🥗</div>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, maxWidth: 700 }}>
                    {brand.split("").map((ch, i) => (
                        <span key={i} style={{
                            fontFamily: "'Playfair Display',serif", fontWeight: 800,
                            fontSize: "clamp(44px, 8vw, 96px)", lineHeight: 1.05,
                            color: ch === "'" ? C.orange : C.cream,
                            opacity: 0, transform: "translateY(20px)",
                            willChange: "transform, opacity",
                            animation: `letter-in 0.35s ease ${i * 0.06}s forwards`,
                        }}>{ch === " " ? "\u00A0" : ch}</span>
                    ))}
                </div>
                {phase !== "letters" && (
                    <div style={{
                        fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 500,
                        letterSpacing: 6, textTransform: "uppercase", color: "rgba(240,237,232,0.45)",
                        marginTop: 24,
                        opacity: 0, animation: "fade-up 0.5s ease forwards",
                    }}>Fresh · Healthy · Delicious</div>
                )}
            </div>
        </div>
    );
}

function Hero() {
    const [loaded, setLoaded] = useState(false);
    const [tagIdx, setTagIdx] = useState(0);
    useEffect(() => { setTimeout(() => setLoaded(true), 100); }, []);
    useEffect(() => {
        const t = setInterval(() => setTagIdx(i => (i + 1) % TAGLINES.length), 3500);
        return () => clearInterval(t);
    }, []);

    return (
        <section style={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            padding: "80px 5vw 60px", background: C.bg,
            position: "relative", overflow: "hidden",
        }}>
            <div style={{ position: "absolute", inset: 0, background: "url('https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg') center/cover no-repeat", opacity: 0.15, pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to bottom, ${C.bg} 0%, ${C.bg} 20%, transparent 50%, transparent 60%, ${C.bg} 100%)`, pointerEvents: "none" }} />
            <div style={{ maxWidth: 1160, margin: "0 auto", width: "100%", position: "relative" }} className="grid-2">
                <div>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        background: "rgba(255,94,20,0.1)", border: `1px solid ${C.borderO}`,
                        borderRadius: 50, padding: "5px 16px 5px 12px", marginBottom: 28,
                        opacity: loaded ? 1 : 0, transition: "opacity 0.6s 0.2s",
                    }}>
                        <div style={{
                            width: 20, height: 20, borderRadius: 6,
                            background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11,
                        }}><Icon name="check" size={11} style={{ color: "#fff" }} /></div>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 500, color: C.orange }}>
                            Now delivering in your city
                        </span>
                    </div>

                    <h1 style={{
                        fontFamily: "'Playfair Display',serif", fontWeight: 800,
                        fontSize: "clamp(44px, 6vw, 76px)", lineHeight: 1.0,
                        color: C.cream, margin: "0 0 24px", letterSpacing: -2,
                        opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(24px)",
                        transition: "all 0.7s 0.3s",
                        minHeight: "1.2em",
                    }}>
                        {TAGLINES[tagIdx].map((part, i) => (
                            <span key={i} style={{ display: "block", animation: loaded ? "tagline-in 0.5s ease-out" : "none" }}>{i === 0 ? part : <span style={{ color: C.orange }}>{part}</span>}</span>
                        ))}
                    </h1>

                    <p style={{
                        fontFamily: "'Inter',sans-serif", fontSize: 17, lineHeight: 1.75,
                        color: C.creamDim, maxWidth: 440, margin: "0 0 36px",
                        opacity: loaded ? 1 : 0, transition: "opacity 0.7s 0.5s",
                    }}>
                        Enjoy fresh juices, protein shakes, nutritious meals, and delicious snacks prepared daily with premium ingredients.
                    </p>

                </div>

                <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
                    opacity: loaded ? 1 : 0, transform: loaded ? "translateY(0)" : "translateY(30px)",
                    transition: "all 0.8s 0.5s",
                }}>
                    <div style={{
                        position: "relative", width: "100%", maxWidth: 400, aspectRatio: "1/1",
                    }}>
                        <div style={{
                            position: "absolute", top: "5%", right: "5%", width: "55%", aspectRatio: "1/1",
                            borderRadius: 24, overflow: "hidden",
                            border: `2px solid ${C.borderO}`, boxShadow: "0 20px 60px rgba(232,89,12,0.2)",
                            transform: "rotate(6deg)", zIndex: 3,
                        }}>
                            <HeroShot src={HERO_SHOT[0]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                        <div style={{
                            position: "absolute", bottom: "5%", left: "5%", width: "50%", aspectRatio: "1/1",
                            borderRadius: 24, overflow: "hidden",
                            border: `2px solid ${C.borderO}`, boxShadow: "0 20px 60px rgba(232,89,12,0.15)",
                            transform: "rotate(-4deg)", zIndex: 2,
                        }}>
                            <HeroShot src={HERO_SHOT[1]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                        <div style={{
                            position: "absolute", top: "60%", right: "10%", width: "40%", aspectRatio: "1/1",
                            borderRadius: 24, overflow: "hidden",
                            border: `2px solid ${C.borderO}`, boxShadow: "0 20px 60px rgba(232,89,12,0.2)",
                            transform: "rotate(12deg)", zIndex: 4,
                        }}>
                            <HeroShot src={HERO_SHOT[2]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                        <div style={{
                            position: "absolute", top: "25%", left: "8%", width: "35%", aspectRatio: "1/1",
                            borderRadius: 24, overflow: "hidden",
                            border: `2px solid ${C.borderO}`, boxShadow: "0 20px 60px rgba(232,89,12,0.15)",
                            transform: "rotate(-8deg)", zIndex: 1,
                        }}>
                            <HeroShot src={HERO_SHOT[3]} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        {[["30 min", "Avg. delivery"], ["500+", "Restaurants"], ["4.9★", "Rating"]].map(([val, lbl]) => (
                            <div key={lbl} style={{ textAlign: "center", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 16px", minWidth: 80 }}>
                                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 18, color: C.cream }}>{val}</div>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginTop: 2 }}>{lbl}</div>
                            </div>
                        ))}
                    </div>
                    <OrderTracker />
                    <TiffinServiceCard />
                </div>
            </div>
        </section>
    );
}

function HowItWorks() {
    const [ref, inView] = useInView(0.1);
    const steps = [
        { icon: "01", title: "Enter your address", desc: "Type in your delivery address and we'll show you all the great restaurants nearby." },
        { icon: "02", title: "Browse & pick", desc: "Choose from hundreds of cuisines. Filter by rating, price, or delivery time." },
        { icon: "03", title: "Pay securely", desc: "Pay with card, UPI, or cash. Your details are always encrypted and safe." },
        { icon: "04", title: "Track live", desc: "Watch your order move in real time from kitchen to your door. Every step." },
    ];

    return (
        <section id="how" ref={ref} style={{ background: C.bgCard, padding: "96px 5vw", borderTop: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 64 }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.orange, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
                        Simple as 1-2-3-4
                    </div>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: "clamp(32px, 4vw, 52px)", color: C.cream, margin: "0 auto", letterSpacing: -1 }}>
                        Order in 4 easy steps
                    </h2>
                    <div style={{ width: 50, height: 3, background: C.orange, borderRadius: 2, margin: "12px auto 0" }} />
                </div>

                <div className="grid-4" style={{ position: "relative" }}>
                    <div style={{
                        position: "absolute", top: 44, left: "10%", right: "10%", height: 1,
                        background: `linear-gradient(to right, ${C.orange}, transparent)`,
                        opacity: 0.25,
                    }} />

                    {steps.map((s, i) => (
                        <div key={i} style={{
                            background: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 16, padding: "32px 24px",
                            opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(24px)",
                            transition: `all 0.6s ${i * 0.12}s`,
                            position: "relative",
                        }}>
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 16,
                                color: "#fff", marginBottom: 20,
                            }}>{s.icon}</div>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream, margin: "0 0 10px", letterSpacing: -0.3 }}>
                                {s.title}
                            </h3>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, lineHeight: 1.7, color: C.creamDim, margin: 0 }}>
                                {s.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function DishRow({ dish, index, total }) {
    const { items, add, remove } = useCart();
    const { favs, toggle } = useFav();
    const { toast } = useToast();
    const [heartAnim, setHeartAnim] = useState(false);
    const [priceFlash, setPriceFlash] = useState(false);

    const hasSizes = !!dish.prices;
    const [size, setSize] = useState("full");
    const displayName = hasSizes ? `${dish.name} (${size === "half" ? "Half" : "Full"})` : dish.name;
    const displayPrice = hasSizes ? dish.prices[size] : dish.price;
    const qty = items[displayName.replace(/\s/g, "_")]?.qty || 0;
    const isFav = favs.includes(dish.name);

    const handleAdd = (e) => {
        e.stopPropagation();
        add(displayName, displayPrice);
        toast(`Added ${dish.name}`, "success");
        setPriceFlash(true);
        setTimeout(() => setPriceFlash(false), 400);
    };
    const handleRemove = (e) => {
        e.stopPropagation();
        remove(displayName);
    };
    const handleFav = (e) => {
        e.stopPropagation();
        toggle(dish.name);
        setHeartAnim(true);
        setTimeout(() => setHeartAnim(false), 350);
    };

    return (
        <div className="dish-row" style={{
            display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
            borderBottom: index < total - 1 ? `1px solid ${C.border}` : "none",
            transition: "all 0.2s", borderLeft: "3px solid transparent",
        }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(232,89,12,0.03)"; e.currentTarget.style.borderLeftColor = C.orange; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; }}
        >
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                            width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${dish.veg ? C.green : C.red}`,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: dish.veg ? C.green : C.red }} />
                        </div>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 600, fontSize: 15, color: C.cream }}>{dish.name}</span>
                    </div>
                    {dish.tag && <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(255,200,70,0.6)", background: "rgba(255,200,70,0.1)", borderRadius: 20, padding: "2px 8px" }}>{dish.tag}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 3 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>{dish.time}</span>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.amber }}><Icon name="star" size={11} /> {dish.rating}</span>
                </div>
            </div>

            <div className="dish-row-controls" style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                {hasSizes && (
                    <div style={{ display: "flex", background: C.bg, borderRadius: 6, padding: 1, border: `1px solid ${C.border}` }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSize("half"); }} style={{
                            padding: "4px 6px", border: "none", background: size === "half" ? C.orange : "none",
                            color: size === "half" ? "#fff" : C.creamDim, cursor: "pointer", borderRadius: 5,
                            fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, transition: "all 0.15s",
                        }}>½</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); setSize("full"); }} style={{
                            padding: "4px 6px", border: "none", background: size === "full" ? C.orange : "none",
                            color: size === "full" ? "#fff" : C.creamDim, cursor: "pointer", borderRadius: 5,
                            fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, transition: "all 0.15s",
                        }}>Full</button>
                    </div>
                )}
                <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, color: C.orange, minWidth: hasSizes ? 44 : "auto", textAlign: "right", transition: "all 0.2s", animation: priceFlash ? "price-flash 0.4s ease" : "none" }}>{displayPrice}</span>
                <button type="button" onClick={handleFav} style={{
                    background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px",
                    color: isFav ? C.red : "rgba(255,255,255,0.25)",
                    animation: heartAnim ? "heart-pop 0.35s ease" : "none", transition: "all 0.2s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                }}>{isFav ? <Icon name="heartFilled" size={16} style={{ color: C.red }} /> : <Icon name="heart" size={16} style={{ color: "rgba(255,255,255,0.25)" }} />}</button>
                {qty === 0 ? (
                    <button type="button" onClick={handleAdd} style={{
                        background: C.orange, border: "none", cursor: "pointer", borderRadius: 6,
                        fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 700,
                        color: "#fff", padding: "6px 12px", transition: "background 0.2s",
                        whiteSpace: "nowrap",
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = C.orangeDim}
                        onMouseLeave={e => e.currentTarget.style.background = C.orange}
                    ><Icon name="plus" size={11} style={{ marginRight: 2 }} /> Add</button>
                ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(255,94,20,0.1)", border: `1px solid ${C.borderO}`, borderRadius: 6 }}>
                        <button type="button" onClick={handleRemove} style={{ background: "none", border: "none", cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", color: C.orange }}><Icon name="minus" /></button>
                        <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 13, color: C.cream, minWidth: 20, textAlign: "center" }}>{qty}</span>
                        <button type="button" onClick={handleAdd} style={{ background: C.orange, border: "none", cursor: "pointer", width: 26, height: 26, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}><Icon name="plus" /></button>
                    </div>
                )}
            </div>
        </div>
    );
}

function Menu() {
    const [ref, inView] = useInView(0.05);
    const [activeCategory, setActiveCategory] = useState("Breakfast");
    const [search, setSearch] = useState("");
    const [diet, setDiet] = useState("all");
    window.__setDiet = setDiet;
    const { favs } = useFav();
    const { version, getDishes } = useDishes();
    const dishes = useMemo(() => getDishes(), [version, getDishes]);

    const filters = ["Breakfast", "Main Course", "Rice", "Maggie", "Noodles", "Rolls", "Snacks & Starters", "Juices", "Coolers", "Shakes", "Beverages", "Healthy Diet", "Add-ons"];

    const filtered = dishes.filter(d => {
        if (diet === "veg" && !d.veg) return false;
        if (diet === "nonveg" && d.veg) return false;
        if (diet === "fav" && !favs.includes(d.name)) return false;
        if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.category.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const grouped = {};
    filtered.forEach(d => {
        if (!grouped[d.category]) grouped[d.category] = [];
        grouped[d.category].push(d);
    });

    const visibleCategories = Object.keys(grouped);

    const scrollToCategory = (cat) => {
        setActiveCategory(cat);
        const el = document.getElementById(`cat-${cat.replace(/\s/g, "-")}`);
        if (el) {
            const offset = 140;
            const top = el.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top, behavior: "smooth" });
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveCategory(entry.target.dataset.category);
                }
            });
        }, { rootMargin: "-140px 0px -60% 0px" });
        visibleCategories.forEach(cat => {
            const el = document.getElementById(`cat-${cat.replace(/\s/g, "-")}`);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [visibleCategories]);

    const hasActiveFilters = search || diet !== "all";

    return (
        <section id="menu" ref={ref} style={{ background: C.bg, padding: "96px 5vw" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
                    <div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.orange, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>Our menu</div>
                        <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: "clamp(30px, 4vw, 48px)", color: C.cream, margin: 0, letterSpacing: -1 }}>
                            What's cooking?
                        </h2>
                        <div style={{ width: 40, height: 3, background: C.orange, borderRadius: 2, marginTop: 10 }} />
                    </div>
                    <div className="diet-filters" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button key="all" type="button" onClick={() => setDiet("all")} style={{
                            background: diet === "all" ? "rgba(52,184,106,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${diet === "all" ? "rgba(52,184,106,0.4)" : C.border}`,
                            cursor: "pointer", borderRadius: 50, padding: "6px 14px",
                            fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500,
                            color: diet === "all" ? C.green : C.creamDim,
                            transition: "all 0.2s",
                        }}>All</button>
                        <button key="veg" type="button" onClick={() => setDiet("veg")} style={{
                            background: diet === "veg" ? "rgba(52,184,106,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${diet === "veg" ? "rgba(52,184,106,0.4)" : C.border}`,
                            cursor: "pointer", borderRadius: 50, padding: "6px 14px",
                            fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500,
                            color: diet === "veg" ? C.green : C.creamDim,
                            transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                        }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: diet === "veg" ? C.green : "rgba(255,255,255,0.3)", display: "inline-block" }} /> Veg</button>
                        <button key="nonveg" type="button" onClick={() => setDiet("nonveg")} style={{
                            background: diet === "nonveg" ? "rgba(229,72,72,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${diet === "nonveg" ? "rgba(229,72,72,0.4)" : C.border}`,
                            cursor: "pointer", borderRadius: 50, padding: "6px 14px",
                            fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500,
                            color: diet === "nonveg" ? C.red : C.creamDim,
                            transition: "all 0.2s", display: "flex", alignItems: "center", gap: 6,
                        }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: diet === "nonveg" ? C.red : "rgba(255,255,255,0.3)", display: "inline-block" }} /> Non-Veg</button>
                        <button key="fav" type="button" onClick={() => setDiet("fav")} style={{
                            background: diet === "fav" ? "rgba(229,72,72,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${diet === "fav" ? "rgba(229,72,72,0.4)" : C.border}`,
                            cursor: "pointer", borderRadius: 50, padding: "6px 14px",
                            fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 500,
                            color: diet === "fav" ? C.red : C.creamDim,
                            transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4,
                        }}><Icon name="heart" size={13} style={{ color: diet === "fav" ? C.red : C.creamDim }} /> Favorites</button>
                    </div>
                </div>

                <div className="input-focus" style={{ display: "flex", marginBottom: 28, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 50, overflow: "hidden", maxWidth: 400 }}>
                    <div style={{ padding: "0 14px", display: "flex", alignItems: "center", color: C.creamDim, fontSize: 12, fontWeight: 600 }}>Search</div>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..." style={{ flex: 1, background: "none", border: "none", outline: "none", fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.cream, padding: "11px 0" }} />
                    {search && <button type="button" onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: C.creamDim, padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="close" size={14} /></button>}
                </div>

                {hasActiveFilters && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>
                            <span style={{ fontWeight: 600, color: C.cream }}>{filtered.length}</span> {filtered.length === 1 ? "item" : "items"} found
                        </div>
                        <button type="button" onClick={() => { setSearch(""); setDiet("all"); }}
                            style={{ background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 50, padding: "5px 14px", fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}
                             onMouseEnter={e => { e.currentTarget.style.border = `1px solid ${C.orange}`; e.currentTarget.style.color = C.orange; }}
                             onMouseLeave={e => { e.currentTarget.style.border = `1px solid ${C.border}`; e.currentTarget.style.color = C.creamDim; }}
                         ><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="close" size={12} /> Clear</span></button>
                    </div>
                )}

                <div style={{ display: "flex", gap: 12, overflowX: "auto", marginBottom: 32, paddingBottom: 8, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {visibleCategories.map(cat => {
                        const catDishes = grouped[cat];
                        const rep = catDishes[0];
                        const count = catDishes.length;
                        const isActive = activeCategory === cat;
                        return (
                            <button key={cat} type="button" onClick={() => scrollToCategory(cat)} style={{
                                flexShrink: 0, borderRadius: 14, cursor: "pointer", textAlign: "left",
                                background: isActive ? `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})` : C.bgCard,
                                border: `1px solid ${isActive ? "transparent" : C.border}`,
                                boxShadow: isActive ? `0 8px 24px rgba(232,89,12,0.25)` : "none",
                                transition: "all 0.2s", scrollSnapAlign: "start",
                                padding: "16px 20px", minWidth: 150,
                            }}
                                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.border = `1px solid ${C.borderO}`; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.border = `1px solid ${C.border}`; e.currentTarget.style.transform = "translateY(0)"; } }}
                            >
                                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: isActive ? "#fff" : C.cream, letterSpacing: "-0.01em" }}>{cat}</div>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500, color: isActive ? "rgba(255,255,255,0.8)" : C.creamDim, marginTop: 3 }}>{count} {count === 1 ? "item" : "items"}</div>
                            </button>
                        );
                    })}
                </div>

                {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px", background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}><Icon name="search" size={20} style={{ color: C.creamDim }} /></div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 15, color: C.creamDim }}>
                            {search ? `No dishes match "${search}"` : "No dishes found"}
                        </div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "rgba(200,184,154,0.4)", marginTop: 6 }}>
                            Try a different search or filter
                        </div>
                    </div>
                ) : (
                    visibleCategories.map(cat => (
                        <div key={cat} id={`cat-${cat.replace(/\s/g, "-")}`} data-category={cat} style={{ marginBottom: 36 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                                <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 20, color: C.cream, margin: 0 }}>{cat}</h3>
                                <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, ${C.border}, transparent)` }} />
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>{grouped[cat].length} {grouped[cat].length === 1 ? "item" : "items"}</span>
                            </div>
                            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
                                {grouped[cat].map((dish, i) => (
                                    <DishRow key={dish.name} dish={dish} index={i} total={grouped[cat].length} />
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}

function StatsBanner() {
    const [ref, inView] = useInView(0.3);
    const c1 = useCounter(1, 1600, inView);
    const c2 = useCounter(3, 1000, inView);
    const c3 = useCounter(99, 1400, inView);
    const c4 = useCounter(15, 1800, inView);

    return (
        <div ref={ref} style={{
            background: C.bgCard, padding: "56px 5vw", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
        }} className="grid-stats">
            {[[c1, "", "Cafe Location"], [c2, "K+", "Happy Customers"], [c3, "%", "Freshness Quality"], [c4, "K+", "Orders Served"]].map(([val, suffix, label], i) => (
                <div key={i} style={{ textAlign: "center" }}>
                    <div style={{
                        fontFamily: "'Playfair Display',serif", fontWeight: 800,
                        fontSize: "clamp(36px, 5vw, 52px)",
                        background: `linear-gradient(135deg, ${C.orange}, ${C.amber})`,
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        lineHeight: 1.05,
                    }}>
                        {val.toLocaleString()}{suffix}
                    </div>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim, marginTop: 8 }}>{label}</div>
                </div>
            ))}
        </div>
    );
}

function FeaturedDishes() {
    const [ref, inView] = useInView(0.1);
    const featured = useMemo(() => DISHES.filter(d => FEATURED_TAGS.includes(d.tag) || d.rating >= 4.9).slice(0, 4), []);
    return (
        <section ref={ref} style={{ background: C.bg, padding: "72px 5vw" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.orange, letterSpacing: 3, textTransform: "uppercase", marginBottom: 8 }}>Featured</div>
                        <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: "clamp(28px, 3.5vw, 40px)", color: C.cream, margin: 0, letterSpacing: -1 }}>
                            Today's Specials
                        </h2>
                        <div style={{ width: 36, height: 3, background: C.orange, borderRadius: 2, marginTop: 8 }} />
                    </div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>Chef-curated picks for you</span>
                </div>
                <div className="grid-4" style={{ gap: 16 }}>
                    {featured.map((dish, i) => (
                        <div key={dish.name} style={{
                            background: C.bgCard, border: `1px solid ${C.border}`,
                            borderRadius: 16, overflow: "hidden",
                            opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)",
                            transition: `all 0.5s ${i * 0.1}s`,
                            cursor: "pointer",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02) translateY(-4px)"; e.currentTarget.style.borderColor = C.borderO; e.currentTarget.style.boxShadow = "0 12px 40px rgba(232,89,12,0.12)"; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = "scale(1) translateY(0)"; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
                        >
                            <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", minHeight: 120 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 15, color: C.cream }}>{dish.name}</div>
                                    {dish.tag && (
                                        <div style={{
                                            background: dish.tag === "Bestseller" ? C.orange : "rgba(255,255,255,0.08)",
                                            borderRadius: 20, padding: "3px 10px",
                                            fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 700, color: dish.tag === "Bestseller" ? "#fff" : C.amber, whiteSpace: "nowrap",
                                        }}>{dish.tag}</div>
                                    )}
                                </div>
                                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim, marginBottom: "auto", paddingTop: 2 }}>{dish.category}</div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                                    <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 16, color: C.orange }}>{dish.price || dish.prices?.full}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <Icon name="star" size={11} style={{ color: C.amber }} />
                                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.amber }}>{dish.rating}</span>
                                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: C.creamDim }}>· {dish.time}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const FEATURES = [
    { icon: "bolt", title: "30-min delivery", desc: "Our network of riders ensures your food reaches you hot and fast, every single time." },
    { icon: "check", title: "No hidden fees", desc: "What you see is what you pay. Free delivery on first 3 orders, no surprises." },
    { icon: "shield", title: "Secure checkout", desc: "Pay with UPI, card, or cash. Your payment details are always encrypted." },
    { icon: "pin", title: "Live tracking", desc: "Know exactly where your order is with real-time updates from kitchen to door." },
];

function Features() {
    const [ref, inView] = useInView(0.1);
    return (
        <section ref={ref} style={{ background: C.bgCard, padding: "80px 5vw", borderTop: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 52 }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.orange, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                        Why SwiftBite
                    </div>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: "clamp(30px, 4vw, 44px)", color: C.cream, margin: 0, letterSpacing: -1 }}>
                        Built for speed, crafted for taste
                    </h2>
                    <div style={{ width: 44, height: 3, background: C.orange, borderRadius: 2, margin: "10px auto 0" }} />
                </div>
                <div className="grid-4" style={{ gap: 20 }}>
                    {FEATURES.map((f, i) => (
                        <div key={i} style={{
                            background: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 16, padding: "28px 24px",
                            opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)",
                            transition: `all 0.5s ${i * 0.1}s`,
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 18, marginBottom: 18,
                            }}><Icon name={f.icon} size={18} style={{ color: "#fff" }} /></div>
                            <h3 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream, margin: "0 0 8px" }}>{f.title}</h3>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, lineHeight: 1.7, color: C.creamDim, margin: 0 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function Testimonials() {
    const [ref, inView] = useInView(0.1);
    const userReviews = useMemo(() => {
        try { return JSON.parse(localStorage.getItem("feedback") || "[]"); } catch (e) { return []; }
    }, []);
    const reviews = [
        { name: "Priya M.", rating: 5, text: "Fastest delivery I've ever had — 22 minutes flat! The biryani was still steaming when it arrived. Absolutely love swiftbite.", avatar: "PM" },
        { name: "Rohan S.", rating: 5, text: "The live tracking is a game changer. I knew exactly where my order was the whole time. Never going back to other apps.", avatar: "RS" },
        { name: "Anita K.", rating: 5, text: "Great variety, super easy to use, and customer support actually picks up. This is how food delivery should work.", avatar: "AK" },
        ...userReviews.filter(r => r.rating > 0).map(r => ({
            name: "You",
            rating: r.rating,
            text: r.text || "Great experience!",
            avatar: "You",
        })),
    ];

    return (
        <section ref={ref} style={{ background: C.bgCard, padding: "96px 5vw", borderTop: `1px solid ${C.border}` }}>
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: 56 }}>
                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: C.orange, letterSpacing: 3, textTransform: "uppercase", marginBottom: 10 }}>
                        Reviews
                    </div>
                    <h2 style={{ fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: "clamp(30px, 4vw, 48px)", color: C.cream, margin: 0, letterSpacing: -1 }}>
                        What people are saying
                    </h2>
                </div>

                <div className="grid-3">
                    {reviews.map((r, i) => (
                        <div key={i} style={{
                            background: C.bg, border: `1px solid ${C.border}`,
                            borderRadius: 16, padding: "28px 28px",
                            opacity: inView ? 1 : 0, transform: inView ? "translateY(0)" : "translateY(20px)",
                            transition: `all 0.5s ${i * 0.1}s`,
                        }}>
                            <div style={{ color: C.amber, marginBottom: 16, display: "flex", gap: 3 }}>
                                {Array.from({ length: r.rating }, (_, i) => <Icon key={i} name="star" size={14} style={{ color: C.amber }} />)}
                            </div>
                            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, lineHeight: 1.75, color: C.creamDim, margin: "0 0 24px", fontStyle: "italic" }}>
                                "{r.text}"
                            </p>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: "50%",
                                    background: `linear-gradient(135deg, ${C.orange}, ${C.orangeDim})`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 13, color: "#fff",
                                }}>{r.avatar}</div>
                                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 14, color: C.cream }}>{r.name}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

const NAV_ITEMS = [
    { key: "home", icon: "home", label: "Home", id: "hero" },
    { key: "menu", icon: "search", label: "Menu", id: "menu" },
    { key: "cart", icon: "cart", label: "Cart" },
    { key: "fav", icon: "heart", label: "Favorites", id: "menu" },
    { key: "profile", icon: "profile", label: "Profile" },
];

function BottomNav() {
    const { count, setDrawerOpen } = useCart();
    const { user, logout } = useAuth();
    const [active, setActive] = useState("home");
    const [showProfile, setShowProfile] = useState(false);
    const scroll = (id) => {
        if (id === "hero") { window.scrollTo({ top: 0, behavior: "smooth" }); return; }
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    };
    return (
        <>
            <nav className="bottom-nav" style={{
                position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 300,
                background: "rgba(11,11,13,0.97)", backdropFilter: "blur(16px)",
                borderTop: `1px solid ${C.border}`,
                display: "none", justifyContent: "space-around", alignItems: "center",
                padding: "6px 0 env(safe-area-inset-bottom, 6px) 0",
            }}>
                {NAV_ITEMS.map(item => (
                    <button key={item.key} type="button" onClick={() => {
                        setActive(item.key);
                        if (item.key === "cart") { setDrawerOpen(true); return; }
                        if (item.key === "fav") { scroll("menu"); setTimeout(() => window.__setDiet?.("fav"), 300); return; }
                        if (item.key === "profile") { setShowProfile(true); return; }
                        scroll(item.id);
                    }} style={{
                        background: "none", border: "none", cursor: "pointer", padding: "4px 12px",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        position: "relative",
                    }}>
                        <Icon name={item.icon} size={18} style={{ color: active === item.key ? C.orange : "rgba(255,255,255,0.35)" }} />
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 9, fontWeight: active === item.key ? 600 : 400, color: active === item.key ? C.orange : "rgba(255,255,255,0.35)" }}>{item.label}</span>
                        {item.key === "cart" && count > 0 && (
                            <span style={{
                                position: "absolute", top: 0, right: 4,
                                background: C.red, borderRadius: "50%",
                                width: 16, height: 16, fontSize: 9, fontWeight: 700,
                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{count}</span>
                        )}
                    </button>
                ))}
            </nav>

            {showProfile && (
                <>
                    <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 350, background: "rgba(0,0,0,0.5)" }} />
                    <div style={{
                        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 351,
                        background: C.bgCard, borderTop: `1px solid ${C.border}`,
                        borderRadius: "20px 20px 0 0", padding: "28px 24px calc(env(safe-area-inset-bottom, 0px) + 16px)",
                        animation: "fade-up 0.25s ease",
                    }}>
                        {user ? (
                            <>
                                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                                    <div style={{
                                        width: 44, height: 44, borderRadius: "50%",
                                        background: C.orange, display: "flex", alignItems: "center", justifyContent: "center",
                                        fontFamily: "'Playfair Display',serif", fontWeight: 800, fontSize: 16, color: "#fff",
                                    }}>{user.avatar}</div>
                                    <div>
                                        <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 16, color: C.cream }}>{user.name}</div>
                                        <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: C.creamDim }}>{user.phone}{user.isAdmin ? <span style={{ color: C.amber, marginLeft: 4 }}>● Admin</span> : ""}</div>
                                    </div>
                                </div>
                                {user.isAdmin && (
                                    <>
                                        <button type="button" onClick={() => { window.__openDashboard?.(); setShowProfile(false); }}
                                            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.orange, marginBottom: 8 }}
                                        ><Icon name="home" size={14} /> Dashboard</button>
                                        <button type="button" onClick={() => { window.__openAdmin?.(); setShowProfile(false); }}
                                            style={{ width: "100%", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.amber, marginBottom: 8 }}
                                        ><Icon name="settings" size={14} /> Admin Panel</button>
                                    </>
                                )}
                                <button type="button" onClick={() => { logout(); setShowProfile(false); }}
                                    style={{ width: "100%", background: "rgba(221,51,51,0.08)", border: `1px solid rgba(221,51,51,0.2)`, borderRadius: 10, padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.red }}
                                ><Icon name="close" size={14} /> Sign out</button>
                            </>
                        ) : (
                            <>
                                <div style={{ textAlign: "center", marginBottom: 20 }}>
                                    <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color: C.cream, marginBottom: 4 }}>Account</div>
                                    <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>Order without an account — just add your phone at checkout.</div>
                                </div>
                                <button type="button" onClick={() => { window.__openPin?.(); setShowProfile(false); }}
                                    style={{ width: "100%", background: "rgba(232,89,12,0.12)", border: `1px solid ${C.borderO}`, cursor: "pointer", borderRadius: 10, padding: "14px", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: C.orange, marginBottom: 8 }}
                                >Admin access</button>
                                <button type="button" onClick={() => setShowProfile(false)}
                                    style={{ width: "100%", background: "none", border: `1px solid ${C.border}`, cursor: "pointer", borderRadius: 10, padding: "14px", fontFamily: "'Inter',sans-serif", fontSize: 14, color: C.creamDim }}
                                >Close</button>
                            </>
                        )}
                    </div>
                </>
            )}
        </>
    );
}

function Footer({ onSupport }) {
    return (
        <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: "44px 5vw" }}>
            <div style={{ maxWidth: 1160, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter',sans-serif", fontWeight: 700, fontSize: 10, color: "#fff" }}>HA</div>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontWeight: 600, fontSize: 15, color: C.cream }}>Healthy <span style={{ color: C.orange }}>Arena's</span></span>
                </div>
                <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>
                    © {new Date().getFullYear()} · All rights reserved
                </div>
                <div style={{ display: "flex", gap: 24 }}>
                    {["Privacy", "Terms", "Support", "Careers"].map(l => (
                        <button key={l} type="button" onClick={() => { if (l === "Support") onSupport?.(); }}
                            style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: "rgba(200,184,154,0.5)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                            onMouseEnter={e => e.target.style.color = C.cream}
                            onMouseLeave={e => e.target.style.color = "rgba(200,184,154,0.5)"}
                        >{l}</button>
                    ))}
                </div>
            </div>
        </footer>
    );
}

export default function App() {
    const [splash, setSplash] = useState(true);
    const [showSupport, setShowSupport] = useState(false);
    const [showAdmin, setShowAdmin] = useState(false);
    const [showDashboard, setShowDashboard] = useState(false);
    const [showPin, setShowPin] = useState(false);
    useEffect(() => {
        window.__openDashboard = () => setShowDashboard(true);
        window.__openAdmin = () => setShowAdmin("dashboard");
        window.__openPin = () => setShowPin(true);
        return () => { window.__openDashboard = undefined; window.__openAdmin = undefined; window.__openPin = undefined; };
    }, []);
    return (
        <AuthProvider>
        <DishesProvider>
        <ToastProvider>
        <CartProvider>
            <FavProvider>
                <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0B0B0D; color: #F0EDE8; }
        input::placeholder { color: rgba(200,184,154,0.4); font-family: 'Inter', sans-serif; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0F0A00; }
        ::-webkit-scrollbar-thumb { background: #FF5E14; border-radius: 3px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .grid-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        @media (max-width: 1024px) {
            .grid-4 { grid-template-columns: repeat(2, 1fr); }
            .grid-stats { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 768px) {
            .grid-2 { grid-template-columns: 1fr; gap: 40px; }
            .grid-3 { grid-template-columns: repeat(2, 1fr); }
            .grid-4 { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
            .grid-3 { grid-template-columns: 1fr; }
            .grid-4 { grid-template-columns: 1fr; }
            .grid-stats { grid-template-columns: 1fr; }
            .nav-links { display: none !important; }
            .hamburger { display: block !important; }
            .hide-mobile { display: none !important; }
        }
        .dish-row { flex-wrap: wrap; }
        .dish-row-controls { flex-wrap: wrap; justify-content: flex-end; }
        .diet-filters { flex-wrap: wrap; }
        .address-bar { flex-wrap: wrap; }
        @media (max-width: 640px) {
            .address-bar { gap: 10px; }
            .address-bar .ab-btn { width: calc(100% - 10px) !important; padding: 12px 0 !important; display: flex; align-items: center; justify-content: center; }
            .nav-order { display: none !important; }
            .dish-row { gap: 8px !important; padding: 12px !important; }
            .dish-row-controls { width: 100%; justify-content: flex-end; gap: 4px !important; }
            .bottom-nav { display: flex !important; }
            body { padding-bottom: 56px; }
        }
        :focus-visible { outline: 2px solid #FF5E14; outline-offset: 2px; border-radius: 4px; }
        @keyframes badge-pulse { 0%{transform:scale(1)}50%{transform:scale(1.35)}100%{transform:scale(1)} }
        @keyframes toast-in { 0%{opacity:0;transform:translateY(-12px) scale(0.95)}100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes heart-pop { 0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)} }
        @keyframes click-pop { 0%{transform:scale(1)}50%{transform:scale(0.93)}100%{transform:scale(1)} }
        @keyframes tagline-in { 0%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)} }
        @keyframes price-flash { 0%{transform:scale(1)}30%{transform:scale(1.2); color:#FFC846}100%{transform:scale(1)} }
        @keyframes float { 0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)} }
        @keyframes fade-up { 0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)} }
        @keyframes letter-in { 0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)} }
        .input-focus:focus-within { border-color: #FF5E14 !important; box-shadow: 0 0 0 3px rgba(255,94,20,0.15) !important; }
        .checkout-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 32px; align-items: start; }
        .checkout-details { position: sticky; top: 90px; }
        @media (max-width: 900px) {
            .checkout-grid { grid-template-columns: 1fr; }
            .checkout-details { position: static; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
                {splash && <SplashScreen onDismiss={() => setSplash(false)} />}
                {showDashboard ? (
                    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "rgba(200,184,154,0.6)", fontFamily: "'Inter',sans-serif" }}>Loading dashboard...</div>}><AdminDashboard onClose={() => setShowDashboard(false)} onAdminOpen={setShowAdmin} /></Suspense>
                ) : (
                    <>
                <Nav onAdminOpen={setShowAdmin} onDashboardOpen={setShowDashboard} />
                <Hero />
                <HowItWorks />
                <Menu />
                <StatsBanner />
                <FeaturedDishes />
                <Features />
                <Testimonials />
                <Footer onSupport={() => setShowSupport(true)} />
                <CheckoutView />
                <BackToTop />
                <ScrollProgress />
                <BottomNav />
                {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
                {showAdmin && <Suspense fallback={null}><AdminPanel onClose={() => setShowAdmin(false)} initialTab={showAdmin} /></Suspense>}
                {showPin && <AdminPinModal onClose={() => setShowPin(false)} onUnlock={() => { setShowPin(false); setShowAdmin("dashboard"); }} />}
                    </>
                )}
            </FavProvider>
        </CartProvider>
        </ToastProvider>
        </DishesProvider>
        </AuthProvider>
    );
}
