(function(){
'use strict';

let activeIndex=0;
let touchStartX=null;

function getParts(){
  const section=document.getElementById('players');
  const grid=document.getElementById('homePlayersGrid');
  const prev=section&&section.querySelector('[data-fil-player-prev]');
  const next=section&&section.querySelector('[data-fil-player-next]');
  const count=section&&section.querySelector('[data-fil-player-count]');
  return {section,grid,prev,next,count};
}

function playerSource(){
  try{
    if(Array.isArray(window.playersData))return window.playersData;
    if(typeof playersData!=='undefined'&&Array.isArray(playersData))return playersData;
  }catch(_){}
  return [];
}

function activePlayers(){
  return playerSource().filter(function(player){
    const status=String(player.status||'active').toLowerCase();
    return !['hidden','inactive','disabled','archived'].includes(status);
  });
}

function ensureAllPlayerCards(grid){
  if(!grid)return;
  const source=activePlayers();
  const current=grid.querySelectorAll(':scope > .player-card').length;
  let builder=null;
  try{
    if(typeof window.buildPlayerCard==='function')builder=window.buildPlayerCard;
    else if(typeof buildPlayerCard==='function')builder=buildPlayerCard;
  }catch(_){}
  if(source.length<=current||!builder)return;
  grid.innerHTML=source.map(function(player,index){return builder(player,index);}).join('');
}

function cards(grid){return grid?Array.from(grid.querySelectorAll(':scope > .player-card')):[];}

function sizeCards(grid,list){
  if(!grid)return;
  grid.style.setProperty('display','flex','important');
  grid.style.setProperty('gap','18px','important');
  grid.style.setProperty('overflow-x','hidden','important');
  grid.style.setProperty('overflow-y','hidden','important');
  grid.style.setProperty('scroll-snap-type','none','important');
  grid.style.setProperty('touch-action','pan-y','important');
  const viewport=window.innerWidth;
  const basis=viewport<=620?'84%':viewport<=900?'calc((100% - 18px)/2)':'calc((100% - 36px)/3)';
  list.forEach(function(card){
    card.style.setProperty('flex','0 0 '+basis,'important');
    card.style.setProperty('width',basis,'important');
    card.style.setProperty('min-width','0','important');
    card.style.setProperty('transition','transform .38s cubic-bezier(.22,.8,.25,1)','important');
    card.style.setProperty('will-change','transform','important');
  });
}

function visibleCount(grid,list){
  if(!grid||!list.length)return 1;
  const width=list[0].getBoundingClientRect().width;
  const gap=parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||'18')||18;
  return Math.max(1,Math.floor((grid.clientWidth+gap)/Math.max(1,width+gap)));
}
function maxIndex(grid,list){return Math.max(0,list.length-visibleCount(grid,list));}
function step(grid,list){
  if(!grid||!list.length)return 0;
  const gap=parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||'18')||18;
  return list[0].getBoundingClientRect().width+gap;
}
function applyPosition(grid,list){
  if(!grid||!list.length)return;
  const offset=activeIndex*step(grid,list);
  list.forEach(function(card){card.style.setProperty('transform','translate3d(-'+offset+'px,0,0)','important');});
  grid.dataset.filCarouselIndex=String(activeIndex);
}

function update(){
  const {grid,prev,next,count}=getParts();
  if(!grid)return;
  ensureAllPlayerCards(grid);
  const list=cards(grid);
  if(!list.length)return;
  sizeCards(grid,list);
  activeIndex=Math.min(Math.max(0,activeIndex),maxIndex(grid,list));
  applyPosition(grid,list);
  if(count)count.textContent=String(activeIndex+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
  if(prev)prev.disabled=activeIndex<=0;
  if(next)next.disabled=activeIndex>=maxIndex(grid,list);
}

function go(delta){
  const {grid}=getParts();
  if(!grid)return;
  ensureAllPlayerCards(grid);
  const list=cards(grid);
  if(!list.length)return;
  sizeCards(grid,list);
  activeIndex=Math.min(Math.max(0,activeIndex+delta),maxIndex(grid,list));
  applyPosition(grid,list);
  update();
}

function bind(){
  const {grid}=getParts();
  if(!grid)return;
  ensureAllPlayerCards(grid);
  const list=cards(grid);
  sizeCards(grid,list);
  if(!grid.dataset.filReliableCarousel){
    grid.dataset.filReliableCarousel='true';
    grid.addEventListener('touchstart',function(event){touchStartX=event.touches&&event.touches[0]?event.touches[0].clientX:null;},{passive:true});
    grid.addEventListener('touchend',function(event){
      if(touchStartX==null)return;
      const endX=event.changedTouches&&event.changedTouches[0]?event.changedTouches[0].clientX:touchStartX;
      const delta=endX-touchStartX;touchStartX=null;
      if(Math.abs(delta)>42)go(delta<0?1:-1);
    },{passive:true});
    new MutationObserver(function(){window.setTimeout(update,60);}).observe(grid,{childList:true});
  }
  update();
}

window.addEventListener('click',function(event){
  const target=event.target instanceof Element?event.target:null;
  const previous=target&&target.closest('[data-fil-player-prev]');
  const next=target&&target.closest('[data-fil-player-next]');
  if(!previous&&!next)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  go(previous?-1:1);
},true);

window.addEventListener('resize',function(){window.setTimeout(bind,100);});
window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(bind,80);});
window.addEventListener('filitalia:content-updated',function(){window.setTimeout(bind,80);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
[250,700,1500,3200].forEach(function(delay){window.setTimeout(bind,delay);});
})();