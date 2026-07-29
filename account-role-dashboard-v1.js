(function(){
  'use strict';

  const d=document;
  const byId=id=>d.getElementById(id);

  const roleProfiles={
    player:{label:'Giocatore',title:'La tua area giocatore',description:'Gestisci profilo basket, iscrizioni ai camp, documenti, pagamenti e comunicazioni personali.',documents:'Profilo e certificati'},
    parent:{label:'Genitore',title:'La tua area genitore',description:'Controlla giocatori collegati, iscrizioni, consensi, documenti, pagamenti e comunicazioni.',documents:'Per i giocatori collegati'},
    coach:{label:'Coach',title:'La tua area coach',description:'Consulta eventi assegnati, giocatori autorizzati, presenze, valutazioni e attività dello staff.',documents:'Qualifiche e BLSD'},
    coordinator:{label:'Coordinatore',title:'La tua area coordinatore',description:'Gestisci le attività della tua città, gli eventi assegnati, lo staff operativo e le comunicazioni.',documents:'Logistica e certificazioni'},
    staff:{label:'Staff',title:'La tua area staff',description:'Consulta eventi, turni, mansioni, documenti e comunicazioni relativi alle attività assegnate.',documents:'Solo quelli assegnati'},
    volunteer:{label:'Volontario',title:'La tua area volontario',description:'Consulta disponibilità, turni, mansioni, referente e checklist operative senza accedere ai dati sensibili.',documents:'Solo certificazioni personali'},
    admin:{label:'Admin',title:'Profilo amministratore',description:'Gestisci il tuo profilo personale e accedi al pannello operativo FIL-ITALIA.',documents:'Gestione autorizzata'},
    super_admin:{label:'Super Admin',title:'Profilo Super Admin',description:'Gestisci il tuo profilo e accedi alla configurazione completa di utenti, ruoli e piattaforma.',documents:'Gestione completa'},
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
    if(text.includes('genitor')||text.includes('tutor')||text.includes('parent')) return 'parent';
    if(text.includes('volont')||text.includes('volunteer')) return 'volunteer';
    if(text.includes('staff')) return 'staff';
    if(text.includes('giocator')||text.includes('player')) return 'player';
    return 'pending';
  }

  function countRegistrations(){
    const box=byId('accountRegistrations');
    if(!box) return 0;
    const cards=box.querySelectorAll('.registration-mini-card,[data-registration-id],article');
    return cards.length;
  }

  function profileCompletion(role){
    const selectors=['#profileForm input[name="firstName"]','#profileForm input[name="lastName"]','#profileForm input[name="phone"]','#profileForm input[name="city"]','#profileForm select[name="language"]'];
    if(role==='player') selectors.push('#playerProfileForm input[name="birthDate"]','#playerProfileForm select[name="sex"]','#playerProfileForm input[name="residenceCity"]','#playerProfileForm input[name="position"]');
    const nodes=selectors.map(selector=>d.querySelector(selector)).filter(Boolean);
    if(!nodes.length) return 0;
    const completed=nodes.filter(node=>String(node.value||'').trim()).length;
    return Math.round((completed/nodes.length)*100);
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
    if(byId('accountAccessStatus')) byId('accountAccessStatus').textContent=normalized(byId('accountStatusBadge')?.textContent).includes('attiv')?'Attivo':'Da verificare';
    if(adminAction) adminAction.hidden=!(role==='admin'||role==='super_admin');
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

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(byId('accountRole')&&byId('accountRoleSummary')){
      clearInterval(timer);
      observe();
      render();
    }else if(tries>80){
      clearInterval(timer);
    }
  },250);
})();
