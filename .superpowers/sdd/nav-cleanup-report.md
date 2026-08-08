# Nav cleanup report

## Status
COMPLETE

## Commit
`40f0651757550af9b0d85a033303739e46094949` — "fix: remove duplicate admin entry points, keep one Admin Panel"

## Changes (src/App.jsx, +5/-21)
1. AdminPinModal submit button label: "Open Dashboard" → "Open Admin Panel" (line 69).
2. Nav desktop pill: relabeled "Dashboard" → "Admin Panel"; onClick `onDashboardOpen(true)` → `onAdminOpen("dashboard")`; icon/colors unchanged.
3. Nav dropdown: deleted the duplicate "Dashboard" button; kept only "Admin Panel".
4. BottomNav profile sheet: deleted the duplicate "Dashboard" button; kept only "Admin Panel".
5. Removed `onDashboardOpen` from Nav's destructured props and from the App call site (`<Nav onAdminOpen={setShowAdmin} />`).

## Verification
- `grep onDashboardOpen|Open Dashboard|Dashboard` in src/App.jsx: **0 matches**.
- `npm run build`: **passed** — vite v6.4.3, 35 modules transformed, built in 633ms.

## Concerns
None.
