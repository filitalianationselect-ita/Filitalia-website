(function(){
'use strict';
if(!window.FilitaliaAuth)return;
const original=window.FilitaliaAuth;
const cfg=window.FILITALIA_CONFIG||{};
const previewHost=/\.netlify\.app$/i.test(location.hostname)||/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
const origin=previewHost?location.origin:String(cfg.siteUrl||location.origin).replace(/\/$/,'');
const email=value=>String(value||'').trim().toLowerCase();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email(value));
const requestedRoles=new Set(['player','parent','coach','coordinator','staff']);
async function signUp(payload){
 if(!original.client)throw new Error('SUPABASE_NOT_CONFIGURED');
 const firstName=String(payload?.firstName||'').trim().slice(0,100),lastName=String(payload?.lastName||'').trim().slice(0,100),mail=email(payload?.email),password=String(payload?.password||''),role=requestedRoles.has(payload?.requestedRole)?payload.requestedRole:'player';
 if(!firstName||!lastName)throw new Error('NAME_REQUIRED');
 if(!validEmail(mail))throw new Error('INVALID_EMAIL');
 if(password.length<10)throw new Error('WEAK_PASSWORD');
 return original.client.auth.signUp({email:mail,password,options:{emailRedirectTo:origin+'/account.html',data:{first_name:firstName,last_name:lastName,requested_role:role,language:String(payload?.language||'it').slice(0,5)}}});
}
async function sendPasswordReset(value){
 if(!original.client)throw new Error('SUPABASE_NOT_CONFIGURED');
 const mail=email(value);if(!validEmail(mail))throw new Error('INVALID_EMAIL');
 return original.client.auth.resetPasswordForEmail(mail,{redirectTo:origin+'/reset-password.html'});
}
window.FilitaliaAuth=Object.freeze(Object.assign({},original,{signUp,sendPasswordReset,redirectOrigin:origin,isDeployPreview:previewHost}));
window.FilitaliaPreviewAuth=Object.freeze({origin,isDeployPreview:previewHost});
})();