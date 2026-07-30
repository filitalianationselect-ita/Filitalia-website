(function(){
'use strict';
let observer=null;
let busy=false;
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
  [30,100,250,600,1100,1800,3000,5000].forEach(function(delay){window.setTimeout(function(){enforce();watch()},delay)});
  window.addEventListener('filitalia:content-updated',function(){window.setTimeout(enforce,50)});
  window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(enforce,50)});
  document.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))window.setTimeout(enforce,120)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
