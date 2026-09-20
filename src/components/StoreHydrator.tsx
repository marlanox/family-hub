"use client";

import { useEffect } from "react";
import { useFamilyStore } from "@/lib/store";

/** Swaps the empty default state for the real persisted one right after mount. */
export function StoreHydrator() {
  useEffect(() => {
    const unsub = useFamilyStore.persist.onFinishHydration(() => {
      useFamilyStore.setState({ hasHydrated: true });
    });
    useFamilyStore.persist.rehydrate();
    return unsub;
  }, []);

  return null;
}
