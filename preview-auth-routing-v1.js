(function(){
'use strict';
if(!window.FilitaliaAuth)return;

const original=window.FilitaliaAuth;
const cfg=window.FILITALIA_CONFIG||{};
const previewHost=(Boolean(cfg.isPreview)&&/\.netlify\.app$/i.test(location.hostname))||/^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
const origin=previewHost?location.origin:String(cfg.siteUrl||location.origin).replace(/\/$/,'');
const email=value=>String(value||'').trim().toLowerCase();
const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email(value));
const requestedRoles=new Set(['player','parent','coach','coordinator','staff','volunteer']);

const TEST_EMAIL='player@filitalia.test';
const TEST_PASSWORD='FilItalia2026!';
const SESSION_KEY='filitalia_preview_player_session_v1';
const PROFILE_KEY='filitalia_preview_player_profile_v1';
const PLAYER_KEY='filitalia_preview_player_details_v1';
let avatarObjectUrl='';

function readJson(key,fallback){
 try{
  const value=JSON.parse(localStorage.getItem(key)||'null');
  return value&&typeof value==='object'?value:fallback;
 }catch(_){return fallback}
}
function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value));}
function testActive(){return previewHost&&localStorage.getItem(SESSION_KEY)==='active';}
function baseProfile(){
 return {
  id:'preview-player-001',
  email:TEST_EMAIL,
  first_name:'Player',
  last_name:'Test',
  phone:'',
  city:'Bologna',
  language:'it',
  requested_role:'player',
  role:'player',
  status:'active',
  avatar_path:null,
  created_at:new Date().toISOString(),
  updated_at:new Date().toISOString()
 };
}
function basePlayer(){
 return {
  user_id:'preview-player-001',
  birth_date:'2010-06-15',
  sex:'Maschio',
  residence_city:'Bologna',
  position:'PG / SG',
  current_club:'FIL-ITALIA Test Team',
  height_cm:176,
  weight_kg:68,
  italian_passport:true,
  filipino_passport:true,
  instagram:'filitalia.test',
  highlights_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  created_at:new Date().toISOString(),
  updated_at:new Date().toISOString()
 };
}
function profile(){return Object.assign(baseProfile(),readJson(PROFILE_KEY,{}));}
function player(){return Object.assign(basePlayer(),readJson(PLAYER_KEY,{}));}
function fakeUser(){
 const p=profile();
 return {
  id:p.id,
  email:p.email,
  user_metadata:{
   first_name:p.first_name,
   last_name:p.last_name,
   requested_role:'player',
   language:p.language||'it'
  }
 };
}
function fakeSession(){
 return {
  access_token:'preview-local-test-token',
  token_type:'bearer',
  expires_in:3600,
  user:fakeUser()
 };
}
function activateTest(){
 localStorage.setItem(SESSION_KEY,'active');
 if(!localStorage.getItem(PROFILE_KEY))writeJson(PROFILE_KEY,baseProfile());
 if(!localStorage.getItem(PLAYER_KEY))writeJson(PLAYER_KEY,basePlayer());
}
function canonicalPlayer(){
 const p=profile(),pp=player();
 return {
  id:'preview-canonical-player-001',
  first_name:p.first_name,
  last_name:p.last_name,
  birth_date:pp.birth_date,
  residence_city:pp.residence_city||p.city,
  position:pp.position,
  current_club:pp.current_club,
  height_cm:pp.height_cm,
  weight_kg:pp.weight_kg,
  italian_passport:pp.italian_passport,
  filipino_passport:pp.filipino_passport,
  instagram:pp.instagram,
  highlights_url:pp.highlights_url,
  photo_path:p.avatar_path,
  relationship:'self'
 };
}
function registryHistory(){
 return [
  {event_name:'Talent ID Bologna 2026',event_city:'Bologna',event_date:'2026-09-21',registration_status:'confirmed',payment_status:'free',shirt_size:'M'},
  {event_name:'Talent ID Venezia 2026',event_city:'Venezia',event_date:'2026-09-13',registration_status:'confirmed',payment_status:'paid',shirt_size:'M'}
 ];
}
function ownRegistrations(){
 return registryHistory().map(function(row,index){
  return {
   id:'preview-registration-'+(index+1),
   event_id:'preview-event-'+(index+1),
   event_name:row.event_name,
   event_city:row.event_city,
   event_date:row.event_date,
   status:row.registration_status,
   payment_status:row.payment_status,
   shirt_size:row.shirt_size,
   created_at:new Date().toISOString()
  };
 });
}
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
async function signIn(mail,password){
 if(previewHost&&email(mail)===TEST_EMAIL&&String(password||'')===TEST_PASSWORD){
  activateTest();
  return {data:{user:fakeUser(),session:fakeSession()},error:null};
 }
 return original.signIn(mail,password);
}
async function getSession(){
 if(testActive())return fakeSession();
 return original.getSession();
}
async function signOut(){
 if(testActive()){
  localStorage.removeItem(SESSION_KEY);
  return {error:null};
 }
 return original.signOut();
}
async function getOwnProfile(){return testActive()?profile():original.getOwnProfile();}
async function updateOwnProfile(payload){
 if(!testActive())return original.updateOwnProfile(payload);
 const current=profile();
 const next=Object.assign({},current,{
  first_name:String(payload?.firstName||'').trim().slice(0,100),
  last_name:String(payload?.lastName||'').trim().slice(0,100),
  phone:String(payload?.phone||'').trim().slice(0,50)||null,
  city:String(payload?.city||'').trim().slice(0,120)||null,
  language:String(payload?.language||'it').trim().slice(0,5),
  updated_at:new Date().toISOString()
 });
 if(!next.first_name||!next.last_name)throw new Error('NAME_REQUIRED');
 writeJson(PROFILE_KEY,next);
 return next;
}
async function getOwnPlayerProfile(){return testActive()?player():original.getOwnPlayerProfile();}
async function upsertOwnPlayerProfile(payload){
 if(!testActive())return original.upsertOwnPlayerProfile(payload);
 const current=player();
 const bool=value=>value===true||value==='true'?true:value===false||value==='false'?false:null;
 const num=value=>String(value??'').trim()===''?null:Number(value);
 const next=Object.assign({},current,{
  birth_date:String(payload?.birthDate||'').slice(0,10)||null,
  sex:String(payload?.sex||'').trim().slice(0,30)||null,
  residence_city:String(payload?.residenceCity||'').trim().slice(0,120)||null,
  position:String(payload?.position||'').trim().slice(0,30)||null,
  current_club:String(payload?.currentClub||'').trim().slice(0,160)||null,
  height_cm:num(payload?.heightCm),
  weight_kg:num(payload?.weightKg),
  italian_passport:bool(payload?.italianPassport),
  filipino_passport:bool(payload?.filipinoPassport),
  instagram:String(payload?.instagram||'').trim().slice(0,160)||null,
  highlights_url:String(payload?.highlightsUrl||'').trim().slice(0,500)||null,
  updated_at:new Date().toISOString()
 });
 writeJson(PLAYER_KEY,next);
 return next;
}
async function uploadOwnPlayerPhoto(file){
 if(!testActive())return original.uploadOwnPlayerPhoto(file);
 if(!file||!file.name)throw new Error('PHOTO_REQUIRED');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('INVALID_PHOTO_TYPE');
 if(file.size>5*1024*1024)throw new Error('PHOTO_TOO_LARGE');
 if(avatarObjectUrl)try{URL.revokeObjectURL(avatarObjectUrl)}catch(_){}
 avatarObjectUrl=URL.createObjectURL(file);
 const next=profile();next.avatar_path=avatarObjectUrl;next.updated_at=new Date().toISOString();writeJson(PROFILE_KEY,next);
 return avatarObjectUrl;
}
async function getSignedProfilePhotoUrl(path,expiresIn){
 if(testActive()){
  const value=String(path||'');
  return /^(blob:|data:|https?:)/i.test(value)?value:'images/logo.png';
 }
 return original.getSignedProfilePhotoUrl(path,expiresIn);
}
async function ensureOwnCanonicalPlayer(){return testActive()?canonicalPlayer():original.ensureOwnCanonicalPlayer();}
async function getMyLinkedPlayers(){return testActive()?[canonicalPlayer()]:original.getMyLinkedPlayers();}
async function getOwnRegistryRegistrations(){return testActive()?registryHistory():original.getOwnRegistryRegistrations();}
async function getOwnRegistrations(){return testActive()?ownRegistrations():original.getOwnRegistrations();}
async function syncOwnProfileToSheet(){return testActive()?{ok:true,preview:true}:original.syncOwnProfileToSheet();}
async function requestAccountDeletion(reason){return testActive()?{ok:true,preview:true,reason:String(reason||'').slice(0,500)}:original.requestAccountDeletion(reason);}

const patched=Object.assign({},original,{
 signUp,sendPasswordReset,signIn,getSession,signOut,getOwnProfile,updateOwnProfile,
 getOwnPlayerProfile,upsertOwnPlayerProfile,uploadOwnPlayerPhoto,getSignedProfilePhotoUrl,
 ensureOwnCanonicalPlayer,getMyLinkedPlayers,getOwnRegistryRegistrations,getOwnRegistrations,
 syncOwnProfileToSheet,requestAccountDeletion,
 redirectOrigin:origin,isDeployPreview:previewHost,
 previewTestCredentials:previewHost?Object.freeze({email:TEST_EMAIL,password:TEST_PASSWORD}):null
});
if(testActive())patched.client=null;
window.FilitaliaAuth=Object.freeze(patched);
window.FilitaliaPreviewAuth=Object.freeze({origin,isDeployPreview:previewHost,testActive:testActive});

function installPreviewLogin(){
 if(!previewHost||document.body?.dataset.accountPage!=='login')return;
 const form=document.getElementById('loginForm');
 if(!form||document.getElementById('previewPlayerLogin'))return;
 const box=document.createElement('div');
 box.id='previewPlayerLogin';
 box.style.cssText='margin-top:14px;padding:14px;border:1px solid #b8d9c7;border-radius:14px;background:#f3fbf6;color:#173f2e;';
 box.innerHTML='<strong style="display:block;margin-bottom:6px">PREVIEW TEST PLAYER</strong><small style="display:block;margin-bottom:10px">Ambiente di prova isolato. Nessun dato reale viene modificato.</small><button type="button" class="account-button" id="previewPlayerLoginButton">ENTRA COME PLAYER TEST</button>';
 form.appendChild(box);
 document.getElementById('previewPlayerLoginButton').addEventListener('click',function(){
  activateTest();
  window.location.replace('account.html');
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installPreviewLogin);else installPreviewLogin();
})();