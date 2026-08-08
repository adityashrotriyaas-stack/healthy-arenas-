# Live Order Polling + New-Order Alerts — Report

## What was built

All changes in `src/components/AdminPanel.jsx` only.

### 1. Polling
- New `useEffect` (line ~53) with `setInterval(fetchOrders, 20000)`; `clearInterval` on unmount. Panel mounts only when open, so polling runs only while the admin panel is open.

### 2. New-order alert
- `lastIdRef` (`useRef(null)`) added. On the first successful fetch it is only initialized to the current max order id (no alert). On later fetches, if `max > lastIdRef.current` → alert fires once per poll (multiple new orders in one poll = one alert), then ref updates.
- `notifyNewOrder()` fires three things:
  - `toast("New order received!", "success")` — plain text; grep confirmed no emoji is used in any existing toast in the codebase.
  - `navigator.vibrate([120, 60, 120, 60, 240])` guarded by `if (navigator.vibrate)` + try/catch (iOS silently no-ops).
  - `playDing()` — module-level helper with a lazily-created singleton `AudioContext` (reused across alerts). Two-tone sine ding: 880Hz then 660Hz, 150ms each, 0.15 gain with exponential attack/decay envelope. All in try/catch — autoplay policy or AudioContext unavailability never breaks the order flow.

### 3. Tab-switch refetch
- The NAV_TABS button `onClick` (line ~497) now also calls `fetchOrders()` on every tab change — simpler and correct: always-refetch means fresh data whenever the user lands on Orders, and the alert logic still guards against duplicate notifications (ref only bumps on genuinely larger ids).

## Edge cases handled
- Empty orders list on first load → ref initialized to 0, so the first real order still alerts.
- `data.orders` null-guarded (`|| []`).
- Poll interval closure uses only stable values (setters, ref, toast), so the mount-time closure stays fresh without dependency churn.

## Verification
- `npm run build` passes (vite v6.4.3, built in ~650ms).
- Not run manually (no browser), but the logic is trivial state comparison.

## Files changed
- `src/components/AdminPanel.jsx` (only file)
