export default async function handler(req, res) {
    const { supabase } = await import("../_lib/supabase.js");
    const { isAdmin } = await import("../_lib/admin.js");
    const { sanitizeDish } = await import("../_lib/dishFields.js");

    if (req.method === "GET") {
        const { data, error } = await supabase.from("dishes").select("*").order("id");
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ dishes: data });
    }

    const adminOk = isAdmin(req);
    if (!adminOk) return res.status(403).json({ error: "Admin only" });

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

    if (req.method === "DELETE") {
        const { parseBody } = await import("../_lib/body.js");
        const { id } = parseBody(req);
        if (!id) return res.status(400).json({ error: "Missing id" });
        const { error } = await supabase.from("dishes").delete().eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    res.status(405).json({ error: "Method not allowed" });
}
