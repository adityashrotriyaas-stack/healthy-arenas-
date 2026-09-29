# Task 4: Create push API endpoint

## Status: DONE

## What was done
- Created `api/push/index.js` with:
  - Default export `handler` — POST stores subscriptions, DELETE removes them (admin-only via `isAdmin`)
  - Named export `sendPushToAll(supabase, payload)` — sends push to all stored subscriptions, cleans up dead endpoints (404/410)
- Imports match existing patterns: `import("../_lib/supabase.js")`, `import("../_lib/admin.js")`

## Concerns
- None. Code matches the plan exactly.

## Files created/modified
- Created: `api/push/index.js`

## Next steps (not done in this task)
- Task 5: Hook order creation to call `sendPushToAll`
