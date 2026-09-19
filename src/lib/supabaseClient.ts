import { createClient } from "@supabase/supabase-js";

// Family Hub has no server of its own. Supabase's free tier is the shared
// "cloud" that every family member's phone talks to over HTTPS — see
// docs/ARCHITECTURE.md ("Storage & sync strategy") for why this is the
// answer to "where does this data live, and how does it sync on Android
// without a subscription or iCloud".
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
