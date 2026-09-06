import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_RE = /^[0-9a-f]{64}$/;
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS,
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function bytesFromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function detectedMime(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (
    bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  if (
    bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return "";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: CORS });
  if (req.method !== "POST") return json(405, { ok: false, error: "METHOD_NOT_ALLOWED" });

  const contentLength = Number(req.headers.get("content-length") || 0);
  if (contentLength > 7 * 1024 * 1024) return json(413, { ok: false, error: "PAYLOAD_TOO_LARGE" });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (_) {
    return json(400, { ok: false, error: "INVALID_JSON" });
  }

  const registrationId = String(body.registrationId || "").trim();
  const submissionId = String(body.submissionId || "").trim();
  const token = String(body.token || "").trim();
  const mimeType = String(body.mimeType || "").toLowerCase().trim();
  const base64 = String(body.data || "").trim();

  if (!UUID_RE.test(registrationId) || !UUID_RE.test(submissionId)) {
    return json(400, { ok: false, error: "INVALID_IDENTIFIERS" });
  }
  if (token.length < 40 || token.length > 200) return json(403, { ok: false, error: "INVALID_TOKEN" });
  if (!ALLOWED_MIME.has(mimeType)) return json(400, { ok: false, error: "INVALID_MIME" });
  if (!base64 || base64.length > Math.ceil(MAX_BYTES * 4 / 3) + 16) {
    return json(413, { ok: false, error: "PHOTO_TOO_LARGE" });
  }

  let bytes: Uint8Array;
  try {
    bytes = bytesFromBase64(base64);
  } catch (_) {
    return json(400, { ok: false, error: "INVALID_BASE64" });
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES || detectedMime(bytes) !== mimeType) {
    return json(400, { ok: false, error: "INVALID_IMAGE" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceRole) return json(500, { ok: false, error: "SERVER_NOT_CONFIGURED" });

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tokenHash = await sha256Hex(token);
  if (!HASH_RE.test(tokenHash)) return json(403, { ok: false, error: "INVALID_TOKEN" });

  const lookup = await supabase
    .from("registrations")
    .select("id,submission_id,photo_sync_token_hash,created_at")
    .eq("id", registrationId)
    .eq("submission_id", submissionId)
    .maybeSingle();

  if (lookup.error || !lookup.data || lookup.data.photo_sync_token_hash !== tokenHash) {
    return json(403, { ok: false, error: "INVALID_OR_USED_TOKEN" });
  }

  const createdAt = Date.parse(String(lookup.data.created_at || ""));
  if (!Number.isFinite(createdAt) || Date.now() - createdAt > 48 * 60 * 60 * 1000) {
    return json(403, { ok: false, error: "TOKEN_EXPIRED" });
  }

  const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const storagePath = `registrations/${registrationId}/${submissionId}.${ext}`;

  const upload = await supabase.storage
    .from("profile-media")
    .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

  if (upload.error) {
    const duplicate = /already exists|duplicate/i.test(upload.error.message || "");
    if (!duplicate) return json(502, { ok: false, error: "STORAGE_UPLOAD_FAILED" });
  }

  const linked = await supabase.rpc("service_attach_registration_storage_photo", {
    target_registration_id: registrationId,
    target_submission_id: submissionId,
    target_storage_path: storagePath,
    target_token: token,
  });

  if (linked.error) {
    if (!upload.error) await supabase.storage.from("profile-media").remove([storagePath]);
    return json(403, { ok: false, error: "PHOTO_LINK_REJECTED" });
  }

  return json(200, { ok: true, storagePath });
});
