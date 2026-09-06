import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const SITE_URL = "https://www.filitalianationselect.com";
const LOGO_URL = SITE_URL + "/images/logo.png";

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

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function wrapBase64(value: string) {
  return value.match(/.{1,76}/g)?.join("\r\n") || value;
}

function sanitizeHeader(value: unknown) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim();
}

function escapeHtml(value: unknown) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char] || char);
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

function replaceTokens(text: string, recipientName: string, event: Record<string, unknown>) {
  const values: Record<string, string> = {
    nome: recipientName || "partecipante",
    giocatore: String(event.playerName || event.giocatore || recipientName || "partecipante"),
    genitore: String(event.guardianName || event.genitore || recipientName || ""),
    email: String(event.email || ""),
    telefono: String(event.phone || event.telefono || ""),
    anno: String(event.birthYear || event.anno || ""),
    taglia: String(event.shirtSize || event.taglia || ""),
    quota: String(event.fee || event.quota || ""),
    evento: String(event.name || event.label || "Evento FIL-ITALIA"),
    citta: String(event.city || ""),
    data: String(event.dateLabel || event.date || ""),
    orario: String(event.time || ""),
    luogo: String(event.venue || "")
  };
  return text.replace(/\{(nome|giocatore|genitore|email|telefono|anno|taglia|quota|evento|citta|data|orario|luogo)\}/g, (_, key) => values[key] || "");
}

function eventDetailsHtml(event: Record<string, unknown>) {
  const details = [
    ["EVENTO", event.name || event.label],
    ["DATA", event.dateLabel || event.date],
    ["ORARIO", event.time],
    ["LUOGO", event.venue],
    ["CITTÀ", event.city]
  ].filter((item) => String(item[1] || "").trim());

  if (!details.length) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-collapse:separate;border-spacing:0;background:#eef7f2;border:1px solid #c9dfd3;border-radius:16px;overflow:hidden;">
      ${details.map(([label, value]) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #d8e8df;font-family:Arial,sans-serif;font-size:11px;font-weight:800;letter-spacing:.9px;color:#4d6c5d;width:105px;">${escapeHtml(label)}</td>
          <td style="padding:12px 16px;border-bottom:1px solid #d8e8df;font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#133d2d;">${escapeHtml(value)}</td>
        </tr>`).join("")}
    </table>`;
}

function safeHttpsUrl(value: unknown, fallback: string) {
  const candidate = String(value || "").trim();
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" ? parsed.toString() : fallback;
  } catch (_) {
    return fallback;
  }
}

type EmailDesign = {
  ctaLabel: string;
  ctaUrl: string;
  includeEventDetails: boolean;
  inlineLogo: boolean;
};

function buildHtml(subject: string, personalizedBody: string, event: Record<string, unknown>, design: EmailDesign) {
  const safeSubject = escapeHtml(subject);
  const bodyHtml = escapeHtml(personalizedBody).replace(/\r?\n/g, "<br>");
  const logoSource = design.inlineLogo ? "cid:filItaliaLogo" : LOGO_URL;
  const details = design.includeEventDetails ? eventDetailsHtml(event) : "";
  const cta = design.ctaLabel && design.ctaUrl ? `
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px auto 8px;">
              <tr><td align="center" style="border-radius:12px;background:#167451;">
                <a href="${escapeHtml(design.ctaUrl)}" style="display:inline-block;padding:13px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;">${escapeHtml(design.ctaLabel)}</a>
              </td></tr>
            </table>` : "";
  return `<!doctype html>
<html lang="it">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e8f0eb;font-family:Arial,Helvetica,sans-serif;color:#17372b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background:#e8f0eb;padding:28px 10px;">
    <tr><td align="center">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;border-collapse:separate;border-spacing:0;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 16px 45px rgba(16,63,43,.16);">
        <tr>
          <td align="center" style="padding:34px 28px 30px;background:#073a28;background-image:linear-gradient(135deg,#052f21,#16805a);">
            <img src="${logoSource}" width="116" alt="FIL-ITALIA Nation Select" style="display:block;width:116px;max-width:45%;height:auto;margin:0 auto 17px;border:0;">
            <div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#bfe3d1;text-transform:uppercase;">FIL-ITALIA NATION SELECT</div>
            <h1 style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:27px;line-height:1.2;color:#ffffff;font-weight:800;">${safeSubject}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:34px 34px 18px;background:#ffffff;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.75;color:#28493b;">${bodyHtml}</div>
            ${details}
            ${cta}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:22px 28px 28px;background:#f2f7f4;border-top:1px solid #dce9e2;">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:800;color:#174a36;">FIL-ITALIA Nation Select</div>
            <div style="margin-top:7px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#70847a;">Questa comunicazione è stata inviata dal sistema ufficiale FIL-ITALIA.</div>
            <div style="margin-top:10px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#557065;"><a href="${SITE_URL}" style="color:#176b4b;text-decoration:none;">filitalianationselect.com</a></div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type InlineLogo = {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
};

async function fetchInlineLogo(): Promise<InlineLogo | null> {
  try {
    const response = await fetch(LOGO_URL, { headers: { Accept: "image/jpeg,image/png,image/*" } });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 1024 * 1024) return null;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    if (!jpeg && !png) return null;
    return {
      bytes,
      filename: jpeg ? "fil-italia-logo.jpg" : "fil-italia-logo.png",
      mimeType: jpeg ? "image/jpeg" : "image/png"
    };
  } catch (_) {
    return null;
  }
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

async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  plainBody: string,
  htmlBody: string,
  logo: InlineLogo | null
) {
  const alternative = "filitalia_alt_" + crypto.randomUUID().replace(/-/g, "");
  const related = "filitalia_rel_" + crypto.randomUUID().replace(/-/g, "");
  const headers = [
    "From: FIL-ITALIA Nation Select <" + sanitizeHeader(from) + ">",
    "To: " + sanitizeHeader(to),
    "Subject: " + sanitizeHeader(subject),
    "MIME-Version: 1.0"
  ];
  const alternativeParts = [
    "--" + alternative,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    plainBody,
    "",
    "--" + alternative,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    htmlBody,
    "",
    "--" + alternative + "--"
  ];
  let message: string;

  if (logo) {
    message = [
      ...headers,
      'Content-Type: multipart/related; boundary="' + related + '"',
      "",
      "--" + related,
      'Content-Type: multipart/alternative; boundary="' + alternative + '"',
      "",
      ...alternativeParts,
      "",
      "--" + related,
      'Content-Type: ' + logo.mimeType + '; name="' + logo.filename + '"',
      'Content-Disposition: inline; filename="' + logo.filename + '"',
      "Content-ID: <filItaliaLogo>",
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(bytesToBase64(logo.bytes)),
      "",
      "--" + related + "--"
    ].join("\r\n");
  } else {
    message = [
      ...headers,
      'Content-Type: multipart/alternative; boundary="' + alternative + '"',
      "",
      ...alternativeParts
    ].join("\r\n");
  }

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
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

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret || !encryptionKey) throw new Error("GMAIL_SEND_NOT_CONFIGURED");
    if (!authorization.startsWith("Bearer ")) throw new Error("NOT_AUTHENTICATED");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false }
    });
    const userResult = await userClient.auth.getUser();
    const user = userResult.data.user;
    if (userResult.error || !user) throw new Error("NOT_AUTHENTICATED");

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const profileResult = await service.from("profiles").select("id,role,status").eq("id", user.id).maybeSingle();
    if (profileResult.error) throw profileResult.error;
    const role = String(profileResult.data?.role || "");
    if (!profileResult.data || !["admin", "super_admin"].includes(role) || profileResult.data.status !== "active") throw new Error("NOT_AUTHORIZED");

    const body = await request.json();
    const subjectTemplate = sanitizeHeader(body.subject).slice(0, 300);
    const bodyTemplate = String(body.body_template || body.body || "").slice(0, 100000);
    const ctaLabel = sanitizeHeader(body.cta_label || "Visita il sito FIL-ITALIA").slice(0, 320);
    const ctaUrl = safeHttpsUrl(body.cta_url, SITE_URL);
    const includeEventDetails = body.include_event_details !== false;
    const eventId = String(body.event_id || "").slice(0, 160) || null;
    const event = body.event && typeof body.event === "object" ? body.event as Record<string, unknown> : {};
    const recipients = (Array.isArray(body.recipients) ? body.recipients : [{ to: body.to, name: body.name }])
      .map((item: Record<string, unknown>) => normalizeRecipient(item || {}))
      .filter((item) => validEmail(item.email))
      .slice(0, 100);

    if (!subjectTemplate || !bodyTemplate) throw new Error("EMAIL_CONTENT_REQUIRED");
    if (!recipients.length) throw new Error("EMAIL_RECIPIENTS_REQUIRED");

    const connectionResult = await service.from("admin_google_connections")
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
    const inlineLogo = await fetchInlineLogo();

    const campaignResult = await service.from("admin_email_campaigns").insert({
      event_id: eventId,
      subject: subjectTemplate,
      body_template: bodyTemplate,
      audience: { ...(body.audience && typeof body.audience === "object" ? body.audience : {}), branded_html: true },
      recipient_count: recipients.length,
      status: "sending",
      created_by: user.id
    }).select("id").single();
    if (campaignResult.error) throw campaignResult.error;
    const campaignId = campaignResult.data.id;

    const deliveriesInsert = await service.from("admin_email_deliveries").insert(recipients.map((recipient) => ({
      campaign_id: campaignId,
      registration_id: recipient.registration_id,
      recipient_email: recipient.email,
      recipient_name: recipient.name,
      status: "queued"
    }))).select("id,recipient_email");
    if (deliveriesInsert.error) throw deliveriesInsert.error;
    const deliveryByEmail = new Map((deliveriesInsert.data || []).map((row) => [row.recipient_email, row.id]));

    let sent = 0;
    let failed = 0;
    const failures: Array<{ email: string; error: string }> = [];

    for (const recipient of recipients) {
      const personalizedSubject = replaceTokens(subjectTemplate, recipient.name, event);
      const personalizedBody = replaceTokens(bodyTemplate, recipient.name, event);
      const htmlBody = buildHtml(personalizedSubject, personalizedBody, event, {
        ctaLabel,
        ctaUrl,
        includeEventDetails,
        inlineLogo: Boolean(inlineLogo)
      });
      const deliveryId = deliveryByEmail.get(recipient.email);
      try {
        const providerMessageId = await sendViaGmail(
          accessToken,
          connectionResult.data.gmail_address,
          recipient.email,
          personalizedSubject,
          personalizedBody,
          htmlBody,
          inlineLogo
        );
        sent += 1;
        if (deliveryId) await service.from("admin_email_deliveries").update({
          status: "sent",
          provider_message_id: providerMessageId,
          sent_at: new Date().toISOString()
        }).eq("id", deliveryId);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : "GMAIL_SEND_FAILED";
        failures.push({ email: recipient.email, error: message });
        if (deliveryId) await service.from("admin_email_deliveries").update({ status: "failed", error_message: message }).eq("id", deliveryId);
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
      action: "branded_email_campaign_sent",
      details: { campaign_id: campaignId, recipients: recipients.length, sent, failed },
      actor_id: user.id
    });

    return json({ campaign_id: campaignId, sent, failed, failures, status: finalStatus, branded_html: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "EMAIL_SEND_FAILED";
    const status = message === "NOT_AUTHENTICATED" ? 401 : message === "NOT_AUTHORIZED" ? 403 : 400;
    return json({ error: message }, status);
  }
});
