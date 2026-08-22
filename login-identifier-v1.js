(function () {
  "use strict";
  if (!window.FilitaliaAuth) return;

  const original = window.FilitaliaAuth;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  async function signIn(identifier, password) {
    const value = String(identifier || "").trim().toLowerCase();
    if (emailPattern.test(value)) return original.signIn(value, password);
    if (!value || !original.client) throw new Error("INVALID_LOGIN");

    const response = await original.client.functions.invoke("sign-in-alias", {
      body: { identifier: value, password: String(password || "") }
    });

    if (response.error || !response.data || response.data.error || !response.data.session) {
      throw new Error("INVALID_LOGIN");
    }

    const session = response.data.session;
    return original.client.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }

  function friendlyError(error) {
    if (String(error && (error.message || error)).includes("INVALID_LOGIN")) {
      return "Credenziali non corrette.";
    }
    return original.friendlyError ? original.friendlyError(error) : "Accesso non riuscito.";
  }

  window.FilitaliaAuth = Object.freeze(Object.assign({}, original, { signIn, friendlyError }));
})();
