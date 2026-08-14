(function(){
"use strict";

const EVENTS=[
 {id:"idcamp-roma-2026",name:"Talent ID Camp Roma",city:"Roma",date:"2026-08-05",dateLabel:"5 agosto 2026",time:"15:00–20:00",venue:"Stella Azzurra Roma"},
 {id:"idcamp-firenze-2026",name:"Talent ID Camp Firenze",city:"Firenze",date:"2026-09-13",dateLabel:"13 settembre 2026",time:"15:00–20:00",venue:"Palestra da confermare"},
 {id:"idcamp-milano-2026",name:"Talent ID Camp Milano",city:"Milano",date:"2026",dateLabel:"Data da confermare",time:"—",venue:"Palestra da confermare"},
 {id:"idcamp-venezia-2026",name:"Talent ID Camp Venezia",city:"Venezia",date:"2026",dateLabel:"Data da confermare",time:"—",venue:"Palestra da confermare"}
];

const DEMO_SEED={
 "idcamp-roma-2026":[
  {id:"demo-1",name:"Marco Rossi",email:"marco.rossi@email.it",phone:"333 1000001",year:"2011",category:"U16",shirt:"XL",parent:"Andrea Rossi",paymentStatus:"paid",paymentAmount:50,paymentMethod:"Bonifico",paymentDate:"2026-07-20",paymentReference:"CRO demo 001",certificateStatus:"approved",certificatePath:"",playerPhotoPath:"",checked:true,shirtDone:true,present:true,notes:"Buon ball handling."},
  {id:"demo-2",name:"Luca Bianchi",email:"famiglia.bianchi@email.it",phone:"333 1000002",year:"2013",category:"U14",shirt:"M",parent:"Paolo Bianchi",paymentStatus:"pending",paymentAmount:50,paymentMethod:"",paymentDate:"",paymentReference:"",certificateStatus:"missing",certificatePath:"",playerPhotoPath:"",checked:false,shirtDone:false,present:false,notes:""},
  {id:"demo-3",name:"David Panopio",email:"d.panopio@email.it",phone:"333 1000003",year:"2010",category:"U16",shirt:"L",parent:"Maria Panopio",paymentStatus:"paid",paymentAmount:50,paymentMethod:"Carta",paymentDate:"2026-07-22",paymentReference:"PAY-DEMO-03",certificateStatus:"received",certificatePath:"",playerPhotoPath:"",checked:false,shirtDone:false,present:false,notes:"Gruppo avanzato."},
  {id:"demo-4",name:"Jayson Mendoza",email:"mendoza.family@email.it",phone:"333 1000004",year:"2014",category:"U12",shirt:"S",parent:"Carlo Mendoza",paymentStatus:"not_required",paymentAmount:0,paymentMethod:"",paymentDate:"",paymentReference:"",certificateStatus:"missing",certificatePath:"",playerPhotoPath:"",checked:false,shirtDone:false,present:false,notes:"U12 gratuito."},
  {id:"demo-5",name:"Nico De Luca",email:"nico.deluca@email.it",phone:"333 1000005",year:"2009",category:"U18",shirt:"XL",parent:"Elena De Luca",paymentStatus:"pending",paymentAmount:50,paymentMethod:"",paymentDate:"",paymentReference:"",certificateStatus:"missing",certificatePath:"",playerPhotoPath:"",checked:false,shirtDone:false,present:false,notes:"Certificato da controllare."}
 ],
 "idcamp-firenze-2026":[],"idcamp-milano-2026":[],"idcamp-venezia-2026":[]
};

const TEMPLATES={
 details:{subject:"FIL-ITALIA · Dettagli finali {evento}",body:"Ciao {nome},\n\necco i dettagli finali di {evento}.\n\nData: {data}\nOrario: {orario}\nLuogo: {luogo}\n\nPorta scarpe da basket, abbigliamento da allenamento, borraccia e certificato medico se non ancora inviato.\n\nFIL-ITALIA Nation Select"},
 confirmation:{subject:"FIL-ITALIA · Conferma iscrizione {evento}",body:"Ciao {nome},\n\nla tua iscrizione a {evento} è stata registrata correttamente.\n\nData: {data}\nOrario: {orario}\nLuogo: {luogo}\n\nFIL-ITALIA Nation Select"},
 payment:{subject:"FIL-ITALIA · Promemoria pagamento {evento}",body:"Ciao {nome},\n\nrisulta ancora in attesa il pagamento relativo a {evento}.\n\nRispondi a questa email se hai già effettuato il pagamento o se hai bisogno di assistenza.\n\nFIL-ITALIA Nation Select"},
 certificate:{subject:"FIL-ITALIA · Certificato medico {evento}",body:"Ciao {nome},\n\nper completare la registrazione a {evento} abbiamo bisogno del certificato medico valido.\n\nPuoi rispondere a questa email allegando il documento.\n\nFIL-ITALIA Nation Select"}
};

const $=id=>document.getElementById(id);
const DATA_KEY="filitalia-admin-console-v2-data";
const AUDIT_KEY="filitalia-admin-console-v2-audit";
const GMAIL_KEY="filitalia-admin-console-v2-gmail";
let currentView="dashboard";
let currentEventId=localStorage.getItem("filitalia-admin-current-event")||EVENTS[0].id;
let players=[];
let selectedId=null;
let activeFilter="all";
let editingId=null;
let realMode=false;
let loading=false;
let gmailConnection=null;
let selectedRecipients=new Set();
let demoData=readJson(DATA_KEY,clone(DEMO_SEED));
let demoAudit=readJson(AUDIT_KEY,[]);

function clone(value){return JSON.parse(JSON.stringify(value))}
function readJson(key,fallback){try{const parsed=JSON.parse(localStorage.getItem(key)||"null");return parsed||fallback}catch(_){return fallback}}
function saveDemo(){localStorage.setItem(DATA_KEY,JSON.stringify(demoData));localStorage.setItem(AUDIT_KEY,JSON.stringify(demoAudit))}
function eventInfo(){return EVENTS.find(e=>e.id===currentEventId)||EVENTS[0]}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(message){$("toast").textContent=message;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1900)}
function completedPayment(player){return ["paid","waived","not_required"].includes(player.paymentStatus)}
function certificateReady(player){return ["received","approved"].includes(player.certificateStatus)}
function paymentLabel(value){return({pending:"In attesa",paid:"Pagato",waived:"Esente",refunded:"Rimborsato",not_required:"Non richiesto"})[value]||value||"In attesa"}
function certificateLabel(value){return({missing:"Mancante",received:"Ricevuto",approved:"Approvato",expired:"Scaduto",rejected:"Rifiutato"})[value]||value||"Mancante"}
function dateTime(value){if(!value)return"—";try{return new Date(value).toLocaleString("it-IT")}catch(_){return String(value)}}
function logDemo(action,registrationId,details){demoAudit.unshift({id:Date.now()+Math.random(),event_id:currentEventId,registration_id:registrationId||null,action,details:details||{},created_at:new Date().toISOString()});saveDemo()}

function showView(name){
 currentView=name;
 document.querySelectorAll(".view").forEach(view=>view.classList.toggle("active",view.id===name+"View"));
 document.querySelectorAll("[data-view]").forEach(btn=>btn.classList.toggle("active",btn.dataset.view===name));
 const titles={dashboard:["Admin / Dashboard","Dashboard"],event:["Admin / Eventi / "+eventInfo().city,"Gestione evento"],email:["Admin / Email","Centro Email"],audit:["Admin / Storico","Storico modifiche"]};
 $("crumb").textContent=titles[name][0];$("pageTitle").textContent=titles[name][1];
 if(name==="email")renderEmail();
 if(name==="audit")loadAudit();
 try{history.replaceState(null,"","#"+name)}catch(_){ }
}

function renderEventSelector(){
 $("eventSelect").innerHTML=EVENTS.map(e=>`<option value="${escapeHtml(e.id)}">${escapeHtml(e.city)} · ${escapeHtml(e.dateLabel)}</option>`).join("");
 $("eventSelect").value=currentEventId;
}

function setModeBanner(type,title,text){
 const banner=$("modeBanner");banner.className="banner "+type;banner.innerHTML=`<div><strong>${escapeHtml(title)}</strong><div>${escapeHtml(text)}</div></div>`;
}

function setupRows(){
 return[
  {done:Boolean(window.FilitaliaAuth&&window.FilitaliaAuth.configured),label:"Supabase configurato"},
  {done:realMode,label:"Tabelle operazioni e audit attive"},
  {done:realMode,label:"Bucket certificati e foto attivo"},
  {done:Boolean(gmailConnection),label:"Gmail FIL-ITALIA collegato"}
 ];
}

function renderDashboard(){
 updateStats();
 $("eventCards").innerHTML=EVENTS.map(e=>`<div class="event-card ${e.id===currentEventId?"active":""}"><div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.dateLabel)} · ${escapeHtml(e.venue)}</small></div><button class="btn small" type="button" data-open-event="${escapeHtml(e.id)}">Apri</button></div>`).join("");
 $("eventCards").querySelectorAll("[data-open-event]").forEach(btn=>btn.onclick=async()=>{currentEventId=btn.dataset.openEvent;localStorage.setItem("filitalia-admin-current-event",currentEventId);$("eventSelect").value=currentEventId;await loadEvent();showView("event")});
 $("setupList").innerHTML=setupRows().map(row=>`<div class="setup-row"><span class="setup-dot ${row.done?"done":""}"></span><strong>${escapeHtml(row.label)}</strong></div>`).join("");
}

function visiblePlayers(){
 const query=$("search").value.toLowerCase().trim();
 return players.filter(player=>{
  const filterMatch=activeFilter==="all"||activeFilter===player.category||(activeFilter==="pending"&&!completedPayment(player))||(activeFilter==="certificate"&&!certificateReady(player))||(activeFilter==="checked"&&player.checked);
  const searchMatch=[player.name,player.email,player.phone,player.category,player.year,player.parent].join(" ").toLowerCase().includes(query);
  return filterMatch&&searchMatch;
 });
}

function taskMarkup(key,label,on){return`<div class="task"><div><strong>${escapeHtml(label)}</strong><div class="muted">${on?"Completato":"Da completare"}</div></div><button class="btn ${on?"on":""}" type="button" data-task="${escapeHtml(key)}">${on?"✓ Fatto":"Segna fatto"}</button></div>`}

function renderPlayers(){
 const rows=visiblePlayers();
 $("playerList").innerHTML=rows.length?rows.map(player=>`<button class="player ${player.id===selectedId?"active":""}" type="button" data-player="${escapeHtml(player.id)}"><span class="pill ${player.checked?"done":"pending"}">${player.checked?"Arrivato":"Da registrare"}</span><strong>${escapeHtml(player.name)}</strong><br><small>${escapeHtml(player.category)} · ${escapeHtml(player.year)} · Maglia ${escapeHtml(player.shirt)}</small></button>`).join(""):'<div class="empty">Nessun partecipante trovato.</div>';
 $("playerList").querySelectorAll("[data-player]").forEach(btn=>btn.onclick=()=>{selectedId=btn.dataset.player;renderPlayers();renderDetail()});
}

function selectedPlayer(){return players.find(p=>p.id===selectedId)||null}
function renderDetail(){
 const p=selectedPlayer();
 if(!p){$("playerDetail").innerHTML='<div class="empty">Seleziona un partecipante.</div>';return}
 const paymentClass=completedPayment(p)?"done":p.paymentStatus==="refunded"?"bad":"pending";
 const certificateClass=certificateReady(p)?"done":"pending";
 $("playerDetail").innerHTML=`<div class="detail"><div class="profile"><div><h2>${escapeHtml(p.name)}</h2><div class="muted">${escapeHtml(p.category)} · ${escapeHtml(p.year)}</div></div><div class="profile-actions management-only"><button id="singleEmailBtn" class="btn" type="button">✉️ Email</button><button id="editPlayerBtn" class="btn" type="button">Modifica</button></div></div>
 <div class="info-grid"><div class="info"><span>Email</span><strong>${escapeHtml(p.email||"—")}</strong></div><div class="info"><span>Telefono</span><strong>${escapeHtml(p.phone||"—")}</strong></div><div class="info"><span>Genitore / riferimento</span><strong>${escapeHtml(p.parent||"—")}</strong></div><div class="info"><span>Taglia</span><strong>${escapeHtml(p.shirt||"—")}</strong></div><div class="info"><span>Pagamento</span><strong class="pill ${paymentClass}" style="float:none">${escapeHtml(paymentLabel(p.paymentStatus))}</strong></div><div class="info"><span>Certificato</span><strong class="pill ${certificateClass}" style="float:none">${escapeHtml(certificateLabel(p.certificateStatus))}</strong></div></div>
 <div class="tasks">${taskMarkup("checked","Check-in",p.checked)}${taskMarkup("shirtDone","Maglia consegnata",p.shirtDone)}${taskMarkup("present","Presenza confermata",p.present)}</div>
 <div class="documents management-only"><div class="document"><strong>Pagamento</strong><button id="managePaymentBtn" class="btn small" type="button">Gestisci dettagli</button></div><div class="document"><strong>Certificato medico</strong><button id="certificateUploadBtn" class="btn small" type="button">Carica documento</button>${p.certificatePath?'<button id="certificateOpenBtn" class="btn small" type="button">Apri</button>':""}</div><div class="document"><strong>Foto giocatore</strong><button id="photoUploadBtn" class="btn small" type="button">Carica foto</button>${p.playerPhotoPath?'<button id="photoOpenBtn" class="btn small" type="button">Apri</button>':""}</div><div class="document"><strong>Ultimo aggiornamento</strong><span class="muted">${escapeHtml(dateTime(p.updatedAt))}</span></div></div>
 <textarea id="notes" class="notes management-only" placeholder="Note rapide…">${escapeHtml(p.notes||"")}</textarea></div>`;
 $("playerDetail").querySelectorAll("[data-task]").forEach(btn=>btn.onclick=()=>toggleTask(btn.dataset.task));
 $("editPlayerBtn").onclick=()=>openRegistrationModal("edit");
 $("singleEmailBtn").onclick=()=>{showView("email");$("audienceSelect").value="custom";selectedRecipients=new Set([p.id]);renderRecipients();applyTemplate()};
 $("managePaymentBtn").onclick=openPaymentModal;
 $("certificateUploadBtn").onclick=()=>chooseFile("certificate");
 $("photoUploadBtn").onclick=()=>chooseFile("photo");
 if($("certificateOpenBtn"))$("certificateOpenBtn").onclick=()=>openDocument(p.certificatePath);
 if($("photoOpenBtn"))$("photoOpenBtn").onclick=()=>openDocument(p.playerPhotoPath);
 $("notes").onchange=e=>saveChanges({notes:e.target.value},"notes_updated");
}

function updateStats(){
 const total=players.length,paid=players.filter(completedPayment).length,certs=players.filter(certificateReady).length,check=players.filter(p=>p.checked).length,shirts=players.filter(p=>p.shirtDone).length;
 ["dashTotal","eventTotal"].forEach(id=>$(id).textContent=total);["dashPaid","eventPaid"].forEach(id=>$(id).textContent=paid);$("dashCertificates").textContent=certs;["dashCheckin","eventCheckin"].forEach(id=>$(id).textContent=check);$("eventShirts").textContent=shirts;
}

function renderEvent(){
 const e=eventInfo();$("eventName").textContent=e.name;$("eventMeta").innerHTML=`<span>📅 ${escapeHtml(e.dateLabel)} · ${escapeHtml(e.time)}</span><span>📍 ${escapeHtml(e.venue)}</span><span>🆔 ${escapeHtml(e.id)}</span>`;
 renderPlayers();renderDetail();updateStats();renderDashboard();
}

async function loadEvent(){
 if(loading)return;loading=true;$("refreshBtn").disabled=true;
 try{
  await window.FilitaliaAdminData.requireAdmin();
  players=await window.FilitaliaAdminData.loadEvent(currentEventId);
  realMode=true;setModeBanner("real","Modalità reale attiva","Registrazioni e operazioni vengono salvate su Supabase.");
 }catch(error){
  realMode=false;players=clone(demoData[currentEventId]||[]);
  const message=String(error&&error.message||error||"");
  if(message.includes("NOT_AUTHENTICATED"))setModeBanner("demo","Anteprima senza login","Accedi come amministratore per leggere le registrazioni reali. Nel frattempo puoi provare tutta la console con dati demo.");
  else if(message.includes("event_admin_operations")||message.includes("relation")||message.includes("schema cache"))setModeBanner("demo","Migrazione Supabase da eseguire","La grafica è completa. Esegui il file 20260728_admin_console.sql per attivare il salvataggio reale.");
  else setModeBanner("demo","Modalità demo attiva","La console resta completamente provabile. Dettaglio tecnico: "+message.slice(0,140));
 }
 selectedId=players[0]?players[0].id:null;renderEvent();await renderGmail();loading=false;$("refreshBtn").disabled=false;
}

async function saveChanges(changes,action){
 const p=selectedPlayer();if(!p)return;
 const mapped={};
 Object.entries(changes).forEach(([key,value])=>{const map={paymentStatus:"payment_status",paymentAmount:"payment_amount",paymentMethod:"payment_method",paymentDate:"payment_date",paymentReference:"payment_reference",certificateStatus:"certificate_status",certificatePath:"certificate_path",playerPhotoPath:"player_photo_path",checked:"checked_in",shirtDone:"shirt_delivered",present:"present",notes:"notes"};mapped[map[key]||key]=value});
 try{
  if(realMode)await window.FilitaliaAdminData.saveOperation(currentEventId,p.id,mapped,action);
  Object.assign(p,changes);if(!realMode){demoData[currentEventId]=players;logDemo(action,p.id,changes)}renderEvent();toast("Operazione salvata");
 }catch(error){toast("Errore: "+String(error.message||error))}
}

function toggleTask(key){const p=selectedPlayer();if(!p)return;saveChanges({[key]:!p[key]},key+"_updated")}

function openRegistrationModal(mode){
 editingId=mode==="edit"?selectedId:null;const p=editingId?selectedPlayer():{name:"",year:"",category:"U12",shirt:"S",email:"",phone:"",parent:""};if(!p)return;
 $("registrationModalTitle").textContent=editingId?"Modifica partecipante":"Nuova registrazione";$("formName").value=p.name;$("formYear").value=p.year==="—"?"":p.year;$("formCategory").value=p.category==="—"?"U12":p.category;$("formShirt").value=p.shirt==="—"?"S":p.shirt;$("formEmail").value=p.email||"";$("formPhone").value=p.phone||"";$("formParent").value=p.parent==="—"?"":p.parent;$("registrationModal").classList.add("show")
}
function closeRegistrationModal(){$("registrationModal").classList.remove("show")}
async function saveRegistration(){
 const payload={name:$("formName").value.trim(),birthYear:$("formYear").value.trim(),category:$("formCategory").value,shirt:$("formShirt").value,email:$("formEmail").value.trim(),phone:$("formPhone").value.trim(),parent:$("formParent").value.trim(),paymentStatus:"pending"};
 if(!payload.name)return toast("Inserisci il nome");
 try{
  if(realMode){
   if(editingId){const p=selectedPlayer();const basePayload=Object.assign({},p.payload||{},{category:payload.category,birth_year:payload.birthYear,birth_date:payload.birthYear?payload.birthYear+"-01-01":null,parent_name:payload.parent});await window.FilitaliaAdminData.updateRegistration(editingId,{participant_name:payload.name,participant_email:payload.email||null,participant_phone:payload.phone||null,shirt_size:payload.shirt,payload:basePayload},currentEventId)}
   else await window.FilitaliaAdminData.createRegistration(eventInfo(),payload);
   closeRegistrationModal();await loadEvent();toast(editingId?"Partecipante aggiornato":"Registrazione creata");return;
  }
  if(editingId){Object.assign(selectedPlayer(),{name:payload.name,year:payload.birthYear||"—",category:payload.category,shirt:payload.shirt,email:payload.email,phone:payload.phone,parent:payload.parent||"—"});logDemo("registration_updated",editingId,payload)}
  else{const p={id:"demo-"+Date.now(),name:payload.name,email:payload.email,phone:payload.phone,year:payload.birthYear||"—",category:payload.category,shirt:payload.shirt,parent:payload.parent||"—",paymentStatus:"pending",paymentAmount:null,paymentMethod:"",paymentDate:"",paymentReference:"",certificateStatus:"missing",certificatePath:"",playerPhotoPath:"",checked:false,shirtDone:false,present:false,notes:""};players.push(p);selectedId=p.id;demoData[currentEventId]=players;logDemo("registration_created",p.id,payload)}
  saveDemo();closeRegistrationModal();renderEvent();toast(editingId?"Partecipante aggiornato":"Registrazione creata");
 }catch(error){toast("Errore: "+String(error.message||error))}
}

function openPaymentModal(){const p=selectedPlayer();if(!p)return;$("paymentStatus").value=p.paymentStatus||"pending";$("paymentAmount").value=p.paymentAmount==null?"":p.paymentAmount;$("paymentMethod").value=p.paymentMethod||"";$("paymentDate").value=p.paymentDate||"";$("paymentReference").value=p.paymentReference||"";$("paymentModal").classList.add("show")}
function closePaymentModal(){$("paymentModal").classList.remove("show")}
async function savePayment(){const amount=$("paymentAmount").value.trim().replace(",",".");await saveChanges({paymentStatus:$("paymentStatus").value,paymentAmount:amount===""?null:Number(amount),paymentMethod:$("paymentMethod").value,paymentDate:$("paymentDate").value||null,paymentReference:$("paymentReference").value.trim()},"payment_updated");closePaymentModal()}

function chooseFile(kind){const input=document.createElement("input");input.type="file";input.accept=kind==="certificate"?"application/pdf,image/jpeg,image/png,image/webp":"image/jpeg,image/png,image/webp";input.onchange=async()=>{const file=input.files&&input.files[0];if(!file)return;const p=selectedPlayer();try{if(realMode){await window.FilitaliaAdminData.uploadRegistrationFile(currentEventId,p.id,kind,file);await loadEvent()}else{const fakePath="demo/"+kind+"/"+file.name;const changes=kind==="certificate"?{certificatePath:fakePath,certificateStatus:"received"}:{playerPhotoPath:fakePath};Object.assign(p,changes);demoData[currentEventId]=players;logDemo(kind+"_uploaded",p.id,{name:file.name});renderEvent()}toast(kind==="certificate"?"Certificato caricato":"Foto caricata")}catch(error){toast("Errore caricamento: "+String(error.message||error))}};input.click()}
async function openDocument(path){if(!path)return;try{if(realMode){const url=await window.FilitaliaAdminData.signedDocumentUrl(path,900);window.open(url,"_blank","noopener")}else toast("Documento demo: "+path)}catch(error){toast("Documento non disponibile: "+String(error.message||error))}}

function audienceRows(){const value=$("audienceSelect").value;if(value==="custom")return players.filter(p=>selectedRecipients.has(p.id));return players.filter(p=>p.email&&(value==="all"||value===p.category||(value==="pending"&&!completedPayment(p))||(value==="certificate"&&!certificateReady(p))))}
function renderRecipients(){
 const value=$("audienceSelect").value;const rows=audienceRows();if(value!=="custom")selectedRecipients=new Set(rows.map(p=>p.id));
 $("recipientList").innerHTML=rows.length?rows.map(p=>`<label class="recipient"><input type="checkbox" data-recipient="${escapeHtml(p.id)}" ${selectedRecipients.has(p.id)?"checked":""}><div><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.email)} · ${escapeHtml(p.category)}</small></div></label>`).join(""):'<div class="empty">Nessun destinatario.</div>';
 $("recipientList").querySelectorAll("[data-recipient]").forEach(input=>input.onchange=()=>{input.checked?selectedRecipients.add(input.dataset.recipient):selectedRecipients.delete(input.dataset.recipient);updateRecipientCount()});updateRecipientCount()
}
function updateRecipientCount(){const count=selectedRecipients.size;$("recipientCount").textContent=count;$("sendSummary").textContent=count+" email pronte";$("sendEmailsBtn").disabled=count===0}
function replaceEventTokens(text){const e=eventInfo();return String(text).replace(/\{evento\}/g,e.name).replace(/\{data\}/g,e.dateLabel).replace(/\{orario\}/g,e.time).replace(/\{luogo\}/g,e.venue)}
function applyTemplate(){const key=$("templateSelect").value;if(key==="custom")return;const t=TEMPLATES[key];$("emailSubject").value=replaceEventTokens(t.subject);$("emailBody").value=replaceEventTokens(t.body)}
async function renderGmail(){
 if(realMode){try{gmailConnection=await window.FilitaliaAdminData.getGmailConnection()}catch(_){gmailConnection=null}}
 else gmailConnection=localStorage.getItem(GMAIL_KEY)==="true"?{gmail_address:"filitalia.demo@gmail.com"}:null;
 $("gmailDot").classList.toggle("on",Boolean(gmailConnection));$("gmailTitle").textContent=gmailConnection?"Gmail FIL-ITALIA collegato":"Gmail FIL-ITALIA non collegato";$("gmailText").textContent=gmailConnection?(gmailConnection.gmail_address||"Account ufficiale pronto per l’invio"):"Collega soltanto l’account ufficiale FIL-ITALIA.";$("connectGmailBtn").textContent=gmailConnection?(realMode?"Account collegato":"Disconnetti demo"):"Collega Gmail FIL-ITALIA";renderDashboard()
}
function renderEmail(){renderRecipients();applyTemplate();renderGmail()}
async function connectGmail(){try{if(realMode){if(gmailConnection)return toast("Gmail è già collegato");await window.FilitaliaAdminData.startGmailConnection()}else{const on=localStorage.getItem(GMAIL_KEY)!=="true";localStorage.setItem(GMAIL_KEY,String(on));await renderGmail();toast(on?"Gmail collegato nella demo":"Gmail demo disconnesso")}}catch(error){toast("Collegamento non disponibile: "+String(error.message||error))}}
async function sendEmails(){
 if(!gmailConnection)return toast("Prima collega Gmail FIL-ITALIA");const recipients=players.filter(p=>selectedRecipients.has(p.id)&&p.email).map(p=>({registration_id:p.id,email:p.email,name:p.name}));const subject=$("emailSubject").value.trim(),body=$("emailBody").value.trim();if(!subject||!body)return toast("Completa oggetto e messaggio");if(!recipients.length)return toast("Seleziona almeno un destinatario");
 $("sendEmailsBtn").disabled=true;$("emailProgress").classList.add("show");$("emailProgressBar").style.width="15%";$("emailResult").hidden=true;
 try{
  let result;if(realMode){result=await window.FilitaliaAdminData.sendEmail({event_id:currentEventId,subject,body_template:body,audience:{type:$("audienceSelect").value},recipients})}
  else{for(let i=0;i<recipients.length;i++){await new Promise(resolve=>setTimeout(resolve,180));$("emailProgressBar").style.width=Math.round((i+1)/recipients.length*100)+"%"}result={sent:recipients.length,failed:0,status:"completed"};logDemo("email_campaign_sent",null,{recipients:recipients.length,subject})}
  $("emailProgressBar").style.width="100%";$("emailResult").hidden=false;$("emailResult").innerHTML=`<div><strong>Invio completato</strong><div>${escapeHtml(result.sent)} inviate · ${escapeHtml(result.failed||0)} fallite. Ogni destinatario ha ricevuto una copia separata.</div></div>`;toast("Campagna email completata")
 }catch(error){toast("Invio non riuscito: "+String(error.message||error))}finally{$("sendEmailsBtn").disabled=false;setTimeout(()=>{$("emailProgress").classList.remove("show");$("emailProgressBar").style.width="0"},900)}
}

async function loadAudit(){
 let rows=[];try{rows=realMode?await window.FilitaliaAdminData.listAudit(currentEventId,150):demoAudit.filter(r=>r.event_id===currentEventId)}catch(error){rows=[];toast("Storico non disponibile: "+String(error.message||error))}
 $("auditList").innerHTML=rows.length?rows.map(row=>`<div class="audit-item"><div><strong>${escapeHtml(dateTime(row.created_at))}</strong><small>${escapeHtml(row.registration_id||"Evento")}</small></div><div><strong>${escapeHtml(String(row.action||"").replace(/_/g," "))}</strong><small>${escapeHtml(JSON.stringify(row.details||{}))}</small></div></div>`).join(""):'<div class="empty">Nessuna modifica registrata.</div>'
}

function toggleEventMode(){const on=!document.body.classList.contains("event-mode");document.body.classList.toggle("event-mode",on);$("eventModeBtn").textContent=on?"← Torna a Gestione":"🎯 Event Day";if(on)showView("event")}

function bind(){
 document.querySelectorAll("[data-view]").forEach(btn=>btn.onclick=()=>showView(btn.dataset.view));
 $("eventSelect").onchange=async()=>{currentEventId=$("eventSelect").value;localStorage.setItem("filitalia-admin-current-event",currentEventId);await loadEvent()};
 $("refreshBtn").onclick=loadEvent;$("eventModeBtn").onclick=toggleEventMode;$("search").oninput=renderPlayers;
 document.querySelectorAll("[data-filter]").forEach(btn=>btn.onclick=()=>{document.querySelectorAll("[data-filter]").forEach(item=>item.classList.remove("active"));btn.classList.add("active");activeFilter=btn.dataset.filter;renderPlayers()});
 $("newRegistrationBtn").onclick=()=>openRegistrationModal("add");$("exportBtn").onclick=()=>window.FilitaliaAdminData?window.FilitaliaAdminData.exportRegistrationsCsv(players,"filitalia-"+eventInfo().city.toLowerCase()+"-iscritti.csv"):null;$("openBulkEmailBtn").onclick=()=>showView("email");
 $("cancelRegistrationBtn").onclick=closeRegistrationModal;$("saveRegistrationBtn").onclick=saveRegistration;$("cancelPaymentBtn").onclick=closePaymentModal;$("savePaymentBtn").onclick=savePayment;
 $("audienceSelect").onchange=()=>{selectedRecipients=new Set();renderRecipients()};$("templateSelect").onchange=applyTemplate;$("connectGmailBtn").onclick=connectGmail;$("sendEmailsBtn").onclick=sendEmails;$("reloadAuditBtn").onclick=loadAudit;
 [$("registrationModal"),$("paymentModal")].forEach(modal=>modal.onclick=e=>{if(e.target===modal)modal.classList.remove("show")});document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeRegistrationModal();closePaymentModal()}})
}

async function init(){renderEventSelector();bind();const hash=location.hash.replace("#","");if(["dashboard","event","email","audit"].includes(hash))showView(hash);await loadEvent();showView(currentView)}
init();
})();
