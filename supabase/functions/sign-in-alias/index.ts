import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function minimumDelay(startedAt: number) {
  const remaining = 350 - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const startedAt = Date.now();
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("SERVER_NOT_CONFIGURED");

    const body = await request.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{4,40}$/.test(identifier) || password.length < 10) throw new Error("INVALID_LOGIN");

    const forwarded = String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
    const clientAddress = forwarded || request.headers.get("cf-connecting-ip") || "unknown";
    const fingerprint = await sha256(`${serviceRoleKey.slice(0, 32)}|${clientAddress}|${identifier}`);
    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const now = new Date();
    const windowMs = 15 * 60 * 1000;
    const limitResult = await service.from("login_alias_rate_limits")
      .select("attempts,window_started_at,locked_until")
      .eq("fingerprint", fingerprint)
      .maybeSingle();
    if (limitResult.error) throw new Error("INVALID_LOGIN");

    const current = limitResult.data;
    if (current?.locked_until && new Date(current.locked_until).getTime() > now.getTime()) {
      await minimumDelay(startedAt);
      return json({ error: "INVALID_LOGIN" }, 429);
    }

    const existingWindow = current?.window_started_at ? new Date(current.window_started_at).getTime() : 0;
    const inWindow = existingWindow && now.getTime() - existingWindow < windowMs;
    const attempts = inWindow ? Number(current?.attempts || 0) + 1 : 1;
    const lockedUntil = attempts >= 8 ? new Date(now.getTime() + windowMs).toISOString() : null;

    const rateUpdate = await service.from("login_alias_rate_limits").upsert({
      fingerprint,
      attempts,
      window_started_at: inWindow ? current?.window_started_at : now.toISOString(),
      locked_until: lockedUntil,
      updated_at: now.toISOString()
    }, { onConflict: "fingerprint" });
    if (rateUpdate.error) throw new Error("INVALID_LOGIN");
    if (lockedUntil) {
      await minimumDelay(startedAt);
      return json({ error: "INVALID_LOGIN" }, 429);
    }

    const aliasResult = await service.from("login_aliases").select("user_id").eq("alias", identifier).maybeSingle();
    if (aliasResult.error || !aliasResult.data) throw new Error("INVALID_LOGIN");

    const userResult = await service.auth.admin.getUserById(aliasResult.data.user_id);
    const email = userResult.data.user?.email || "";
    if (userResult.error || !email) throw new Error("INVALID_LOGIN");

    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const signInResult = await publicClient.auth.signInWithPassword({ email, password });
    if (signInResult.error || !signInResult.data.session) throw new Error("INVALID_LOGIN");

    await service.from("login_alias_rate_limits").delete().eq("fingerprint", fingerprint);
    await minimumDelay(startedAt);
    return json({
      session: {
        access_token: signInResult.data.session.access_token,
        refresh_token: signInResult.data.session.refresh_token
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await minimumDelay(startedAt);
    return json({ error: message === "SERVER_NOT_CONFIGURED" ? message : "INVALID_LOGIN" }, message === "SERVER_NOT_CONFIGURED" ? 503 : 401);
  }
});
