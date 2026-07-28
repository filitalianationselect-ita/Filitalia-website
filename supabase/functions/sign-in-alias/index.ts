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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("SERVER_NOT_CONFIGURED");

    const body = await request.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[a-z0-9._-]{4,40}$/.test(identifier) || password.length < 10) throw new Error("INVALID_LOGIN");

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const aliasResult = await service.from("login_aliases").select("user_id").eq("alias", identifier).maybeSingle();
    if (aliasResult.error || !aliasResult.data) throw new Error("INVALID_LOGIN");

    const userResult = await service.auth.admin.getUserById(aliasResult.data.user_id);
    const email = userResult.data.user?.email || "";
    if (userResult.error || !email) throw new Error("INVALID_LOGIN");

    const publicClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const signInResult = await publicClient.auth.signInWithPassword({ email, password });
    if (signInResult.error || !signInResult.data.session) throw new Error("INVALID_LOGIN");

    return json({
      session: {
        access_token: signInResult.data.session.access_token,
        refresh_token: signInResult.data.session.refresh_token
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message === "SERVER_NOT_CONFIGURED" ? message : "INVALID_LOGIN" }, message === "SERVER_NOT_CONFIGURED" ? 503 : 401);
  }
});
