# Full-page Checkout — Design

Date: 2026-08-08
Status: Approved by user (design gate passed)

## Objective

Replace the narrow slide-in `CartDrawer` with a full-page, two-column checkout
view modelled on the Swadu Cafe (UrbanPiper) checkout: a prominent
Delivery/Pickup toggle, address autocomplete with a "use current location"
button, and an order-details layout. Payment stays COD-only.

## Motivation / reference

`https://www.swaducafe.com/checkout/` is an UrbanPiper React SPA. Checkout
flow pillars: Delivery vs Pickup selection, customer address picker
(autocomplete + "Use your current location"), contact details, order summary
beside the entry fields, and payment-method selection. We replicate the
structure without UrbanPiper or Google billing: autocomplete comes from
free OpenStreetMap (Nominatim).

## Current state (removed/replaced)

- `CartDrawer` component in `src/App.jsx` — fixed right drawer (z-index 400/401),
  items + address + phone + total + COD button stacked in a 380px panel.
- `FloatingOrderBtn` — floating "Order Now" bubble.
- Hero "Order Now" scrolls to `<section id="order">`.

These are superseded by the checkout view.

## New view: CheckoutView

**Navigation model (in-app view swap, no URL routing).**
- `App` state: `view` in `"menu" | "checkout"`.
- Header **Cart** pill toggles `view === "checkout"`. Hero "Order Now" CTA sets
  `view = "checkout"`. `FloatingOrderBtn` and `CartDrawer` removed.
- CheckoutView has a `← Back to menu` control that returns home.
- Cart empty state renders an empty-cart screen inside checkout ("Add some dishes…").

**Layout (desktop: two columns; mobile: stacked).**
- Left (max ~56%): **Your order** — item rows (name, ₹price, qty stepper[+/-], item
  line total, remove) + bill summary (Subtotal, Delivery fee flat ₹30, Total).
- Right (max ~44%, sticky so Place Order stays reachable): delivery card —
  1. Segmented toggle **Delivery / Pickup**.
  2. If Delivery: **address search** (OSM autocomplete, debounced ≥300ms,
     ≤8 results, keyboard/click selection) + **Use current location** button.
  3. **Mobile number** with +91 prefix.
  4. Total ₹ + **Place Order (COD) · ₹** primary button + caption
     "Online payments coming soon — COD only for now".
- If Pickup: address search hidden; phone + Place Order remain.

**Autocomplete (Nominatim, free, no key).**
- `GET https://nominatim.openstreetmap.org/search?format=json&limit=8&q=…`
  with `Accept-Language: en` and a custom `User-Agent` (ponytail: browser JS
  send the UA automatically; include a `by` only if needed).
- Debounce input 300ms, drop stale in-flight responses (AbortController or
  sequence guard). Show dropdown under the input; click sets address.
- Requires no new dependency (fetch + debounce setTimeout).

**Location (existing `checkLocation()`, unchanged).**
- Browser `navigator.geolocation` with 10s timeout → fallback IP via ipwho.is.
- Success fills the address field with a short coords label and tint; the stored
  order address still gets `📍 maps link` appended on submit (unchanged).

**Data flow (unchanged except view.)**
- `ordersApi.create({ items, total, address, phone, payment:null })` same as today.
- Validation: non-empty address (Delivery), 10-digit phone → toast otherwise.
- Success: toast + navigate back to home (view=`menu`) + clear cart? Keep cart
  intact so repeat order easy — decision: keep cart contents after order until
  user empties.

## Components

- `CheckoutView` (new) — owns checkout state, composes parts below.
- `AddressAutocomplete` (small internal) — input + debounce + Nominatim
  suggestions dropdown + select callback.
- Reuse: `useCart`, `useToast`, `Icon`, `checkLocation`, `ordersApi`, colors `C`.
- `App` — adds `view` state, header Cart pill & hero CTA wiring.

## Error handling

- Nominatim fetch failure → no dropdown, silently fall back to manual typing.
- Geo failure → retain manual address entry; already toast on failure (existing).

## Testing

- `npm run build` passes.
- Manual dev pass (localhost): toggle Delivery/Pickup; autocomplete drop; pick an
  address; wrong drawer gone; place order => toast, return home.

## Out of scope

- No Google Places, no delivery fee/gst calculator, no payment buttons, no
  /checkout URL/hash, no Pickup-hour mode.