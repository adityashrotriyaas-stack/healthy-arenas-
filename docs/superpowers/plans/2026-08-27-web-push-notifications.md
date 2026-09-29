# Web Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable push notifications that work even when the browser is closed, so admin never misses a new order.

**Architecture:** VAPID-based Web Push via `web-push` npm package. Service worker (`public/sw.js`) handles push events and shows native OS notifications. Server sends push to all stored subscriptions when a new order is created. Subscriptions stored in Supabase `push_subscriptions` table.

**Tech Stack:** `web-push` (npm), Web Push API, Service Workers, Supabase, Vercel Serverless Functions

## Global Constraints

- Node.js 24 (ES modules, `"type": "module"` in package.json)
- Vercel serverless (no persistent disk)
- Supabase with service role key for server-side operations
- Service worker MUST be in `public/` directory (served from root)
- VAPID keys: private key server-side only, public key sent to client
- All existing AdminNotifier behavior (visual banner, toast, audio) stays for when browser IS open

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `public/sw.js` | Create | Service worker: push event handler, notification display |
| `api/push/index.js` | Create | POST store subscription, DELETE remove subscription, send push to all |
| `src/lib/push.js` | Create | Client-side: register SW, subscribe, send subscription to server |
| `api/orders/index.js` | Modify (POST handler) | After order creation, send push to all subscriptions |
| `src/App.jsx` | Modify | Import push.js, call subscribe on admin login, unsubscribe on logout |
| `.env` / `.env.example` | Modify | Add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` |
| `package.json` | Modify | Add `web-push` dependency |
| `docs/superpowers/specs/2026-08-27-web-push-notifications-design.md` | Reference | Design spec |

---

### Task 1: Install web-push and generate VAPID keys

**Files:**
- Modify: `package.json`
- Modify: `.env`
- Modify: `.env.example`

**Interfaces:**
- Produces: `web-push` package installed, `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` in env

- [ ] **Step 1: Install web-push**

```bash
npm install web-push
```

- [ ] **Step 2: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy the output. It gives you a `Public Key` and `Private Key`.

- [ ] **Step 3: Add keys to .env**

Add to `.env`:
```
VAPID_PUBLIC_KEY=<paste-public-key>
VAPID_PRIVATE_KEY=<paste-private-key>
VAPID_EMAIL=mailto:admin@healthyarena.shop
```

- [ ] **Step 4: Add keys to .env.example**

Add to `.env.example`:
```
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_EMAIL=mailto:admin@healthyarena.shop
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: add web-push dependency and VAPID key placeholders"
```

Note: `.env` is gitignored, only `.env.example` is committed.

---

### Task 2: Create service worker

**Files:**
- Create: `public/sw.js`

**Interfaces:**
- Consumes: push event with JSON payload `{ title, body, icon, url }`
- Produces: native OS notification shown to user

- [ ] **Step 1: Create public/sw.js**

```javascript
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
```

- [ ] **Step 2: Verify service worker is served**

Run: `npx vite build && npx vite preview`
Check: `http://localhost:4173/sw.js` should return the file contents.

- [ ] **Step 3: Commit**

```bash
git add public/sw.js
git commit -m "feat: add service worker for Web Push notifications"
```

---

### Task 3: Create Supabase push_subscriptions table

**Files:**
- None (SQL run in Supabase dashboard)

**Interfaces:**
- Produces: `push_subscriptions` table with columns `id`, `endpoint`, `p256dh`, `auth`, `admin_user_id`, `created_at`

- [ ] **Step 1: Run SQL in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → New query → Paste:

```sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  admin_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by admin
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_admin ON push_subscriptions(admin_user_id);
```

Click "Run". Verify table appears in Table Editor.

- [ ] **Step 2: Verify table exists**

Run in SQL Editor:
```sql
SELECT * FROM push_subscriptions LIMIT 1;
```

Should return empty result set (no error).

---

### Task 4: Create push API endpoint

**Files:**
- Create: `api/push/index.js`

**Interfaces:**
- Consumes: Supabase `push_subscriptions` table, `web-push` package, `VAPID_PRIVATE_KEY` + `VAPID_EMAIL` env vars
- Produces: `POST /api/push` (store subscription), `DELETE /api/push` (remove subscription), `POST /api/push/send` (send push to all — called internally)

- [ ] **Step 1: Create api/push/index.js**

```javascript
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
```

- [ ] **Step 2: Verify endpoint structure**

Check that the file exports `handler` (default) and `sendPushToAll` (named). No tests needed — verified end-to-end in Task 5.

- [ ] **Step 3: Commit**

```bash
git add api/push/index.js
git commit -m "feat: add push subscription API and sendPushToAll helper"
```

---

### Task 5: Hook order creation to send push

**Files:**
- Modify: `api/orders/index.js`

**Interfaces:**
- Consumes: `sendPushToAll` from `api/push/index.js`
- Produces: push notification sent after order creation

- [ ] **Step 1: Modify api/orders/index.js POST handler**

After the successful order insert (line ~42, after `return res.json({ order: data })`), add push notification sending. The push is non-blocking — it runs after the response is sent.

Replace the POST handler's return section. Here's the full POST block with the addition:

```javascript
    if (req.method === "POST") {
        const { parseBody } = await import("../_lib/body.js");
        const b = parseBody(req);
        const { user_id, items, total, address, phone, payment } = b;
        if (!items || !total) return res.status(400).json({ error: "Missing required fields" });
        if (!phone || String(phone).replace(/\D/g, "").length < 10)
            return res.status(400).json({ error: "Enter a valid 10-digit mobile number" });

        let payment_status = "pending";
        let payment_id = null;
        if (payment?.payment_id) {
            const crypto = await import("crypto");
            const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(payment.order_id + "|" + payment.payment_id)
                .digest("hex");
            if (expected !== payment.razorpay_signature)
                return res.status(400).json({ error: "Invalid payment signature" });
            payment_status = "paid";
            payment_id = payment.payment_id;
        }

        const { data, error } = await supabase.from("orders").insert({
            user_id, items, total, status: "confirmed",
            payment_id, payment_status,
            address, phone,
        }).select().single();
        if (error) return res.status(500).json({ error: error.message });

        // Send push notification to all admin subscriptions (non-blocking)
        const itemNames = (items || []).slice(0, 3).map(i => i.name).join(", ");
        const more = (items || []).length > 3 ? ` +${items.length - 3} more` : "";
        const { sendPushToAll } = await import("../push/index.js");
        sendPushToAll(supabase, {
            title: "New Order!",
            body: `\u20B9${total} — ${itemNames}${more}`,
            tag: "new-order",
            url: "/",
        }).catch(() => {}); // swallow push errors — don't fail the order

        return res.json({ order: data });
    }
```

- [ ] **Step 2: Verify import path**

The relative import `../push/index.js` from `api/orders/index.js` resolves to `api/push/index.js`. Verify both files exist in `api/`.

- [ ] **Step 3: Commit**

```bash
git add api/orders/index.js
git commit -m "feat: send Web Push after order creation"
```

---

### Task 6: Create client-side push module

**Files:**
- Create: `src/lib/push.js`

**Interfaces:**
- Consumes: Service Worker registration, `VITE_SUPABASE_ANON_KEY` env var
- Produces: `subscribePush()` — registers SW, subscribes to push, sends to server; `unsubscribePush()` — removes subscription

- [ ] **Step 1: Create src/lib/push.js**

```javascript
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
```

- [ ] **Step 2: Add VITE_VAPID_PUBLIC_KEY to .env and .env.example**

Add to `.env`:
```
VITE_VAPID_PUBLIC_KEY=<paste-the-same-public-key-from-task-1>
```

Add to `.env.example`:
```
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

Note: Vite exposes env vars prefixed with `VITE_` to the client. The public key is safe to expose; the private key must NEVER be prefixed with `VITE_`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/push.js .env.example
git commit -m "feat: client-side push subscription management"
```

---

### Task 7: Wire push into App.jsx

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `subscribePush()` and `unsubscribePush()` from `src/lib/push.js`
- Produces: push subscription created on admin login, removed on logout

- [ ] **Step 1: Add import**

At the top of `src/App.jsx`, add:
```javascript
import { subscribePush, unsubscribePush } from "./lib/push";
```

- [ ] **Step 2: Subscribe to push when admin logs in**

In the `AdminPinModal` component, after successful unlock (line ~25-26), add push subscription:

```javascript
        try {
            await unlock(pin.replace(/\D/g, ""));
            toast("Welcome, Admin!", "success");
            subscribePush(); // non-blocking — don't await
            onUnlock?.();
        } catch (err) {
```

- [ ] **Step 3: Unsubscribe when admin logs out**

In the `Nav` component, where `logout()` is called (there are two places: desktop dropdown line ~912 and mobile menu line ~982), add `unsubscribePush()` before logout:

Desktop (line ~912):
```javascript
                                <button type="button" onClick={() => { unsubscribePush(); logout(); setShowDropdown(false); }}
```

Mobile (line ~982):
```javascript
                    <button type="button" onClick={() => { unsubscribePush(); logout(); setMenuOpen(false); }} style={{
```

- [ ] **Step 4: Verify build**

```bash
npx vite build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire push subscription to admin login/logout"
```

---

### Task 8: Verify end-to-end

**Files:**
- None (verification only)

**Interfaces:**
- Consumes: All previous tasks completed
- Produces: Confirmed working push notifications

- [ ] **Step 1: Test locally**

```bash
npx vite dev
```

Open browser → go to `http://localhost:5173` → 5-tap logo → enter admin PIN → grant notification permission → verify subscription stored in Supabase `push_subscriptions` table.

- [ ] **Step 2: Test push delivery**

Place a test order via the checkout flow. Verify:
1. Admin browser shows native OS notification (even if tab is in background)
2. Clicking notification focuses the browser tab
3. `push_subscriptions` table has one row

- [ ] **Step 3: Test closed browser**

Close the browser completely. Place another test order. Reopen browser — verify notification was received while closed (check browser notification history).

- [ ] **Step 4: Test cleanup**

Log out as admin. Verify subscription removed from `push_subscriptions` table.

- [ ] **Step 5: Commit final state**

```bash
git add -A
git commit -m "feat: Web Push notifications — verified end-to-end"
```
