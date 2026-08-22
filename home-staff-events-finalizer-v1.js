(function(){
'use strict';

let eventsGridObserver=null;
let staffGridObserver=null;
let repairTimer=0;
let repairCount=0;

function staffSource(){
  try{
    if(typeof staffData!=='undefined'&&Array.isArray(staffData))return staffData;
  }catch(_){ }
  return Array.isArray(window.staffData)?window.staffData:null;
}

function localizedName(person){
  const value=person&&person.name;
  if(value&&typeof value==='object'&&!Array.isArray(value))return value.it||value.en||value.ph||Object.values(value)[0]||'';
  return String(value||'');
}

function staffKey(person){
  const name=localizedName(person)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/[^a-z0-9]/g,'');
  if(name)return 'name:'+name;
  return 'id:'+String(person&&person.id||person&&person.slug||'').toLowerCase();
}

function mergePerson(previous,current){
  const merged=Object.assign({},previous,current);
  ['name','role','bio'].forEach(function(field){
    const a=previous&&previous[field];
    const b=current&&current[field];
    if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
      merged[field]=Object.assign({},a,b);
    }
  });
  if(!current.image&&previous.image)merged.image=previous.image;
  return merged;
}

function dedupeStaffSource(){
  const source=staffSource();
  if(!source||source.length<2)return false;
  const positions=new Map();
  const clean=[];
  source.forEach(function(person){
    const key=staffKey(person);
    if(!key||key==='id:'){
      clean.push(person);
      return;
    }
    if(!positions.has(key)){
      positions.set(key,clean.length);
      clean.push(person);
      return;
    }
    const index=positions.get(key);
    clean[index]=mergePerson(clean[index],person);
  });
  if(clean.length===source.length)return false;
  source.splice(0,source.length,...clean);
  return true;
}

function installStaffControlStyle(){
  if(document.getElementById('filStaffControlFix'))return;
  const style=document.createElement('style');
  style.id='filStaffControlFix';
  style.textContent=`
    #homeStaffGrid .fhs-card-wrap .fhs-arrow{
      position:absolute!important;
      z-index:12!important;
      top:50%!important;
      display:grid!important;
      place-items:center!important;
      width:42px!important;
      height:42px!important;
      min-width:42px!important;
      min-height:42px!important;
      padding:0!important;
      border:1px solid rgba(255,255,255,.38)!important;
      border-radius:50%!important;
      color:#fff!important;
      background:rgba(0,34,24,.72)!important;
      box-shadow:0 10px 26px rgba(0,0,0,.24)!important;
      font-family:Arial,sans-serif!important;
      font-size:29px!important;
      font-weight:400!important;
      line-height:1!important;
      transform:translateY(-50%)!important;
    }
    #homeStaffGrid .fhs-card-wrap .fhs-prev{left:-21px!important;right:auto!important}
    #homeStaffGrid .fhs-card-wrap .fhs-next{right:-21px!important;left:auto!important}
    #homeStaffGrid .fhs-card-wrap .fhs-arrow:hover,
    #homeStaffGrid .fhs-card-wrap .fhs-arrow:focus-visible{color:#ff4653!important;background:#fff!important}
    @media(max-width:900px){
      #homeStaffGrid .fhs-card-wrap .fhs-prev{left:8px!important}
      #homeStaffGrid .fhs-card-wrap .fhs-next{right:8px!important}
    }
  `;
  document.head.appendChild(style);
}

function placeStaffControls(){
  const grid=document.getElementById('homeStaffGrid');
  if(!grid)return;
  const wrap=grid.querySelector('.fhs-card-wrap');
  const previous=grid.querySelector('[data-fhs-prev]');
  const next=grid.querySelector('[data-fhs-next]');
  if(!wrap||!previous||!next)return;
  if(previous.parentElement!==wrap)wrap.appendChild(previous);
  if(next.parentElement!==wrap)wrap.appendChild(next);
}

function disconnectLegacyEvents(){
  const grid=document.getElementById('homeEventsGrid');
  if(!grid)return;
  if(grid.__filChronologicalObserver&&typeof grid.__filChronologicalObserver.disconnect==='function'){
    grid.__filChronologicalObserver.disconnect();
    grid.__filChronologicalObserver=null;
  }
  grid.dataset.filHomeEventsFinal='1';
  grid.classList.remove('fil-chronological-events');
  const note=document.querySelector('#events .fil-event-order-note');
  if(note)note.remove();
}

function requestFinalRender(){
  window.dispatchEvent(new CustomEvent('filitalia:content-order-updated',{detail:{source:'home-staff-events-finalizer'}}));
}

function repair(){
  const staff=document.getElementById('homeStaffGrid');
  const events=document.getElementById('homeEventsGrid');
  if(!staff&&!events)return;

  installStaffControlStyle();
  const staffChanged=dedupeStaffSource();
  disconnectLegacyEvents();

  const legacyEvents=events?Array.from(events.querySelectorAll(':scope > .fil-event-card-v2,:scope > .event-card')):[];
  const staffReady=Boolean(staff&&staff.querySelector('.fhs-stage'));
  const eventsReady=Boolean(events&&events.querySelector('.fhe-stage'));

  if(legacyEvents.length)legacyEvents.forEach(function(node){node.remove()});
  if(staffReady)placeStaffControls();

  if((staffChanged||!staffReady||!eventsReady||legacyEvents.length)&&repairCount<30){
    repairCount+=1;
    requestFinalRender();
  }
}

function scheduleRepair(delay){
  window.clearTimeout(repairTimer);
  repairTimer=window.setTimeout(repair,delay||20);
}

function observeEvents(){
  const grid=document.getElementById('homeEventsGrid');
  if(!grid||eventsGridObserver)return;
  eventsGridObserver=new MutationObserver(function(){
    disconnectLegacyEvents();
    const hasLegacy=grid.querySelector(':scope > .fil-event-card-v2,:scope > .event-card');
    const hasFinal=grid.querySelector('.fhe-stage');
    if(hasLegacy||!hasFinal)scheduleRepair(20);
  });
  eventsGridObserver.observe(grid,{childList:true});
}

function observeStaff(){
  const grid=document.getElementById('homeStaffGrid');
  if(!grid||staffGridObserver)return;
  staffGridObserver=new MutationObserver(function(){scheduleRepair(20)});
  staffGridObserver.observe(grid,{childList:true});
}

function boot(){
  installStaffControlStyle();
  observeEvents();
  observeStaff();
  [0,80,220,520,1000,1800,2800,3600,4800].forEach(function(delay){
    window.setTimeout(function(){observeEvents();observeStaff();repair();},delay);
  });
  document.addEventListener('click',function(event){
    if(event.target.closest('.language-switch button'))window.setTimeout(repair,140);
  });
  window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(repair,120)});
  window.addEventListener('filitalia:content-updated',function(){window.setTimeout(repair,120)});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();