(function(){
  'use strict';

  const base=window.FilitaliaAuth;
  if(!base||!base.client)return;

  function clean(value,max){
    return String(value||'').replace(/[\u0000-\u001F\u007F]/g,' ').trim().slice(0,max);
  }

  function siteOrigin(){
    const cfg=window.FILITALIA_CONFIG||{};
    const configured=String(cfg.siteUrl||'').replace(/\/$/,'');
    return configured&&!configured.includes('INCOLLA_QUI')?configured:window.location.origin;
  }

  async function volunteerSignUp(payload){
    if(String(payload&&payload.requestedRole)!=='volunteer')return base.signUp(payload);
    const email=clean(payload.email,254).toLowerCase();
    const firstName=clean(payload.firstName,100);
    const lastName=clean(payload.lastName,100);
    const password=String(payload.password||'');
    if(!firstName||!lastName)throw new Error('NAME_REQUIRED');
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))throw new Error('INVALID_EMAIL');
    if(password.length<10)throw new Error('WEAK_PASSWORD');
    return base.client.auth.signUp({
      email:email,
      password:password,
      options:{
        emailRedirectTo:siteOrigin()+'/account.html',
        data:{
          first_name:firstName,
          last_name:lastName,
          requested_role:'volunteer',
          language:clean(payload.language||'it',5)
        }
      }
    });
  }

  async function volunteerAdminUpdate(userId,role,status){
    if(String(role)!=='volunteer')return base.adminSetAccountStatus(userId,role,status);
    const session=await base.getSession();
    if(!session||!session.access_token)throw new Error('NOT_AUTHENTICATED');
    const result=await base.client.functions.invoke('admin-update-account-status',{
      body:{user_id:userId,role:'volunteer',status:status},
      headers:{Authorization:'Bearer '+session.access_token}
    });
    if(result.error)throw result.error;
    if(result.data&&result.data.error)throw new Error(result.data.error);
    return result.data||{};
  }

  window.FilitaliaAuth=Object.freeze(Object.assign({},base,{
    signUp:volunteerSignUp,
    adminSetAccountStatus:volunteerAdminUpdate
  }));

  function addVolunteerToRoleSelects(root){
    (root||document).querySelectorAll('select').forEach(function(select){
      const values=Array.from(select.options).map(function(option){return option.value;});
      const isRoleSelect=values.includes('player')&&values.includes('staff')&&(values.includes('coach')||values.includes('coordinator'));
      if(!isRoleSelect||values.includes('volunteer'))return;
      const option=document.createElement('option');
      option.value='volunteer';
      option.textContent='Volontario';
      const adminOption=Array.from(select.options).find(function(item){return item.value==='admin';});
      if(adminOption)select.insertBefore(option,adminOption);else select.appendChild(option);
    });
  }

  function normalizeVolunteerLabels(root){
    (root||document).querySelectorAll('#accountRole,.account-role-pill,[data-role-label]').forEach(function(node){
      if(String(node.textContent||'').trim().toLowerCase()==='volunteer')node.textContent='Volontario';
    });
  }

  document.addEventListener('DOMContentLoaded',function(){
    addVolunteerToRoleSelects(document);
    normalizeVolunteerLabels(document);
    new MutationObserver(function(mutations){
      mutations.forEach(function(mutation){
        mutation.addedNodes.forEach(function(node){
          if(node.nodeType!==1)return;
          addVolunteerToRoleSelects(node);
          normalizeVolunteerLabels(node);
        });
      });
      normalizeVolunteerLabels(document);
    }).observe(document.body,{childList:true,subtree:true,characterData:true});
  });
})();
