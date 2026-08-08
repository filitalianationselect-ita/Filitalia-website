const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PhotoPayload = { fileName?: string; mimeType?: string; data?: string };

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
    headers: { apikey: serviceKey, Authorization: `Bearer ${bearerToken}` },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null);
  return user && typeof user.id === "string" ? user.id : null;
}

function photoExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function decodeBase64(data: string): Uint8Array {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function setPlayerPhotoPath(
  supabaseUrl: string,
  serviceKey: string,
  playerId: string,
  photoPath: string,
): Promise<void> {
  const response = await fetch(`${supabaseUrl}/rest/v1/players?id=eq.${encodeURIComponent(playerId)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ photo_path: photoPath, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) throw new Error(`PLAYER_PHOTO_PATH_UPDATE_${response.status}`);
}

async function persistPhoto(
  supabaseUrl: string,
  serviceKey: string,
  playerId: string,
  photo: PhotoPayload | null,
  existingPath: string,
): Promise<string> {
  if (photo && typeof photo.data === "string" && photo.data) {
    const mimeType = String(photo.mimeType || "image/jpeg").toLowerCase();
    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      throw new Error("INVALID_PHOTO_TYPE");
    }
    const bytes = decodeBase64(photo.data);
    if (bytes.byteLength > 5 * 1024 * 1024) throw new Error("PHOTO_TOO_LARGE");

    const path = `registry/${playerId}/player-photo.${photoExtension(mimeType)}`;
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/profile-media/${encodedPath}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": mimeType,
        "x-upsert": "true",
      },
      body: bytes,
    });
    if (!upload.ok) throw new Error(`PHOTO_UPLOAD_${upload.status}`);
    await setPlayerPhotoPath(supabaseUrl, serviceKey, playerId, path);
    return path;
  }

  if (existingPath) {
    await setPlayerPhotoPath(supabaseUrl, serviceKey, playerId, existingPath);
    return existingPath;
  }
  return "";
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = String(Deno.env.get("SUPABASE_URL") || "").replace(/\/$/, "");
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (!supabaseUrl || !serviceKey) return jsonResponse({ ok: false, error: "BACKEND_NOT_CONFIGURED" }, 500);

  let submission: Record<string, unknown>;
  try {
    const raw = await request.json();
    submission = raw && typeof raw.submission === "object" && raw.submission !== null
      ? { ...(raw.submission as Record<string, unknown>) }
      : { ...(raw as Record<string, unknown>) };
  } catch (_) {
    return jsonResponse({ ok: false, error: "INVALID_JSON" }, 400);
  }
  if (!submission || typeof submission !== "object") return jsonResponse({ ok: false, error: "INVALID_SUBMISSION" }, 400);

  const photo = submission["Foto Giocatore"] && typeof submission["Foto Giocatore"] === "object"
    ? submission["Foto Giocatore"] as PhotoPayload
    : null;
  const existingPhotoPath = typeof submission["Profile Photo Path"] === "string"
    ? String(submission["Profile Photo Path"]).trim()
    : "";

  // Sensitive/large transient fields never enter raw_payload.
  delete submission.accountAccessToken;
  delete submission["Foto Giocatore"];

  const bearerToken = cleanBearer(request.headers.get("authorization"));
  const accountId = await resolveAccountId(supabaseUrl, serviceKey, bearerToken);

  const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/service_register_camp_submission`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ submission, verified_account_id: accountId }),
  });

  const rawResult = await rpcResponse.text();
  let result: Record<string, unknown> = {};
  if (rawResult) {
    try { result = JSON.parse(rawResult); }
    catch (_) { result = { message: rawResult }; }
  }

  if (!rpcResponse.ok) {
    console.error("REGISTER_CAMP_RPC_FAILED", rpcResponse.status, result);
    return jsonResponse({ ok: false, error: "REGISTRY_WRITE_FAILED", details: result }, 400);
  }

  const playerId = typeof result.player_id === "string" ? result.player_id : "";
  let photoPath = "";
  let photoWarning = "";
  if (playerId && (photo || existingPhotoPath)) {
    try {
      photoPath = await persistPhoto(supabaseUrl, serviceKey, playerId, photo, existingPhotoPath);
    } catch (error) {
      photoWarning = String(error instanceof Error ? error.message : error);
      console.error("REGISTER_CAMP_PHOTO_FAILED", photoWarning);
    }
  }

  return jsonResponse({ ...result, ok: true, photo_path: photoPath || undefined, photo_warning: photoWarning || undefined });
});
