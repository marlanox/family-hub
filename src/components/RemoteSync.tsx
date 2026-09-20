"use client";

import { useEffect } from "react";
import { useFamilyStore } from "@/lib/store";

const POLL_MS = 20000;

/**
 * While a family code is set, periodically refreshes local state from
 * Supabase so other devices' changes show up here too — see
 * docs/ARCHITECTURE.md "Storage & sync strategy". This is polling, not
 * realtime: changes appear within ~20s or on next app open, not
 * instantly. That trade-off was chosen deliberately for reliability.
 */
export function RemoteSync() {
  const familyCode = useFamilyStore((s) => s.familyCode);
  const hasHydrated = useFamilyStore((s) => s.hasHydrated);
  const pullSync = useFamilyStore((s) => s.pullSync);

  useEffect(() => {
    if (!hasHydrated || !familyCode) return;
    pullSync();
    const id = setInterval(pullSync, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") pullSync();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hasHydrated, familyCode, pullSync]);

  return null;
}
