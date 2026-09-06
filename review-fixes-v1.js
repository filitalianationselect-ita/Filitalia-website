(function(){
'use strict';

let observer=null;
let timer=0;

function repairHomeHero(){
  const shell=document.querySelector('.home-hero-shell');
  const visual=document.querySelector('.home-hero-visual');
  const rail=document.querySelector('.home-event-rail');
  const copy=document.querySelector('.home-hero-copy');
  const actions=document.querySelector('.home-hero-actions');
  const note=document.querySelector('.home-hero-note');
  if(!shell||!visual||!copy)return;

  if(rail&&rail.parentElement!==visual)visual.appendChild(rail);
  if(note&&actions&&note.nextElementSibling!==actions)copy.insertBefore(note,actions);

  document.body.classList.add('fil-review-fixes-ready');
}

function schedule(delay){
  window.clearTimeout(timer);
  timer=window.setTimeout(repairHomeHero,delay||20);
}

function boot(){
  repairHomeHero();
  [80,220,520,1000,1800,3200].forEach(function(delay){window.setTimeout(repairHomeHero,delay)});
  const shell=document.querySelector('.home-hero-shell');
  if(shell&&!observer){
    observer=new MutationObserver(function(){schedule(20)});
    observer.observe(shell,{childList:true,subtree:true});
  }
  window.addEventListener('filitalia:content-updated',function(){schedule(80)});
  window.addEventListener('filitalia:public-content-updated',function(){schedule(80)});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
