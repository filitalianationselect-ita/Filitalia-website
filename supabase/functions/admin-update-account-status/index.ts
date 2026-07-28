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

const allowedRoles = new Set(["player", "parent", "coach", "coordinator", "staff", "admin", "super_admin"]);
const allowedStatuses = new Set(["pending", "active", "suspended", "rejected"]);
const adminRoles = new Set(["admin", "super_admin"]);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const authorization = request.headers.get("Authorization") || "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization.startsWith("Bearer ")) {
      throw new Error("NOT_AUTHENTICATED");
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false }
    });
    const userResult = await userClient.auth.getUser();
    const caller = userResult.data.user;
    if (userResult.error || !caller) throw new Error("NOT_AUTHENTICATED");

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const callerProfileResult = await service.from("profiles")
      .select("id,role,status")
      .eq("id", caller.id)
      .maybeSingle();
    const callerProfile = callerProfileResult.data;
    if (callerProfileResult.error) throw callerProfileResult.error;
    if (!callerProfile || !adminRoles.has(String(callerProfile.role)) || callerProfile.status !== "active") {
      throw new Error("NOT_AUTHORIZED");
    }

    const body = await request.json();
    const userId = String(body.user_id || "").trim();
    const role = String(body.role || "").trim();
    const status = String(body.status || "").trim();
    if (!userId) throw new Error("USER_REQUIRED");
    if (!allowedRoles.has(role)) throw new Error("INVALID_ROLE");
    if (!allowedStatuses.has(status)) throw new Error("INVALID_STATUS");
    if (userId === caller.id) throw new Error("CANNOT_CHANGE_SELF");

    const targetResult = await service.from("profiles")
      .select("id,email,role,status")
      .eq("id", userId)
      .maybeSingle();
    if (targetResult.error) throw targetResult.error;
    if (!targetResult.data) throw new Error("USER_NOT_FOUND");

    const target = targetResult.data;
    const touchesSuperAdmin = target.role === "super_admin" || role === "super_admin";
    if (touchesSuperAdmin && callerProfile.role !== "super_admin") throw new Error("SUPER_ADMIN_REQUIRED");

    if (target.role === "super_admin" && (role !== "super_admin" || status !== "active")) {
      const countResult = await service.from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "super_admin")
        .eq("status", "active");
      if (countResult.error) throw countResult.error;
      if ((countResult.count || 0) <= 1) throw new Error("CANNOT_REMOVE_LAST_SUPER_ADMIN");
    }

    const update = await service.from("profiles")
      .update({ role, status })
      .eq("id", userId)
      .select("id,email,role,status,updated_at")
      .single();
    if (update.error) throw update.error;

    await service.from("admin_audit_log").insert({
      action: "account_role_status_updated",
      details: {
        target_user_id: userId,
        previous_role: target.role,
        previous_status: target.status,
        role,
        status
      },
      actor_id: caller.id
    });

    return json({ ok: true, profile: update.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message === "NOT_AUTHENTICATED" ? 401 : ["NOT_AUTHORIZED", "SUPER_ADMIN_REQUIRED"].includes(message) ? 403 : 400;
    return json({ error: message }, status);
  }
});