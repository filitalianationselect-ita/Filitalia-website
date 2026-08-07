(function () {
  "use strict";

  const d = document;
  const $ = (id) => d.getElementById(id);
  const cfg = window.FILITALIA_CONFIG || {};
  let running = false;
  let last = [];

  const checks = [
    ["environment", "Ambiente", "Deploy Preview oppure sito definitivo"],
    ["config", "Configurazione", "Dominio e progetto Supabase"],
    ["isolation", "Database preview", "Separato dai dati del sito ufficiale"],
    ["pages", "Pagine pubbliche", "Home, Eventi, News, Giocatori e Staff"],
    ["database", "Database", "Tabelle amministrative e operative"],
    ["eventContent", "Scheda evento", "Copertina, descrizioni e collegamenti"],
    ["publicRead", "Lettura pubblica", "Contenuti pubblicati leggibili senza login"],
    ["account", "Account Admin", "Ruolo attivo con permessi di gestione"],
    ["functions", "Funzioni server", "Email grafica, Gmail e gestione utenti"],
    ["gmail", "Gmail ufficiale", "Mittente collegato al gestionale"],
    ["content", "Contenuti pubblicati", "Eventi, News, giocatori e staff visibili"]
  ];

  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);

  function addStyle() {
    if ($("siteConnectionStyle")) return;
    const style = d.createElement("style");
    style.id = "siteConnectionStyle";
    style.textContent = `
      .site-connect{margin-top:18px;border:1px solid #bcd8c9;border-radius:23px;background:#fff;overflow:hidden}
      .site-connect-head{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:22px 23px;background:linear-gradient(135deg,#082f22,#167452);color:#fff}
      .site-connect-head h2{margin:4px 0 5px;color:#fff!important}.site-connect-head .muted{color:#cce5d8!important}
      .site-connect-progress{height:10px;background:#dbe8e1;border-radius:999px;overflow:hidden;margin:17px 20px 0}
      .site-connect-progress span{display:block;height:100%;width:0;background:linear-gradient(90deg,#16805a,#36a978);transition:width .25s}
      .site-connect-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;padding:18px 20px}
      .site-connect-item{border:1px solid #d2e3da;border-radius:16px;padding:15px;background:#f8fbf9}
      .site-connect-item-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.site-connect-item h3{font-size:15px!important;margin:0}
      .site-connect-item p{font-size:12px;line-height:1.5;color:#60766c;margin:8px 0 0}
      .site-connect-next{margin:0 20px 20px;padding:17px;border-radius:17px;border:1px solid #c4dccf;background:#edf7f2}
      .site-connect-next h3{margin:0 0 7px;font-size:17px!important;color:#124932}.site-connect-next p{margin:0;color:#4e6c5e;line-height:1.55;font-size:13px}
      .site-connect-steps{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:13px}.site-connect-step{padding:12px;border:1px solid #d1e2d9;background:#fff;border-radius:13px;font-size:12px;color:#506e5f}.site-connect-step b{display:block;color:#173f30;margin-bottom:4px}
      .site-connect-foot{padding:13px 20px;border-top:1px solid #d9e6df;background:#f5f9f7;color:#5b7368;font-size:12px}
      @media(max-width:800px){.site-connect-grid,.site-connect-steps{grid-template-columns:1fr}.site-connect-head{align-items:flex-start;flex-direction:column}}
    `;
    d.head.appendChild(style);
  }

  function settingsSection() {
    return $("settings") || $("settingsSection") || d.querySelector('[data-section-content="settings"]');
  }

  function mount() {
    const section = settingsSection();
    if (!section || $("siteConnectionCenter")) return Boolean(section);
    addStyle();
    const node = d.createElement("section");
    node.id = "siteConnectionCenter";
    node.className = "site-connect";
    node.innerHTML = `
      <div class="site-connect-head">
        <div><span class="eyebrow" style="color:#a9d9c3">COLLEGAMENTO AL SITO</span><h2>Cosa manca per completare la preview</h2><div class="muted">Controllo reale di pannello, Supabase, pagine pubbliche, funzioni e Gmail.</div></div>
        <div class="actions"><span id="siteConnectionSummary" class="pill orange">DA CONTROLLARE</span><button id="siteConnectionRun" class="btn primary">↻ Controlla collegamento</button></div>
      </div>
      <div class="site-connect-progress"><span id="siteConnectionProgress"></span></div>
      <div class="site-connect-grid">${checks.map(([key, title, subtitle]) => `
        <article class="site-connect-item"><div class="site-connect-item-head"><div><h3>${escapeHtml(title)}</h3><div class="muted">${escapeHtml(subtitle)}</div></div><span class="pill orange" data-site-state="${key}">ATTESA</span></div><p data-site-detail="${key}">Controllo non eseguito.</p></article>
      `).join("")}</div>
      <div id="siteConnectionNext" class="site-connect-next"><h3>Prossima azione</h3><p>Esegui il controllo per vedere il primo passaggio necessario.</p><div class="site-connect-steps"><div class="site-connect-step"><b>1. Database</b>Migrazione unica e RLS.</div><div class="site-connect-step"><b>2. Funzioni</b>Email grafica, inviti e Gmail OAuth.</div><div class="site-connect-step"><b>3. Contenuti</b>Elementi pubblicati di prova.</div><div class="site-connect-step"><b>4. Collaudo</b>Test completo sulla preview.</div></div></div>
      <div id="siteConnectionFoot" class="site-connect-foot">Il controllo è in sola lettura: non modifica dati e non invia email.</div>
    `;
    section.insertAdjacentElement("afterbegin", node);
    $("siteConnectionRun").onclick = run;
    setTimeout(run, 700);
    return true;
  }

  function setResult(key, level, detail) {
    const badge = d.querySelector(`[data-site-state="${key}"]`);
    const text = d.querySelector(`[data-site-detail="${key}"]`);
    if (badge) {
      badge.className = `pill ${level === "ok" ? "green" : level === "bad" ? "red" : "orange"}`;
      badge.textContent = level === "ok" ? "PRONTO" : level === "bad" ? "MANCANTE" : "DA VERIFICARE";
    }
    if (text) text.textContent = detail;
    last.push({ key, level, detail });
  }

  async function table(client, name, columns = "*") {
    const result = await client.from(name).select(columns, { count: "exact", head: true });
    if (result.error) throw result.error;
    return Number(result.count || 0);
  }

  async function pageCheck(path) {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    return /public-content-bridge-v1\.js/.test(await response.text());
  }

  async function functionCheck(name) {
    if (!cfg.supabaseUrl) return false;
    try {
      const response = await fetch(`${cfg.supabaseUrl}/functions/v1/${name}`, {
        method: "OPTIONS",
        headers: { apikey: cfg.supabasePublishableKey || "" }
      });
      return response.status !== 404;
    } catch (_) {
      return false;
    }
  }

  function paintNextAction() {
    const first = last.find((item) => item.level === "bad") || last.find((item) => item.level === "warn");
    const box = $("siteConnectionNext");
    if (!box) return;
    let title = "La Deploy Preview è collegata";
    let detail = "Esegui il collaudo completo con dati di prova prima di valutare la pubblicazione su main.";
    if (first) {
      const messages = {
        environment: ["Aprire la Deploy Preview", "Il collaudo deve essere eseguito sulla preview Netlify, non direttamente sul sito ufficiale."],
        config: ["Configurare Supabase", "URL, chiave pubblicabile e URL della preview devono essere generati correttamente dalla build Netlify."],
        isolation: ["Separare il database di prova", "Imposta su Netlify FILITALIA_PREVIEW_SUPABASE_URL e FILITALIA_PREVIEW_SUPABASE_PUBLISHABLE_KEY prima di usare dati reali."],
        pages: ["Collegare tutte le pagine pubbliche", "Home, Eventi, News, Giocatori e Staff devono caricare public-content-bridge-v1.js."],
        database: ["Eseguire la migrazione unica", "Esegui supabase/migrations/20260728090000_filitalia_admin_complete.sql sul progetto di collaudo."],
        eventContent: ["Completare lo schema eventi", "La migrazione unica deve creare copertine, descrizioni e collegamenti con News, staff e giocatori."],
        publicRead: ["Attivare la lettura pubblica", "Le policy RLS devono permettere ai visitatori di leggere soltanto contenuti pubblicati o attivi."],
        account: ["Attivare un account amministrativo", "Accedi con un profilo Admin o Super Admin con status active."],
        functions: ["Pubblicare le funzioni Supabase", "Distribuisci le sette funzioni Supabase, inclusi Gmail, email grafica, gestione utenti e login con alias privato."],
        gmail: ["Collegare il Gmail ufficiale", "Configura i segreti Google e completa il collegamento OAuth dalla sezione Comunicazioni."],
        content: ["Pubblicare contenuti di prova", "Imposta come pubblicato o attivo almeno un evento, una News, un giocatore o uno staff per verificarne la comparsa sulla preview."]
      };
      [title, detail] = messages[first.key] || [title, first.detail];
    }
    box.querySelector("h3").textContent = title;
    box.querySelector("p").textContent = detail;
  }

  async function run() {
    if (running || !$("siteConnectionCenter")) return;
    running = true;
    last = [];
    const button = $("siteConnectionRun");
    button.disabled = true;
    button.textContent = "Controllo…";

    try {
      const preview = Boolean(cfg.isPreview) || /deploy-preview|\.netlify\.app$|localhost|127\.0\.0\.1/i.test(location.hostname);
      setResult("environment", preview ? "ok" : "warn", preview ? "Deploy Preview attiva: ambiente corretto per il collaudo." : "Questa pagina non risulta una Deploy Preview di collaudo.");

      const configured = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey && cfg.siteUrl && window.supabase);
      setResult("config", configured ? "ok" : "bad", configured ? `Progetto ${cfg.supabaseUrl.replace(/^https?:\/\//, "")} collegato a ${cfg.siteUrl}.` : "Configurazione Supabase o URL del sito mancante.");

      if (preview) {
        setResult("isolation", cfg.usesPreviewDatabase ? "ok" : "bad", cfg.usesPreviewDatabase ? "La preview usa un progetto Supabase separato dai dati ufficiali." : "La preview sta usando il fallback: mancano le due variabili Netlify del database di collaudo.");
      } else {
        setResult("isolation", "warn", "Controllo isolamento previsto soltanto nella Deploy Preview.");
      }

      const pages = ["/index.html", "/events.html", "/news.html", "/players.html", "/staff.html"];
      let pageResults = [];
      try { pageResults = await Promise.all(pages.map(pageCheck)); } catch (_) { pageResults = []; }
      const pagesReady = pageResults.length === pages.length && pageResults.every(Boolean);
      setResult("pages", pagesReady ? "ok" : "bad", pagesReady ? "Le cinque pagine principali caricano il ponte dinamico." : "Una o più pagine non caricano public-content-bridge-v1.js.");

      if (!configured) {
        ["database", "eventContent", "publicRead", "account", "functions", "gmail", "content"].forEach((key) => setResult(key, "bad", "Richiede prima una configurazione Supabase valida."));
        finish();
        return;
      }

      const adminClient = window.FilitaliaAuth?.client || window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
      const anonymousClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, { auth: { persistSession: false, autoRefreshToken: false } });

      const requiredTables = ["admin_events", "admin_news", "admin_players", "admin_staff", "admin_event_links", "event_admin_operations", "admin_user_permissions"];
      const databaseErrors = [];
      for (const name of requiredTables) {
        try { await table(adminClient, name); } catch (error) { databaseErrors.push(`${name}: ${error.message || error}`); }
      }
      setResult("database", databaseErrors.length ? "bad" : "ok", databaseErrors.length ? `Tabelle non disponibili: ${databaseErrors.map((item) => item.split(":")[0]).join(", ")}.` : "Tutte le tabelle principali della migrazione unica sono raggiungibili.");

      let eventContentReady = true;
      let eventContentDetail = "Copertine, descrizioni e collegamenti evento disponibili.";
      try {
        await table(adminClient, "admin_events", "id,image_url,excerpt,description");
        await table(adminClient, "admin_event_links", "id,event_id,entity_type,entity_id");
      } catch (error) {
        eventContentReady = false;
        eventContentDetail = `Esegui la migrazione unica: ${error.message || error}`;
      }
      setResult("eventContent", eventContentReady ? "ok" : "bad", eventContentDetail);

      const publicQueries = [
        ["admin_events", "published"],
        ["admin_news", "published"],
        ["admin_players", "active"],
        ["admin_staff", "active"]
      ];
      let publicReady = true;
      const publicCounts = {};
      for (const [name, status] of publicQueries) {
        const result = await anonymousClient.from(name).select("id", { count: "exact", head: true }).eq("status", status);
        if (result.error) { publicReady = false; publicCounts[name] = result.error.message; }
        else publicCounts[name] = Number(result.count || 0);
      }
      setResult("publicRead", publicReady ? "ok" : "bad", publicReady ? "Le policy pubbliche rispondono senza login." : "Una o più policy RLS pubbliche non sono attive.");

      let accountLevel = "warn";
      let accountDetail = "Nessuna sessione amministrativa attiva.";
      try {
        const profile = await window.FilitaliaAuth?.getActualOwnProfile?.() || await window.FilitaliaAuth?.getOwnProfile?.();
        const role = profile?.actual_role || profile?.role;
        if (profile && ["admin", "super_admin"].includes(role) && profile.status === "active") {
          accountLevel = "ok";
          accountDetail = `Accesso ${role} attivo per ${profile.email || profile.id}.`;
        } else if (profile) accountDetail = `Profilo ${role || "senza ruolo"} con stato ${profile.status || "non definito"}.`;
      } catch (error) { accountDetail = String(error.message || error); }
      setResult("account", accountLevel, accountDetail);

      const functionNames = ["gmail-oauth-start", "gmail-oauth-callback", "send-filitalia-branded-email", "admin-invite-user", "admin-update-account-status", "sign-in-alias", "google-admin-data"];
      const functionResults = await Promise.all(functionNames.map(functionCheck));
      const missingFunctions = functionNames.filter((_, index) => !functionResults[index]);
      setResult("functions", missingFunctions.length ? "bad" : "ok", missingFunctions.length ? `Funzioni non rilevate: ${missingFunctions.join(", ")}.` : "Tutte le sette funzioni server richieste rispondono.");

      let gmailLevel = "warn";
      let gmailDetail = "Gmail non collegato oppure account non autenticato.";
      try {
        if (window.FilitaliaAdminData?.getGmailConnection) {
          const connection = await window.FilitaliaAdminData.getGmailConnection();
          if (connection?.gmail_address) {
            gmailLevel = "ok";
            gmailDetail = `Mittente collegato: ${connection.gmail_address}.`;
          }
        }
      } catch (error) { gmailDetail = String(error.message || error); }
      setResult("gmail", gmailLevel, gmailDetail);

      const totalPublic = Object.values(publicCounts).filter((value) => typeof value === "number").reduce((sum, value) => sum + value, 0);
      setResult("content", totalPublic > 0 ? "ok" : "warn", totalPublic > 0 ? `${totalPublic} contenuti pubblicati o attivi sono leggibili dalla preview.` : "Il collegamento può funzionare, ma non risultano ancora contenuti pubblicati o attivi.");

      finish();
    } catch (error) {
      setResult("database", "bad", `Controllo interrotto: ${error.message || error}`);
      finish();
    }

    function finish() {
      const ok = last.filter((item) => item.level === "ok").length;
      const bad = last.filter((item) => item.level === "bad").length;
      const warn = last.filter((item) => item.level === "warn").length;
      const percentage = Math.round(ok / checks.length * 100);
      $("siteConnectionProgress").style.width = `${percentage}%`;
      const summary = $("siteConnectionSummary");
      summary.textContent = bad ? `${bad} MANCANTI` : warn ? `${warn} DA VERIFICARE` : "PREVIEW COLLEGATA";
      summary.className = `pill ${bad ? "red" : warn ? "orange" : "green"}`;
      $("siteConnectionFoot").textContent = `${ok}/${checks.length} passaggi pronti · ${warn} da verificare · ${bad} mancanti. Nessun dato è stato modificato.`;
      paintNextAction();
      button.disabled = false;
      button.textContent = "↻ Controlla collegamento";
      running = false;
      window.dispatchEvent(new CustomEvent("filitalia:site-connection-checked", { detail: { results: last.slice() } }));
    }
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (mount() || attempts > 80) clearInterval(timer);
  }, 250);

  window.FilitaliaSiteConnection = Object.freeze({ run, getResults: () => last.slice() });
})();
