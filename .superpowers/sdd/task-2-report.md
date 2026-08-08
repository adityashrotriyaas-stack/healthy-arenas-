# Task 2 Report: Remove dead categories API + load menu from DB on boot

## Status: DONE

## Changes

### `src/api/client.js`
- Deleted the unused `categoriesApi` export block (lines 49-53).

### `src/lib/contexts.jsx`
- Added `useEffect(() => { loadFromApi(); }, [loadFromApi]);` inside `DishesProvider` (line 69), so the menu is auto-loaded from `dishesApi.list()` on mount, writing to localStorage + bumping `version`. Customer menu (`getDishes()`) now sees DB dishes after boot.
- Per dispatcher instruction, kept the existing `loadFromApi` function body untouched (no duplication) and kept it in the exported context value.

## Deviations from brief
- Brief suggested inlining the fetch into the effect and dropping `loadFromApi`; instead reused the existing `loadFromApi` (contexts.jsx:60-68) with a one-line mount effect — smallest diff, satisfies "load from DB on boot". `useEffect` was already imported.

## Verification
- `npm run build`: PASS (vite v6.4.3, 35 modules, built in 742ms)
- Grep for `categoriesApi` in `src/`: no matches
- Commit: `6351e2c` — "fix: menu loads from DB on boot, drop dead categories API"