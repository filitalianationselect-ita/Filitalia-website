(function(){
'use strict';

let gridObserver=null;
let repairTimer=0;
let repairCount=0;

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

  disconnectLegacyEvents();

  const legacyEvents=events?Array.from(events.querySelectorAll(':scope > .fil-event-card-v2,:scope > .event-card')):[];
  const staffReady=Boolean(staff&&staff.querySelector('.fhs-stage'));
  const eventsReady=Boolean(events&&events.querySelector('.fhe-stage'));

  if(legacyEvents.length){
    legacyEvents.forEach(node=>node.remove());
  }

  if((!staffReady||!eventsReady||legacyEvents.length)&&repairCount<24){
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
  if(!grid||gridObserver)return;
  gridObserver=new MutationObserver(function(){
    disconnectLegacyEvents();
    const hasLegacy=grid.querySelector(':scope > .fil-event-card-v2,:scope > .event-card');
    const hasFinal=grid.querySelector('.fhe-stage');
    if(hasLegacy||!hasFinal)scheduleRepair(20);
  });
  gridObserver.observe(grid,{childList:true});
}

function boot(){
  observeEvents();
  [0,80,220,520,1000,1800,2800,3600,4800].forEach(delay=>window.setTimeout(function(){observeEvents();repair();},delay));
  document.addEventListener('click',function(event){
    if(event.target.closest('.language-switch button'))window.setTimeout(repair,140);
  });
  window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(repair,120)});
  window.addEventListener('filitalia:content-updated',function(){window.setTimeout(repair,120)});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
