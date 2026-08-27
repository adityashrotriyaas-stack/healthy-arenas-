// public/sw.js — handles Web Push events and shows native notifications
self.addEventListener("push", (event) => {
    if (!event.data) return;
    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || "New Order!", {
            body: data.body || "",
            icon: data.icon || "/logo.png",
            badge: "/logo.png",
            vibrate: [200, 100, 200, 100, 400],
            tag: data.tag || "new-order",
            requireInteraction: true,
            data: { url: data.url || "/" },
        })
    );
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = event.notification.data?.url || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && "focus" in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
