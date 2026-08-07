// Client sends JSON as a urlencoded `payload` field to dodge the edge's
// empty-400 on Content-Type: application/json. Accept both.
export function parseBody(req) {
    const b = req.body;
    if (b && typeof b.payload === "string" && b.payload.trim().startsWith("{")) {
        try { return JSON.parse(b.payload); } catch (e) { /* fall through to raw */ }
    }
    return b;
}
