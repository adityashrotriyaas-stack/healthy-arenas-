export default async function handler(req, res) {
    const { supabase } = await import("../_lib/supabase.js");
    const { isAdmin } = await import("../_lib/admin.js");

    if (req.method === "GET") {
        const { data, error } = await supabase.from("dishes").select("*").order("id");
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ dishes: data });
    }

    const userId = req.headers["x-user-id"];
    if (!(await isAdmin(userId))) return res.status(403).json({ error: "Admin only" });

    if (req.method === "POST") {
        const { name, price, category, rating, time, tag, veg, image_url } = req.body;
        if (!name || !price || !category) return res.status(400).json({ error: "Missing required fields" });
        const { data, error } = await supabase.from("dishes").insert({
            name, price, category, rating: rating || 4.5, time: time || "10 min",
            tag: tag || "", veg: veg !== false, image_url: image_url || "",
        }).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ dish: data });
    }

    if (req.method === "PUT") {
        const { id, ...updates } = req.body;
        if (!id) return res.status(400).json({ error: "Missing id" });
        const { data, error } = await supabase.from("dishes").update(updates).eq("id", id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ dish: data });
    }

    if (req.method === "DELETE") {
        const { id } = req.body;
        if (!id) return res.status(400).json({ error: "Missing id" });
        const { error } = await supabase.from("dishes").delete().eq("id", id);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ success: true });
    }

    res.status(405).json({ error: "Method not allowed" });
}
