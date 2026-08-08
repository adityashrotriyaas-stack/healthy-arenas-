# Task 1 Report: Dish API sanitization

## Status: DONE_WITH_CONCERNS

## What was implemented
- Created `api/_lib/dishFields.js` — exports `DISH_FIELDS` and `sanitizeDish(obj)`, which picks only whitelisted schema fields (name, price, category, rating, time, tag, veg, image_url, available) and keeps `id` when present, dropping extras like `prices`/`description`/`initial`/`color`.
- Rewired POST/PUT in `api/dishes/index.js` to run `sanitizeDish(parseBody(req))` before validation/insert/update. Added `const { sanitizeDish } = await import("../_lib/dishFields.js");` next to the existing dynamic imports. GET/DELETE left as-is.
- Wrote `tests/dishFields.test.js` (2 tests, verbatim from the brief).
- Added `test` script to `package.json`.

## Test output (failing run, TDD step 2)
Ran `node --test tests/dishFields.test.js` before implementing — failed as expected:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'C:\healthy-areans\api\_lib\dishFields.js' imported from C:\healthy-areans\tests\dishFields.test.js
...
✖ fail 1
```

## Test output (after implementation)
```
> node --test "tests/**/*.test.js"

✔ sanitizeDish drops non-schema fields (1.1511ms)
✔ sanitizeDish keeps id when present (0.1175ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 84.0944
```

## Build output
```
> vite build

vite v6.4.3 building for production...
transforming...
✓ 35 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                         0.34 kB │ gzip: 0.25 kB
dist/assets/StatusBadge-EJCYOtgC.js     0.40 kB │ gzip: 0.30 kB
dist/assets/AdminDashboard-biShjvPH.js  7.48 kB │ gzip: 2.31 kB
dist/assets/AdminPanel-B9pz8RDz.js     20.54 kB │ gzip: 4.60 kB
dist/assets/index-D4XPeko6.js         254.53 kB │ gzip: 69.75 kB
✓ built in 828ms
```

## Commit
- Hash: `365ef95`
- Message: `fix: whitelist dish fields on POST/PUT so edits save`
- Files: api/_lib/dishFields.js, api/dishes/index.js, tests/dishFields.test.js, package.json (4 files changed, 40 insertions, 8 deletions)

## Concern (minor deviation from brief)
The brief's exact test script `node --test tests/` fails on Node v24.16.0 on Windows (treats the directory as a module entry point: `Cannot find module 'C:\healthy-areans\tests'`). Used `node --test "tests/**/*.test.js"` instead, which passes. If the brief's exact script is mandated, the script needs the glob form or explicit file list.