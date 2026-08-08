# Secret Admin Entry — Implementation Report

## What changed (src/App.jsx)

1. **Logo 5-tap secret entry**: added `useSecretTap(onSecret)` hook (module scope) — a ref counting taps within a 2s rolling window; on the 5th tap it calls `onSecret` and resets. Wired into `Nav` via new `onAdminPin` prop; attached to the always-visible header brand mark (HA box + wordmark, present for all visitors).

2. **Removed visible admin entries**:
   - Nav desktop: "Admin Panel" pill, dropdown "Admin Panel" item, and "Admin" button (logged-out desktop header).
   - Nav mobile menu: "Admin" button (logged-out) — the ternary became a plain `user &&` sign-out button.
   - BottomNav profile sheet: "Admin Panel" button (admin) and "Admin access" button (guest).
   - `onAdminOpen` prop removed from `Nav` signature and App usage.
   - Profile dropdown header and `● Admin` badge kept (harmless staff-only info).
   - Sign out flow untouched (dropdown, mobile menu, profile sheet all still log out).

3. **Console globals removed**: `window.__openAdmin` / `window.__openPin` assignment + cleanup effect deleted from `App()`. Grep confirms zero `__open` references remain in src/ (only unrelated `__setDiet`, `__toggleDropdown` remain).

4. **Unlock gate unchanged**: `AdminPinModal` kept exactly as-is; `showPin`/`showAdmin` state flow unchanged (`onUnlock` still opens the dashboard).

## Verification

- `grep '__open'` in src/: 0 matches.
- `grep 'Admin Panel'` in src/: only PIN modal button text ("Open Admin Panel") — no entry-point buttons.
- `npm run build`: passes (35 modules, ~639ms).

## Staff usage

5 taps on the header logo within 2s (each tap resets the window) → PIN modal → enter 4-digit code → dashboard.
