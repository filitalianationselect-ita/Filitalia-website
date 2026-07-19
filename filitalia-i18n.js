(function () {
  "use strict";

  const messages = {
    it: {
      account: "Account", openMenu: "Apri menu", privacyPolicy: "Privacy Policy", documents: "Documenti",
      backHome: "← Torna alla Home", backEvents: "← Torna agli Eventi", backSite: "← Torna al sito", backLogin: "← Torna all’accesso", backPlayers: "← Torna ai Giocatori", backNews: "← Torna alle News",
      share: "Condividi", playerNotFound: "Giocatore non trovato", newsNotFound: "News non trovata",
      playerProfileBadge: "PROFILO GIOCATORE FIL-ITALIA", category: "CATEGORIA", height: "ALTEZZA", club: "CLUB", city: "CITTÀ",
      loginTitle: "AREA RISERVATA",
      loginSubtitle: "Accedi al profilo FIL-ITALIA oppure crea un account da sottoporre all’approvazione dello staff.",
      loginConfig: "Il sistema account è pronto, ma deve essere collegato al progetto Supabase inserendo URL e chiave pubblicabile in <strong>supabase-config.js</strong>.",
      tabLogin: "Accedi", tabSignup: "Crea account", tabReset: "Password", email: "Email", password: "Password",
      firstName: "Nome", lastName: "Cognome", requestedAccount: "Tipo di account richiesto",
      rolePlayer: "Giocatore", roleParent: "Genitore / Tutore", roleCoach: "Coach", roleCoordinator: "Coordinatore", roleStaff: "Staff", roleAdmin: "Amministratore",
      repeatPassword: "Ripeti password", privacyAccept: "Ho letto e accetto la <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener noreferrer\">Privacy Policy</a>.",
      loginButton: "ACCEDI", signupButton: "CREA ACCOUNT", resetInfo: "Inserisci l’email dell’account. Per sicurezza, il messaggio mostrato sarà uguale anche se l’indirizzo non è registrato.", resetButton: "INVIA LINK",
      accountConfig: "Collega Supabase in <strong>supabase-config.js</strong> prima di usare l’area riservata.",
      pending: "In attesa", loading: "Caricamento...", logout: "ESCI",
      pendingApproval: "L’account è stato creato ma deve ancora essere approvato. Nel frattempo puoi aggiornare i dati di base; le funzioni riservate restano bloccate.",
      personalData: "Dati personali", phone: "Telefono", accountCity: "Città", language: "Lingua", saveProfile: "SALVA PROFILO",
      myRegistrations: "Le mie registrazioni", playerCampProfile: "Profilo giocatore per i camp",
      playerCampProfileHelp: "Compila questi dati una sola volta. Nei camp verranno recuperati automaticamente insieme alla foto.",
      playerPhoto: "Foto giocatore", playerPhotoAlt: "Anteprima foto giocatore", playerPhotoHelp: "JPG, PNG o WEBP. Massimo 5 MB. Se hai già una foto, non devi ricaricarla.",
      birthDate: "Data di nascita", sex: "Sesso", select: "Seleziona", male: "Maschio", female: "Femmina", otherSex: "Altro / Preferisco non indicarlo",
      residenceCity: "Città di residenza", basketballRole: "Ruolo basket", currentClub: "Squadra attuale", heightCm: "Altezza (cm)", weightKg: "Peso (kg)",
      italianPassport: "Passaporto italiano", filipinoPassport: "Passaporto filippino", yes: "Sì", no: "No", instagram: "Instagram", highlights: "Highlights", savePlayerProfile: "SALVA PROFILO GIOCATORE",
      parentArea: "Area genitore", linkedPlayers: "Giocatori collegati", linkedPlayersText: "Gestione dei figli o atleti minorenni associati.", camp: "Camp", parentCampText: "Iscrizioni, consensi e stato del pagamento.", communications: "Comunicazioni", communicationsText: "Aggiornamenti ufficiali FIL-ITALIA.",
      staffArea: "Area staff", players: "Giocatori", staffPlayersText: "Accesso limitato agli atleti assegnati.", evaluations: "Valutazioni", evaluationsText: "Inserimento note tecniche e presenze.", activities: "Attività", activitiesText: "Camp e convocazioni della propria area.",
      accountApproval: "Approvazione account", accountApprovalText: "Il ruolo scelto dall’utente è solo una richiesta. L’account diventa operativo esclusivamente dopo l’approvazione dell’amministratore.", approve: "Approva", reject: "Rifiuta", requestLabel: "Richiesta", noPendingAccounts: "Nessun account in attesa.", loadingRequests: "Caricamento richieste...",
      noRegistrations: "Nessuna registrazione collegata all’account.", registrationsUnavailable: "Le registrazioni saranno visibili dopo la migrazione del database.", status: "Stato", payment: "Pagamento", received: "ricevuta", toVerify: "da verificare",
      rolePending: "In attesa", roleAdminLabel: "Amministratore", roleCoordinatorLabel: "Coordinatore", roleCoachLabel: "Coach", roleParentLabel: "Genitore", rolePlayerLabel: "Giocatore", roleStaffLabel: "Staff",
      statusPending: "In attesa di approvazione", statusActive: "Attivo", statusSuspended: "Sospeso", statusRejected: "Non approvato",
      loggingIn: "Accesso in corso...", passwordsMismatch: "Le password non coincidono.", privacyRequired: "Devi accettare la Privacy Policy.", creatingAccount: "Creazione account...", accountCreatedOpening: "Account creato. Apertura area riservata...", accountCreatedConfirm: "Account creato. Controlla l’email e conferma l’indirizzo.", sendingLink: "Invio del link...", resetSent: "Se l’account esiste, riceverai un link per cambiare password.",
      saving: "Salvataggio...", profileSynced: "Profilo aggiornato e sincronizzato con il DATABASE.", profileSavedSheet: "Profilo salvato su account. Google Sheet: {message}", syncFailed: "Sincronizzazione non riuscita",
      savingPlayer: "Salvataggio profilo giocatore...", playerSynced: "Profilo giocatore salvato e sincronizzato con il DATABASE. La foto verrà riutilizzata nei camp.", playerSavedSheet: "Profilo giocatore salvato su account. Google Sheet: {message}",
      resetPasswordTitle: "NUOVA PASSWORD", resetPasswordSubtitle: "Scegli una password di almeno 10 caratteri, diversa da quelle usate in passato.", resetConfig: "Collega Supabase in <strong>supabase-config.js</strong>.", newPassword: "Nuova password", updatePassword: "AGGIORNA PASSWORD", openFromEmail: "Apri questa pagina dal link ricevuto via email.", updatingPassword: "Aggiornamento password...", passwordUpdated: "Password aggiornata. Ora puoi entrare nell’account.",
      errorSupabase: "Gli account non sono ancora collegati a Supabase.", errorEmail: "Inserisci un indirizzo email valido.", errorWeakPassword: "La password deve contenere almeno 10 caratteri.", errorName: "Nome e cognome sono obbligatori.", errorSession: "Sessione scaduta. Accedi di nuovo.", errorPhotoRequired: "Seleziona una foto giocatore.", errorPhotoType: "La foto deve essere JPG, PNG oppure WEBP.", errorPhotoSize: "La foto non può superare 5 MB.", errorSheetConfig: "Il collegamento al database Google Sheet non è configurato.", errorLogin: "Email o password non corretti.", errorEmailConfirm: "Conferma prima l’email ricevuta.", errorRegistered: "Esiste già un account con questa email.", errorRate: "Troppi tentativi. Riprova più tardi.", errorNetwork: "Problema di connessione. Riprova.", errorGeneric: "Operazione non riuscita. Riprova o contatta FIL-ITALIA.",
      campLoginNotice: "Accedi con un profilo giocatore per compilare automaticamente i dati. Senza profilo dovrai inserire anche la foto.", campProfileUnavailable: "Profilo account non disponibile. Compila il modulo manualmente.", campCompleteProfile: "Completa prima il profilo giocatore e carica la foto nell’area Account. Finché il profilo non è completo, la foto resta richiesta qui.", campNotPlayer: "Questo account non è un profilo giocatore attivo. Compila i dati del partecipante manualmente.", campProfileLoaded: "Profilo giocatore caricato: dati e foto verranno riutilizzati automaticamente. Devi scegliere solo il camp, la taglia e i consensi.", campProfileError: "Non è stato possibile caricare il profilo. Puoi comunque compilare il modulo manualmente.",
      campPhotoHelp: "Non serve se accedi con un profilo Player attivo che ha già una foto salvata.", adultOnly: "solo se maggiorenne", selectSize: "Seleziona taglia",
      invalidSubmission: "Invio non valido. Ricarica la pagina e riprova.", invalidEmails: "Controlla che gli indirizzi email siano corretti.",
      privacyTitlePage: "PRIVACY POLICY", privacySubtitlePage: "Informazioni su come FIL-ITALIA Basketball raccoglie e utilizza i dati per registrazioni, eventi, contenuti media e comunicazioni.",
      documentsTitlePage: "DOCUMENTI", documentsSubtitlePage: "Documenti ufficiali FIL-ITALIA Basketball per registrazioni, camp, consenso media e partecipazione agli eventi."
    },
    en: {
      account: "Account", openMenu: "Open menu", privacyPolicy: "Privacy Policy", documents: "Documents",
      backHome: "← Back to Home", backEvents: "← Back to Events", backSite: "← Back to the website", backLogin: "← Back to login", backPlayers: "← Back to Players", backNews: "← Back to News",
      share: "Share", playerNotFound: "Player not found", newsNotFound: "News not found",
      playerProfileBadge: "FIL-ITALIA PLAYER PROFILE", category: "CATEGORY", height: "HEIGHT", club: "CLUB", city: "CITY",
      loginTitle: "MEMBER AREA", loginSubtitle: "Log in to your FIL-ITALIA profile or create an account for staff approval.",
      loginConfig: "The account system is ready, but it must be connected to Supabase by adding the URL and publishable key in <strong>supabase-config.js</strong>.",
      tabLogin: "Log in", tabSignup: "Create account", tabReset: "Password", email: "Email", password: "Password",
      firstName: "First name", lastName: "Last name", requestedAccount: "Requested account type",
      rolePlayer: "Player", roleParent: "Parent / Guardian", roleCoach: "Coach", roleCoordinator: "Coordinator", roleStaff: "Staff", roleAdmin: "Administrator",
      repeatPassword: "Confirm password", privacyAccept: "I have read and accept the <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener noreferrer\">Privacy Policy</a>.",
      loginButton: "LOG IN", signupButton: "CREATE ACCOUNT", resetInfo: "Enter the account email. For security, the displayed message will be the same even if the address is not registered.", resetButton: "SEND LINK",
      accountConfig: "Connect Supabase in <strong>supabase-config.js</strong> before using the member area.",
      pending: "Pending", loading: "Loading...", logout: "LOG OUT",
      pendingApproval: "The account has been created but still needs approval. You can update your basic details while restricted features remain locked.",
      personalData: "Personal details", phone: "Phone", accountCity: "City", language: "Language", saveProfile: "SAVE PROFILE",
      myRegistrations: "My registrations", playerCampProfile: "Player profile for camps", playerCampProfileHelp: "Complete these details once. They and the photo will be reused automatically for camp registrations.",
      playerPhoto: "Player photo", playerPhotoAlt: "Player photo preview", playerPhotoHelp: "JPG, PNG or WEBP. Maximum 5 MB. You do not need to upload it again if a photo is already saved.",
      birthDate: "Date of birth", sex: "Sex", select: "Select", male: "Male", female: "Female", otherSex: "Other / Prefer not to say",
      residenceCity: "City of residence", basketballRole: "Basketball position", currentClub: "Current club", heightCm: "Height (cm)", weightKg: "Weight (kg)",
      italianPassport: "Italian passport", filipinoPassport: "Filipino passport", yes: "Yes", no: "No", instagram: "Instagram", highlights: "Highlights", savePlayerProfile: "SAVE PLAYER PROFILE",
      parentArea: "Parent area", linkedPlayers: "Linked players", linkedPlayersText: "Manage children or associated underage athletes.", camp: "Camps", parentCampText: "Registrations, consents and payment status.", communications: "Communications", communicationsText: "Official FIL-ITALIA updates.",
      staffArea: "Staff area", players: "Players", staffPlayersText: "Limited access to assigned athletes.", evaluations: "Evaluations", evaluationsText: "Enter technical notes and attendance.", activities: "Activities", activitiesText: "Camps and call-ups in your area.",
      accountApproval: "Account approval", accountApprovalText: "The role selected by the user is only a request. The account becomes operational only after administrator approval.", approve: "Approve", reject: "Reject", requestLabel: "Request", noPendingAccounts: "No accounts are pending.", loadingRequests: "Loading requests...",
      noRegistrations: "No registrations are linked to this account.", registrationsUnavailable: "Registrations will be visible after the database migration.", status: "Status", payment: "Payment", received: "received", toVerify: "to verify",
      rolePending: "Pending", roleAdminLabel: "Administrator", roleCoordinatorLabel: "Coordinator", roleCoachLabel: "Coach", roleParentLabel: "Parent", rolePlayerLabel: "Player", roleStaffLabel: "Staff",
      statusPending: "Awaiting approval", statusActive: "Active", statusSuspended: "Suspended", statusRejected: "Not approved",
      loggingIn: "Logging in...", passwordsMismatch: "The passwords do not match.", privacyRequired: "You must accept the Privacy Policy.", creatingAccount: "Creating account...", accountCreatedOpening: "Account created. Opening the member area...", accountCreatedConfirm: "Account created. Check your email and confirm the address.", sendingLink: "Sending the link...", resetSent: "If the account exists, you will receive a password reset link.",
      saving: "Saving...", profileSynced: "Profile updated and synchronized with the DATABASE.", profileSavedSheet: "Profile saved to the account. Google Sheet: {message}", syncFailed: "Synchronization failed",
      savingPlayer: "Saving player profile...", playerSynced: "Player profile saved and synchronized with the DATABASE. The photo will be reused for camps.", playerSavedSheet: "Player profile saved to the account. Google Sheet: {message}",
      resetPasswordTitle: "NEW PASSWORD", resetPasswordSubtitle: "Choose a password of at least 10 characters that is different from passwords used before.", resetConfig: "Connect Supabase in <strong>supabase-config.js</strong>.", newPassword: "New password", updatePassword: "UPDATE PASSWORD", openFromEmail: "Open this page from the link received by email.", updatingPassword: "Updating password...", passwordUpdated: "Password updated. You can now log in to your account.",
      errorSupabase: "Accounts are not connected to Supabase yet.", errorEmail: "Enter a valid email address.", errorWeakPassword: "The password must contain at least 10 characters.", errorName: "First and last name are required.", errorSession: "Your session has expired. Log in again.", errorPhotoRequired: "Select a player photo.", errorPhotoType: "The photo must be JPG, PNG or WEBP.", errorPhotoSize: "The photo cannot exceed 5 MB.", errorSheetConfig: "The Google Sheet database connection is not configured.", errorLogin: "Incorrect email or password.", errorEmailConfirm: "Confirm the email you received first.", errorRegistered: "An account with this email already exists.", errorRate: "Too many attempts. Try again later.", errorNetwork: "Connection problem. Try again.", errorGeneric: "The operation failed. Try again or contact FIL-ITALIA.",
      campLoginNotice: "Log in with a player profile to fill in the details automatically. Without a profile, you will also need to upload the photo.", campProfileUnavailable: "The account profile is unavailable. Complete the form manually.", campCompleteProfile: "Complete the player profile and upload the photo in the Account area first. The photo remains required here until the profile is complete.", campNotPlayer: "This account is not an active player profile. Enter the participant’s details manually.", campProfileLoaded: "Player profile loaded: details and photo will be reused automatically. You only need to choose the camp, shirt size and consents.", campProfileError: "The profile could not be loaded. You can still complete the form manually.",
      campPhotoHelp: "Not required when you are logged in with an active Player profile that already has a saved photo.", adultOnly: "only if the player is an adult", selectSize: "Select size",
      invalidSubmission: "Invalid submission. Reload the page and try again.", invalidEmails: "Check that the email addresses are correct.",
      privacyTitlePage: "PRIVACY POLICY", privacySubtitlePage: "Information about how FIL-ITALIA Basketball collects and uses data for registrations, events, media content and communication.",
      documentsTitlePage: "DOCUMENTS", documentsSubtitlePage: "Official FIL-ITALIA Basketball documents for registrations, camps, media consent and event participation."
    },
    ph: {
      account: "Account", openMenu: "Buksan ang menu", privacyPolicy: "Privacy Policy", documents: "Mga Dokumento",
      backHome: "← Bumalik sa Home", backEvents: "← Bumalik sa Events", backSite: "← Bumalik sa website", backLogin: "← Bumalik sa login", backPlayers: "← Bumalik sa Players", backNews: "← Bumalik sa News",
      share: "I-share", playerNotFound: "Hindi nakita ang player", newsNotFound: "Hindi nakita ang news",
      playerProfileBadge: "FIL-ITALIA PLAYER PROFILE", category: "KATEGORYA", height: "TAAS", club: "CLUB", city: "LUNGSOD",
      loginTitle: "MEMBER AREA", loginSubtitle: "Mag-log in sa FIL-ITALIA profile o gumawa ng account na aaprubahan ng staff.",
      loginConfig: "Handa na ang account system, pero kailangan itong i-connect sa Supabase sa pamamagitan ng URL at publishable key sa <strong>supabase-config.js</strong>.",
      tabLogin: "Mag-log in", tabSignup: "Gumawa ng account", tabReset: "Password", email: "Email", password: "Password",
      firstName: "Pangalan", lastName: "Apelyido", requestedAccount: "Hinihiling na uri ng account",
      rolePlayer: "Player", roleParent: "Magulang / Guardian", roleCoach: "Coach", roleCoordinator: "Coordinator", roleStaff: "Staff", roleAdmin: "Administrator",
      repeatPassword: "Ulitin ang password", privacyAccept: "Nabasa at tinatanggap ko ang <a href=\"privacy.html\" target=\"_blank\" rel=\"noopener noreferrer\">Privacy Policy</a>.",
      loginButton: "MAG-LOG IN", signupButton: "GUMAWA NG ACCOUNT", resetInfo: "Ilagay ang email ng account. Para sa seguridad, pareho ang mensaheng ipapakita kahit hindi rehistrado ang address.", resetButton: "IPADALA ANG LINK",
      accountConfig: "I-connect ang Supabase sa <strong>supabase-config.js</strong> bago gamitin ang member area.",
      pending: "Naghihintay", loading: "Naglo-load...", logout: "MAG-LOG OUT",
      pendingApproval: "Nagawa na ang account pero kailangan pa itong maaprubahan. Maaari mong i-update ang basic details habang naka-lock ang restricted features.",
      personalData: "Personal na impormasyon", phone: "Telepono", accountCity: "Lungsod", language: "Wika", saveProfile: "I-SAVE ANG PROFILE",
      myRegistrations: "Mga registration ko", playerCampProfile: "Player profile para sa camps", playerCampProfileHelp: "Kumpletuhin ang impormasyong ito nang isang beses. Awtomatikong gagamitin muli ang mga detalye at litrato sa camp registrations.",
      playerPhoto: "Litrato ng player", playerPhotoAlt: "Preview ng litrato ng player", playerPhotoHelp: "JPG, PNG o WEBP. Maximum 5 MB. Hindi na kailangang mag-upload ulit kung may naka-save nang litrato.",
      birthDate: "Petsa ng kapanganakan", sex: "Kasarian", select: "Pumili", male: "Lalaki", female: "Babae", otherSex: "Iba / Ayaw sabihin",
      residenceCity: "Lungsod ng tirahan", basketballRole: "Posisyon sa basketball", currentClub: "Kasalukuyang club", heightCm: "Taas (cm)", weightKg: "Timbang (kg)",
      italianPassport: "Italian passport", filipinoPassport: "Filipino passport", yes: "Oo", no: "Hindi", instagram: "Instagram", highlights: "Highlights", savePlayerProfile: "I-SAVE ANG PLAYER PROFILE",
      parentArea: "Parent area", linkedPlayers: "Mga naka-link na player", linkedPlayersText: "Pamamahala ng mga anak o naka-link na menor de edad na atleta.", camp: "Camps", parentCampText: "Registrations, consent at payment status.", communications: "Komunikasyon", communicationsText: "Opisyal na FIL-ITALIA updates.",
      staffArea: "Staff area", players: "Players", staffPlayersText: "Limitadong access sa mga assigned na atleta.", evaluations: "Evaluations", evaluationsText: "Paglalagay ng technical notes at attendance.", activities: "Activities", activitiesText: "Camps at call-ups sa sariling area.",
      accountApproval: "Pag-apruba ng account", accountApprovalText: "Request lamang ang role na pinili ng user. Magiging operational ang account pagkatapos lamang ng approval ng administrator.", approve: "Aprubahan", reject: "Tanggihan", requestLabel: "Request", noPendingAccounts: "Walang account na naghihintay.", loadingRequests: "Naglo-load ng requests...",
      noRegistrations: "Walang registration na naka-link sa account.", registrationsUnavailable: "Makikita ang registrations pagkatapos ng database migration.", status: "Status", payment: "Bayad", received: "natanggap", toVerify: "i-verify",
      rolePending: "Naghihintay", roleAdminLabel: "Administrator", roleCoordinatorLabel: "Coordinator", roleCoachLabel: "Coach", roleParentLabel: "Magulang", rolePlayerLabel: "Player", roleStaffLabel: "Staff",
      statusPending: "Naghihintay ng approval", statusActive: "Aktibo", statusSuspended: "Suspended", statusRejected: "Hindi naaprubahan",
      loggingIn: "Nagla-log in...", passwordsMismatch: "Hindi magkapareho ang mga password.", privacyRequired: "Kailangang tanggapin ang Privacy Policy.", creatingAccount: "Gumagawa ng account...", accountCreatedOpening: "Nagawa na ang account. Binubuksan ang member area...", accountCreatedConfirm: "Nagawa na ang account. Tingnan ang email at i-confirm ang address.", sendingLink: "Ipinapadala ang link...", resetSent: "Kung umiiral ang account, makakatanggap ka ng password reset link.",
      saving: "Sine-save...", profileSynced: "Na-update at na-synchronize ang profile sa DATABASE.", profileSavedSheet: "Na-save ang profile sa account. Google Sheet: {message}", syncFailed: "Hindi nagtagumpay ang synchronization",
      savingPlayer: "Sine-save ang player profile...", playerSynced: "Na-save at na-synchronize ang player profile sa DATABASE. Gagamitin muli ang litrato sa camps.", playerSavedSheet: "Na-save ang player profile sa account. Google Sheet: {message}",
      resetPasswordTitle: "BAGONG PASSWORD", resetPasswordSubtitle: "Pumili ng password na hindi bababa sa 10 characters at iba sa mga dati mong ginamit.", resetConfig: "I-connect ang Supabase sa <strong>supabase-config.js</strong>.", newPassword: "Bagong password", updatePassword: "I-UPDATE ANG PASSWORD", openFromEmail: "Buksan ang page na ito mula sa link na natanggap sa email.", updatingPassword: "Ina-update ang password...", passwordUpdated: "Na-update ang password. Maaari ka nang mag-log in sa account.",
      errorSupabase: "Hindi pa naka-connect ang accounts sa Supabase.", errorEmail: "Maglagay ng valid na email address.", errorWeakPassword: "Dapat may hindi bababa sa 10 characters ang password.", errorName: "Kailangan ang pangalan at apelyido.", errorSession: "Nag-expire ang session. Mag-log in ulit.", errorPhotoRequired: "Pumili ng litrato ng player.", errorPhotoType: "Dapat JPG, PNG o WEBP ang litrato.", errorPhotoSize: "Hindi maaaring lumampas sa 5 MB ang litrato.", errorSheetConfig: "Hindi naka-configure ang Google Sheet database connection.", errorLogin: "Mali ang email o password.", errorEmailConfirm: "I-confirm muna ang email na natanggap.", errorRegistered: "May account na gamit ang email na ito.", errorRate: "Masyadong maraming attempt. Subukan ulit mamaya.", errorNetwork: "May problema sa connection. Subukan ulit.", errorGeneric: "Hindi nagtagumpay ang operation. Subukan ulit o kontakin ang FIL-ITALIA.",
      campLoginNotice: "Mag-log in gamit ang player profile para awtomatikong mapunan ang impormasyon. Kung walang profile, kailangan ding i-upload ang litrato.", campProfileUnavailable: "Hindi available ang account profile. Manu-manong kumpletuhin ang form.", campCompleteProfile: "Kumpletuhin muna ang player profile at i-upload ang litrato sa Account area. Required pa rin dito ang litrato hangga’t hindi kumpleto ang profile.", campNotPlayer: "Hindi active player profile ang account na ito. Manu-manong ilagay ang impormasyon ng participant.", campProfileLoaded: "Na-load ang player profile: awtomatikong gagamitin muli ang impormasyon at litrato. Piliin na lang ang camp, shirt size at consents.", campProfileError: "Hindi ma-load ang profile. Maaari mo pa ring kumpletuhin ang form nang manu-mano.",
      campPhotoHelp: "Hindi kailangan kapag naka-log in gamit ang active Player profile na may naka-save nang litrato.", adultOnly: "kung adult lamang ang player", selectSize: "Pumili ng size",
      invalidSubmission: "Hindi valid ang submission. I-reload ang page at subukan ulit.", invalidEmails: "Tiyaking tama ang mga email address.",
      privacyTitlePage: "PRIVACY POLICY", privacySubtitlePage: "Impormasyon kung paano kinokolekta at ginagamit ng FIL-ITALIA Basketball ang data para sa registrations, events, media content at communication.",
      documentsTitlePage: "MGA DOKUMENTO", documentsSubtitlePage: "Opisyal na FIL-ITALIA Basketball documents para sa registrations, camps, media consent at event participation."
    }
  };

  function language() {
    try {
      const value = localStorage.getItem("language") || document.documentElement.lang || "it";
      return value === "tl" ? "ph" : (messages[value] ? value : "it");
    } catch (_) {
      return "it";
    }
  }

  function format(value, params) {
    return String(value || "").replace(/\{(\w+)\}/g, function (_, key) {
      return params && params[key] != null ? String(params[key]) : "";
    });
  }

  function t(key, params) {
    const lang = language();
    return format((messages[lang] && messages[lang][key]) || messages.it[key] || key, params);
  }

  function setText(selector, key) {
    document.querySelectorAll(selector).forEach(function (node) { node.textContent = t(key); });
  }

  function setHtml(selector, key) {
    document.querySelectorAll(selector).forEach(function (node) { node.innerHTML = t(key); });
  }

  function setLabel(formSelector, fieldName, key) {
    const form = document.querySelector(formSelector);
    if (!form || !form.elements || !form.elements.namedItem(fieldName)) return;
    const field = form.elements.namedItem(fieldName);
    const label = field.closest("label");
    if (!label) return;
    let textNode = Array.from(label.childNodes).find(function (node) {
      return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
    });
    if (!textNode) {
      textNode = document.createTextNode("");
      label.insertBefore(textNode, label.firstChild);
    }
    textNode.textContent = t(key) + " ";
  }

  function setOption(selectSelector, value, key) {
    const select = document.querySelector(selectSelector);
    if (!select) return;
    const option = Array.from(select.options).find(function (item) { return item.value === value; });
    if (option) option.textContent = t(key);
  }

  function translateAccountPages() {
    const page = document.body && document.body.getAttribute("data-account-page");
    if (page === "login") {
      document.title = t("account") + " | FIL-ITALIA Nation Select";
      setText(".account-title", "loginTitle");
      setText(".account-subtitle", "loginSubtitle");
      setHtml("#accountConfigWarning", "loginConfig");
      setText('[data-auth-tab="login"]', "tabLogin");
      setText('[data-auth-tab="signup"]', "tabSignup");
      setText('[data-auth-tab="reset"]', "tabReset");
      setLabel("#loginForm", "email", "email"); setLabel("#loginForm", "password", "password");
      setText("#loginForm button[type=submit]", "loginButton");
      setLabel("#signupForm", "firstName", "firstName"); setLabel("#signupForm", "lastName", "lastName"); setLabel("#signupForm", "email", "email");
      setLabel("#signupForm", "requestedRole", "requestedAccount"); setLabel("#signupForm", "password", "password"); setLabel("#signupForm", "passwordConfirm", "repeatPassword");
      setOption('#signupForm select[name="requestedRole"]', "player", "rolePlayer"); setOption('#signupForm select[name="requestedRole"]', "parent", "roleParent"); setOption('#signupForm select[name="requestedRole"]', "coach", "roleCoach"); setOption('#signupForm select[name="requestedRole"]', "coordinator", "roleCoordinator"); setOption('#signupForm select[name="requestedRole"]', "staff", "roleStaff");
      setHtml("#signupForm .account-check span", "privacyAccept"); setText("#signupForm button[type=submit]", "signupButton");
      setText('#resetRequestForm .account-muted', "resetInfo"); setLabel("#resetRequestForm", "email", "email"); setText("#resetRequestForm button[type=submit]", "resetButton");
      setText(".account-footer-link a", "backSite");
    }

    if (page === "account") {
      document.title = t("account") + " | FIL-ITALIA";
      setHtml("#accountConfigWarning", "accountConfig");
      setText("#logoutButton", "logout"); setText("#pendingApprovalBox", "pendingApproval");
      const cards = document.querySelectorAll("main .account-card");
      if (cards[0]) { const h = cards[0].querySelector(".account-section-title"); if (h) h.textContent = t("personalData"); }
      setLabel("#profileForm", "firstName", "firstName"); setLabel("#profileForm", "lastName", "lastName"); setLabel("#profileForm", "phone", "phone"); setLabel("#profileForm", "city", "accountCity"); setLabel("#profileForm", "language", "language");
      setText("#profileForm button[type=submit]", "saveProfile");
      const registrationTitle = document.querySelector('#accountRegistrations')?.closest('.account-card')?.querySelector('.account-section-title'); if (registrationTitle) registrationTitle.textContent = t("myRegistrations");
      setText("#accountRegistrations .account-muted", "loading");
      const playerSection = document.getElementById("playerProfileSection");
      if (playerSection) {
        const title = playerSection.querySelector(".account-section-title"); if (title) title.textContent = t("playerCampProfile");
        const help = playerSection.querySelector(":scope > .account-muted"); if (help) help.textContent = t("playerCampProfileHelp");
      }
      const preview = document.getElementById("playerPhotoPreview"); if (preview) preview.alt = t("playerPhotoAlt");
      setLabel("#playerProfileForm", "birthDate", "birthDate"); setLabel("#playerProfileForm", "sex", "sex"); setLabel("#playerProfileForm", "residenceCity", "residenceCity"); setLabel("#playerProfileForm", "position", "basketballRole"); setLabel("#playerProfileForm", "currentClub", "currentClub"); setLabel("#playerProfileForm", "heightCm", "heightCm"); setLabel("#playerProfileForm", "weightKg", "weightKg"); setLabel("#playerProfileForm", "italianPassport", "italianPassport"); setLabel("#playerProfileForm", "filipinoPassport", "filipinoPassport"); setLabel("#playerProfileForm", "instagram", "instagram"); setLabel("#playerProfileForm", "highlightsUrl", "highlights");
      const photoInput = document.getElementById("playerPhotoInput"); if (photoInput) { const label = photoInput.closest("label"); if (label) { const node = Array.from(label.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()); if (node) node.textContent = t("playerPhoto") + " "; const small = label.querySelector("small"); if (small) small.textContent = t("playerPhotoHelp"); } }
      setOption('#playerProfileForm select[name="sex"]', "", "select"); setOption('#playerProfileForm select[name="sex"]', "Maschio", "male"); setOption('#playerProfileForm select[name="sex"]', "Femmina", "female"); setOption('#playerProfileForm select[name="sex"]', "Altro", "otherSex");
      setOption('#playerProfileForm select[name="italianPassport"]', "true", "yes"); setOption('#playerProfileForm select[name="italianPassport"]', "false", "no"); setOption('#playerProfileForm select[name="filipinoPassport"]', "true", "yes"); setOption('#playerProfileForm select[name="filipinoPassport"]', "false", "no");
      setText("#playerProfileForm button[type=submit]", "savePlayerProfile");
      const roleSections = document.querySelectorAll('[data-role-section]');
      roleSections.forEach(function (section) {
        const roles = section.getAttribute("data-role-section") || "";
        if (roles === "parent") {
          const h = section.querySelector("h2"); if (h) h.textContent = t("parentArea");
          const articles = section.querySelectorAll("article");
          const keys = [["linkedPlayers","linkedPlayersText"],["camp","parentCampText"],["communications","communicationsText"]];
          articles.forEach((a,i) => { if(keys[i]) { a.querySelector("h3").textContent=t(keys[i][0]); a.querySelector("p").textContent=t(keys[i][1]); } });
        }
        if (roles === "coach,coordinator,staff") {
          const h = section.querySelector("h2"); if (h) h.textContent = t("staffArea");
          const articles = section.querySelectorAll("article");
          const keys = [["players","staffPlayersText"],["evaluations","evaluationsText"],["activities","activitiesText"]];
          articles.forEach((a,i) => { if(keys[i]) { a.querySelector("h3").textContent=t(keys[i][0]); a.querySelector("p").textContent=t(keys[i][1]); } });
        }
      });
      setText("#adminAccountsSection .account-section-title", "accountApproval"); setText("#adminAccountsSection > .account-muted", "accountApprovalText");
    }

    if (page === "reset-password") {
      document.title = t("resetPasswordTitle") + " | FIL-ITALIA";
      setText(".account-title", "resetPasswordTitle"); setText(".account-subtitle", "resetPasswordSubtitle"); setHtml("#accountConfigWarning", "resetConfig");
      setLabel("#newPasswordForm", "password", "newPassword"); setLabel("#newPasswordForm", "passwordConfirm", "repeatPassword"); setText("#newPasswordForm button[type=submit]", "updatePassword"); setText(".account-footer-link a", "backLogin");
    }
  }

  function translateCampPage() {
    const form = document.getElementById("campForm");
    if (!form) return;
    const playerEmail = form.elements.namedItem("Email Giocatore");
    const playerPhone = form.elements.namedItem("Telefono Giocatore");
    if (playerEmail) playerEmail.placeholder = t("adultOnly");
    if (playerPhone) playerPhone.placeholder = t("adultOnly");
    setOption('#campForm select[name="Sesso"]', "Maschio", "male");
    setOption('#campForm select[name="Sesso"]', "Femmina", "female");
    const sizeSelect = form.elements.namedItem("Taglia Maglia");
    if (sizeSelect && sizeSelect.options && sizeSelect.options[0]) sizeSelect.options[0].textContent = t("selectSize");
    const photoSmall = document.querySelector("#campPhotoField small");
    if (photoSmall) photoSmall.textContent = t("campPhotoHelp");
  }

  function translateGeneral() {
    document.documentElement.lang = language() === "ph" ? "tl" : language();
    document.querySelectorAll("[data-i18n]").forEach(function (node) { node.textContent = t(node.getAttribute("data-i18n")); });
    document.querySelectorAll("[data-i18n-html]").forEach(function (node) { node.innerHTML = t(node.getAttribute("data-i18n-html")); });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) { node.placeholder = t(node.getAttribute("data-i18n-placeholder")); });
    document.querySelectorAll("[data-language-section]").forEach(function (node) { node.hidden = node.getAttribute("data-language-section") !== language(); });
    document.querySelectorAll(".mobile-menu-button").forEach(function (node) { node.setAttribute("aria-label", t("openMenu")); });
    document.querySelectorAll('footer a[href="privacy.html"]').forEach(function (node) { node.textContent = t("privacyPolicy"); });
    document.querySelectorAll('footer a[href="documents.html"]').forEach(function (node) { node.textContent = t("documents"); });
    translateAccountPages();
    translateCampPage();
  }

  function normalizePath(href) {
    try { return new URL(href || "", window.location.href).pathname.replace(/\/+$/, ""); }
    catch (_) { return String(href || "").split(/[?#]/)[0].replace(/\/+$/, ""); }
  }

  function dedupeAccountNavigation() {
    document.querySelectorAll(".nav-links").forEach(function (nav) {
      const links = Array.from(nav.querySelectorAll("a"));
      links.forEach(function (link) {
        const path = normalizePath(link.getAttribute("href"));
        if (/\/register\.html$/.test(path)) link.remove();
      });
      const accountLinks = Array.from(nav.querySelectorAll("a")).filter(function (link) {
        const path = normalizePath(link.getAttribute("href"));
        return /\/(?:account|login)(?:\.html)?$/.test(path) || link.hasAttribute("data-filitalia-account-link");
      });
      let main = accountLinks[0];
      if (!main) {
        main = document.createElement("a");
        nav.appendChild(main);
      }
      main.href = "account.html";
      main.textContent = t("account");
      main.setAttribute("data-filitalia-account-link", "true");
      main.setAttribute("aria-label", "FIL-ITALIA Account");
      accountLinks.slice(1).forEach(function (link) { link.remove(); });
    });
  }

  const api = { t: t, language: language, translate: translateGeneral, dedupeAccountNavigation: dedupeAccountNavigation };
  window.FilitaliaI18n = api;

  const originalSetLanguage = window.setLanguage;
  if (typeof originalSetLanguage === "function" && !originalSetLanguage.__filitaliaI18nWrapped) {
    const wrapped = function (newLanguage) {
      originalSetLanguage(newLanguage);
      translateGeneral();
      window.dispatchEvent(new CustomEvent("filitalia-language-changed", { detail: { language: newLanguage } }));
      dedupeAccountNavigation();
    };
    wrapped.__filitaliaI18nWrapped = true;
    window.setLanguage = wrapped;
  }

  function init() {
    translateGeneral();
    dedupeAccountNavigation();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  window.addEventListener("filitalia-language-changed", function () { translateGeneral(); dedupeAccountNavigation(); });
})();
