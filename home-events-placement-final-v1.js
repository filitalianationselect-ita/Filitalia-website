(function(){
'use strict';
let observer=null;
let busy=false;
function important(element,property,value){
  if(element)element.style.setProperty(property,value,'important');
}
function enforce(){
  if(busy)return;
  const shell=document.querySelector('.home-hero-shell');
  const copy=document.querySelector('.home-hero-copy');
  const visual=document.querySelector('.home-hero-visual');
  const rail=document.querySelector('.home-event-rail');
  const note=document.querySelector('.home-hero-note');
  const actions=document.querySelector('.home-hero-actions');
  if(!shell||!copy||!visual||!rail||!note||!actions)return;
  busy=true;
  if(rail.parentElement!==visual)visual.appendChild(rail);
  if(note.parentElement!==copy)copy.appendChild(note);
  if(actions.parentElement!==copy)copy.appendChild(actions);
  if(note.nextElementSibling!==actions){copy.appendChild(note);copy.appendChild(actions)}

  const player=visual.querySelector(':scope > .home-player-frame')||document.querySelector('.home-player-frame');
  important(visual,'display','grid');
  important(visual,'grid-template-columns','minmax(0, 1fr)');
  important(visual,'grid-template-rows','minmax(350px, 1fr) auto');
  important(visual,'grid-template-areas','"player" "events"');
  important(visual,'grid-auto-flow','row');
  important(visual,'grid-auto-columns','minmax(0, 1fr)');
  important(visual,'align-items','stretch');
  important(visual,'justify-items','stretch');

  if(player){
    important(player,'grid-area','auto');
    important(player,'grid-column','1 / -1');
    important(player,'grid-row','1');
    important(player,'position','relative');
    important(player,'inset','auto');
    important(player,'width','100%');
    important(player,'max-width','none');
    important(player,'transform','none');
  }
  important(rail,'grid-area','auto');
  important(rail,'grid-column','1 / -1');
  important(rail,'grid-row','2');
  important(rail,'position','relative');
  important(rail,'inset','auto');
  important(rail,'width','100%');
  important(rail,'max-width','none');
  important(rail,'height','auto');
  important(rail,'transform','none');

  document.body.classList.add('fil-home-events-layout-final');
  shell.dataset.filHomeEventsPlacement='final';
  busy=false;
}
function watch(){
  const shell=document.querySelector('.home-hero-shell');
  if(!shell||observer)return;
  observer=new MutationObserver(function(){window.setTimeout(enforce,0)});
  observer.observe(shell,{childList:true,subtree:true});
}
function boot(){
  enforce();watch();
  [0,30,100,250,600,1100,1800,3000,5000].forEach(function(delay){window.setTimeout(function(){enforce();watch()},delay)});
  window.addEventListener('resize',function(){window.setTimeout(enforce,30)});
  window.addEventListener('filitalia:content-updated',function(){window.setTimeout(enforce,50)});
  window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(enforce,50)});
  document.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))window.setTimeout(enforce,120)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
