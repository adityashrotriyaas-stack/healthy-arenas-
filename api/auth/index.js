export default async function handler(req, res) {
    const { supabase } = await import("../_lib/supabase.js");
    const { isAdmin } = await import("../_lib/admin.js");

    if (req.method === "POST") {
        const body = (await import("../_lib/body.js")).parseBody(req);
        const { action, userId, email, name, targetUserId, role } = body;

        if (action === "verify-pin") {
            const ok = isAdmin({ headers: { "x-admin-pin": String(body.pin || "") } });
            if (!ok) return res.status(401).json({ error: "Invalid code" });
            return res.json({ ok: true });
        }

        if (action === "signup") {
            // ponytail: the known admin bootstrap — any signup with this exact email becomes admin. Upgrade to an invite flow if this leaks.
            const isAdmin = email === "admin@healthyarena.com";
            const phone = body.phone || "";
            const { error } = await supabase.from("profiles").insert({
                id: userId, email, name: name || email.split("@")[0], phone,
                role: isAdmin ? "admin" : "user",
            });
            if (error) return res.status(400).json({ error: error.message });
            return res.json({ user: { id: userId, email, name: name || email.split("@")[0], phone, isAdmin } });
        }

        if (action === "get") {
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
            return res.json({
                user: {
                    id: userId, email: profile?.email, name: profile?.name,
                    phone: profile?.phone || null,
                    isAdmin: profile?.role === "admin",
                }
            });
        }

        if (action === "update") {
            const updates = { id: userId, name };
            if (email !== undefined) updates.email = email;
            if (body.phone !== undefined) updates.phone = body.phone;
            const { data } = await supabase.from("profiles").upsert(updates).select().single();
            return res.json({ user: { id: data.id, email: data.email, name: data.name, phone: data.phone, isAdmin: data.role === "admin" } });
        }

        if (action === "list") {
            if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
            const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
            if (error) return res.status(500).json({ error: error.message });
            return res.json({ users: data });
        }

        if (action === "phone-auth") {
            const phone = body.phone?.replace(/\D/g, "");
            if (!phone || phone.length < 10)
                return res.status(400).json({ error: "Invalid phone number" });

            const { data: existing } = await supabase
                .from("profiles").select("*").eq("phone", phone).maybeSingle();

            if (existing) {
                return res.json({
                    user: {
                        id: existing.id, name: existing.name, phone: existing.phone,
                        isAdmin: existing.role === "admin",
                    }
                });
            }

            const userId = body.userId;
            if (!userId) return res.status(400).json({ error: "Not authenticated" });
            const name = body.name || "User";
            const { error } = await supabase.from("profiles").insert({
                id: userId, phone, name, role: "user",
            });
            if (error) return res.status(400).json({ error: error.message });
            return res.json({
                user: { id: userId, name, phone, isAdmin: false }
            });
        }

        if (action === "updateRole") {
            if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
            const { data, error } = await supabase.from("profiles").update({ role }).eq("id", targetUserId).select().single();
            if (error) return res.status(500).json({ error: error.message });
            return res.json({ user: data });
        }
    }

    res.status(405).json({ error: "Method not allowed" });
}
