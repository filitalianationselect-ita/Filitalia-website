import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const EVENT_MAP: Record<string, { tab: string; city: string; label: string; token: string }> = {
  "idcamp-roma-2026": { tab: "ROMA", city: "Roma", label: "Talent ID Camp Roma", token: "roma" },
  "idcamp-milano-2026": { tab: "MILANO", city: "Milano", label: "Talent ID Camp Milano", token: "milano" },
  "idcamp-firenze-2026": { tab: "FIRENZE", city: "Firenze", label: "Talent ID Camp Firenze", token: "firenze" },
  "idcamp-venezia-2026": { tab: "Venezia", city: "Venezia", label: "Talent ID Camp Venezia", token: "venezia" },
  "idcamp-bologna-2026": { tab: "Bologna", city: "Bologna", label: "Talent ID Camp Bologna", token: "bologna" }
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}

function bytesFromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function decryptToken(encryptedBase64: string, ivBase64: string, keyBase64: string) {
  const keyBytes = bytesFromBase64(keyBase64);
  if (keyBytes.length !== 32) throw new Error("INVALID_GOOGLE_ENCRYPTION_KEY");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: bytesFromBase64(ivBase64) },
    key,
    bytesFromBase64(encryptedBase64)
  );
  return new TextDecoder().decode(decrypted);
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
  if (!response.ok || !data.access_token) throw new Error("GOOGLE_TOKEN_REFRESH_FAILED");
  return String(data.access_token);
}

async function googleJson(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = String(data?.error?.message || "GOOGLE_API_FAILED");
    if (response.status === 403) throw new Error("GOOGLE_RECONNECT_REQUIRED");
    throw new Error(message);
  }
  return data;
}

function normalized(value: unknown) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clean(value: unknown, max = 1000) {
  return String(value == null ? "" : value).replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

function indexOfHeader(headers: string[], aliases: string[]) {
  const normalizedHeaders = headers.map(normalized);
  for (const alias of aliases.map(normalized)) {
    const exact = normalizedHeaders.findIndex((header) => header === alias);
    if (exact >= 0) return exact;
  }
  for (const alias of aliases.map(normalized)) {
    const partial = normalizedHeaders.findIndex((header) => header.includes(alias));
    if (partial >= 0) return partial;
  }
  return -1;
}

function valueAt(headers: string[], row: unknown[], aliases: string[]) {
  const index = indexOfHeader(headers, aliases);
  return index >= 0 ? clean(row[index]) : "";
}

function firstMatch(row: unknown[], matcher: (value: string) => boolean) {
  for (const cell of row) {
    const value = clean(cell);
    if (matcher(value)) return value;
  }
  return "";
}

function birthDateFrom(headers: string[], row: unknown[]) {
  const direct = valueAt(headers, row, ["Data Nascita", "Date of birth", "Player Date of Birth"]);
  if (/^(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(direct) || /^\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}$/.test(direct)) return direct;
  return firstMatch(row, (value) => /^(?:19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(value) || /^\d{1,2}[-/.]\d{1,2}[-/.](?:19|20)\d{2}$/.test(value));
}

function birthYear(value: string) {
  const four = value.match(/(?:19|20)\d{2}/);
  return four ? four[0] : "";
}

function categoryForYear(yearValue: string) {
  const year = Number(yearValue);
  if (!year) return "—";
  if (year >= 2014) return "U12";
  if (year >= 2012) return "U14";
  if (year >= 2010) return "U16";
  if (year >= 2008) return "U18";
  if (year >= 2007) return "U19";
  return "Open";
}

function paymentStatus(value: string) {
  const status = normalized(value);
  if (["paid", "pagato", "completato", "completed", "confirmed", "confermato"].some((item) => status.includes(item))) return "paid";
  if (["free", "gratuito", "not required", "non richiesto", "waived"].some((item) => status.includes(item))) return "not_required";
  if (["refund", "rimborsato"].some((item) => status.includes(item))) return "refunded";
  return "pending";
}

function safeEmail(headers: string[], row: unknown[]) {
  const direct = valueAt(headers, row, ["Email", "Email Genitore", "Parent Email Address", "Verified Account Email"]);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(direct)) return direct.toLowerCase();
  return firstMatch(row, (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)).toLowerCase();
}

function safePhone(headers: string[], row: unknown[]) {
  const direct = valueAt(headers, row, ["Telefono", "Telefono Genitore", "Parent / Guardian Mobile Number", "Mobile Number"]);
  if (direct) return direct;
  return firstMatch(row, (value) => value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15);
}

function shirtSize(headers: string[], row: unknown[]) {
  const direct = valueAt(headers, row, ["Taglia Maglia", "Uniform Sizes", "Jersey Size"]);
  if (direct) return direct;
  return firstMatch(row, (value) => /^(?:2xs|xs|s|m|l|xl|2xl|xxl|3xl)$/i.test(value));
}

function mapCityValues(values: unknown[][], eventId: string) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const event = EVENT_MAP[eventId];
  const headers = (values[0] || []).map((value) => clean(value));
  return values.slice(1).map((row, offset) => {
    const firstName = valueAt(headers, row, ["Nome"]);
    const lastName = valueAt(headers, row, ["Cognome"]);
    const parentFirst = valueAt(headers, row, ["Nome Genitore"]);
    const parentLast = valueAt(headers, row, ["Cognome Genitore"]);
    const birth = birthDateFrom(headers, row);
    const year = birthYear(birth);
    const submission = valueAt(headers, row, ["Submission ID"]);
    const paymentRaw = valueAt(headers, row, ["Stato Pagamento", "Payment Status"]);
    const name = clean([firstName, lastName].filter(Boolean).join(" "), 200);
    if (!name) return null;
    return {
      id: "google:" + event.tab.toLowerCase() + ":" + (submission || String(offset + 2)),
      eventId,
      name,
      email: safeEmail(headers, row),
      phone: safePhone(headers, row),
      parent: clean([parentFirst, parentLast].filter(Boolean).join(" "), 200),
      year: year || "—",
      cat: categoryForYear(year),
      shirt: shirtSize(headers, row) || "—",
      payment: paymentStatus(paymentRaw),
      amount: null,
      certificate: false,
      present: false,
      notes: valueAt(headers, row, ["Note"]),
      status: "received",
      readOnly: true,
      source: "google_sheet",
      sourceTab: event.tab,
      createdAt: valueAt(headers, row, ["Timestamp"]),
      payload: {
        birth_date: birth,
        gender: valueAt(headers, row, ["Sesso"]),
        residence_city: valueAt(headers, row, ["Città di Residenza"]),
        privacy_consent: valueAt(headers, row, ["Privacy Consent"]),
        media_consent: valueAt(headers, row, ["Media Consent"]),
        player_photo: valueAt(headers, row, ["Foto Giocatore"]),
        guardian_document: valueAt(headers, row, ["Documento Genitore"]),
        submission_id: submission,
        event_name: valueAt(headers, row, ["Camp Name"]) || event.label,
        event_date: valueAt(headers, row, ["Camp Date"])
      }
    };
  }).filter(Boolean);
}

function mapRawCampValues(values: unknown[][], eventId: string) {
  if (!Array.isArray(values) || values.length < 2) return [];
  const event = EVENT_MAP[eventId];
  const headers = (values[0] || []).map((value) => clean(value));
  return values.slice(1).map((row, offset) => {
    const selectedCamp = valueAt(headers, row, ["Which Talent ID Camp would you like to attend?", "Talent ID Camp"]);
    if (!normalized(selectedCamp).includes(event.token)) return null;
    const name = valueAt(headers, row, ["Player (full name)", "Player Full Name"]);
    if (!name) return null;
    const birth = birthDateFrom(headers, row);
    const year = birthYear(birth);
    const email = valueAt(headers, row, ["Parent / Guardian Email Address", "Email Address", "email"]) || safeEmail(headers, row);
    return {
      id: "google:camps:" + String(offset + 2),
      eventId,
      name: clean(name, 200),
      email: clean(email, 254).toLowerCase(),
      phone: valueAt(headers, row, ["Parent / Guardian Mobile Number", "phone", "Mobile Number"]),
      parent: valueAt(headers, row, ["Parent / Guardian (full name)", "Parent / Guardian Full Name"]),
      year: year || "—",
      cat: categoryForYear(year),
      shirt: shirtSize(headers, row) || "—",
      payment: "pending",
      amount: null,
      certificate: false,
      present: false,
      notes: "",
      status: "received",
      readOnly: true,
      source: "google_sheet",
      sourceTab: "CAMPS",
      createdAt: valueAt(headers, row, ["Timestamp"]),
      payload: {
        birth_date: birth,
        selected_camp: selectedCamp,
        city_country: valueAt(headers, row, ["City / Country"]),
        club: valueAt(headers, row, ["Team or Basketball Club"]),
        position: valueAt(headers, row, ["Position"]),
        height: valueAt(headers, row, ["Height"]),
        weight: valueAt(headers, row, ["Weight"]),
        basketball_background: valueAt(headers, row, ["Basketball background"]),
        objective: valueAt(headers, row, ["Player objective"]),
        relationship: valueAt(headers, row, ["relationship"]),
        authorization: valueAt(headers, row, ["Authorization"]),
        policy_acceptance: valueAt(headers, row, ["Accept policy"])
      }
    };
  }).filter(Boolean);
}

function mergeRegistrations(primary: any[], fallback: any[]) {
  const map = new Map<string, any>();
  const key = (row: any) => normalized([row.name, row.year, row.email].join("|"));
  fallback.forEach((row) => map.set(key(row), row));
  primary.forEach((row) => map.set(key(row), row));
  return [...map.values()].sort((a, b) => String(a.createdAt || "").localeCompare(String(b.createdAt || "")));
}

async function findSpreadsheet(accessToken: string) {
  const q = "name = 'DATI FIL-ITALIA' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false";
  const params = new URLSearchParams({ q, fields: "files(id,name,modifiedTime)", pageSize: "10", orderBy: "modifiedTime desc" });
  const data = await googleJson("https://www.googleapis.com/drive/v3/files?" + params.toString(), accessToken);
  const files = Array.isArray(data.files) ? data.files : [];
  if (!files.length) throw new Error("FILITALIA_SPREADSHEET_NOT_FOUND");
  return files[0];
}

async function sheetValues(accessToken: string, spreadsheetId: string, range: string) {
  const url = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) + "/values/" + encodeURIComponent(range) + "?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE";
  const data = await googleJson(url, accessToken);
  return Array.isArray(data.values) ? data.values : [];
}

async function loadRegistrations(accessToken: string, eventId: string) {
  const event = EVENT_MAP[eventId];
  if (!event) throw new Error("EVENT_NOT_SUPPORTED");
  const spreadsheet = await findSpreadsheet(accessToken);
  const [cityValues, rawValues] = await Promise.all([
    sheetValues(accessToken, spreadsheet.id, "'" + event.tab.replace(/'/g, "''") + "'!A:Y"),
    sheetValues(accessToken, spreadsheet.id, "'CAMPS'!A:Y")
  ]);
  const cityRows = mapCityValues(cityValues, eventId) as any[];
  const rawRows = mapRawCampValues(rawValues, eventId) as any[];
  const rows = mergeRegistrations(cityRows, rawRows);
  return {
    event: { id: eventId, city: event.city, label: event.label },
    rows,
    count: rows.length,
    source: "DATI FIL-ITALIA",
    modifiedTime: spreadsheet.modifiedTime || null,
    readOnly: true
  };
}

function headerValue(headers: any[], name: string) {
  const found = (headers || []).find((header) => String(header.name || "").toLowerCase() === name.toLowerCase());
  return clean(found?.value || "", 1000);
}

function senderEmail(value: string) {
  const match = value.match(/<([^>]+)>/);
  return clean(match ? match[1] : value, 254).toLowerCase();
}

async function loadInbox(accessToken: string, limit: number) {
  const params = new URLSearchParams({ q: "in:inbox newer_than:365d", maxResults: String(Math.min(100, Math.max(1, limit || 40))) });
  const list = await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/messages?" + params.toString(), accessToken);
  const messages = Array.isArray(list.messages) ? list.messages : [];
  const output = [];
  for (const item of messages.slice(0, 60)) {
    const metadata = await googleJson(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(item.id) + "?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=To",
      accessToken
    );
    const headers = metadata?.payload?.headers || [];
    const from = headerValue(headers, "From");
    output.push({
      id: clean(metadata.id, 200),
      threadId: clean(metadata.threadId, 200),
      from,
      fromEmail: senderEmail(from),
      to: headerValue(headers, "To"),
      subject: headerValue(headers, "Subject") || "(Senza oggetto)",
      date: headerValue(headers, "Date"),
      snippet: clean(metadata.snippet, 500),
      unread: Array.isArray(metadata.labelIds) && metadata.labelIds.includes("UNREAD"),
      gmailUrl: "https://mail.google.com/mail/u/0/#inbox/" + encodeURIComponent(metadata.threadId || metadata.id)
    });
  }
  return { messages: output, count: output.length };
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

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !clientId || !clientSecret || !encryptionKey) throw new Error("GOOGLE_ADMIN_DATA_NOT_CONFIGURED");
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

    const connectionResult = await service.from("admin_google_connections")
      .select("gmail_address,encrypted_refresh_token,token_iv,scopes,connected_at,updated_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (connectionResult.error) throw connectionResult.error;
    if (!connectionResult.data) throw new Error("GOOGLE_NOT_CONNECTED");

    const body = await request.json().catch(() => ({}));
    const action = clean(body.action || "status", 60);
    if (action === "status") {
      return json({
        connected: true,
        address: connectionResult.data.gmail_address,
        scopes: connectionResult.data.scopes || [],
        connectedAt: connectionResult.data.connected_at || null,
        updatedAt: connectionResult.data.updated_at || null
      });
    }

    const refreshToken = await decryptToken(
      connectionResult.data.encrypted_refresh_token,
      connectionResult.data.token_iv,
      encryptionKey
    );
    const accessToken = await refreshAccessToken(refreshToken, clientId, clientSecret);

    if (action === "registrations") {
      const eventId = clean(body.event_id, 160);
      return json(await loadRegistrations(accessToken, eventId));
    }
    if (action === "inbox") {
      return json(await loadInbox(accessToken, Number(body.limit) || 40));
    }
    throw new Error("UNKNOWN_ACTION");
  } catch (error) {
    const message = error instanceof Error ? error.message : "GOOGLE_ADMIN_DATA_FAILED";
    const status = message === "NOT_AUTHENTICATED" ? 401 : message === "NOT_AUTHORIZED" ? 403 : 400;
    return json({ error: message }, status);
  }
});
