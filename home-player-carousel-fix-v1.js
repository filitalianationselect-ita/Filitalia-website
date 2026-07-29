(function(){
'use strict';

let activeIndex=0;

function getParts(){
  const section=document.getElementById('players');
  const grid=document.getElementById('homePlayersGrid');
  const prev=section&&section.querySelector('[data-fil-player-prev]');
  const next=section&&section.querySelector('[data-fil-player-next]');
  const count=section&&section.querySelector('[data-fil-player-count]');
  return {section,grid,prev,next,count};
}

function cards(grid){
  return grid?Array.from(grid.querySelectorAll(':scope > .player-card')):[];
}

function sizeCards(grid,list){
  if(!grid)return;
  grid.style.setProperty('display','flex','important');
  grid.style.setProperty('gap','18px','important');
  grid.style.setProperty('overflow-x','auto','important');
  grid.style.setProperty('overflow-y','hidden','important');
  grid.style.setProperty('scroll-behavior','smooth','important');
  grid.style.setProperty('-webkit-overflow-scrolling','touch');
  const viewport=window.innerWidth;
  const basis=viewport<=620?'84%':viewport<=900?'calc((100% - 18px)/2)':'calc((100% - 36px)/3)';
  list.forEach(function(card){
    card.style.setProperty('flex','0 0 '+basis,'important');
    card.style.setProperty('width',basis,'important');
    card.style.setProperty('min-width','0','important');
    card.style.setProperty('scroll-snap-align','start','important');
  });
}

function visibleCount(grid,list){
  if(!grid||!list.length)return 1;
  const width=list[0].getBoundingClientRect().width;
  const gap=parseFloat(getComputedStyle(grid).columnGap||getComputedStyle(grid).gap||'18')||18;
  return Math.max(1,Math.floor((grid.clientWidth+gap)/Math.max(1,width+gap)));
}

function maxIndex(grid,list){
  return Math.max(0,list.length-visibleCount(grid,list));
}

function targetLeft(grid,card){
  const gridBox=grid.getBoundingClientRect();
  const cardBox=card.getBoundingClientRect();
  return Math.max(0,grid.scrollLeft+(cardBox.left-gridBox.left));
}

function update(){
  const {grid,prev,next,count}=getParts();
  const list=cards(grid);
  if(!grid||!list.length)return;
  sizeCards(grid,list);
  activeIndex=Math.min(Math.max(0,activeIndex),maxIndex(grid,list));
  if(count)count.textContent=String(activeIndex+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
  if(prev)prev.disabled=activeIndex<=0;
  if(next)next.disabled=activeIndex>=maxIndex(grid,list);
}

function go(delta){
  const {grid}=getParts();
  const list=cards(grid);
  if(!grid||!list.length)return;
  sizeCards(grid,list);
  activeIndex=Math.min(Math.max(0,activeIndex+delta),maxIndex(grid,list));
  const target=list[activeIndex];
  const left=targetLeft(grid,target);
  const before=grid.scrollLeft;
  try{grid.scrollTo({left,behavior:'smooth'});}catch(_){grid.scrollLeft=left;}
  window.setTimeout(function(){
    if(Math.abs(grid.scrollLeft-before)<2&&Math.abs(left-before)>2)grid.scrollLeft=left;
    update();
  },220);
  update();
}

function bind(){
  const {grid}=getParts();
  if(!grid)return;
  const list=cards(grid);
  sizeCards(grid,list);
  if(!grid.dataset.filReliableCarousel){
    grid.dataset.filReliableCarousel='true';
    grid.addEventListener('scroll',function(){
      const current=cards(grid);
      if(!current.length)return;
      let best=0;
      let distance=Infinity;
      current.forEach(function(card,index){
        const value=Math.abs(targetLeft(grid,card)-grid.scrollLeft);
        if(value<distance){distance=value;best=index;}
      });
      activeIndex=Math.min(best,maxIndex(grid,current));
      window.requestAnimationFrame(update);
    },{passive:true});
    new MutationObserver(function(){window.setTimeout(bind,60);}).observe(grid,{childList:true});
  }
  update();
}

document.addEventListener('click',function(event){
  const previous=event.target.closest('[data-fil-player-prev]');
  const next=event.target.closest('[data-fil-player-next]');
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