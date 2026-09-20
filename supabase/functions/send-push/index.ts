// Supabase Edge Function: fans out a Web Push notification to a family's
// other members. Called by the client (src/lib/sync.ts, notifyFamily())
// right after someone completes or refuses a task — see
// docs/ARCHITECTURE.md "Notifications" for the full picture, and
// README.md for how to deploy this function and set its secrets.
//
// Deploy: paste this file's contents into Supabase Dashboard → Edge
// Functions → "send-push" → the code editor, then Deploy. Then set two
// secrets (Dashboard → Edge Functions → send-push → Secrets, or
// Settings → Edge Functions): VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically
// by Supabase — you don't set those yourself.

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails("mailto:family-hub@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(JSON.stringify({ error: "VAPID secrets not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { familyId, excludeMemberIds = [], title, body } = await req.json();
    if (!familyId || !title || !body) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: members } = await supabase.from("family_members").select("id").eq("family_id", familyId);
    const targetIds = (members ?? []).map((m: { id: string }) => m.id).filter((id: string) => !excludeMemberIds.includes(id));

    if (targetIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase.from("push_subscriptions").select("*").in("member_id", targetIds);

    let sent = 0;
    for (const sub of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body }),
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone (browser data cleared, app uninstalled, …) — stop retrying it.
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
