const BASE = ""; // Same origin (Vercel handles routing)

async function request(url, options = {}) {
    const headers = { ...options.headers };
    const pin = localStorage.getItem("ha_pin");
    if (pin) headers["X-Admin-Pin"] = pin;
    let body = options.body;
    if (body && !(headers["Content-Type"] && headers["Content-Type"] !== "application/json")) {
        // ponytail: Vercel edge returns empty 400 for some POST JSON clients.
        // Send JSON as urlencoded `payload`; servers parse both.
        headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";
        body = "payload=" + encodeURIComponent(body);
    }
    const res = await fetch(BASE + url, { ...options, body, headers });
    const text = await res.text();
    if (!text) throw new Error(res.ok ? "Empty response from server" : "Server error — try again");
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error("Unexpected server response — try again"); }
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}

export const authApi = {
    verifyPin: (pin) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "verify-pin", pin }) }),
    getProfile: (userId) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "get", userId }) }),
};

export const dishesApi = {
    list: () => request("/api/dishes"),
    create: (dish) => request("/api/dishes", { method: "POST", body: JSON.stringify(dish) }),
    update: (id, updates) => request("/api/dishes", { method: "PUT", body: JSON.stringify({ id, ...updates }) }),
    delete: (id) => request("/api/dishes", { method: "DELETE", body: JSON.stringify({ id }) }),
};

export const ordersApi = {
    list: (userId, all) => request(`/api/orders?userId=${userId || ""}&all=${all ? "true" : ""}`),
    create: (order) => request("/api/orders", { method: "POST", body: JSON.stringify(order) }),
    updateStatus: (id, status) => request("/api/orders", { method: "PUT", body: JSON.stringify({ id, status }) }),
};

export const usersApi = {
    list: () => request("/api/auth", { method: "POST", body: JSON.stringify({ action: "list" }) }),
    updateRole: (targetUserId, role) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "updateRole", targetUserId, role }) }),
};

export const otpApi = {
    send: (phone) =>
        request("/api/otp", { method: "POST", body: JSON.stringify({ action: "send", phone }) }),
    verify: (phone, otp) =>
        request("/api/otp", { method: "POST", body: JSON.stringify({ action: "verify", phone, otp }) }),
};
