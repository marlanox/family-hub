import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Family Hub has no server of its own. Sync is opt-in and requires each
// household to bring their own free Supabase project, typed into Settings
// and kept only in that browser's localStorage — see
// docs/ARCHITECTURE.md ("Storage & sync strategy").
//
// There is deliberately no shared fallback project baked into the app for
// everyone who opens the deployed link to write into: a project this app
// was built with (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, if set at all) is
// never used to talk to Supabase — it's ignored outright — so nobody can
// end up syncing into a cloud they didn't knowingly set up themselves.

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
  return customClient;
}

export function isSyncAvailable(): boolean {
  return customClient !== null;
}

export function usingCustomSupabase(): boolean {
  return customClient !== null;
}

export function activeSupabaseUrl(): string | null {
  return customUrl;
}
