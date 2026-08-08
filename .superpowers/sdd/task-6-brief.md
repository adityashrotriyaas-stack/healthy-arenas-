
## Task 6: Orders tab — real status updates, retry, phone/maps

**Files:**
- Modify: `src/components/AdminPanel.jsx` (orders tab)

**Interfaces:**
- Consumes: `ordersApi.list(null,true)`, `ordersApi.updateStatus(id, status)`; `StatusBadge`.
- Produces: order list with status-filter chips, next-step button, error/empty states.

- [ ] **Step 1: Add refetch + error retry**

`fetchOrders` catch → `setOrderErr("Couldn't load orders")`. UI: when `orderErr`, render message + Retry button (calls fetchOrders). Add a "Refresh" icon button next to filter chips always.

- [ ] **Step 2: Status buttons per order — replace flat pill-strips**

Keep filter chips; per order, show current StatusBadge + exactly one primary action button that advances; plus Cancel when status not in (`delivered`/`cancelled`):

```js
const NEXT = { pending: "confirmed", confirmed: "preparing", preparing: "delivering", delivering: "delivered" };
// button: onClick={() => updateOrderStatus(o.id, NEXT[o.status] || ...)} label `→ ${NEXT[o.status] || "delivered"}`
```

Cancel button separate with red tint (reuse lines 399-403 pattern).

- [ ] **Step 3: Phone + address links, items expandable**

Wrap phone in `tel:` link and address in `maps:` link (as today lines 406-414, keep). Items list: keep joined as today. (No new behavior needed; page still foldable.)

- [ ] **Step 4: Run build**

`npm run build` passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/AdminPanel.jsx
git commit -m "feat: orders tab next-step status, retry, refresh"
```

---
