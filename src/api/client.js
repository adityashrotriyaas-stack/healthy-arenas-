const BASE = ""; // Same origin (Vercel handles routing)

import { supabase } from "../lib/supabase";

async function request(url, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) headers["X-User-Id"] = session.user.id;
    const res = await fetch(BASE + url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
}

export const authApi = {
    phoneAuth: (userId, phone, name) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "phone-auth", userId, phone, name }) }),
    getProfile: (userId) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "get", userId }) }),
    updateProfile: (userId, name, phone) =>
        request("/api/auth", { method: "POST", body: JSON.stringify({ action: "update", userId, name, phone }) }),
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

export async function openRazorpay({ amount, name, phone, onSuccess, onDismiss }) {
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
