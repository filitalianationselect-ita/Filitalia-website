const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function bearer(request: Request): string {
  return String(request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

async function serviceFetch(url: string, serviceKey: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  return fetch(url, { ...init, headers });
}

async function requireAdmin(supabaseUrl: string, serviceKey: string, token: string): Promise<string> {
  if (!token) throw new Error("NOT_AUTHENTICATED");
  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) throw new Error("INVALID_SESSION");
  const user = await userResponse.json();
  if (!user || !user.id) throw new Error("INVALID_SESSION");

  const profileResponse = await serviceFetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,status`,
    serviceKey,
  );
  if (!profileResponse.ok) throw new Error("PROFILE_LOOKUP_FAILED");
  const profiles = await profileResponse.json();
  const profile = Array.isArray(profiles) ? profiles[0] : null;
  if (!profile || profile.role !== "admin" || profile.status !== "active") throw new Error("ADMIN_REQUIRED");
  return user.id;
}

function validStatus(value: unknown, allowed: string[], fallback: string): string {
  const text = String(value || "").trim();
  return allowed.includes(text) ? text : fallback;
}

async function importOne(
  supabaseUrl: string,
  serviceKey: string,
  item: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const submission = item.submission && typeof item.submission === "object"
    ? { ...(item.submission as Record<string, unknown>) }
    : { ...item };

  const rpc = await serviceFetch(`${supabaseUrl}/rest/v1/rpc/service_register_camp_submission`, serviceKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ submission, verified_account_id: null }),
  });
  const raw = await rpc.text();
  let result: Record<string, unknown> = {};
  try { result = raw ? JSON.parse(raw) : {}; }
  catch (_) { result = { message: raw }; }
  if (!rpc.ok) throw new Error(`REGISTRY_IMPORT_RPC_${rpc.status}:${raw.slice(0,300)}`);

  const playerId = String(result.player_id || "");
  const registrationId = String(result.registration_id || "");
  const rowNumber = String(item.rowNumber || submission.importedLegacyRow || "");
  const photo = typeof item.sourcePhoto === "string"
    ? item.sourcePhoto.trim()
    : typeof submission["Profile Photo Path"] === "string"
      ? String(submission["Profile Photo Path"]).trim()
      : "";

  if (playerId && photo) {
    const updatePhoto = await serviceFetch(`${supabaseUrl}/rest/v1/players?id=eq.${encodeURIComponent(playerId)}`, serviceKey, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ photo_path: photo, updated_at: new Date().toISOString() }),
    });
    if (!updatePhoto.ok) throw new Error(`PLAYER_PHOTO_IMPORT_${updatePhoto.status}`);
  }

  if (registrationId) {
    const paymentStatus = validStatus(item.paymentStatus, ["pending","paid","partial","waived","refunded","failed","not_required"], "pending");
    const registrationStatus = validStatus(item.registrationStatus, ["registered","confirmed","cancelled","waitlist","withdrawn"], "registered");
    const updateRegistration = await serviceFetch(
      `${supabaseUrl}/rest/v1/player_event_registrations?id=eq.${encodeURIComponent(registrationId)}`,
      serviceKey,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          payment_status: paymentStatus,
          registration_status: registrationStatus,
          legacy_registration_id: rowNumber ? `legacy-row:${rowNumber}` : null,
          source: "legacy_import",
          updated_at: new Date().toISOString(),
        }),
      },
    );
    if (!updateRegistration.ok) throw new Error(`REGISTRATION_STATUS_IMPORT_${updateRegistration.status}`);
  }

  return { ok: true, rowNumber: item.rowNumber || null, player_id: playerId, registration_id: registrationId };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (!supabaseUrl || !serviceKey) return response({ ok: false, error: "BACKEND_NOT_CONFIGURED" }, 500);

  try {
    await requireAdmin(supabaseUrl, serviceKey, bearer(request));
  } catch (error) {
    return response({ ok: false, error: String(error instanceof Error ? error.message : error) }, 403);
  }

  let payload: Record<string, unknown>;
  try { payload = await request.json(); }
  catch (_) { return response({ ok: false, error: "INVALID_JSON" }, 400); }

  const registrations = Array.isArray(payload.registrations) ? payload.registrations : [];
  if (!registrations.length) return response({ ok: false, error: "NO_REGISTRATIONS" }, 400);
  if (registrations.length > 500) return response({ ok: false, error: "IMPORT_LIMIT_500" }, 400);

  const imported: Record<string, unknown>[] = [];
  const errors: Record<string, unknown>[] = [];
  for (let i = 0; i < registrations.length; i += 1) {
    const item = registrations[i];
    if (!item || typeof item !== "object") {
      errors.push({ index: i, error: "INVALID_ITEM" });
      continue;
    }
    try {
      imported.push(await importOne(supabaseUrl, serviceKey, item as Record<string, unknown>));
    } catch (error) {
      errors.push({
        index: i,
        rowNumber: (item as Record<string, unknown>).rowNumber || null,
        error: String(error instanceof Error ? error.message : error),
      });
    }
  }

  return response({
    ok: errors.length === 0,
    imported: imported.length,
    failed: errors.length,
    results: imported,
    errors,
  }, errors.length ? 207 : 200);
});
