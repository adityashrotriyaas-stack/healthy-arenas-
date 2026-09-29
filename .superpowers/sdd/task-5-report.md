# Task 5: Hook order creation to send push

**Status:** DONE

## Changes

**File:** `api/orders/index.js`

Added non-blocking push notification after successful order insert (lines 48-56):

- Dynamically imports `sendPushToAll` from `../push/index.js`
- Builds payload with title "New Order!", body with ₹amount and first 3 item names
- Tag: "new-order", url: "/" — matches service worker behavior
- Uses `.catch(() => {})` to swallow errors — order creation is never blocked by push failures

## Verification

- Import path `../push/index.js` resolves correctly to `api/push/index.js` (confirmed file exists)
- Push is non-blocking: `sendPushToAll` is called without `await`, errors caught silently
- No commit made per task instructions

## Concerns

None — matches plan spec exactly.
