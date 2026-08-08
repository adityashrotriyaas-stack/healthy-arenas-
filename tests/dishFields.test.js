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