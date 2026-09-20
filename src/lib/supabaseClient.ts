import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Family Hub has no server of its own. Supabase's free tier is the shared
// "cloud" that every family member's phone talks to over HTTPS — see
// docs/ARCHITECTURE.md ("Storage & sync strategy").
//
// Two ways this gets configured:
//  1. Baked in at build time (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY) — set by
//     whoever deployed this copy of the app.
//  2. Typed into Settings by the person using it, and kept only in their
//     own browser's localStorage. This is what lets a friend visit the
//     SAME deployed link, install the SAME app, and store their family's
//     data in THEIR OWN free Supabase project instead of the deployer's —
//     the app is shared, the cloud underneath it isn't.
//
// A custom config always wins over the baked-in default once set.

const defaultUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const defaultKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const defaultClient: SupabaseClient | null =
  defaultUrl && defaultKey ? createClient(defaultUrl, defaultKey) : null;

let customClient: SupabaseClient | null = null;
let customUrl: string | null = null;

/** Called once on startup (with any saved custom config) and whenever Settings saves a new one. */
export function setCustomSupabase(url: string | null, key: string | null) {
  if (url && key) {
    customClient = createClient(url, key);
    customUrl = url;
  } else {
    customClient = null;
    customUrl = null;
  }
}

export function getSupabase(): SupabaseClient | null {
  return customClient ?? defaultClient;
}

export function isSyncAvailable(): boolean {
  return Boolean(customClient ?? defaultClient);
}

export function usingCustomSupabase(): boolean {
  return customClient !== null;
}

export function activeSupabaseUrl(): string | null {
  return customUrl ?? (defaultUrl || null);
}

/** @deprecated kept only for the "is a default project baked in at all" check in Settings copy. */
export const isSupabaseConfigured = Boolean(defaultUrl && defaultKey);
