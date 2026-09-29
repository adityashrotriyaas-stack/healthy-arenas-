# Task 6: Create client-side push module

## Status: DONE

## Files Created/Modified

| File | Action |
|------|--------|
| `src/lib/push.js` | Created |
| `.env` | Modified (added `VITE_VAPID_PUBLIC_KEY`) |
| `.env.example` | Modified (added `VITE_VAPID_PUBLIC_KEY` placeholder) |

## What was done

- Created `src/lib/push.js` exporting `subscribePush()` and `unsubscribePush()`
- `subscribePush`: requests notification permission, registers `/sw.js`, subscribes to push with VAPID key, sends subscription to `POST /api/push`
- `unsubscribePush`: gets current subscription, unsubscribes, sends `DELETE /api/push` with endpoint
- Added `VITE_VAPID_PUBLIC_KEY` to both `.env` (with real key) and `.env.example` (placeholder)

## Concerns

None. Straightforward file creation per plan spec.

## Verification

- `src/lib/push.js` exists and exports both functions
- `.env.example` includes `VITE_VAPID_PUBLIC_KEY=your-vapid-public-key`
- `.env` includes `VITE_VAPID_PUBLIC_KEY` with the actual key
