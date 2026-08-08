# Pill Fix Report — AdminPanel.jsx

Commit: `4b6b13a` — "fix: availability toggle persists; tel link; chip wrap"
Status: DONE

## Changes (only src/components/AdminPanel.jsx)

1. **Availability toggle persists (review finding)** — Extracted `persistDish(dish)` (API update/create + `saveDishes` to localStorage + toasts, returns success bool) from `saveDishRow`, which now just calls it. New `toggleAvailability(i)`:
   - Unsaved new row (no id): updates local state only (mirrors `deleteDish` behavior for unsaved rows).
   - Saved row: optimistic local flip, then `persistDish`; `toast("Saved!", "success")` on success, `toast("Save failed", "info")` on failure.
   - Double-tap guard: reuses the existing `saving` flag; toggle button `disabled={saving}` with dimmed style.

2. **Tap-to-call** — Order card phone (`o.phone`) wrapped in `<a href={`tel:${o.phone}`}>`, styled like the nearby Google Maps link (orange, underline, 11px, 600).

3. **Chip wrap** — Order filter chip container got `flexWrap: "wrap"` so chips wrap on narrow phones.

## Verification

- `npm run build`: PASS (35 modules, built in 713ms).
- `npm test`: PASS — 5/5 tests.
- No other files changed.

## Concerns

- None. `persistDish` reads `dishes` from closure (same as original `saveDishRow`); the id/reference-based merge in `setDishes` stays correct across the optimistic update.
