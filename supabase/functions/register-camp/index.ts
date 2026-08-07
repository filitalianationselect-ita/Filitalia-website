const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function cleanBearer(value: string | null): string {
  const text = String(value || "").trim();
  if (!/^Bearer\s+/i.test(text)) return "";
  return text.replace(/^Bearer\s+/i, "").trim();
}

async function resolveAccountId(
  supabaseUrl: string,
  serviceKey: string,
  bearerToken: string,
): Promise<string | null> {
  if (!bearerToken) return null;

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user && typeof user.id === "string" ? user.id : null;
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  }

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ ok: false, error: "BACKEND_NOT_CONFIGURED" }, 500);
  }

  let submission: Record<string, unknown>;
  try {
    const raw = await request.json();
    submission = raw && typeof raw.submission === "object" && raw.submission !== null
      ? raw.submission as Record<string, unknown>
      : raw as Record<string, unknown>;
  } catch (_) {
    return jsonResponse({ ok: false, error: "INVALID_JSON" }, 400);
  }

  if (!submission || typeof submission !== "object") {
    return jsonResponse({ ok: false, error: "INVALID_SUBMISSION" }, 400);
  }

  // Never persist a browser JWT in raw_payload. Authorization comes from the
  // header only; the SQL function also strips the legacy payload field.
  delete submission.accountAccessToken;

  const bearerToken = cleanBearer(request.headers.get("authorization"));
  const accountId = await resolveAccountId(supabaseUrl, serviceKey, bearerToken);

  const rpcResponse = await fetch(
    `${supabaseUrl}/rest/v1/rpc/service_register_camp_submission`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submission,
        verified_account_id: accountId,
      }),
    },
  );

  const rawResult = await rpcResponse.text();
  let result: unknown = null;
  if (rawResult) {
    try {
      result = JSON.parse(rawResult);
    } catch (_) {
      result = { message: rawResult };
    }
  }

  if (!rpcResponse.ok) {
    console.error("REGISTER_CAMP_RPC_FAILED", rpcResponse.status, result);
    return jsonResponse(
      { ok: false, error: "REGISTRY_WRITE_FAILED", details: result },
      400,
    );
  }

  return jsonResponse(result || { ok: true });
});
