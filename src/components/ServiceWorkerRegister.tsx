"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {
        // Offline shell is a nice-to-have; the app still works without it.
      });
    }
  }, []);

  return null;
}
