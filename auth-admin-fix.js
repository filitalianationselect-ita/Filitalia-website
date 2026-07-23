(function () {
  "use strict";

  const base = window.FilitaliaAuth;
  const cfg = window.FILITALIA_CONFIG || {};

  if (!base) {
    console.error("FILITALIA_ADMIN_FIX: auth-client.js non disponibile");
    return;
  }

  function clean(value, maxLength) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .trim()
      .slice(0, maxLength || 1000);
  }

  function errorText(error) {
    return clean(
      error && (error.code || error.message)
        ? error.code || error.message
        : error,
      1500
    );
  }

  async function invokeDetailed(functionName, body) {
    const session = await base.getSession();
    if (!session || !session.access_token) {
      throw new Error("NOT_AUTHENTICATED");
    }

    const supabaseUrl = clean(cfg.supabaseUrl, 500).replace(/\/$/, "");
    const publishableKey = clean(cfg.supabasePublishableKey, 1000);

    if (!supabaseUrl || !publishableKey) {
      throw new Error("SUPABASE_NOT_CONFIGURED");
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(function () {
      controller.abort();
    }, 20000);

    let response;
    try {
      response = await fetch(
        supabaseUrl + "/functions/v1/" + encodeURIComponent(functionName),
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: "Bearer " + session.access_token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body || {}),
          signal: controller.signal
        }
      );
    } catch (error) {
      if (error && error.name === "AbortError") {
        throw new Error("EDGE_FUNCTION_TIMEOUT");
      }
      throw new Error("EDGE_FUNCTION_NETWORK_ERROR: " + errorText(error));
    } finally {
      window.clearTimeout(timeout);
    }

    const raw = await response.text();
    let payload = {};

    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch (_) {
        payload = { message: raw };
      }
    }

    if (!response.ok || payload.ok === false || payload.error) {
      const code = clean(
        payload.error || payload.message || "FUNCTION_HTTP_" + response.status,
        1000
      );
      const details = clean(payload.details || "", 1000);
      const error = new Error(code + (details ? ": " + details : ""));
      error.code = code;
      error.httpStatus = response.status;
      error.payload = payload;
      console.error("FILITALIA_EDGE_FUNCTION_ERROR", {
        functionName: functionName,
        status: response.status,
        payload: payload
      });
      throw error;
    }

    return payload || {};
  }

  function friendlyError(error) {
    const message = errorText(error);
    const upper = message.toUpperCase();
    const lower = message.toLowerCase();

    if (upper.includes("NOT_AUTHENTICATED") || upper.includes("ADMIN_SESSION_INVALID") || upper.includes("ACCESS_TOKEN_MISSING")) {
      return "La sessione è scaduta. Esci dall’account, accedi di nuovo e riprova.";
    }
    if (upper.includes("ADMIN_ACCESS_DENIED")) {
      return "Il tuo profilo non risulta amministratore attivo in Supabase.";
    }
    if (upper.includes("CANNOT_CHANGE_SELF")) {
      return "Per sicurezza non puoi modificare il tuo stesso account amministratore.";
    }
    if (upper.includes("SUPABASE_SERVICE_ROLE_KEY_MISSING")) {
      return "Nella Edge Function manca il secret SUPABASE_SERVICE_ROLE_KEY.";
    }
    if (upper.includes("SUPABASE_URL_MISSING")) {
      return "Nella Edge Function manca il secret SUPABASE_URL.";
    }
    if (upper.includes("PROFILE_NOT_FOUND")) {
      return "Il profilo dell’account non è stato trovato nella tabella profiles.";
    }
    if (upper.includes("PROFILE_UPDATE_FAILED")) {
      return "Aggiornamento account non riuscito: " + message.replace(/^PROFILE_UPDATE_FAILED:\s*/i, "");
    }
    if (upper.includes("REQUEST_NOT_FOUND_OR_ALREADY_PROCESSED") || upper.includes("REQUEST_ALREADY_PROCESSED")) {
      return "La richiesta non è più disponibile oppure è già stata gestita. Premi AGGIORNA.";
    }
    if (upper.includes("REQUEST_NOT_FOUND")) {
      return "La richiesta di eliminazione non è stata trovata. Premi AGGIORNA.";
    }
    if (upper.includes("USER_DELETION_FAILED")) {
      return "Eliminazione account non riuscita: " + message.replace(/^USER_DELETION_FAILED:\s*/i, "");
    }
    if (upper.includes("CANNOT_DELETE_ADMIN")) {
      return "Un account amministratore non può essere eliminato da questo pannello.";
    }
    if (upper.includes("EDGE_FUNCTION_TIMEOUT")) {
      return "La funzione Supabase non ha risposto in tempo. Riprova tra qualche secondo.";
    }
    if (upper.includes("EDGE_FUNCTION_NETWORK_ERROR") || lower.includes("failed to fetch") || lower.includes("load failed")) {
      return "La funzione Supabase non è raggiungibile. Controlla che sia pubblicata e che il CORS sia aggiornato.";
    }
    if (upper.includes("FUNCTION_HTTP_404") || lower.includes("function not found")) {
      return "La Edge Function richiesta non risulta pubblicata su Supabase.";
    }
    if (upper.includes("FUNCTION_HTTP_401")) {
      return "La sessione non è valida. Esci dall’account e accedi nuovamente.";
    }
    if (upper.includes("FUNCTION_HTTP_403")) {
      return "Supabase ha rifiutato l’operazione perché il profilo non risulta admin attivo.";
    }

    const baseMessage = typeof base.friendlyError === "function"
      ? base.friendlyError(error)
      : "";

    if (baseMessage && !/operazione non riuscita|errorgeneric/i.test(baseMessage)) {
      return baseMessage;
    }

    return message
      ? "Operazione non riuscita: " + message
      : "Operazione non riuscita. Controlla i log della Edge Function.";
  }

  const patched = Object.assign({}, base, {
    requestAccountDeletion: function (reason) {
      return invokeDetailed("request-account-deletion", {
        reason: clean(reason || "", 500)
      });
    },
    adminDeleteUser: function (requestId) {
      return invokeDetailed("admin-delete-user", {
        request_id: clean(requestId, 100)
      });
    },
    adminCancelDeletion: function (requestId) {
      return invokeDetailed("admin-cancel-deletion", {
        request_id: clean(requestId, 100)
      });
    },
    adminSetAccountStatus: function (userId, role, status) {
      return invokeDetailed("admin-update-account-status", {
        user_id: clean(userId, 100),
        role: clean(role, 30),
        status: clean(status, 30)
      });
    },
    friendlyError: friendlyError
  });

  window.FilitaliaAuth = Object.freeze(patched);
  console.info("FILITALIA_ADMIN_FIX_READY");
})();
