import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function encryptToken(token: string, keyBase64: string) {
  const keyBytes = base64ToBytes(keyBase64);
  if (keyBytes.length !== 32) throw new Error("INVALID_GMAIL_ENCRYPTION_KEY");
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );
  return {
    encrypted: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(iv)
  };
}

function redirect(url: string, params: Record<string, string>) {
  const destination = new URL(url);
  Object.entries(params).forEach(([key, value]) => destination.searchParams.set(key, value));
  return Response.redirect(destination.toString(), 302);
}

Deno.serve(async (request) => {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || "";
    const state = url.searchParams.get("state") || "";
    const oauthError = url.searchParams.get("error") || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const clientId = Deno.env.get("GMAIL_CLIENT_ID") || "";
    const clientSecret = Deno.env.get("GMAIL_CLIENT_SECRET") || "";
    const redirectUri = Deno.env.get("GMAIL_REDIRECT_URI") || "";
    const encryptionKey = Deno.env.get("GMAIL_TOKEN_ENCRYPTION_KEY") || "";
    const fallbackUrl = (Deno.env.get("ADMIN_SITE_ORIGIN") || "https://www.filitalianationselect.com") + "/admin-light.html";

    if (!supabaseUrl || !serviceRoleKey || !clientId || !clientSecret || !redirectUri || !encryptionKey) {
      return redirect(fallbackUrl, { gmail: "error", reason: "not_configured" });
    }

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const stateResult = await service
      .from("admin_oauth_states")
      .select("state,user_id,redirect_uri,expires_at")
      .eq("state", state)
      .maybeSingle();

    const returnUrl = stateResult.data?.redirect_uri || fallbackUrl;
    if (stateResult.error || !stateResult.data) {
      return redirect(returnUrl, { gmail: "error", reason: "invalid_state" });
    }

    await service.from("admin_oauth_states").delete().eq("state", state);

    if (new Date(stateResult.data.expires_at).getTime() < Date.now()) {
      return redirect(returnUrl, { gmail: "error", reason: "expired_state" });
    }
    if (oauthError) return redirect(returnUrl, { gmail: "error", reason: oauthError });
    if (!code) return redirect(returnUrl, { gmail: "error", reason: "missing_code" });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || !tokens.access_token) {
      return redirect(returnUrl, { gmail: "error", reason: "token_exchange_failed" });
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: "Bearer " + tokens.access_token }
    });
    const googleProfile = await profileResponse.json();
    if (!profileResponse.ok || !googleProfile.email) {
      return redirect(returnUrl, { gmail: "error", reason: "gmail_profile_failed" });
    }

    let refreshToken = String(tokens.refresh_token || "");
    if (!refreshToken) {
      const existing = await service
        .from("admin_google_connections")
        .select("encrypted_refresh_token,token_iv")
        .eq("user_id", stateResult.data.user_id)
        .maybeSingle();
      if (!existing.data) {
        return redirect(returnUrl, { gmail: "error", reason: "refresh_token_missing" });
      }
      return redirect(returnUrl, { gmail: "connected", address: String(googleProfile.email) });
    }

    const encrypted = await encryptToken(refreshToken, encryptionKey);
    const grantedScopes = String(tokens.scope || "")
      .split(/\s+/)
      .map((scope) => scope.trim())
      .filter(Boolean);
    const expectedScopes = [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly"
    ];
    const scopes = Array.from(new Set([...grantedScopes, ...expectedScopes]));

    const upsert = await service.from("admin_google_connections").upsert({
      user_id: stateResult.data.user_id,
      gmail_address: String(googleProfile.email).toLowerCase(),
      encrypted_refresh_token: encrypted.encrypted,
      token_iv: encrypted.iv,
      scopes,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" });
    refreshToken = "";
    if (upsert.error) throw upsert.error;

    return redirect(returnUrl, { gmail: "connected", address: String(googleProfile.email) });
  } catch (_) {
    const fallbackUrl = (Deno.env.get("ADMIN_SITE_ORIGIN") || "https://www.filitalianationselect.com") + "/admin-light.html";
    return redirect(fallbackUrl, { gmail: "error", reason: "callback_failed" });
  }
});
