"use client";

import { useEffect } from "react";
import { useFamilyStore } from "@/lib/store";
import { setCustomSupabase } from "@/lib/supabaseClient";

/** Swaps the empty default state for the real persisted one right after mount. */
export function StoreHydrator() {
  useEffect(() => {
    const unsub = useFamilyStore.persist.onFinishHydration(() => {
      const { customSupabaseUrl, customSupabaseKey } = useFamilyStore.getState();
      if (customSupabaseUrl && customSupabaseKey) {
        setCustomSupabase(customSupabaseUrl, customSupabaseKey);
      }
      useFamilyStore.setState({ hasHydrated: true });
    });
    useFamilyStore.persist.rehydrate();
    return unsub;
  }, []);

  return null;
}
