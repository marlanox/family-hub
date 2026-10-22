import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Family Hub has no server of its own; sync goes through a Supabase
// project. This deployment is one family's own, so its project
// (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY in .env.production) is built in:
// a reinstalled phone only needs the family code, not the URL and key.
// The anon key is public by design; the family code is what keeps
// another family's data out of reach. A project typed into Settings
// still takes precedence on that device.

const BUILT_IN_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const BUILT_IN_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
let builtInClient: SupabaseClient | null = null;

function getBuiltIn(): SupabaseClient | null {
  if (!BUILT_IN_URL || !BUILT_IN_KEY) return null;
  if (!builtInClient) builtInClient = createClient(BUILT_IN_URL, BUILT_IN_KEY);
  return builtInClient;
}

/** True when this build ships with the family's cloud already configured. */
export function hasBuiltInCloud(): boolean {
  return !!BUILT_IN_URL && !!BUILT_IN_KEY;
}

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
  return customClient ?? getBuiltIn();
}

export function isSyncAvailable(): boolean {
  return getSupabase() !== null;
}

export function usingCustomSupabase(): boolean {
  return customClient !== null;
}

export function activeSupabaseUrl(): string | null {
  return customUrl ?? (hasBuiltInCloud() ? BUILT_IN_URL : null);
}
