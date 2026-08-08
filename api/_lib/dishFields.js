const DISH_FIELDS = ["name", "price", "category", "rating", "time", "tag", "veg", "image_url", "available"];
export function sanitizeDish(obj) {
    const out = {};
    for (const f of DISH_FIELDS) if (obj[f] !== undefined) out[f] = obj[f];
    if (obj.id !== undefined) out.id = obj.id;
    return out;
}