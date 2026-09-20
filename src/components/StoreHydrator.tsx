"use client";

import { useEffect } from "react";
import { useFamilyStore } from "@/lib/store";

/** Swaps the demo/default state for the real persisted one right after mount. */
export function StoreHydrator() {
  useEffect(() => {
    useFamilyStore.persist.rehydrate();
  }, []);

  return null;
}
