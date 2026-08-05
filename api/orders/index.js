export default async function handler(req, res) {
    const { supabase } = await import("../_lib/supabase.js");
    const { isAdmin } = await import("../_lib/admin.js");

    if (req.method === "GET") {
        const { userId, all } = req.query;
        if (all) {
            const requesterId = req.headers["x-user-id"];
            if (!(await isAdmin(requesterId))) return res.status(403).json({ error: "Admin only" });
        }
        let query = supabase.from("orders").select("*").order("created_at", { ascending: false });
        if (!all && userId) query = query.eq("user_id", userId);
        const { data, error } = await query;
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ orders: data });
    }

    if (req.method === "POST") {
        const { user_id, items, total, address, phone, payment } = req.body;
        if (!items || !total) return res.status(400).json({ error: "Missing required fields" });

        let payment_status = "pending";
        let payment_id = null;
        if (payment?.payment_id) {
            const crypto = await import("crypto");
            const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(payment.order_id + "|" + payment.payment_id)
                .digest("hex");
            if (expected !== payment.razorpay_signature)
                return res.status(400).json({ error: "Invalid payment signature" });
            payment_status = "paid";
            payment_id = payment.payment_id;
        }

        const { data, error } = await supabase.from("orders").insert({
            user_id, items, total, status: "confirmed",
            payment_id, payment_status,
            address, phone,
        }).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ order: data });
    }

    if (req.method === "PUT") {
        const { id, status } = req.body;
        if (!id || !status) return res.status(400).json({ error: "Missing id or status" });
        const userId = req.headers["x-user-id"];
        if (!(await isAdmin(userId))) return res.status(403).json({ error: "Admin only" });
        const { data, error } = await supabase.from("orders").update({ status }).eq("id", id).select().single();
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ order: data });
    }

    res.status(405).json({ error: "Method not allowed" });
}