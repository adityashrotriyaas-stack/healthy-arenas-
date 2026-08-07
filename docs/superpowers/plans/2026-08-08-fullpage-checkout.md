# Full-page Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the narrow `CartDrawer` with a full-page, two-column checkout view (orders + delivery details), model Swadu Cafe's checkout, and remove the legacy `#order` flow.

**Architecture:** One new `CheckoutView` component in `src/App.jsx` renders as a fixed full-screen overlay when the cart context's `drawerOpen` is true (same flag the header Cart pill and bottom-nav Cart already set). It contains an inline `AddressAutocomplete` (Nomantine debounced autocomplete). The legacy `OrderCTA`/`#order` section, `FloatingOrderBtn`, and the `openRazorpay` import are deleted. `checkLocation()`, `STORE`, and the COD-only `ordersApi.create` path are reused unchanged.

**Tech Stack:** React (Vite SPA), inline styles + existing CSS string in `src/App.jsx`, Nominatim OSM autocomplete (fetch), existing Supabase orders API via `ordersApi`.

## Global Constraints

- No new dependencies (fetch + setTimeout debounce only).
- No Google Places, no billing keys.
- Payment is COD only — no Razorpay UI anywhere in the app.
- All changes stay in `src/App.jsx`, `src/lib/contexts.jsx` (only if needed), and the existing `<style>` block in `App.jsx`.
- Reuse existing helpers: `checkLocation()` (App.jsx:224), `STORE` (App.jsx:222), `ordersApi.create`, `useCart`, `useToast`, `Icon`, color object `C`.
- Keep cart contents after an order (no auto-clear).
- Build gate: `npm run build` must pass after each task.

---

### Task 1: Add CheckoutView + AddressAutocomplete, render it in place of CartDrawer

**Files:**
- Modify: `src/App.jsx` — replace the `CartDrawer` function (currently lines ~399–532) with `AddressAutocomplete` + `CheckoutView`; update the `openRazorpay` import if OrderCTA deletion leaves it unused (do that in Task 2); replace the `<CartDrawer />` mount (line ~2112) with `<CheckoutView />`; delete `FloatingOrderBtn` (lines ~576–598) and its render (line ~2115).

**Interfaces:**
- Consumes: `useCart()` → `{ items, add, remove, count, total, drawerOpen, setDrawerOpen }`; `useToast()` → `{ toast }`; `checkLocation()` → `{lat, lon, source}` | null; `ordersApi.create({items, total, address, phone, payment})`.
- Produces: `CheckoutView` — reads `drawerOpen`; renders null when closed; full-screen when open. No new exports.

- [ ] **Step 1: Replace the `CartDrawer` function block**

Replace everything from `function CartDrawer() {` through the closing `}` at line ~532 with:

```jsx
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
            if (!pos) { toast("Couldn't fetch location — please type your address", "info"); return; }
            setLoc(pos);
            setAddress(`${pos.source === "ip" ? "≈ " : "✓ "}Location captured (${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)})`);
            toast(pos.source === "ip" ? "Approximate location captured (IP-based)" : "Current location captured", "success");
        } finally { setGettingLoc(false); }
    };

    const placeOrder = async () => {
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
                                        <Icon name={ic} size={14} /> {l}
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
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.creamDim }}>Delivery</span>
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
```

- [ ] **Step 2: Wire the render and remove FloatingOrderBtn**

- Replace the `<CartDrawer />` line (~2112) with `<CheckoutView />`.
- Delete the `FloatingOrderBtn` function (`function FloatingOrderBtn() { ... }`, lines ~576–598) entirely.
- Remove `<FloatingOrderBtn />` from the JSX tree (line ~2115).
- Remove the `.floating-order { display: flex !important; }` declaration at ~2066 (it's inside the `@media (max-width: 640px)` block).

- [ ] **Step 3: Add checkout grid CSS rules**

Inside the existing `<style>` block in `App()`, append these rules (near the other media queries):

```jsx
.checkout-grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 32px; align-items: start; }
.checkout-details { position: sticky; top: 90px; }
@media (max-width: 900px) {
    .checkout-grid { grid-template-columns: 1fr; }
    .checkout-details { position: static; }
}
```

- [ ] **Step 4: Build verify**

Run: `npm run build`
Expected: no errors, `✓ built in ...`.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: full-page checkout view with address autocomplete"
```

---

### Task 2: Delete legacy #order flow, FloatingOrderBtn leftovers, and openRazorpay import

**Files:**
- Modify: `src/App.jsx` — delete the `OrderCTA` function (lines ~1555–1882, includes the `##` order section, payment methods, and feedback block), remove the `<section id="order">` mount. Delete `SLOTS` constant (line ~1508). Remove `openRazorpay` from the import (line 5). Verify nothing else calls `getDistance`/`checkLocation` only for order flows — keep both (Hero still uses them).

**Interfaces:**
- Consumes: nothing new. Produces: no orphan references to `#order`.

- [ ] **Step 1: Remove the OrderCTA function and SLOTS**

Delete `const SLOTS = [...]` (line ~1508) and the entire `function OrderCTA() { ... }` block (lines ~1555–1825).

- [ ] **Step 2: Remove the mount**

Delete `<OrderCTA />` from the tree (line ~2109).

- [ ] **Step 3: Remove the openRazorpay import**

Change line 5 from:
`import { dishesApi, ordersApi, openRazorpay } from "./api/client";`
to:
`import { dishesApi, ordersApi } from "./api/client";`

- [ ] **Step 4: Grep for orphans**

Run: `rg "OrderCTA|SLOTS|openRazorpay|id=\"order\"" src/`
Expected: zero matches in `src/App.jsx`.

- [ ] **Step 5: Build verify**

Run: `npm run build`
Expected: `✓ built` with no warnings about unused imports.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: remove legacy #order flow and online payment UI"
```

---

## Post-plan manual smoke test (localhost, both tasks done)

Start backend (`vercel dev --listen 3131`) + frontend (`npm run dev`). Verify:
1. Header **Cart** pill and bottom-nav Cart open the new full-page checkout (no slide drawer).
2. Delivery/Pickup toggle works; Pickup hides address block.
3. Typing ≥3 chars in address shows Nominatim suggestions; clicking fills the field.
4. "Use Current Location" attaches coords and shows the GPS/IP toast.
5. Empty cart shows the empty state via checkout.
6. Valid phone + address places order → toast, returns to menu; order appears in AdminPanel Orders (with maps link when coords attached).
7. No "Find Food" overflow; footer & admin panel unchanged; no `#order` section anywhere.