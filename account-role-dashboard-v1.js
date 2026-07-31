(function(){
  'use strict';

  const d=document;
  const byId=id=>d.getElementById(id);
  const MOVEMENT_LIMIT=5;
  let registrationMovementsExpanded=false;

  const roleProfiles={
    player:{label:'Giocatore',title:'La tua area giocatore',description:'Gestisci profilo basket, iscrizioni ai camp, documenti, pagamenti e comunicazioni personali.',documents:'Profilo e certificati'},
    parent:{label:'Genitore',title:'La tua area genitore',description:'Controlla giocatori collegati, iscrizioni, consensi, documenti, pagamenti e comunicazioni.',documents:'Per i giocatori collegati'},
    coach:{label:'Coach',title:'La tua area coach',description:'Consulta eventi assegnati, giocatori autorizzati, presenze, valutazioni e attività dello staff.',documents:'Qualifiche e BLSD'},
    coordinator:{label:'Coordinatore',title:'La tua area coordinatore',description:'Gestisci le attività della tua città, gli eventi assegnati, lo staff operativo e le comunicazioni.',documents:'Logistica e certificazioni'},
    staff:{label:'Staff',title:'La tua area staff',description:'Consulta eventi, turni, mansioni, documenti e comunicazioni relativi alle attività assegnate.',documents:'Solo quelli assegnati'},
    volunteer:{label:'Volontario',title:'La tua area volontario',description:'Consulta disponibilità, turni, mansioni, referente e checklist operative senza accedere ai dati sensibili.',documents:'Solo certificazioni personali'},
    admin:{label:'Admin',title:'Area Admin',description:'Gestisci il tuo profilo amministratore e apri il pannello operativo FIL-ITALIA.',documents:'Gestione autorizzata'},
    super_admin:{label:'Super Admin',title:'Area Admin',description:'Gestisci il tuo account e accedi separatamente al pannello Super Admin con tutti gli strumenti della piattaforma.',documents:'Gestione completa'},
    pending:{label:'In attesa',title:'Account in attesa',description:'Puoi completare i dati personali mentre attendi l’approvazione dell’amministratore.',documents:'Non ancora disponibili'}
  };

  function normalized(value){
    return String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  }

  function detectRole(){
    const text=normalized(byId('accountRole')?.textContent);
    if(text.includes('super')) return 'super_admin';
    if(text.includes('admin')||text.includes('amministr')) return 'admin';
    if(text.includes('coordin')) return 'coordinator';
    if(text.includes('coach')||text.includes('allenator')) return 'coach';
    if(text.includes('genitor')||text.includes('tutor')||text.includes('parent')||text.includes('magulang')) return 'parent';
    if(text.includes('volont')||text.includes('volunteer')||text.includes('boluntary')) return 'volunteer';
    if(text.includes('staff')) return 'staff';
    if(text.includes('giocator')||text.includes('player')||text.includes('manlalaro')) return 'player';
    return 'pending';
  }

  function countRegistrations(){
    const box=byId('accountRegistrations');
    if(!box) return 0;
    const cards=box.querySelectorAll('.registration-mini-card,[data-registration-id],article');
    return cards.length;
  }

  function movementText(key,total){
    const lang=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    const more=Math.max(0,total-MOVEMENT_LIMIT);
    const copy={
      it:{show:'Mostra movimenti'+(more?' ('+more+')':''),hide:'Mostra meno'},
      en:{show:'Show movements'+(more?' ('+more+')':''),hide:'Show less'},
      ph:{show:'Ipakita ang movements'+(more?' ('+more+')':''),hide:'Ipakita ang mas kaunti'}
    };
    return (copy[lang]||copy.it)[key];
  }

  function ensureMovementStyle(){
    if(byId('accountMovementLimitStyle')) return;
    const style=d.createElement('style');
    style.id='accountMovementLimitStyle';
    style.textContent='.account-registration-hidden{display:none!important}.account-movement-toggle{width:100%;margin-top:14px;text-align:center}.account-movement-toggle.account-button{display:block}';
    d.head.appendChild(style);
  }

  function collapseRegistrationMovements(){
    const box=byId('accountRegistrations');
    if(!box) return;
    ensureMovementStyle();
    const cards=Array.from(box.children).filter(node=>node.classList&&node.classList.contains('registration-mini-card'));
    let toggle=box.querySelector('[data-account-show-movements]');
    if(cards.length<=MOVEMENT_LIMIT){
      cards.forEach(card=>card.classList.remove('account-registration-hidden'));
      if(toggle) toggle.remove();
      return;
    }
    cards.forEach((card,index)=>{
      card.classList.toggle('account-registration-hidden',!registrationMovementsExpanded&&index>=MOVEMENT_LIMIT);
    });
    if(!toggle){
      toggle=d.createElement('button');
      toggle.type='button';
      toggle.className='account-button secondary account-movement-toggle';
      toggle.dataset.accountShowMovements='true';
      toggle.addEventListener('click',function(){
        registrationMovementsExpanded=!registrationMovementsExpanded;
        collapseRegistrationMovements();
      });
      box.appendChild(toggle);
    }
    toggle.textContent=registrationMovementsExpanded?movementText('hide',cards.length):movementText('show',cards.length);
  }

  function profileCompletion(role){
    const selectors=['#profileForm input[name="firstName"]','#profileForm input[name="lastName"]','#profileForm input[name="phone"]','#profileForm input[name="city"]','#profileForm select[name="language"]'];
    if(role==='player') selectors.push('#playerProfileForm input[name="birthDate"]','#playerProfileForm select[name="sex"]','#playerProfileForm input[name="residenceCity"]','#playerProfileForm input[name="position"]');
    const nodes=selectors.map(selector=>d.querySelector(selector)).filter(Boolean);
    if(!nodes.length) return 0;
    const completed=nodes.filter(node=>String(node.value||'').trim()).length;
    return Math.round((completed/nodes.length)*100);
  }

  function loadAdminTheme(){
    if(d.querySelector('link[data-account-admin-theme]')) return;
    const link=d.createElement('link');
    link.rel='stylesheet';
    link.href='account-admin-modern-v1.css?v=2';
    link.dataset.accountAdminTheme='true';
    d.head.appendChild(link);
  }

  function ensureAdminNavigation(){
    const nav=byId('navLinks')||d.querySelector('.nav-links');
    if(!nav) return;

    const links=[
      ['Home','index.html'],
      ['Players','players.html'],
      ['Staff','staff.html'],
      ['Gallery','gallery.html'],
      ['News','news.html'],
      ['Events','events.html'],
      ['Camp','camp-register.html'],
      ['Admin','account.html']
    ];

    nav.replaceChildren();
    links.forEach(function(item){
      const link=d.createElement('a');
      link.textContent=item[0];
      link.href=item[1];
      if(item[1]==='account.html') link.setAttribute('aria-current','page');
      nav.appendChild(link);
    });

    d.querySelectorAll('.mobile-menu-button').forEach(function(button){
      button.hidden=true;
      button.setAttribute('aria-hidden','true');
      button.tabIndex=-1;
    });
  }

  function updateAdminHero(role){
    const hero=d.querySelector('.account-workspace-hero');
    const title=hero?.querySelector('h1');
    const description=hero?.querySelector('p');

    if(title) title.textContent='Admin';
    if(description){
      description.textContent=role==='super_admin'
        ? 'Il tuo spazio amministratore. Da qui gestisci il profilo e apri il pannello Super Admin completo.'
        : 'Il tuo spazio amministratore per profilo, attività assegnate e accesso agli strumenti FIL-ITALIA.';
    }
    d.title=role==='super_admin'?'Admin e Super Admin | FIL-ITALIA':'Admin | FIL-ITALIA';
  }

  function ensureAdminPortal(role){
    let portal=byId('adminPortalLaunch');
    if(!portal){
      portal=d.createElement('section');
      portal.id='adminPortalLaunch';
      portal.className='admin-portal-launch';
      portal.innerHTML='<div class="admin-portal-launch-copy"><span class="admin-portal-launch-eyebrow">ACCESSO AMMINISTRATIVO</span><h2>Pannello Super Admin</h2><p>Apri il centro di controllo completo per utenti, ruoli, Player, Staff, eventi, iscrizioni, pagamenti, documenti, media e comunicazioni.</p></div><div class="admin-portal-launch-actions"><a class="admin-portal-launch-button" href="admin-light.html">APRI PANNELLO SUPER ADMIN</a><span class="admin-portal-launch-note">Accesso riservato e protetto</span></div>';
      const roleIntro=d.querySelector('.account-role-intro');
      if(roleIntro) roleIntro.insertAdjacentElement('afterend',portal);
    }

    const heading=portal.querySelector('h2');
    const paragraph=portal.querySelector('p');
    const button=portal.querySelector('a');
    if(role==='admin'){
      if(heading) heading.textContent='Pannello Admin';
      if(paragraph) paragraph.textContent='Apri il centro operativo FIL-ITALIA con gli strumenti consentiti al tuo ruolo amministratore.';
      if(button) button.textContent='APRI PANNELLO ADMIN';
    }else{
      if(heading) heading.textContent='Pannello Super Admin';
      if(paragraph) paragraph.textContent='Apri il centro di controllo completo per utenti, ruoli, Player, Staff, eventi, iscrizioni, pagamenti, documenti, media e comunicazioni.';
      if(button) button.textContent='APRI PANNELLO SUPER ADMIN';
    }
  }

  function removeAdminPortal(){
    byId('adminPortalLaunch')?.remove();
  }

  function removeLegacyAdminCard(){
    byId('openAdminPanelCard')?.remove();
  }

  function render(){
    const role=detectRole();
    const profile=roleProfiles[role]||roleProfiles.pending;
    d.body.dataset.profileRole=role;

    const roleSummary=byId('accountRoleSummary');
    const rolePill=byId('accountRolePill');
    const roleTitle=byId('accountRoleTitle');
    const roleDescription=byId('accountRoleDescription');
    const adminAction=byId('accountAdminAction');
    const completion=profileCompletion(role);
    const registrations=countRegistrations();

    if(roleSummary) roleSummary.textContent=profile.label;
    if(rolePill) rolePill.textContent=profile.label;
    if(roleTitle) roleTitle.textContent=profile.title;
    if(roleDescription) roleDescription.textContent=profile.description;
    if(byId('accountProfileCompletion')) byId('accountProfileCompletion').textContent=completion+'%';
    if(byId('accountRegistrationCount')) byId('accountRegistrationCount').textContent=String(registrations);
    if(byId('accountDocumentStatus')) byId('accountDocumentStatus').textContent=profile.documents;
    const statusText=normalized(byId('accountStatusBadge')?.textContent);
    const isActive=statusText.includes('attiv')||statusText.includes('active')||statusText.includes('aktibo');
    if(byId('accountAccessStatus')) byId('accountAccessStatus').textContent=isActive?'Attivo':'Da verificare';

    const isAdmin=role==='admin'||role==='super_admin';
    if(adminAction){
      adminAction.hidden=!isAdmin;
      adminAction.href='admin-light.html';
      adminAction.textContent=role==='super_admin'?'Apri pannello Super Admin':'Apri pannello Admin';
    }

    if(isAdmin){
      loadAdminTheme();
      ensureAdminNavigation();
      updateAdminHero(role);
      removeLegacyAdminCard();
      ensureAdminPortal(role);
    }else{
      removeAdminPortal();
    }

    collapseRegistrationMovements();
  }

  function observe(){
    ['accountRole','accountStatusBadge','accountRegistrations'].forEach(id=>{
      const node=byId(id);
      if(node) new MutationObserver(render).observe(node,{childList:true,subtree:true,characterData:true});
    });
    d.querySelectorAll('#profileForm input,#profileForm select,#playerProfileForm input,#playerProfileForm select').forEach(node=>{
      node.addEventListener('input',render);
      node.addEventListener('change',render);
    });
  }

  function loadPlayerMedia(){
    if(d.querySelector('script[data-account-player-media]'))return;
    const script=d.createElement('script');
    script.src='account-player-media-v1.js?v=1';
    script.defer=true;
    script.dataset.accountPlayerMedia='true';
    d.body.appendChild(script);
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(byId('accountRole')&&byId('accountRoleSummary')){
      clearInterval(timer);
      observe();
      render();
      loadPlayerMedia();
    }else if(tries>80){
      clearInterval(timer);
    }
  },250);
})();
