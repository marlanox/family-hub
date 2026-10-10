// Family Hub service worker.
//
// Two jobs:
//   1. Cache the app shell so the installed PWA opens instantly and works
//      offline (all real data lives in localStorage, read by the page
//      itself — this worker only caches the code/assets).
//   2. Push + notification-click handlers — see supabase/functions for
//      what actually sends these (send-push for "something just
//      happened", send-reminders for "a task is due now").

const CACHE_NAME = "family-hub-shell-v2";
// Derived from where this worker was actually registered, so the same
// file works whether the app is served from "/" or a subpath like
// "/family-hub/" (GitHub Pages project sites).
const BASE = new URL(self.registration.scope).pathname;
const APP_SHELL = [BASE, `${BASE}manifest.webmanifest`, `${BASE}icons/icon-192.png`, `${BASE}icons/icon-512.png`];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match(BASE))),
  );
});

// --- Push notifications (skeleton — see note above) ------------------

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Family Hub", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Family Hub", {
      body: payload.body,
      icon: `${BASE}icons/icon-192.png`,
      badge: `${BASE}icons/icon-192.png`,
      data: payload.data ?? {},
      actions: payload.actions ?? [],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const path = event.notification.data?.url ?? "/";
  // BASE already ends with "/" and path starts with "/" — drop one so a
  // GitHub Pages subpath (e.g. "/family-hub/") doesn't get doubled up.
  const targetUrl = new URL(BASE.slice(0, -1) + path, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      // A tab that's already open needs to actually navigate to the
      // task — just focusing it left whoever tapped the notification
      // staring at whatever screen they'd last left open.
      if (existing) return existing.navigate(targetUrl).then((c) => c.focus()).catch(() => existing.focus());
      return self.clients.openWindow(targetUrl);
    }),
  );
});
