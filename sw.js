// Family Hub service worker.
//
// Two jobs today:
//   1. Cache the app shell so the installed PWA opens instantly and works
//      offline (all real data lives in localStorage, read by the page
//      itself — this worker only caches the code/assets).
//   2. Skeleton push + notification-click handlers, wired up but inert
//      until a backend exists to send pushes (see docs/ARCHITECTURE.md
//      "Notifications" for the free Supabase Edge Function path that
//      would drive these later).

const CACHE_NAME = "family-hub-shell-v1";
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
  const targetUrl = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});
