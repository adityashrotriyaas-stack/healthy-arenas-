// api/push/index.js — stores push subscriptions and sends Web Push
import webPush from "web-push";

const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@healthyarena.shop";

export default async function handler(req, res) {
    const { supabase } = await import("../_lib/supabase.js");
    const { isAdmin } = await import("../_lib/admin.js");

    // Configure web-push with VAPID keys
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        webPush.setVapidDetails(
            VAPID_EMAIL,
            process.env.VAPID_PUBLIC_KEY,
            process.env.VAPID_PRIVATE_KEY
        );
    }

    // POST — store a push subscription (admin only)
    if (req.method === "POST") {
        if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
        const { endpoint, p256dh, auth } = req.body || {};
        if (!endpoint || !p256dh || !auth) {
            return res.status(400).json({ error: "Missing subscription fields" });
        }
        const { error } = await supabase
            .from("push_subscriptions")
            .upsert({ endpoint, p256dh, auth }, { onConflict: "endpoint" });
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
    }

    // DELETE — remove a push subscription
    if (req.method === "DELETE") {
        if (!isAdmin(req)) return res.status(403).json({ error: "Admin only" });
        const { endpoint } = req.body || {};
        if (!endpoint) return res.status(400).json({ error: "Missing endpoint" });
        const { error } = await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", endpoint);
        if (error) return res.status(500).json({ error: error.message });
        return res.json({ ok: true });
    }

    res.status(405).json({ error: "Method not allowed" });
}

// Exported helper: send push to all stored subscriptions
// Called from api/orders/index.js after order creation
export async function sendPushToAll(supabase, payload) {
    if (!process.env.VAPID_PRIVATE_KEY) return; // VAPID not configured
    const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth");
    if (!subs?.length) return;

    const deadEndpoints = [];
    const results = await Promise.allSettled(
        subs.map(async (sub) => {
            try {
                await webPush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                    JSON.stringify(payload)
                );
            } catch (err) {
                // 404/410 = subscription expired, collect for cleanup
                if (err.statusCode === 404 || err.statusCode === 410) {
                    deadEndpoints.push(sub.endpoint);
                }
            }
        })
    );

    // Clean up dead subscriptions
    if (deadEndpoints.length) {
        await supabase
            .from("push_subscriptions")
            .delete()
            .in("endpoint", deadEndpoints);
    }
}
