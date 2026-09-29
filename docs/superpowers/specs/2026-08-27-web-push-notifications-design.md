# Design: Web Push Notifications for New Orders

**Date:** 2026-08-27
**Status:** Approved
**Scope:** Admin-only push notifications when browser is closed

---

## Problem

Currently, admin order notifications (sound, vibration, tab title flash, visual banner) only work while the browser tab is open. If the admin closes the browser or navigates away, they miss new orders.

## Solution

Web Push (VAPID) + Service Worker — the browser holds a push subscription independently of the site being open. Server sends push on new order creation; browser shows a native OS notification.

## Architecture

```
┌─────────────────┐     POST /api/push      ┌──────────────────┐
│  Admin Browser   │ ──────────────────────> │  Supabase         │
│  (registers SW,  │                         │  push_subscriptions│
│   subscribes to  │                         └──────────────────┘
│   push)          │                                  ↑
└─────────────────┘                                   │
                                                      │ POST /api/orders (after create)
                                              ┌───────┴───────┐
                                              │  Vercel API    │
                                              │  api/orders    │
                                              └───────────────┘
                                                      │
                                              ┌───────┴───────┐
                                              │  web-push npm  │
                                              │  sends to all  │
                                              │  subscriptions  │
                                              └───────────────┘
                                                      │
                                              ┌───────┴───────┐
                                              │  Browser OS    │
                                              │  native push   │
                                              └───────────────┘
```

## Components

### 1. Service Worker (`public/sw.js`)
- Listens for `push` events
- Shows native notification with order details (amount, items, phone)
- Clicking notification opens the admin panel
- No caching logic — minimal file

### 2. Push API (`api/push/index.js`)
- `POST /api/push` — stores a push subscription (admin only, deduplicates by endpoint)
- `DELETE /api/push` — removes a subscription (e.g., on logout)
- Uses `web-push` npm package to send push to all stored subscriptions

### 3. Order Hook (`api/orders/index.js` POST handler)
- After successful order creation, fetches all subscriptions from Supabase
- Sends Web Push to each via `web-push` package
- Push payload: `{ title: "New Order!", body: "₹XXX — items...", url: "/admin" }`
- Non-blocking — push sending doesn't delay the order response

### 4. Client-side (`src/App.jsx`)
- On admin login: register service worker, request notification permission, subscribe to push, send subscription to `POST /api/push`
- On logout: delete subscription via `DELETE /api/push`
- Replaces the existing `AdminNotifier` audio/vibration logic (keep the visual banner for when browser IS open)

### 5. Supabase Table (`push_subscriptions`)
```sql
CREATE TABLE push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  admin_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. VAPID Keys
- Generated once via `npx web-push generate-vapid-keys`
- Stored as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env`
- Public key sent to client for subscription; private key kept server-side only

## Data Flow

1. Admin logs in → client registers SW, subscribes to push → `POST /api/push` stores subscription
2. Customer places order → `POST /api/orders` creates order row
3. Same handler fetches all `push_subscriptions` → sends Web Push to each
4. Browser receives push (even if closed) → shows native notification
5. Admin clicks notification → opens admin panel

## What stays from current AdminNotifier
- Visual banner (for when browser IS open)
- Tab title flash
- Toast notification
- Audio ding (after first user click to unlock AudioContext)

## What gets removed
- In-page vibration (replaced by OS-level push, which handles its own vibration/alert)
- The full-screen OrderAlert modal (push replaces it when browser is closed; keep a lighter version for when browser is open)

## New Dependency
- `web-push` — VAPID JWT signing + AES-128-GCM encryption. No alternative without reimplementing ~200 lines of crypto.

## Trade-offs
- **Pro:** Works when browser is closed, no battery drain, native OS notification
- **Con:** Admin must grant notification permission once; one new npm dependency; one Supabase table to create manually

## Failure Modes
- Notification permission denied → falls back to current behavior (audio/vibration/banner)
- `web-push` send fails → logged, doesn't affect order creation
- Subscription expired → Supabase row cleaned up on next failed push attempt
