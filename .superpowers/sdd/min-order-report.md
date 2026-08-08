# Min-Order Report: ₹200 minimum order value

## Task
Add a ₹200 minimum order value to the café SPA checkout in `src/App.jsx`.

## Changes (commit `230bfed`, only `src/App.jsx` modified)

1. **Constant** — `const MIN_ORDER = 200;` at module scope, immediately before `CheckoutView` (`src/App.jsx:437`).

2. **Checkout guard** — in `placeOrder`, after the existing address/phone validations and before any API call (`src/App.jsx:470`):
   ```js
   if (total < MIN_ORDER) { toast(`Minimum order is ₹${MIN_ORDER}`, "info"); return; }
   ```

3. **Visible hint** — in the checkout summary column, between the Total row and the Place Order button (`src/App.jsx:582-585`), shown only when `total < MIN_ORDER`:
   `Minimum order ₹200 — add ₹X more` where X = `(MIN_ORDER - total).toLocaleString()`; styled per app conventions (Inter, 12px, `C.amber`, centered).

4. **Disabled button** — Place Order button now `disabled={checkingOut || total < MIN_ORDER}` with the existing dimmed style (`rgba(232,89,12,0.5)` background, `default` cursor) applied when below minimum.

## Other cart-total surfaces checked

- Customer-facing total displays exist only inside `CheckoutView`: Total row (`App.jsx:577`), button label (`:581`), Subtotal row (`:605`). The nav cart button shows only a count badge; the bottom nav cart entry (`:1649`) shows only the count. Checkout is the single gate — no other hint added.

## Verification

- `npm run build` — passed (vite build, 35 modules, ~721ms)
- `npm test` — 5/5 passing (unrelated lib tests; no UI test infra for this change)
- `git status` clean for `src/App.jsx`

## Concerns

- None. Button is disabled when below minimum (so the toast guard is a defense-in-depth backstop, not the primary UX — the hint tells the customer why).
