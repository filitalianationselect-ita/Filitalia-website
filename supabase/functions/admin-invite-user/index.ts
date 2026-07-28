import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authHeader = request.headers.get("Authorization") || "";
    if (!supabaseUrl || !anonKey || !serviceKey || !authHeader) throw new Error("NOT_AUTHENTICATED");

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userResult, error: userError } = await callerClient.auth.getUser();
    if (userError || !userResult.user) throw new Error("NOT_AUTHENTICATED");
    const { data: profile, error: profileError } = await callerClient.from("profiles").select("id,role,status").eq("id", userResult.user.id).maybeSingle();
    if (profileError || !profile || profile.role !== "admin" || profile.status !== "active") throw new Error("NOT_AUTHORIZED");

    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.first_name || "").trim().slice(0, 100);
    const lastName = String(body.last_name || "").trim().slice(0, 100);
    const role = ["admin","coordinator","coach","staff","player","parent"].includes(String(body.role)) ? String(body.role) : "staff";
    const scope = Array.isArray(body.scope) ? body.scope.map((value: unknown) => String(value).trim()).filter(Boolean).slice(0, 30) : [];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("INVALID_EMAIL");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const siteUrl = String(Deno.env.get("ADMIN_SITE_ORIGIN") || "https://www.filitalianationselect.com").replace(/\/$/, "");
    const invite = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: siteUrl + "/reset-password.html",
      data: { first_name: firstName, last_name: lastName, requested_role: role, invited_by_admin: profile.id }
    });
    if (invite.error) throw invite.error;
    const invitedUser = invite.data.user;
    if (invitedUser) {
      const profileUpdate = await adminClient.from("profiles").upsert({
        id: invitedUser.id,
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        requested_role: role,
        role,
        status: "pending"
      }, { onConflict: "id" });
      if (profileUpdate.error) throw profileUpdate.error;
      const permissionUpdate = await adminClient.from("admin_user_permissions").upsert({
        user_id: invitedUser.id,
        scope,
        permissions: body.permissions && typeof body.permissions === "object" ? body.permissions : {},
        updated_by: profile.id
      }, { onConflict: "user_id" });
      if (permissionUpdate.error) throw permissionUpdate.error;
    }
    await adminClient.from("admin_user_invitations").insert({
      email, first_name: firstName || null, last_name: lastName || null, role, scope, status: "pending", invited_by: profile.id
    });

    return new Response(JSON.stringify({ ok: true, user_id: invitedUser?.id || null, email }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});