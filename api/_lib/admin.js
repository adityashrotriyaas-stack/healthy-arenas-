import crypto from "crypto";

export function isAdmin(req) {
    const pin = (req.headers["x-admin-pin"] || "").trim();
    const expected = process.env.ADMIN_PIN;
    if (!expected || !pin || expected.length !== pin.length) return false;
    return crypto.timingSafeEqual(Buffer.from(pin), Buffer.from(expected));
}