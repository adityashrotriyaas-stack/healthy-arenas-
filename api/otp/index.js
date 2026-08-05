export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { supabase } = await import("../_lib/supabase.js");
    const { action, phone, otp } = req.body;
    const normalized = phone?.replace(/\D/g, "");

    if (!normalized || normalized.length < 10)
        return res.status(400).json({ error: "Invalid phone number" });

    if (action === "send") {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await supabase.from("otps").upsert(
            { phone: normalized, otp: code, expires_at: expiresAt, verified: false },
            { onConflict: "phone" }
        );

        try {
            const twilioSid = process.env.TWILIO_SID;
            const twilioToken = process.env.TWILIO_AUTH_TOKEN;
            if (twilioSid && twilioToken) {
                const acct = twilioSid;
                const { default: Twilio } = await import("twilio");
                const client = new Twilio(twilioSid, twilioToken);
                await client.messages.create({
                    body: `Your Healthy Arena's verification code: ${code}`,
                    from: process.env.TWILIO_PHONE,
                    to: `+${normalized}`,
                });
            } else {
                console.log(`[OTP] ${normalized} → ${code}`);
            }
        } catch (e) {
            console.log(`[OTP] SMS failed, using fallback. ${normalized} → ${code}`);
        }

        return res.json({ success: true });
    }

    if (action === "verify") {
        if (!otp) return res.status(400).json({ error: "OTP is required" });

        const { data, error } = await supabase
            .from("otps")
            .select("*")
            .eq("phone", normalized)
            .single();

        if (error || !data)
            return res.status(400).json({ error: "No OTP sent to this number" });
        if (data.verified)
            return res.json({ success: true, message: "Already verified" });
        if (new Date(data.expires_at) < new Date())
            return res.status(400).json({ error: "OTP expired" });
        if (data.otp !== otp)
            return res.status(400).json({ error: "Invalid OTP" });

        await supabase.from("otps").update({ verified: true }).eq("phone", normalized);

        return res.json({ success: true });
    }

    res.status(400).json({ error: "Unknown action" });
}
