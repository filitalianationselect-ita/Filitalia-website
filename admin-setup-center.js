(function () {
  "use strict";

  const d = document;
  const $ = function (id) { return d.getElementById(id); };
  const ROMA_EVENT_ID = "idcamp-roma-2026";
  let checking = false;

  const css = `
    .setup-center{display:grid;gap:16px}.setup-hero{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap;padding:18px;border-radius:18px;background:linear-gradient(135deg,#0c2f22,#154b37);color:#fff;box-shadow:0 15px 35px rgba(8,31,22,.16)}
    .setup-hero h2{margin:4px 0 5px}.setup-hero .muted{color:#bed8cb}.setup-actions{display:flex;gap:8px;flex-wrap:wrap}.setup-actions .btn.secondary{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.24);color:#fff}
    .setup-summary{display:inline-flex;align-items:center;gap:8px;padding:8px 11px;border-radius:999px;background:#fff1d6;color:#8c5b0b;font-size:11px;font-weight:900}.setup-summary.ready{background:#ddf4e7;color:#146c49}.setup-summary-dot{width:9px;height:9px;border-radius:50%;background:currentColor}
    .setup-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.setup-item{border:1px solid var(--line);border-radius:16px;background:#fff;padding:15px;box-shadow:var(--shadow)}.setup-item-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.setup-item h3{margin:0 0 5px;font-size:14px}.setup-item p{margin:0;color:var(--muted);font-size:11px;line-height:1.5}.setup-state{white-space:nowrap;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;background:#eef1f0;color:#63706a}.setup-state.ok{background:#dff4e8;color:#166c4b}.setup-state.warn{background:#fff1d6;color:#8c5b0b}.setup-state.bad{background:#fde5e5;color:#9f3535}.setup-detail{margin-top:11px;padding-top:10px;border-top:1px solid #edf2ef;font-size:11px;color:#53645c;min-height:28px}.setup-guide{padding:16px;border:1px solid #dce9e2;border-radius:16px;background:#f4f8f6}.setup-guide h3{margin:0 0 8px}.setup-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.setup-step{background:#fff;border:1px solid var(--line);border-radius:13px;padding:12px}.setup-step b{display:block;margin-bottom:4px;font-size:12px}.setup-step span{font-size:10px;color:var(--muted);line-height:1.45}
    @media(max-width:900px){.setup-grid,.setup-steps{grid-template-columns:1fr 1fr}}@media(max-width:560px){.setup-grid,.setup-steps{grid-template-columns:1fr}.setup-hero{align-items:flex-start}.setup-actions{width:100%}.setup-actions .btn{flex:1}}
  `;

  function addStyle() {
    if ($("adminSetupStyle")) return;
    const style = d.createElement("style");
    style.id = "adminSetupStyle";
    style.textContent = css;
    d.head.appendChild(style);
  }

  function statusCard(key, title, description) {
    return `<article class="setup-item" data-setup-card="${key}"><div class="setup-item-head"><div><h3>${title}</h3><p>${description}</p></div><span class="setup-state" data-setup-state="${key}">DA VERIFICARE</span></div><div class="setup-detail" data-setup-detail="${key}">Controllo non ancora eseguito.</div></article>`;
  }

  function findSection() {
    return $("settings") || $("settingsSection") || d.querySelector('[data-section-content="settings"]');
  }

  function mount() {
    const section = findSection();
    if (!section || $("adminSetupCenter")) return Boolean(section);
    addStyle();
    const topbar = section.querySelector(".topbar");
    const target = topbar ? topbar : section.firstElementChild;
    const html = `<div id="adminSetupCenter" class="setup-center section-gap">
      <section class="setup-hero">
        <div><span class="eyebrow" style="color:#9bc9b2">CONTROLLO COLLEGAMENTI</span><h2>Stato sistema FIL-ITALIA</h2><div class="muted">Un solo pannello, con demo e dati reali chiaramente separati.</div></div>
        <div class="setup-actions"><span id="setupSummary" class="setup-summary"><span class="setup-summary-dot"></span>DA VERIFICARE</span><button id="setupLogin" class="btn secondary" type="button">Accedi ai dati reali</button><button id="setupCheck" class="btn primary" type="button">↻ Verifica ora</button></div>
      </section>
      <section class="setup-grid">
        ${statusCard("config", "Supabase", "Indirizzo e chiave pubblica del progetto.")}
        ${statusCard("session", "Account amministratore", "Sessione attiva con ruolo admin approvato.")}
        ${statusCard("database", "Database operativo", "Tabelle Event Day, pagamenti e storico.")}
        ${statusCard("storage", "Documenti privati", "Bucket per certificati e foto giocatori.")}
        ${statusCard("registrations", "Registrazioni reali", "Lettura degli iscritti del camp di Roma.")}
        ${statusCard("gmail", "Gmail FIL-ITALIA", "Account ufficiale autorizzato all’invio.")}
      </section>
      <section class="setup-guide"><h3>Ordine di attivazione</h3><div class="setup-steps"><div class="setup-step"><b>1. Database</b><span>Esegui una sola volta la migrazione Supabase già preparata.</span></div><div class="setup-step"><b>2. Account admin</b><span>Accedi con il profilo FIL-ITALIA avente ruolo admin e stato active.</span></div><div class="setup-step"><b>3. Gmail</b><span>Collega l’account ufficiale dalla sezione Comunicazioni.</span></div></div></section>
    </div>`;
    if (target && target !== section) target.insertAdjacentHTML("afterend", html);
    else section.insertAdjacentHTML("afterbegin", html);

    $("setupCheck").onclick = inspect;
    $("setupLogin").onclick = function () {
      const loginButton = $("adminRealLoginBtn");
      if (loginButton) loginButton.click();
      else if (window.FilitaliaAdminLight && window.FilitaliaAdminLight.openRealLogin) window.FilitaliaAdminLight.openRealLogin();
    };
    setTimeout(inspect, 300);
    return true;
  }

  function setStatus(key, state, label, detail) {
    const badge = d.querySelector(`[data-setup-state="${key}"]`);
    const box = d.querySelector(`[data-setup-detail="${key}"]`);
    if (badge) {
      badge.className = "setup-state " + state;
      badge.textContent = label;
    }
    if (box) box.textContent = detail;
  }

  function summarize(results) {
    const values = Object.values(results);
    const good = values.filter(Boolean).length;
    const summary = $("setupSummary");
    if (!summary) return;
    const ready = good === values.length;
    summary.classList.toggle("ready", ready);
    summary.innerHTML = '<span class="setup-summary-dot"></span>' + (ready ? "TUTTO PRONTO" : good + "/" + values.length + " COLLEGAMENTI PRONTI");
    const login = $("setupLogin");
    if (login) login.textContent = results.session ? "Account admin collegato" : "Accedi ai dati reali";
  }

  function errorText(error) {
    const value = String(error && (error.message || error.code) || error || "");
    if (value.includes("NOT_AUTHENTICATED")) return "Nessuna sessione amministratore attiva.";
    if (value.includes("NOT_AUTHORIZED")) return "Profilo presente, ma non abilitato come admin attivo.";
    if (value.includes("event_admin_operations") || value.includes("does not exist")) return "Migrazione non ancora eseguita nel progetto Supabase.";
    if (value.includes("row-level security") || value.includes("permission denied")) return "Accesso negato dalle regole di sicurezza.";
    return value || "Controllo non riuscito.";
  }

  async function inspect() {
    if (checking || !$("adminSetupCenter")) return;
    checking = true;
    const button = $("setupCheck");
    if (button) { button.disabled = true; button.textContent = "Verifica…"; }
    const result = { config: false, session: false, database: false, storage: false, registrations: false, gmail: false };

    const auth = window.FilitaliaAuth;
    const service = window.FilitaliaAdminData;
    const configured = Boolean(auth && auth.configured && auth.client);
    result.config = configured;
    setStatus("config", configured ? "ok" : "bad", configured ? "PRONTO" : "MANCANTE", configured ? "Configurazione Supabase caricata correttamente." : "Controlla supabase-config.js e la libreria Supabase.");

    if (!configured || !service) {
      setStatus("session", "warn", "NON COLLEGATO", "Accedi dopo aver configurato Supabase.");
      setStatus("database", "warn", "IN ATTESA", "Il database verrà verificato dopo l’accesso admin.");
      setStatus("storage", "warn", "IN ATTESA", "Il bucket verrà verificato dopo l’accesso admin.");
      setStatus("registrations", "warn", "IN ATTESA", "Le registrazioni verranno lette dopo l’accesso admin.");
      setStatus("gmail", "warn", "IN ATTESA", "Gmail verrà verificato dopo l’accesso admin.");
      summarize(result);
      checking = false;
      if (button) { button.disabled = false; button.textContent = "↻ Verifica ora"; }
      return;
    }

    try {
      const admin = await service.requireAdmin();
      result.session = true;
      const email = admin && admin.profile ? admin.profile.email : "";
      setStatus("session", "ok", "COLLEGATO", email ? "Admin attivo: " + email : "Account amministratore attivo.");
    } catch (error) {
      setStatus("session", "warn", "NON COLLEGATO", errorText(error));
      ["database", "storage", "registrations", "gmail"].forEach(function (key) { setStatus(key, "warn", "IN ATTESA", "Richiede prima l’accesso amministratore."); });
      summarize(result);
      checking = false;
      if (button) { button.disabled = false; button.textContent = "↻ Verifica ora"; }
      return;
    }

    try {
      const dbCheck = await auth.client.from("event_admin_operations").select("registration_id", { count: "exact", head: true });
      if (dbCheck.error) throw dbCheck.error;
      result.database = true;
      setStatus("database", "ok", "PRONTO", "Tabelle operative raggiungibili e protette da accesso admin.");
    } catch (error) {
      setStatus("database", "bad", "DA ATTIVARE", errorText(error));
    }

    try {
      const storageCheck = await auth.client.storage.from("event-documents").list("", { limit: 1 });
      if (storageCheck.error) throw storageCheck.error;
      result.storage = true;
      setStatus("storage", "ok", "PRONTO", "Bucket privato event-documents raggiungibile.");
    } catch (error) {
      setStatus("storage", "bad", "DA ATTIVARE", errorText(error));
    }

    try {
      const rows = await service.loadEvent(ROMA_EVENT_ID);
      result.registrations = true;
      setStatus("registrations", "ok", "PRONTO", rows.length + " registrazioni trovate per Roma.");
    } catch (error) {
      setStatus("registrations", "bad", "ERRORE", errorText(error));
    }

    try {
      const gmail = await service.getGmailConnection();
      result.gmail = Boolean(gmail);
      setStatus("gmail", gmail ? "ok" : "warn", gmail ? "COLLEGATO" : "NON COLLEGATO", gmail ? "Mittente: " + gmail.gmail_address : "Apri Comunicazioni e collega l’account Gmail ufficiale.");
    } catch (error) {
      setStatus("gmail", "warn", "NON COLLEGATO", errorText(error));
    }

    summarize(result);
    checking = false;
    if (button) { button.disabled = false; button.textContent = "↻ Verifica ora"; }
  }

  let attempts = 0;
  const timer = setInterval(function () {
    attempts += 1;
    if (mount() || attempts > 40) clearInterval(timer);
  }, 250);

  window.FilitaliaAdminSetup = Object.freeze({ refresh: inspect });
})();