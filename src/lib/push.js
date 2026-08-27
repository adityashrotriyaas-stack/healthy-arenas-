// src/lib/push.js — client-side Web Push subscription management

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

// Convert VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export async function subscribePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
    if (!VAPID_PUBLIC_KEY) return null;

    try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return null;

        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        const json = sub.toJSON();
        await fetch("/api/push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
            }),
        });

        return sub;
    } catch (e) {
        console.warn("Push subscription failed:", e);
        return null;
    }
}

export async function unsubscribePush() {
    if (!("serviceWorker" in navigator)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!sub) return;
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
        });
    } catch (e) {
        console.warn("Push unsubscribe failed:", e);
    }
}
