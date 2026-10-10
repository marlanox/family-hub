"use client";

import { useEffect } from "react";

/**
 * Registers the offline-shell service worker, and — this is the part
 * that actually matters — makes sure a new deploy is picked up without
 * someone having to force-quit the app from the app switcher. iOS PWAs
 * in particular can sit on a stale cached bundle for a long time
 * otherwise: "why doesn't X work" turning out to just be an old build.
 * See docs/ARCHITECTURE.md "Updates" for the full reasoning.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
  }, []);

  return null;
}
