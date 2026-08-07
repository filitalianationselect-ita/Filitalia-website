(function () {
  "use strict";

  let auth = null;
  let bundle = null;

  function byId(id){return document.getElementById(id);}
  function esc(value){return String(value==null?"":value).replace(/[&<>'"]/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c];});}

  async function requireAdmin(){
    const client=window.FilitaliaAuth;
    if(!client||!client.configured||!client.client) throw new Error("SUPABASE_NOT_CONFIGURED");
    const profile=await client.getOwnProfile();
    if(!profile||profile.status!=="active"||profile.role!=="admin"){
      window.location.replace("account.html");
      throw new Error("ADMIN_REQUIRED");
    }
    return client;
  }

  function stat(label,value){
    return '<article class="registry-stat"><span>'+esc(label)+'</span><strong>'+esc(value||0)+'</strong></article>';
  }

  function renderBundle(){
    const summary=bundle&&bundle.summary?bundle.summary:{};
    byId("importSummary").innerHTML=[
      stat("Righe origine",summary.sourceRows),stat("Registrazioni valide",summary.validRegistrations),
      stat("Giocatori unici",summary.uniquePlayers),stat("Multi-evento",summary.playersWithMultipleRegistrations),
      stat("Da risolvere",summary.unresolvedRows),stat("Conflitti identità",summary.possibleIdentityConflicts)
    ].join("");

    const unresolved=Array.isArray(bundle.unresolved)?bundle.unresolved:[];
    const conflicts=Array.isArray(bundle.possibleIdentityConflicts)?bundle.possibleIdentityConflicts:[];
    const warnings=[];
    if(unresolved.length){
      warnings.push('<div class="registry-panel" style="box-shadow:none"><div class="registry-panel-head"><h2>Righe da risolvere</h2></div><div style="padding:14px">'+unresolved.slice(0,20).map(function(row){return '<p><strong>Riga '+esc(row.rowNumber)+'</strong> · '+esc(row.firstName+' '+row.lastName)+' · '+esc(row.reason)+'</p>';}).join("")+'</div></div>');
    }
    if(conflicts.length){
      warnings.push('<div class="registry-panel" style="box-shadow:none"><div class="registry-panel-head"><h2>Possibili identità duplicate</h2></div><div style="padding:14px">'+conflicts.map(function(row){return '<p><strong>'+esc(row.manualKey)+'</strong><br><span class="registry-muted">'+esc((row.identityKeys||[]).join(" / "))+'</span></p>';}).join("")+'</div></div>');
    }
    if(!warnings.length) warnings.push('<p class="registry-pill good">Pacchetto pronto per l’importazione.</p>');
    byId("importWarnings").innerHTML=warnings.join("");

    const registrations=Array.isArray(bundle.registrations)?bundle.registrations:[];
    byId("runRegistryImport").disabled=!registrations.length||unresolved.length>0||conflicts.length>0;
    byId("importStatus").textContent=byId("runRegistryImport").disabled
      ? "L’import resta bloccato finché ci sono righe irrisolte o conflitti di identità."
      : registrations.length+" registrazioni pronte. Controlla il riepilogo prima di importare.";
  }

  async function readFile(file){
    const text=await file.text();
    const parsed=JSON.parse(text);
    if(!parsed||!Array.isArray(parsed.registrations)||!parsed.summary) throw new Error("PACCHETTO_NON_VALIDO");
    return parsed;
  }

  async function runImport(){
    if(!bundle||!Array.isArray(bundle.registrations)) return;
    if(!window.confirm("Importare "+bundle.registrations.length+" registrazioni nel nuovo registro? Il sistema precedente non verrà cancellato.")) return;
    const button=byId("runRegistryImport");
    button.disabled=true;
    byId("importStatus").textContent="Importazione in corso...";
    try{
      const result=await auth.client.functions.invoke("admin-import-registry",{body:{registrations:bundle.registrations}});
      if(result.error) throw result.error;
      const data=result.data||{};
      byId("importStatus").textContent="Importate: "+(data.imported||0)+" · Errori: "+(data.failed||0)+(data.failed?". Controlla i dettagli nella console prima di riprovare.":". Import completato.");
      if(data.errors&&data.errors.length) console.error("FILITALIA_IMPORT_ERRORS",data.errors);
      if(!data.failed) setTimeout(function(){window.location.href="admin-registry.html";},900);
    }catch(error){
      byId("importStatus").textContent="Importazione non riuscita: "+String(error&&error.message||error);
      button.disabled=false;
    }
  }

  async function init(){
    try{
      auth=await requireAdmin();
      byId("importBundleFile").addEventListener("change",async function(event){
        const file=event.target.files&&event.target.files[0];
        if(!file)return;
        try{bundle=await readFile(file);renderBundle();}
        catch(error){bundle=null;byId("importSummary").innerHTML="";byId("importWarnings").innerHTML="";byId("runRegistryImport").disabled=true;byId("importStatus").textContent="File non valido: "+String(error.message||error);}
      });
      byId("runRegistryImport").addEventListener("click",runImport);
    }catch(error){if(String(error.message||error)!=="ADMIN_REQUIRED")byId("importStatus").textContent=String(error.message||error);}
  }

  document.addEventListener("DOMContentLoaded",init);
})();
