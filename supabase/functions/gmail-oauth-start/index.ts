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
    const googleClientId = Deno.env.get("GMAIL_CLIENT_ID") || "";
    const redirectUri = Deno.env.get("GMAIL_REDIRECT_URI") || "";
    const authorization = request.headers.get("Authorization") || "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !googleClientId || !redirectUri) {
      throw new Error("GMAIL_OAUTH_NOT_CONFIGURED");
    }
    if (!authorization.startsWith("Bearer ")) throw new Error("NOT_AUTHENTICATED");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false }
    });
    const userResult = await userClient.auth.getUser();
    const user = userResult.data.user;
    if (userResult.error || !user) throw new Error("NOT_AUTHENTICATED");

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const profileResult = await service
      .from("profiles")
      .select("id,role,status")
      .eq("id", user.id)
      .maybeSingle();
    if (profileResult.error) throw profileResult.error;
    if (!profileResult.data || !["admin", "super_admin"].includes(String(profileResult.data.role)) || profileResult.data.status !== "active") {
      throw new Error("NOT_AUTHORIZED");
    }

    const body = await request.json().catch(() => ({}));
    const requestedReturnUrl = String(body.return_url || "");
    const allowedOrigin = Deno.env.get("ADMIN_SITE_ORIGIN") || "https://www.filitalianationselect.com";
    let returnUrl = allowedOrigin + "/admin-light.html";
    try {
      const candidate = new URL(requestedReturnUrl);
      if (candidate.origin === allowedOrigin || candidate.hostname.endsWith(".netlify.app")) {
        returnUrl = candidate.toString();
      }
    } catch (_) {
      // Mantiene la destinazione sicura predefinita.
    }

    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const stateInsert = await service.from("admin_oauth_states").insert({
      state,
      user_id: user.id,
      redirect_uri: returnUrl,
      expires_at: expiresAt
    });
    if (stateInsert.error) throw stateInsert.error;

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      scope: [
        "openid",
        "email",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.metadata.readonly"
      ].join(" "),
      state
    });

    return json({
      authorization_url: "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString()
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GMAIL_OAUTH_START_FAILED";
    return json({ error: message }, message === "NOT_AUTHENTICATED" ? 401 : message === "NOT_AUTHORIZED" ? 403 : 400);
  }
});
