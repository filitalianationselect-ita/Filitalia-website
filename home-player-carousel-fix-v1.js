(function(){
'use strict';

let activeIndex=0;
let touchStartX=null;
let observer=null;
let syncing=false;

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
  }catch(_){ }
  return [];
}

function activePlayers(){
  return playerSource().filter(function(player){
    const status=String(player.status||'active').toLowerCase();
    return !['hidden','inactive','disabled','archived'].includes(status);
  });
}

function cardBuilder(){
  try{
    if(typeof window.buildPlayerCard==='function')return window.buildPlayerCard;
    if(typeof buildPlayerCard==='function')return buildPlayerCard;
  }catch(_){ }
  return null;
}

function ensureTrack(grid){
  if(!grid)return null;
  syncing=true;
  let track=grid.querySelector(':scope > .fil-player-carousel-inner');
  if(!track){
    track=document.createElement('div');
    track.className='fil-player-carousel-inner';
    Array.from(grid.children).filter(function(node){return node.classList&&node.classList.contains('player-card');}).forEach(function(card){track.appendChild(card);});
    grid.replaceChildren(track);
  }else{
    Array.from(grid.children).filter(function(node){return node!==track&&node.classList&&node.classList.contains('player-card');}).forEach(function(card){track.appendChild(card);});
  }

  const source=activePlayers();
  const builder=cardBuilder();
  const current=track.querySelectorAll(':scope > .player-card').length;
  if(builder&&source.length>current){
    track.innerHTML=source.map(function(player,index){return builder(player,index);}).join('');
  }
  syncing=false;
  return track;
}

function cards(track){return track?Array.from(track.querySelectorAll(':scope > .player-card')):[];}
function visibleCount(){return window.innerWidth<=620?1:(window.innerWidth<=900?2:3);}
function gap(track){return parseFloat(getComputedStyle(track).columnGap||getComputedStyle(track).gap||'18')||18;}
function maxIndex(list){return Math.max(0,list.length-visibleCount());}

function layout(grid,track,list){
  if(!grid||!track||!list.length)return;
  grid.classList.add('fil-player-carousel-track');
  grid.style.setProperty('display','block','important');
  grid.style.setProperty('overflow','hidden','important');
  grid.style.setProperty('position','relative','important');
  grid.style.setProperty('touch-action','pan-y','important');
  grid.style.setProperty('scroll-snap-type','none','important');
  grid.scrollLeft=0;

  track.style.setProperty('display','flex','important');
  track.style.setProperty('align-items','stretch','important');
  track.style.setProperty('gap','18px','important');
  track.style.setProperty('width','max-content','important');
  track.style.setProperty('max-width','none','important');
  track.style.setProperty('transition','transform .42s cubic-bezier(.22,.8,.25,1)','important');
  track.style.setProperty('will-change','transform','important');

  const perView=visibleCount();
  const available=Math.max(260,grid.clientWidth);
  const cardWidth=perView===1?Math.min(available*.86,390):(available-(18*(perView-1)))/perView;
  list.forEach(function(card){
    card.style.removeProperty('transform');
    card.style.removeProperty('transition');
    card.style.setProperty('flex','0 0 '+cardWidth+'px','important');
    card.style.setProperty('width',cardWidth+'px','important');
    card.style.setProperty('min-width',cardWidth+'px','important');
    card.style.setProperty('max-width',cardWidth+'px','important');
  });
}

function applyPosition(grid,track,list){
  if(!grid||!track||!list.length)return;
  const first=list[0];
  const step=(first?first.offsetWidth:0)+gap(track);
  const offset=activeIndex*step;
  track.style.setProperty('transform','translate3d(-'+offset+'px,0,0)','important');
  grid.dataset.filCarouselIndex=String(activeIndex);
  grid.dataset.filCarouselOffset=String(offset);
}

function update(){
  const parts=getParts();
  const grid=parts.grid;
  if(!grid)return;
  const track=ensureTrack(grid);
  const list=cards(track);
  if(!list.length)return;
  layout(grid,track,list);
  activeIndex=Math.min(Math.max(0,activeIndex),maxIndex(list));
  applyPosition(grid,track,list);
  if(parts.count)parts.count.textContent=String(activeIndex+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
  if(parts.prev)parts.prev.disabled=activeIndex<=0;
  if(parts.next)parts.next.disabled=activeIndex>=maxIndex(list);
}

function go(delta){
  const parts=getParts();
  if(!parts.grid)return;
  const track=ensureTrack(parts.grid);
  const list=cards(track);
  if(!list.length)return;
  layout(parts.grid,track,list);
  activeIndex=Math.min(Math.max(0,activeIndex+delta),maxIndex(list));
  applyPosition(parts.grid,track,list);
  if(parts.count)parts.count.textContent=String(activeIndex+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
  if(parts.prev)parts.prev.disabled=activeIndex<=0;
  if(parts.next)parts.next.disabled=activeIndex>=maxIndex(list);
}

function bind(){
  const parts=getParts();
  if(!parts.grid)return;
  ensureTrack(parts.grid);
  if(!parts.grid.dataset.filReliableCarousel){
    parts.grid.dataset.filReliableCarousel='true';
    parts.grid.addEventListener('touchstart',function(event){touchStartX=event.touches&&event.touches[0]?event.touches[0].clientX:null;},{passive:true});
    parts.grid.addEventListener('touchend',function(event){
      if(touchStartX==null)return;
      const endX=event.changedTouches&&event.changedTouches[0]?event.changedTouches[0].clientX:touchStartX;
      const delta=endX-touchStartX;
      touchStartX=null;
      if(Math.abs(delta)>42)go(delta<0?1:-1);
    },{passive:true});
    observer=new MutationObserver(function(){
      if(syncing)return;
      window.setTimeout(update,60);
    });
    observer.observe(parts.grid,{childList:true,subtree:false});
  }
  update();
}

window.addEventListener('click',function(event){
  const target=event.target instanceof Element?event.target:null;
  const previous=target&&target.closest('[data-fil-player-prev]');
  const next=target&&target.closest('[data-fil-player-next]');
  if(!previous&&!next)return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  go(previous?-1:1);
},true);

window.addEventListener('resize',function(){window.setTimeout(update,120);});
window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(bind,100);});
window.addEventListener('filitalia:content-updated',function(){window.setTimeout(bind,100);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
[250,700,1500,3200].forEach(function(delay){window.setTimeout(bind,delay);});
})();