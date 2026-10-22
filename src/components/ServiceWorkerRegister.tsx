"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Registers the offline-shell service worker, and — this is the part
 * that actually matters — makes sure a new deploy is picked up without
 * someone having to force-quit the app from the app switcher. iOS PWAs
 * in particular can sit on a stale cached bundle for a long time
 * otherwise: "why doesn't X work" turning out to just be an old build.
 * See docs/ARCHITECTURE.md "Updates" for the full reasoning.
 */
// Must match NAV_CACHE in public/sw.js.
const PENDING_NAV_CACHE = "family-hub-pending-nav";

export function ServiceWorkerRegister() {
  const router = useRouter();

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // A due-task push that arrived while the app was already open and in
    // front — the service worker skips the OS banner for these and asks
    // us to jump straight to the reminder screen instead (see sw.js).
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const pendingKey = `${base}/__pending-nav`;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "navigate" && typeof event.data.url === "string") {
        router.push(event.data.url);
        void caches?.open(PENDING_NAV_CACHE).then((c) => c.delete(pendingKey)).catch(() => {});
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    // A tapped notification parks its task URL in the cache (sw.js). On
    // iOS the "navigate" message above often never reaches the page —
    // it was frozen in the background — so whenever the app comes to the
    // front, look for a fresh parked URL and go there.
    const consumePendingNav = async () => {
      if (typeof caches === "undefined") return;
      try {
        const cache = await caches.open(PENDING_NAV_CACHE);
        const res = await cache.match(pendingKey);
        if (!res) return;
        await cache.delete(pendingKey);
        const { url, at } = (await res.json()) as { url?: string; at?: number };
        if (typeof url === "string" && typeof at === "number" && Date.now() - at < 2 * 60 * 1000) {
          router.push(url);
        }
      } catch {
        // Nothing parked, or storage unavailable — stay where we are.
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void consumePendingNav();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    void consumePendingNav();

    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // A new service worker just took over — the cached assets it's
      // serving may be newer than the JS already running on this page,
      // so reload once to get a fully consistent new version.
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(`${base}/sw.js`)
      .then((registration) => {
        // Check for a new version every time the app comes to the
        // foreground — covers "closed the app yesterday, opened it
        // today" without needing a hard-refresh or reinstall.
        const checkForUpdate = () => void registration.update();
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        window.addEventListener("focus", checkForUpdate);
        checkForUpdate();
      })
      .catch(() => {
        // Offline shell is a nice-to-have; the app still works without it.
      });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [router]);

  return null;
}
