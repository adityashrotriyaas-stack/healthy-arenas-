### Task 1: Dish API sanitization (fixes "edit dish won't save")

**Files:**
- Create: `api/_lib/dishFields.js`
- Modify: `api/dishes/index.js:14-33`
- Test: `tests/dishFields.test.js`
- Modify: `package.json` (add test script)

**Interfaces:**
- Consumes: nothing
- Produces: `DISH_FIELDS` (array), `sanitizeDish(obj)` → picks only known fields; exported from `api/_lib/dishFields.js`. Later tasks rely on the PUT/POST handlers using it.

- [ ] **Step 1: Write the failing test**

```js
// tests/dishFields.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeDish } from "../api/_lib/dishFields.js";

test("sanitizeDish drops non-schema fields", () => {
    const out = sanitizeDish({
        name: "Paneer Wrap", price: "₹120", category: "Rolls",
        rating: 4.5, time: "12 min", tag: "", veg: true,
        image_url: "", available: false,
        prices: { half: "70", full: "140" }, description: "yum", initial: "P", color: "#fff",
    });
    assert.deepEqual(out, {
        name: "Paneer Wrap", price: "₹120", category: "Rolls",
        rating: 4.5, time: "12 min", tag: "", veg: true,
        image_url: "", available: false,
    });
    assert.equal("description" in out, false);
    assert.equal("initial" in out, false);
});

test("sanitizeDish keeps id when present", () => {
    const out = sanitizeDish({ id: 7, name: "X", price: "1", category: "C" });
    assert.equal(out.id, 7);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/dishFields.test.js`
Expected: FAIL — `api/_lib/dishFields.js` cannot be imported (ERR_MODULE_NOT_FOUND).

- [ ] **Step 3: Implement the sanitizer**

```js
// api/_lib/dishFields.js
const DISH_FIELDS = ["name", "price", "category", "rating", "time", "tag", "veg", "image_url", "available"];
export function sanitizeDish(obj) {
    const out = {};
    for (const f of DISH_FIELDS) if (obj[f] !== undefined) out[f] = obj[f];
    if (obj.id !== undefined) out.id = obj.id;
    return out;
}
```

- [ ] **Step 4: Add test script to package.json**

```jsonc
// package.json scripts
"test": "node --test tests/"
```

- [ ] **Step 5: Run test to verify passes**

Run: `npm test`
Expected: 2 passing.

- [ ] **Step 6: Rewire POST and PUT in api/dishes/index.js to use the sanitizer**

Replace lines 14-33 (`POST`/`PUT` blocks) with:

```js
if (req.method === "POST") {
    const { parseBody } = await import("../_lib/body.js");
    const fields = sanitizeDish(parseBody(req));
    if (!fields.name || !fields.price || !fields.category) return res.status(400).json({ error: "Missing required fields" });
    const dish = { ...fields, rating: fields.rating, time: fields.time || "10 min", tag: fields.tag || "", veg: fields.veg !== false, image_url: fields.image_url || "", available: fields.available !== undefined ? fields.available : true };
    const { data, error } = await supabase.from("dishes").insert(dish).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ dish: data });
}

if (req.method === "PUT") {
    const { parseBody } = await import("../_lib/body.js");
    const fields = sanitizeDish(parseBody(req));
    if (!fields.id) return res.status(400).json({ error: "Missing id" });
    const { id, ...updates } = fields;
    const { data, error } = await supabase.from("dishes").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ dish: data });
}
```

Add import at top of `api/dishes/index.js` after the existing isAdmin import:

```js
const { sanitizeDish } = await import("../_lib/dishFields.js");
```

Also update the GET response — leave as-is.

- [ ] **Step 7: Verify build + tests**

Run: `npm test` and `npm run build`
Expected: tests pass; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add api/_lib/dishFields.js api/dishes/index.js tests/dishFields.test.js package.json
git commit -m "fix: whitelist dish fields on POST/PUT so edits save"
```


