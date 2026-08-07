const BASE = ""; // Same origin (Vercel handles routing)

async function request(url, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const pin = localStorage.getItem("ha_pin");
    if (pin) headers["X-Admin-Pin"] = pin;
    const res = await fetch(BASE + url, { ...options, headers });
    const data = await res.json();
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

export const paymentsApi = {
    createOrder: (amount) =>
        request("/api/payments", { method: "POST", body: JSON.stringify({ action: "create-order", amount }) }),
    verify: (order_id, payment_id, razorpay_signature) =>
        request("/api/payments", { method: "POST", body: JSON.stringify({ action: "verify", order_id, payment_id, razorpay_signature }) }),
};

export const usersApi = {
    list: () => request("/api/auth", { method: "POST", body: JSON.stringify({ action: "list" }) }),
    updateRole: (targetUserId, role) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "updateRole", targetUserId, role }) }),
};

export const categoriesApi = {
    list: () => request("/api/categories"),
    create: (name) => request("/api/categories", { method: "POST", body: JSON.stringify({ name }) }),
    remove: (id) => request("/api/categories", { method: "DELETE", body: JSON.stringify({ id }) }),
};

export const otpApi = {
    send: (phone) =>
        request("/api/otp", { method: "POST", body: JSON.stringify({ action: "send", phone }) }),
    verify: (phone, otp) =>
        request("/api/otp", { method: "POST", body: JSON.stringify({ action: "verify", phone, otp }) }),
};

function loadRazorpay() {
    return new Promise((resolve, reject) => {
        if (window.Razorpay) return resolve();
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Couldn't load payment gateway"));
        document.head.appendChild(s);
    });
}

export async function openRazorpay({ amount, name, phone, onSuccess, onDismiss }) {
    await loadRazorpay();
    const { id, amount: amountPaise, currency, key } = await paymentsApi.createOrder(amount);
    const rzp = new window.Razorpay({
        key,
        amount: amountPaise,
        currency,
        name: "Healthy Arena's Cafe",
        description: "Food order",
        order_id: id,
        prefill: { name, contact: phone },
        handler: (r) => onSuccess(r),
        modal: { ondismiss: onDismiss },
    });
    rzp.open();
}
