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

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function decryptToken(encryptedBase64: string, ivBase64: string, keyBase64: string) {
  const keyBytes = base64ToBytes(keyBase64);
  if (keyBytes.length !== 32) throw new Error("INVALID_GMAIL_ENCRYPTION_KEY");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(ivBase64) },
    key,
    base64ToBytes(encryptedBase64)
  );
  return new TextDecoder().decode(decrypted);
}

function base64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function sanitizeHeader(value: unknown) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function normalizeRecipient(input: Record<string, unknown>) {
  return {
    registration_id: String(input.registration_id || "").slice(0, 160) || null,
    email: String(input.email || input.to || "").trim().toLowerCase(),
    name: String(input.name || "").trim().slice(0, 200)
  };
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("GMAIL_TOKEN_REFRESH_FAILED");
  return String(data.access_token);
}

async function sendViaGmail(accessToken: string, from: string, to: string, subject: string, body: string) {
  const message = [
    "From: FIL-ITALIA Nation Select <" + sanitizeHeader(from) + ">",
    "To: " + sanitizeHeader(to),
    "Subject: " + sanitizeHeader(subject),
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    body
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: base64Url(message) })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(String(data?.error?.message || "GMAIL_SEND_FAILED"));
  return String(data.id || "");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const clientId = Deno.env.get("GMAIL_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") || "";
    const encryptionKey = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY") || "";
    const authorization = request.headers.get("Authorization") || "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret || !encryptionKey) {
      throw new Error("GMAIL_SEND_NOT_CONFIGURED");
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
    if (!profileResult.data || !["admin","super_admin"].includes(String(profileResult.data.role)) || profileResult.data.status !== "active") {
      throw new Error("NOT_AUTHORIZED");
    }

    const body = await request.json();
    const subject = sanitizeHeader(body.subject).slice(0, 300);
    const bodyTemplate = String(body.body_template || body.body || "").slice(0, 100000);
    const eventId = String(body.event_id || "").slice(0, 160) || null;
    const rawRecipients = Array.isArray(body.recipients)
      ? body.recipients
      : [{ to: body.to, name: body.name, registration_id: body.registration_id }];
    const recipients = rawRecipients
      .map((item: Record<string, unknown>) => normalizeRecipient(item || {}))
      .filter((item) => validEmail(item.email))
      .slice(0, 100);

    if (!subject || !bodyTemplate) throw new Error("EMAIL_CONTENT_REQUIRED");
    if (!recipients.length) throw new Error("EMAIL_RECIPIENTS_REQUIRED");

    const connectionResult = await service
      .from("admin_google_connections")
      .select("gmail_address,encrypted_refresh_token,token_iv")
      .eq("user_id", user.id)
      .maybeSingle();
    if (connectionResult.error) throw connectionResult.error;
    if (!connectionResult.data) throw new Error("GMAIL_NOT_CONNECTED");

    const refreshToken = await decryptToken(
      connectionResult.data.encrypted_refresh_token,
      connectionResult.data.token_iv,
      encryptionKey
    );
    const accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);

    const campaignResult = await service.from("admin_email_campaigns").insert({
      event_id: eventId,
      subject,
      body_template: bodyTemplate,
      audience: body.audience && typeof body.audience === "object" ? body.audience : {},
      recipient_count: recipients.length,
      status: "sending",
      created_by: user.id
    }).select("id").single();
    if (campaignResult.error) throw campaignResult.error;
    const campaignId = campaignResult.data.id;

    const deliveryRows = recipients.map((recipient) => ({
      campaign_id: campaignId,
      registration_id: recipient.registration_id,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      status: "queued"
    }));
    const deliveriesInsert = await service
      .from("admin_email_deliveries")
      .insert(deliveryRows)
      .select("id,recipient_email");
    if (deliveriesInsert.error) throw deliveriesInsert.error;
    const deliveryByEmail = new Map((deliveriesInsert.data || []).map((row) => [row.recipient_email, row.id]));

    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const recipient of recipients) {
      const personalizedBody = bodyTemplate.replace(/\{nome\}/g, recipient.name || "partecipante");
      const deliveryId = deliveryByEmail.get(recipient.email);
      try {
        const providerMessageId = await sendViaGmail(
          accessToken,
          connectionResult.data.gmail_address,
          recipient.email,
          subject,
          personalizedBody
        );
        sent += 1;
        if (deliveryId) {
          await service.from("admin_email_deliveries").update({
            status: "sent",
            provider_message_id: providerMessageId,
            sent_at: new Date().toISOString()
          }).eq("id", deliveryId);
        }
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "GMAIL_SEND_FAILED";
        failures.push({ email: recipient.email, error: message });
        if (deliveryId) {
          await service.from("admin_email_deliveries").update({
            status: "failed",
            error_message: message
          }).eq("id", deliveryId);
        }
      }
    }

    const finalStatus = failed === 0 ? "completed" : sent > 0 ? "partial" : "failed";
    await service.from("admin_email_campaigns").update({
      sent_count: sent,
      failed_count: failed,
      status: finalStatus,
      completed_at: new Date().toISOString()
    }).eq("id", campaignId);

    await service.from("admin_audit_log").insert({
      event_id: eventId,
      action: "email_campaign_sent",
      details: { campaign_id: campaignId, recipients: recipients.length, sent, failed },
      actor_id: user.id
    });

    return json({ campaign_id: campaignId, sent, failed, failures, status: finalStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    const status = message === "NOT_AUTHENTICATED" ? 401 : message === "NOT_AUTHORIZED" ? 403 : 400;
    return json({ error: message }, status);
  }
});