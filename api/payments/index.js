import Razorpay from "razorpay";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { body } = await import("../_lib/body.js");
    const b = body(req);
    const { action } = b;

    if (action === "create-order") {
        const amount = Number(b.amount);
        if (!Number.isFinite(amount) || amount < 1)
            return res.status(400).json({ error: "Invalid amount (min ₹1)" });
        try {
            const order = await razorpay.orders.create({
                amount: Math.round(amount * 100), // paise
                currency: b.currency || "INR",
                receipt: "order_" + Date.now(),
            });
            return res.json({
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID,
            });
        } catch (e) {
            return res.status(500).json({ error: "Failed to create payment order" });
        }
    }

    if (action === "verify") {
        const { order_id, payment_id, razorpay_signature } = b;
        if (!order_id || !payment_id || !razorpay_signature)
            return res.status(400).json({ error: "Missing payment details" });
        try {
            const crypto = await import("crypto");
            const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(order_id + "|" + payment_id)
                .digest("hex");
            if (expected === razorpay_signature) {
                return res.json({ success: true, payment_id });
            }
            return res.status(400).json({ error: "Invalid signature" });
        } catch (e) {
            return res.status(500).json({ error: "Verification failed" });
        }
    }

    res.status(400).json({ error: "Unknown action" });
}
