(function(){
  "use strict";
  const d=document;
  const auth=window.FilitaliaAuth;

  function byId(id){return d.getElementById(id);}
  function esc(value){return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[ch];});}
  function text(value,fallback){const v=String(value==null?"":value).trim();return v||fallback||"—";}
  function yearOf(date){const m=String(date||"").match(/^(\d{4})/);return m?Number(m[1]):null;}
  function categoryFor(date){
    const y=yearOf(date);
    if(!y)return "Categoria da completare";
    if(y>=2014)return "U12";
    if(y>=2012)return "U14";
    if(y>=2010)return "U16";
    if(y>=2008)return "U18";
    if(y===2007)return "U19";
    return "Senior";
  }
  function prettyDate(value){
    if(!value)return "";
    const date=new Date(String(value).length===10?value+"T12:00:00":value);
    if(Number.isNaN(date.getTime()))return text(value);
    return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(date);
  }
  function drivePhotoUrl(value){
    const v=String(value||"").trim();
    const m=v.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)||v.match(/[?&]id=([^&#]+)/);
    return m?"https://drive.google.com/thumbnail?id="+encodeURIComponent(m[1])+"&sz=w1200":v;
  }
  function legacyPhotoCandidate(source){
    if(!source||typeof source!=="object")return "";
    const keys=["photo_path","photo_url","image_url","card_image_url","primary_photo_url","public_url","preview_url"];
    for(const key of keys){
      const value=String(source[key]||"").trim();
      if(value)return value;
    }
    const original=source.original_data&&typeof source.original_data==="object"?source.original_data:null;
    if(!original)return "";
    const legacy=original["Foto Giocatore"]||original.photo_url||original.photo||"";
    if(typeof legacy==="string")return legacy.trim();
    if(legacy&&typeof legacy==="object"){
      return String(legacy.url||legacy.webViewLink||legacy.drive_url||legacy.public_url||legacy.preview_url||legacy.storage_path||legacy.path||"").trim();
    }
    return "";
  }
  async function resolvePhoto(profile,canonical,history){
    const own=String(profile&&profile.avatar_path||"").trim();
    if(own){
      if(/^https?:\/\//i.test(own))return drivePhotoUrl(own);
      try{return await auth.getSignedProfilePhotoUrl(own.replace(/^profile-media\//,""),3600);}catch(_){}
    }
    const candidates=[legacyPhotoCandidate(canonical)].concat((history||[]).slice().reverse().map(legacyPhotoCandidate)).filter(Boolean);
    for(let candidate of candidates){
      if(/^https?:\/\//i.test(candidate))return drivePhotoUrl(candidate);
      candidate=candidate.replace(/^profile-media\//,"");
      try{
        const signed=await auth.getSignedProfilePhotoUrl(candidate,3600);
        if(signed)return signed;
      }catch(_){}
    }
    return "images/logo.png";
  }
  function mergeData(profile,player,canonical){
    return {
      firstName:text(profile&&profile.first_name,canonical&&canonical.first_name),
      lastName:text(profile&&profile.last_name,canonical&&canonical.last_name),
      birthDate:(player&&player.birth_date)||(canonical&&canonical.birth_date)||"",
      city:(player&&player.residence_city)||(canonical&&canonical.residence_city)||(profile&&profile.city)||"",
      position:(player&&player.position)||(canonical&&canonical.position)||"",
      club:(player&&player.current_club)||(canonical&&canonical.current_club)||"",
      height:(player&&player.height_cm)||(canonical&&canonical.height_cm)||"",
      weight:(player&&player.weight_kg)||(canonical&&canonical.weight_kg)||"",
      instagram:(player&&player.instagram)||(canonical&&canonical.instagram)||"",
      highlights:(player&&player.highlights_url)||(canonical&&canonical.highlights_url)||"",
      italianPassport:player&&player.italian_passport!=null?player.italian_passport:canonical&&canonical.italian_passport,
      filipinoPassport:player&&player.filipino_passport!=null?player.filipino_passport:canonical&&canonical.filipino_passport
    };
  }
  function completion(data,photoUrl){
    const checks=[
      ["Foto",photoUrl&& !photoUrl.endsWith("/images/logo.png") && !photoUrl.endsWith("images/logo.png")],
      ["Ruolo",data.position],
      ["Altezza",data.height],
      ["Città",data.city],
      ["Squadra",data.club],
      ["Instagram / Highlights",data.instagram||data.highlights],
      ["Data di nascita",data.birthDate]
    ];
    const done=checks.filter(x=>Boolean(x[1])).length;
    return {percent:Math.round(done/checks.length*100),checks,missing:checks.filter(x=>!x[1]).map(x=>x[0])};
  }
  function eventList(history){
    const seen=new Set();
    return (history||[]).filter(function(item){
      const key=[item.event_name,item.event_city,item.event_date,item.event_date_label].join("|").toLowerCase();
      if(seen.has(key))return false;
      seen.add(key);return true;
    }).slice(0,8);
  }
  function linkCard(label,value,url,kind){
    if(!value)return '<div class="ppv-link muted"><span>'+esc(label)+'</span><strong>Da aggiungere</strong></div>';
    if(url)return '<a class="ppv-link" href="'+esc(url)+'" target="_blank" rel="noopener"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></a>';
    return '<div class="ppv-link"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>';
  }
  function instagramUrl(value){
    const v=String(value||"").trim().replace(/^@/,"");
    return v?"https://www.instagram.com/"+encodeURIComponent(v):"";
  }
  function render(section,profile,player,canonical,history,photoUrl){
    const data=mergeData(profile,player,canonical);
    const fullName=[data.firstName,data.lastName].filter(Boolean).join(" ")||"Player FIL-ITALIA";
    const comp=completion(data,photoUrl);
    const events=eventList(history);
    const status=String(profile&&profile.status||"pending");
    const year=yearOf(data.birthDate);
    const passport=[data.italianPassport===true?"IT":null,data.filipinoPassport===true?"PH":null].filter(Boolean).join(" / ");

    section.innerHTML=
      '<div class="ppv-heading"><div><span class="ppv-kicker">FIL-ITALIA PLAYER AREA</span><h2>Il mio profilo</h2></div><button id="ppvEditButton" class="ppv-edit" type="button">✎ Modifica profilo</button></div>'+
      '<article class="ppv-hero">'+
        '<div class="ppv-photo-wrap"><img class="ppv-photo" src="'+esc(photoUrl)+'" alt="Foto profilo di '+esc(fullName)+'" referrerpolicy="no-referrer"></div>'+
        '<div class="ppv-main">'+
          '<div class="ppv-name-row"><div><h1>'+esc(fullName)+'</h1><p>'+esc(categoryFor(data.birthDate))+(year?' · '+esc(year):'')+'</p><p class="ppv-city">📍 '+esc(text(data.city,"Città da aggiungere"))+'</p></div><span class="ppv-account-status '+(status==="active"?"active":"pending")+'">'+esc(status==="active"?"Account attivo":"Account in attesa")+'</span></div>'+
          '<div class="ppv-stats">'+
            '<div><strong>'+esc(text(data.position,"Da aggiungere"))+'</strong><span>Ruolo</span></div>'+
            '<div><strong>'+esc(data.height?data.height+" cm":"Da aggiungere")+'</strong><span>Altezza</span></div>'+
            '<div><strong>'+esc(text(data.club,"Da aggiungere"))+'</strong><span>Squadra attuale</span></div>'+
          '</div>'+
          '<div class="ppv-links">'+
            linkCard("Instagram",data.instagram,instagramUrl(data.instagram))+
            linkCard("Highlights",data.highlights?"Vedi video":"",data.highlights)+
          '</div>'+
          '<div class="ppv-completion"><div class="ppv-completion-head"><strong>Profilo completato</strong><b>'+comp.percent+'%</b></div><div class="ppv-progress"><span style="width:'+comp.percent+'%"></span></div><div class="ppv-checks">'+comp.checks.map(function(x){return '<span class="'+(x[1]?"done":"todo")+'">'+(x[1]?"✓":"•")+' '+esc(x[0])+'</span>';}).join("")+'</div></div>'+
        '</div>'+
      '</article>'+
      '<div class="ppv-bottom">'+
        '<article class="ppv-panel"><h3>🏀 Talent ID</h3><div class="ppv-events">'+(events.length?events.map(function(e){return '<div class="ppv-event"><span class="ppv-event-check">✓</span><div><strong>'+esc(text(e.event_name,"Evento FIL-ITALIA"))+'</strong><small>'+esc([e.event_city,prettyDate(e.event_date||e.event_date_label)].filter(Boolean).join(" · "))+'</small></div></div>';}).join(""):'<p class="ppv-empty">Nessun Talent ID collegato ancora.</p>')+'</div></article>'+
        '<article class="ppv-panel"><h3>👤 Informazioni giocatore</h3><dl class="ppv-info">'+
          '<div><dt>Nome</dt><dd>'+esc(text(data.firstName))+'</dd></div><div><dt>Cognome</dt><dd>'+esc(text(data.lastName))+'</dd></div>'+
          '<div><dt>Anno di nascita</dt><dd>'+esc(year||"—")+'</dd></div><div><dt>Categoria</dt><dd>'+esc(categoryFor(data.birthDate))+'</dd></div>'+
          '<div><dt>Ruolo</dt><dd>'+esc(text(data.position))+'</dd></div><div><dt>Altezza</dt><dd>'+esc(data.height?data.height+" cm":"—")+'</dd></div>'+
          '<div><dt>Città</dt><dd>'+esc(text(data.city))+'</dd></div><div><dt>Squadra</dt><dd>'+esc(text(data.club))+'</dd></div>'+
          '<div><dt>Passaporti</dt><dd>'+esc(passport||"—")+'</dd></div></dl></article>'+
        '<article class="ppv-panel"><h3>🔗 Profilo e link</h3><div class="ppv-contact-list">'+
          '<div><span>Instagram</span><strong>'+esc(text(data.instagram,"—"))+'</strong></div>'+
          '<div><span>Highlights</span><strong>'+(data.highlights?'<a href="'+esc(data.highlights)+'" target="_blank" rel="noopener">Apri video</a>':'—')+'</strong></div>'+
          '<div><span>Stato profilo</span><strong>'+(comp.missing.length?'Mancano: '+esc(comp.missing.join(", ")):'Completo ✓')+'</strong></div>'+
        '</div></article>'+
      '</div>';

    const edit=byId("ppvEditButton");
    const editor=byId("playerProfileSection");
    if(edit&&editor){
      edit.onclick=function(){
        editor.hidden=false;
        editor.classList.add("ppv-editor-open");
        edit.textContent="Chiudi modifica";
        edit.onclick=function(){editor.hidden=true;editor.classList.remove("ppv-editor-open");refresh();};
        editor.scrollIntoView({behavior:"smooth",block:"start"});
      };
    }
  }
  async function refresh(){
    if(!auth||!auth.configured)return;
    let section=byId("playerProfileViewSection");
    if(!section){
      section=d.createElement("section");
      section.id="playerProfileViewSection";
      section.className="ppv-shell";
      const anchor=byId("profilo-personale")||byId("playerProfileSection");
      if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(section,anchor);
    }
    try{
      const profile=await auth.getOwnProfile();
      const role=String(profile&&(profile.actual_role||profile.role||profile.requested_role)||"").toLowerCase();
      const isPlayer=role==="player"||String(profile&&profile.requested_role||"").toLowerCase()==="player";
      section.hidden=!isPlayer;
      if(!isPlayer)return;
      d.body.classList.add("ppv-player-mode");
      const accountNav=d.querySelector('.nav-links a[href="account.html"]');
      if(accountNav)accountNav.textContent="Il mio profilo";
      const workspaceTitle=d.querySelector(".account-workspace-copy h1");
      const workspaceCopy=d.querySelector(".account-workspace-copy p");
      if(workspaceTitle)workspaceTitle.textContent="Il mio profilo";
      if(workspaceCopy)workspaceCopy.textContent="La tua scheda atleta FIL-ITALIA, i Talent ID e i dati del tuo profilo.";
      section.innerHTML='<div class="ppv-loading">Caricamento Player Profile…</div>';
      const results=await Promise.allSettled([
        auth.getOwnPlayerProfile(),
        auth.getMyLinkedPlayers?auth.getMyLinkedPlayers():Promise.resolve([]),
        auth.getOwnRegistryRegistrations?auth.getOwnRegistryRegistrations():Promise.resolve([])
      ]);
      const player=results[0].status==="fulfilled"?results[0].value:null;
      const linked=results[1].status==="fulfilled"?results[1].value:[];
      const history=results[2].status==="fulfilled"?results[2].value:[];
      const canonical=(linked||[]).find(x=>String(x.relationship||"")==="self")||(linked||[])[0]||null;
      const photoUrl=await resolvePhoto(profile,canonical,history);
      render(section,profile,player,canonical,history,photoUrl);
      const editor=byId("playerProfileSection");
      if(editor&&!editor.classList.contains("ppv-editor-open"))editor.hidden=true;
    }catch(error){
      section.innerHTML='<div class="ppv-loading error">Impossibile caricare il Player Profile. Riprova tra poco.</div>';
      console.warn("Player Profile dashboard unavailable",error);
    }
  }

  function boot(){
    if(!window.FilitaliaAuth){setTimeout(boot,150);return;}
    refresh();
    const status=byId("playerProfileStatus");
    if(status){
      new MutationObserver(function(){
        const t=String(status.textContent||"").toLowerCase();
        if(t.includes("salvato")||t.includes("sincron"))setTimeout(function(){
          const editor=byId("playerProfileSection");if(editor){editor.hidden=true;editor.classList.remove("ppv-editor-open");}
          refresh();
        },350);
      }).observe(status,{childList:true,subtree:true,characterData:true});
    }
  }
  if(d.readyState==="loading")d.addEventListener("DOMContentLoaded",boot);else boot();
})();