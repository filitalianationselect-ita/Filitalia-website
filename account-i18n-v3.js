(function(){
  "use strict";

  if(!document.body || document.body.dataset.accountPage !== "account") return;

  const COPY = {
    navHome:{it:"Home",en:"Home",ph:"Home"},
    navPlayers:{it:"Giocatori",en:"Players",ph:"Players"},
    navStaff:{it:"Staff",en:"Staff",ph:"Staff"},
    navGallery:{it:"Galleria",en:"Gallery",ph:"Gallery"},
    navNews:{it:"News",en:"News",ph:"News"},
    navEvents:{it:"Eventi",en:"Events",ph:"Events"},
    navCamp:{it:"Camp",en:"Camp",ph:"Camp"},
    navAdmin:{it:"Admin",en:"Admin",ph:"Admin"},
    openMenu:{it:"Apri menu",en:"Open menu",ph:"Buksan ang menu"},
    accountTitle:{it:"Il mio account",en:"My account",ph:"Aking account"},
    accountHero:{it:"Profilo, iscrizioni, documenti e attività FIL-ITALIA riuniti in un’unica area personale.",en:"Profile, registrations, documents and FIL-ITALIA activities together in one personal area.",ph:"Profile, registrations, documents at FIL-ITALIA activities sa iisang personal area."},
    backSite:{it:"Torna al sito",en:"Back to the website",ph:"Bumalik sa website"},
    openAdministration:{it:"Apri amministrazione",en:"Open administration",ph:"Buksan ang administration"},
    profile:{it:"Profilo",en:"Profile",ph:"Profile"},
    registrations:{it:"Registrazioni",en:"Registrations",ph:"Registrations"},
    documents:{it:"Documenti",en:"Documents",ph:"Mga dokumento"},
    access:{it:"Accesso",en:"Access",ph:"Access"},
    profileCompletion:{it:"Completamento dei dati personali",en:"Personal details completion",ph:"Pagkumpleto ng personal details"},
    linkedActivities:{it:"Camp e attività collegate",en:"Linked camps and activities",ph:"Naka-link na camps at activities"},
    roleAvailability:{it:"Disponibilità in base al ruolo",en:"Availability based on role",ph:"Availability batay sa role"},
    verify:{it:"Da verificare",en:"To verify",ph:"I-verify"},
    personalArea:{it:"AREA PERSONALE",en:"PERSONAL AREA",ph:"PERSONAL AREA"},
    waitingAccount:{it:"Account in attesa",en:"Account pending",ph:"Naghihintay na account"},
    loadingFunctions:{it:"Caricamento delle funzioni disponibili per il tuo profilo.",en:"Loading the features available for your profile.",ph:"Nilo-load ang mga feature na available para sa profile mo."},
    pending:{it:"In attesa",en:"Pending",ph:"Naghihintay"},
    loading:{it:"Caricamento...",en:"Loading...",ph:"Naglo-load..."},
    personalData:{it:"Dati personali",en:"Personal details",ph:"Personal na impormasyon"},
    firstName:{it:"Nome",en:"First name",ph:"Pangalan"},
    lastName:{it:"Cognome",en:"Last name",ph:"Apelyido"},
    phone:{it:"Telefono",en:"Phone",ph:"Telepono"},
    city:{it:"Città",en:"City",ph:"Lungsod"},
    language:{it:"Lingua",en:"Language",ph:"Wika"},
    saveProfile:{it:"SALVA PROFILO",en:"SAVE PROFILE",ph:"I-SAVE ANG PROFILE"},
    logout:{it:"ESCI",en:"LOG OUT",ph:"MAG-LOG OUT"},
    myRegistrations:{it:"Le mie registrazioni e attività",en:"My registrations and activities",ph:"Aking registrations at activities"},
    playerCampProfile:{it:"Profilo giocatore per i camp",en:"Player profile for camps",ph:"Player profile para sa camps"},
    playerCampHelp:{it:"Compila questi dati una sola volta. Nei camp verranno recuperati automaticamente insieme alla foto.",en:"Complete these details once. They and the photo will be reused automatically for camps.",ph:"Kumpletuhin ang impormasyong ito nang isang beses. Awtomatikong gagamitin muli ang details at litrato sa camps."},
    playerPhoto:{it:"Foto giocatore",en:"Player photo",ph:"Litrato ng player"},
    birthDate:{it:"Data di nascita",en:"Date of birth",ph:"Petsa ng kapanganakan"},
    sex:{it:"Sesso",en:"Sex",ph:"Kasarian"},
    select:{it:"Seleziona",en:"Select",ph:"Pumili"},
    male:{it:"Maschio",en:"Male",ph:"Lalaki"},
    female:{it:"Femmina",en:"Female",ph:"Babae"},
    otherSex:{it:"Altro / Preferisco non indicarlo",en:"Other / Prefer not to say",ph:"Iba / Ayaw sabihin"},
    residenceCity:{it:"Città di residenza",en:"City of residence",ph:"Lungsod ng tirahan"},
    basketballRole:{it:"Ruolo basket",en:"Basketball position",ph:"Posisyon sa basketball"},
    currentClub:{it:"Squadra attuale",en:"Current club",ph:"Kasalukuyang club"},
    height:{it:"Altezza (cm)",en:"Height (cm)",ph:"Taas (cm)"},
    weight:{it:"Peso (kg)",en:"Weight (kg)",ph:"Timbang (kg)"},
    italianPassport:{it:"Passaporto italiano",en:"Italian passport",ph:"Italian passport"},
    filipinoPassport:{it:"Passaporto filippino",en:"Filipino passport",ph:"Filipino passport"},
    yes:{it:"Sì",en:"Yes",ph:"Oo"},
    no:{it:"No",en:"No",ph:"Hindi"},
    savePlayer:{it:"SALVA PROFILO GIOCATORE",en:"SAVE PLAYER PROFILE",ph:"I-SAVE ANG PLAYER PROFILE"},
    parentArea:{it:"Area genitore",en:"Parent area",ph:"Parent area"},
    linkedPlayers:{it:"Giocatori collegati",en:"Linked players",ph:"Mga naka-link na player"},
    linkedPlayersText:{it:"Gestione dei figli o atleti minorenni associati.",en:"Manage children or linked underage athletes.",ph:"Pamamahala ng mga anak o naka-link na menor de edad na atleta."},
    campConsents:{it:"Camp e consensi",en:"Camps and consents",ph:"Camps at consents"},
    campConsentsText:{it:"Iscrizioni, autorizzazioni e stato del pagamento.",en:"Registrations, permissions and payment status.",ph:"Registrations, permissions at payment status."},
    communications:{it:"Comunicazioni",en:"Communications",ph:"Komunikasyon"},
    parentCommunications:{it:"Aggiornamenti ufficiali riguardanti i giocatori collegati.",en:"Official updates about linked players.",ph:"Opisyal na updates tungkol sa mga naka-link na player."},
    coachArea:{it:"Area coach",en:"Coach area",ph:"Coach area"},
    assignedPlayers:{it:"Giocatori assegnati",en:"Assigned players",ph:"Assigned players"},
    assignedPlayersText:{it:"Consulta soltanto gli atleti autorizzati per la tua attività.",en:"View only the athletes authorized for your activity.",ph:"Tingnan lamang ang mga atletang awtorisado para sa activity mo."},
    evaluations:{it:"Valutazioni",en:"Evaluations",ph:"Evaluations"},
    evaluationsText:{it:"Presenze, note tecniche e osservazioni dello staff.",en:"Attendance, technical notes and staff observations.",ph:"Attendance, technical notes at staff observations."},
    eventsCallups:{it:"Eventi e convocazioni",en:"Events and call-ups",ph:"Events at call-ups"},
    eventsCallupsText:{it:"Calendario delle attività tecniche assegnate.",en:"Schedule of assigned technical activities.",ph:"Schedule ng assigned technical activities."},
    coordinatorArea:{it:"Area coordinatore",en:"Coordinator area",ph:"Coordinator area"},
    assignedCity:{it:"Città assegnata",en:"Assigned city",ph:"Assigned city"},
    assignedCityText:{it:"Eventi, palestra, staff e attività della propria area.",en:"Events, gym, staff and activities in your area.",ph:"Events, gym, staff at activities sa area mo."},
    organization:{it:"Organizzazione",en:"Organization",ph:"Organisasyon"},
    organizationText:{it:"Checklist palestra, BLSD, fotografo e materiale operativo.",en:"Gym, BLSD, photographer and equipment checklist.",ph:"Checklist para sa gym, BLSD, photographer at equipment."},
    operationalCommunications:{it:"Comunicazioni operative",en:"Operational communications",ph:"Operational communications"},
    operationalCommunicationsText:{it:"Aggiornamenti e richieste legate agli eventi assegnati.",en:"Updates and requests related to assigned events.",ph:"Updates at requests tungkol sa assigned events."},
    staffArea:{it:"Area staff",en:"Staff area",ph:"Staff area"},
    assignedActivities:{it:"Attività assegnate",en:"Assigned activities",ph:"Assigned activities"},
    assignedActivitiesText:{it:"Camp, turni, orari e referente operativo.",en:"Camps, shifts, schedules and operational contact.",ph:"Camps, shifts, schedules at operational contact."},
    personalDocuments:{it:"Documenti personali",en:"Personal documents",ph:"Personal documents"},
    personalDocumentsText:{it:"Qualifiche, BLSD e certificazioni richieste.",en:"Required qualifications, BLSD and certifications.",ph:"Required qualifications, BLSD at certifications."},
    internalCommunications:{it:"Comunicazioni interne",en:"Internal communications",ph:"Internal communications"},
    internalCommunicationsText:{it:"Informazioni necessarie per svolgere il proprio compito.",en:"Information needed to carry out your task.",ph:"Impormasyong kailangan para magawa ang iyong task."},
    volunteerArea:{it:"Area volontario",en:"Volunteer area",ph:"Volunteer area"},
    volunteerIntro:{it:"Questa area mostra soltanto informazioni operative personali. Non consente l’accesso a dati medici, pagamenti o profili riservati degli atleti.",en:"This area only shows personal operational information. It does not allow access to medical data, payments or restricted athlete profiles.",ph:"Personal operational information lamang ang makikita rito. Walang access sa medical data, payments o restricted athlete profiles."},
    availabilityShifts:{it:"Disponibilità e turni",en:"Availability and shifts",ph:"Availability at shifts"},
    availabilityShiftsText:{it:"Consulta data, orario e attività per cui sei stato assegnato.",en:"View the date, time and activity assigned to you.",ph:"Tingnan ang date, time at activity na naka-assign sa iyo."},
    taskContact:{it:"Mansione e referente",en:"Task and contact",ph:"Task at contact"},
    taskContactText:{it:"Indicazioni pratiche e contatto dello staff responsabile.",en:"Practical instructions and contact for the responsible staff member.",ph:"Practical instructions at contact ng responsible staff member."},
    eventChecklist:{it:"Checklist evento",en:"Event checklist",ph:"Event checklist"},
    eventChecklistText:{it:"Compiti da completare prima, durante e dopo l’attività.",en:"Tasks to complete before, during and after the activity.",ph:"Mga task na dapat matapos bago, habang at pagkatapos ng activity."},
    deleteAccount:{it:"Eliminazione account",en:"Delete account",ph:"Pag-delete ng account"},
    deleteAccountText:{it:"La richiesta verrà inviata all’amministratore. Dopo la verifica saranno eliminati account, profilo giocatore, foto e dati collegati. L’operazione definitiva non è reversibile.",en:"The request will be sent to the administrator. After verification, the account, player profile, photos and linked data will be deleted. The final action cannot be undone.",ph:"Ipapadala ang request sa administrator. Pagkatapos ng verification, ide-delete ang account, player profile, photos at linked data. Hindi na ito maaaring ibalik."},
    optionalReason:{it:"Motivo facoltativo",en:"Optional reason",ph:"Optional na dahilan"},
    reasonPlaceholder:{it:"Puoi indicare il motivo della richiesta",en:"You may provide the reason for the request",ph:"Maaari mong ilagay ang dahilan ng request"},
    requestDeletion:{it:"RICHIEDI ELIMINAZIONE ACCOUNT",en:"REQUEST ACCOUNT DELETION",ph:"HUMILING NG ACCOUNT DELETION"},
    adminDashboard:{it:"Dashboard amministratore",en:"Administrator dashboard",ph:"Administrator dashboard"},
    refresh:{it:"AGGIORNA",en:"REFRESH",ph:"I-REFRESH"},
    awaitingApproval:{it:"Da approvare",en:"Awaiting approval",ph:"Naghihintay ng approval"},
    deletionRequests:{it:"Richieste eliminazione",en:"Deletion requests",ph:"Deletion requests"},
    activeUsers:{it:"Utenti attivi",en:"Active users",ph:"Active users"},
    suspendedUsers:{it:"Utenti sospesi",en:"Suspended users",ph:"Suspended users"},
    accountManagement:{it:"Gestione account",en:"Account management",ph:"Account management"},
    accountManagementText:{it:"Approva, rifiuta, sospendi o riattiva gli account. Ogni cambiamento invia automaticamente una mail all’utente.",en:"Approve, reject, suspend or reactivate accounts. Every change automatically sends an email to the user.",ph:"Aprubahan, tanggihan, i-suspend o i-reactivate ang accounts. Bawat pagbabago ay awtomatikong nagpapadala ng email sa user."},
    show:{it:"Mostra",en:"Show",ph:"Ipakita"},
    active:{it:"Attivi",en:"Active",ph:"Aktibo"},
    suspended:{it:"Sospesi",en:"Suspended",ph:"Suspended"},
    rejected:{it:"Rifiutati",en:"Rejected",ph:"Rejected"},
    all:{it:"Tutti",en:"All",ph:"Lahat"},
    publicCards:{it:"Player Card pubbliche",en:"Public Player Cards",ph:"Public Player Cards"},
    publicCardsText:{it:"Controlla i dati del giocatore e pubblica la card nella pagina Players. Email, telefono, peso e dati privati non vengono mostrati.",en:"Review the player’s details and publish the card on the Players page. Email, phone, weight and private data are not shown.",ph:"Suriin ang player details at i-publish ang card sa Players page. Hindi ipinapakita ang email, phone, weight at private data."},
    accountDeletionRequests:{it:"Richieste eliminazione account",en:"Account deletion requests",ph:"Account deletion requests"},
    accountDeletionRequestsText:{it:"Puoi annullare la richiesta mantenendo l’account attivo oppure eliminarlo definitivamente. In entrambi i casi l’utente riceverà una mail.",en:"You can cancel the request and keep the account active, or delete it permanently. In both cases, the user will receive an email.",ph:"Maaari mong kanselahin ang request at panatilihing active ang account, o permanenteng i-delete ito. Sa parehong kaso, makakatanggap ng email ang user."},
    playerAreaTitle:{it:"La tua area giocatore",en:"Your player area",ph:"Iyong player area"},
    playerAreaText:{it:"Gestisci profilo basket, iscrizioni ai camp, documenti, pagamenti e comunicazioni personali.",en:"Manage your basketball profile, camp registrations, documents, payments and personal communications.",ph:"Pamahalaan ang basketball profile, camp registrations, documents, payments at personal communications."},
    parentAreaTitle:{it:"La tua area genitore",en:"Your parent area",ph:"Iyong parent area"},
    parentAreaText:{it:"Controlla giocatori collegati, iscrizioni, consensi, documenti, pagamenti e comunicazioni.",en:"Manage linked players, registrations, consents, documents, payments and communications.",ph:"Pamahalaan ang linked players, registrations, consents, documents, payments at communications."},
    coachAreaTitle:{it:"La tua area coach",en:"Your coach area",ph:"Iyong coach area"},
    coachAreaText:{it:"Consulta eventi assegnati, giocatori autorizzati, presenze, valutazioni e attività dello staff.",en:"View assigned events, authorized players, attendance, evaluations and staff activities.",ph:"Tingnan ang assigned events, authorized players, attendance, evaluations at staff activities."},
    coordinatorAreaTitle:{it:"La tua area coordinatore",en:"Your coordinator area",ph:"Iyong coordinator area"},
    coordinatorAreaText:{it:"Gestisci le attività della tua città, gli eventi assegnati, lo staff operativo e le comunicazioni.",en:"Manage your city’s activities, assigned events, operational staff and communications.",ph:"Pamahalaan ang city activities, assigned events, operational staff at communications."},
    staffAreaTitle:{it:"La tua area staff",en:"Your staff area",ph:"Iyong staff area"},
    staffAreaText:{it:"Consulta eventi, turni, mansioni, documenti e comunicazioni relativi alle attività assegnate.",en:"View events, shifts, tasks, documents and communications related to assigned activities.",ph:"Tingnan ang events, shifts, tasks, documents at communications para sa assigned activities."},
    volunteerAreaTitle:{it:"La tua area volontario",en:"Your volunteer area",ph:"Iyong volunteer area"},
    volunteerAreaText:{it:"Consulta disponibilità, turni, mansioni, referente e checklist operative senza accedere ai dati sensibili.",en:"View availability, shifts, tasks, contacts and operational checklists without accessing sensitive data.",ph:"Tingnan ang availability, shifts, tasks, contacts at operational checklists nang walang access sa sensitive data."},
    adminArea:{it:"Area Admin",en:"Admin area",ph:"Admin area"},
    adminAreaText:{it:"Gestisci il tuo profilo amministratore e apri il pannello operativo FIL-ITALIA.",en:"Manage your administrator profile and open the FIL-ITALIA operations panel.",ph:"Pamahalaan ang administrator profile at buksan ang FIL-ITALIA operations panel."},
    superAdminAreaText:{it:"Gestisci il tuo account e accedi separatamente al pannello Super Admin con tutti gli strumenti della piattaforma.",en:"Manage your account and separately access the Super Admin panel with all platform tools.",ph:"Pamahalaan ang account at hiwalay na buksan ang Super Admin panel kasama ang lahat ng platform tools."},
    pendingAreaText:{it:"Puoi completare i dati personali mentre attendi l’approvazione dell’amministratore.",en:"You can complete your personal details while waiting for administrator approval.",ph:"Maaari mong kumpletuhin ang personal details habang hinihintay ang administrator approval."},
    adminSpace:{it:"Il tuo spazio amministratore. Da qui gestisci il profilo e apri il pannello Super Admin completo.",en:"Your administrator space. Manage your profile here and open the complete Super Admin panel.",ph:"Iyong administrator space. Dito mo pamamahalaan ang profile at bubuksan ang complete Super Admin panel."},
    adminSpaceBasic:{it:"Il tuo spazio amministratore per profilo, attività assegnate e accesso agli strumenti FIL-ITALIA.",en:"Your administrator space for your profile, assigned activities and access to FIL-ITALIA tools.",ph:"Iyong administrator space para sa profile, assigned activities at FIL-ITALIA tools."},
    adminAccess:{it:"ACCESSO AMMINISTRATIVO",en:"ADMINISTRATIVE ACCESS",ph:"ADMINISTRATIVE ACCESS"},
    superAdminPanel:{it:"Pannello Super Admin",en:"Super Admin panel",ph:"Super Admin panel"},
    adminPanel:{it:"Pannello Admin",en:"Admin panel",ph:"Admin panel"},
    superAdminPanelText:{it:"Apri il centro di controllo completo per utenti, ruoli, Player, Staff, eventi, iscrizioni, pagamenti, documenti, media e comunicazioni.",en:"Open the complete control center for users, roles, Players, Staff, events, registrations, payments, documents, media and communications.",ph:"Buksan ang complete control center para sa users, roles, Players, Staff, events, registrations, payments, documents, media at communications."},
    adminPanelText:{it:"Apri il centro operativo FIL-ITALIA con gli strumenti consentiti al tuo ruolo amministratore.",en:"Open the FIL-ITALIA operations center with the tools allowed for your administrator role.",ph:"Buksan ang FIL-ITALIA operations center gamit ang tools na pinapayagan sa administrator role mo."},
    openSuperAdmin:{it:"APRI PANNELLO SUPER ADMIN",en:"OPEN SUPER ADMIN PANEL",ph:"BUKSAN ANG SUPER ADMIN PANEL"},
    openAdmin:{it:"APRI PANNELLO ADMIN",en:"OPEN ADMIN PANEL",ph:"BUKSAN ANG ADMIN PANEL"},
    protectedAccess:{it:"Accesso riservato e protetto",en:"Restricted and protected access",ph:"Restricted at protected access"},
    galleryProfile:{it:"Galleria del mio profilo",en:"My profile gallery",ph:"Aking profile gallery"},
    galleryProfileText:{it:"Puoi caricare più foto e indicare quella principale. Ogni nuova immagine rimane in attesa finché un Admin non la approva.",en:"You can upload multiple photos and choose the primary one. Each new image remains pending until an Admin approves it.",ph:"Maaari kang mag-upload ng maraming photos at pumili ng primary photo. Mananatiling pending ang bawat bagong image hanggang aprubahan ng Admin."},
    newPhotos:{it:"Nuove foto",en:"New photos",ph:"Mga bagong photo"},
    photoLimit:{it:"Massimo 5 foto per volta, 5 MB ciascuna.",en:"Maximum 5 photos at a time, 5 MB each.",ph:"Maximum 5 photos bawat upload, 5 MB bawat isa."},
    firstPrimary:{it:"La prima foto sarà la principale",en:"The first photo will be the primary one",ph:"Ang unang photo ang magiging primary"},
    uploadPhotos:{it:"CARICA FOTO",en:"UPLOAD PHOTOS",ph:"MAG-UPLOAD NG PHOTOS"},
    noExtraPhotos:{it:"Non hai ancora caricato foto aggiuntive.",en:"You have not uploaded any additional photos yet.",ph:"Wala ka pang na-upload na additional photos."},
    profilePhoto:{it:"Foto profilo",en:"Profile photo",ph:"Profile photo"},
    primaryPhoto:{it:"FOTO PRINCIPALE",en:"PRIMARY PHOTO",ph:"PRIMARY PHOTO"},
    delete:{it:"ELIMINA",en:"DELETE",ph:"I-DELETE"},
    requestRemoval:{it:"RICHIEDI RIMOZIONE",en:"REQUEST REMOVAL",ph:"HUMILING NG REMOVAL"},
    published:{it:"Pubblicata",en:"Published",ph:"Published"},
    rejectedSingle:{it:"Rifiutata",en:"Rejected",ph:"Rejected"},
    removalRequested:{it:"Rimozione richiesta",en:"Removal requested",ph:"Removal requested"},
    publishCard:{it:"PUBBLICA CARD",en:"PUBLISH CARD",ph:"I-PUBLISH ANG CARD"},
    updateCard:{it:"AGGIORNA CARD",en:"UPDATE CARD",ph:"I-UPDATE ANG CARD"},
    incompleteData:{it:"DATI INCOMPLETI",en:"INCOMPLETE DATA",ph:"KULANG ANG DATA"},
    removeCard:{it:"RIMUOVI CARD",en:"REMOVE CARD",ph:"ALISIN ANG CARD"},
    readyPublish:{it:"Profilo pronto per la pubblicazione",en:"Profile ready to publish",ph:"Handa nang i-publish ang profile"},
    noPlayerProfiles:{it:"Nessun profilo giocatore disponibile.",en:"No player profiles available.",ph:"Walang available na player profiles."},
    noAccountsCategory:{it:"Nessun account in questa categoria.",en:"No accounts in this category.",ph:"Walang account sa category na ito."},
    approve:{it:"APPROVA",en:"APPROVE",ph:"APRUBAHAN"},
    reject:{it:"RIFIUTA",en:"REJECT",ph:"TANGGIHAN"},
    suspend:{it:"SOSPENDI",en:"SUSPEND",ph:"I-SUSPEND"},
    reactivate:{it:"RIATTIVA",en:"REACTIVATE",ph:"I-REACTIVATE"},
    cancel:{it:"ANNULLA",en:"CANCEL",ph:"KANSELAHIN"},
    accountUpdating:{it:"Aggiornamento account...",en:"Updating account...",ph:"Ina-update ang account..."},
    accountsLoading:{it:"Caricamento account...",en:"Loading accounts...",ph:"Naglo-load ng accounts..."},
    dashboardUpdating:{it:"Aggiornamento dashboard...",en:"Updating dashboard...",ph:"Ina-update ang dashboard..."},
    cardLoading:{it:"Caricamento Player Card...",en:"Loading Player Cards...",ph:"Naglo-load ng Player Cards..."},
    cardPublishing:{it:"Pubblicazione Player Card...",en:"Publishing Player Card...",ph:"Pino-publish ang Player Card..."},
    cardUpdating:{it:"Aggiornamento Player Card...",en:"Updating Player Card...",ph:"Ina-update ang Player Card..."},
    cardRemoving:{it:"Rimozione Player Card...",en:"Removing Player Card...",ph:"Inaalis ang Player Card..."},
    accountUpdatedMail:{it:"Account aggiornato correttamente. Mail inviata all’utente.",en:"Account updated successfully. Email sent to the user.",ph:"Matagumpay na na-update ang account. Naipadala ang email sa user."},
    accountUpdatedNoMail:{it:"Account aggiornato correttamente, ma la mail non è stata inviata.",en:"Account updated successfully, but the email was not sent.",ph:"Matagumpay na na-update ang account, pero hindi naipadala ang email."},
    cardPublished:{it:"Player Card pubblicata correttamente.",en:"Player Card published successfully.",ph:"Matagumpay na na-publish ang Player Card."},
    cardUpdated:{it:"Player Card aggiornata correttamente.",en:"Player Card updated successfully.",ph:"Matagumpay na na-update ang Player Card."},
    cardRemoved:{it:"Player Card rimossa dalla pagina pubblica.",en:"Player Card removed from the public page.",ph:"Inalis ang Player Card sa public page."},
    photoDeleted:{it:"Foto eliminata.",en:"Photo deleted.",ph:"Na-delete ang photo."},
    removalSent:{it:"Richiesta di rimozione inviata.",en:"Removal request sent.",ph:"Naipadala ang removal request."},
    selectPhoto:{it:"Seleziona almeno una foto.",en:"Select at least one photo.",ph:"Pumili ng kahit isang photo."},
    maxPhotos:{it:"Puoi caricare massimo 5 foto per volta.",en:"You can upload a maximum of 5 photos at a time.",ph:"Maximum 5 photos lamang bawat upload."},
    uploading:{it:"Caricamento in corso…",en:"Uploading…",ph:"Nag-a-upload…"},
    photosUploaded:{it:"Foto caricate. Restano in attesa di approvazione.",en:"Photos uploaded. They remain pending approval.",ph:"Na-upload ang photos. Naghihintay pa rin ang mga ito ng approval."}
  };

  const NORMALIZE = value => String(value == null ? "" : value).replace(/\s+/g," ").trim();
  const LOOKUP = new Map();
  Object.keys(COPY).forEach(key=>{
    Object.values(COPY[key]).forEach(value=>LOOKUP.set(NORMALIZE(value),key));
  });

  const FRAGMENTS = [
    {it:"Richiesta:",en:"Request:",ph:"Request:"},
    {it:"Account:",en:"Account:",ph:"Account:"},
    {it:"Card: pubblicata",en:"Card: published",ph:"Card: published"},
    {it:"Card: non pubblicata",en:"Card: not published",ph:"Card: hindi published"},
    {it:"Mancano:",en:"Missing:",ph:"Kulang:"},
    {it:"Stato:",en:"Status:",ph:"Status:"},
    {it:"Pagamento:",en:"Payment:",ph:"Payment:"},
    {it:"In attesa di approvazione",en:"Awaiting approval",ph:"Naghihintay ng approval"},
    {it:"Attivo",en:"Active",ph:"Aktibo"},
    {it:"Sospeso",en:"Suspended",ph:"Suspended"},
    {it:"Rifiutato",en:"Rejected",ph:"Rejected"}
  ];

  function language(){
    if(window.FilitaliaI18n && typeof window.FilitaliaI18n.language === "function") return window.FilitaliaI18n.language();
    const value=localStorage.getItem("language")||"it";
    return value==="tl"?"ph":(["it","en","ph"].includes(value)?value:"it");
  }

  function target(key){
    const entry=COPY[key];
    return entry ? (entry[language()] || entry.it) : null;
  }

  function translateValue(value){
    const normalized=NORMALIZE(value);
    const key=LOOKUP.get(normalized);
    if(key) return target(key);

    let output=String(value);
    FRAGMENTS.forEach(group=>{
      const destination=group[language()]||group.it;
      [group.it,group.en,group.ph].forEach(source=>{
        if(source && source!==destination) output=output.split(source).join(destination);
      });
    });
    return output;
  }

  function translateTextNode(node){
    if(!node || node.nodeType!==Node.TEXT_NODE) return;
    const parent=node.parentElement;
    if(!parent || /^(SCRIPT|STYLE|NOSCRIPT|CODE|PRE)$/.test(parent.tagName)) return;
    const raw=node.nodeValue||"";
    const trimmed=raw.trim();
    if(!trimmed) return;
    const translated=translateValue(trimmed);
    if(translated===trimmed) return;
    const left=raw.match(/^\s*/)?.[0]||"";
    const right=raw.match(/\s*$/)?.[0]||"";
    node.nodeValue=left+translated+right;
  }

  function translateAttributes(root){
    const elements=[];
    if(root && root.nodeType===Node.ELEMENT_NODE) elements.push(root);
    if(root && root.querySelectorAll) elements.push(...root.querySelectorAll("[placeholder],[aria-label],[title],[alt]"));
    elements.forEach(element=>{
      ["placeholder","aria-label","title","alt"].forEach(name=>{
        if(!element.hasAttribute(name)) return;
        const value=element.getAttribute(name);
        const translated=translateValue(value);
        if(translated!==value) element.setAttribute(name,translated);
      });
    });
  }

  function translateTree(root){
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){ translateTextNode(root); return; }
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())) translateTextNode(node);
    translateAttributes(root);
  }

  const originalConfirm=window.confirm.bind(window);
  window.confirm=function(message){ return originalConfirm(translateValue(message)); };

  let queued=false;
  function schedule(root){
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      translateTree(root||document.body);
    });
  }

  const observer=new MutationObserver(mutations=>{
    mutations.forEach(mutation=>{
      mutation.addedNodes.forEach(node=>schedule(node));
      if(mutation.type==="characterData") schedule(mutation.target);
    });
  });

  function init(){
    translateTree(document.body);
    observer.observe(document.body,{subtree:true,childList:true,characterData:true});
    [150,400,900,1800].forEach(delay=>setTimeout(()=>translateTree(document.body),delay));
  }

  window.addEventListener("filitalia-language-changed",()=>{
    [0,60,250].forEach(delay=>setTimeout(()=>translateTree(document.body),delay));
  });
  window.addEventListener("storage",event=>{
    if(event.key==="language") translateTree(document.body);
  });

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init);
  else init();
})();
