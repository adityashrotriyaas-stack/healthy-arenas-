# Task 7: Wire push into App.jsx — Report

## Status: DONE

## Changes Made

**File:** `src/App.jsx`

1. **Line 8** — Added import:
   ```js
   import { subscribePush, unsubscribePush } from "./lib/push";
   ```

2. **Line 27** (AdminPinModal `submit` try block) — Added fire-and-forget `subscribePush()` after successful unlock, before `onUnlock?.()`:
   ```js
   subscribePush();
   ```

3. **Line 914** (Nav desktop dropdown "Sign out" button) — Added `unsubscribePush()` before `logout()`:
   ```js
   onClick={() => { unsubscribePush(); logout(); setShowDropdown(false); }}
   ```

4. **Line 984** (Nav mobile menu "Sign out" button) — Added `unsubscribePush()` before `logout()`:
   ```js
   onClick={() => { unsubscribePush(); logout(); setMenuOpen(false); }}
   ```

## Notes

- `subscribePush()` is fire-and-forget — no await, no error handling (push.js handles its own errors internally).
- `unsubscribePush()` is called before `logout()` in both desktop and mobile sign-out paths.
- No commit made per task instructions.
