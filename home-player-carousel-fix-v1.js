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
  activeIndex=Math.min(Math.max(0,activeIndex),maxIndex(grid,list));
  if(count)count.textContent=String(activeIndex+1).padStart(2,'0')+' / '+String(list.length).padStart(2,'0');
  if(prev)prev.disabled=activeIndex<=0;
  if(next)next.disabled=activeIndex>=maxIndex(grid,list);
}

function go(delta){
  const {grid}=getParts();
  const list=cards(grid);
  if(!grid||!list.length)return;
  activeIndex=Math.min(Math.max(0,activeIndex+delta),maxIndex(grid,list));
  const target=list[activeIndex];
  const left=targetLeft(grid,target);
  const before=grid.scrollLeft;
  try{grid.scrollTo({left,behavior:'smooth'});}catch(_){grid.scrollLeft=left;}
  window.setTimeout(function(){
    if(Math.abs(grid.scrollLeft-before)<2&&Math.abs(left-before)>2)grid.scrollLeft=left;
    update();
  },180);
  update();
}

function bind(){
  const {grid}=getParts();
  if(!grid)return;
  grid.style.overflowX='auto';
  grid.style.scrollBehavior='smooth';
  grid.style.webkitOverflowScrolling='touch';
  if(!grid.dataset.filReliableCarousel){
    grid.dataset.filReliableCarousel='true';
    grid.addEventListener('scroll',function(){
      const list=cards(grid);
      if(!list.length)return;
      let best=0;
      let distance=Infinity;
      list.forEach(function(card,index){
        const value=Math.abs(targetLeft(grid,card)-grid.scrollLeft);
        if(value<distance){distance=value;best=index;}
      });
      activeIndex=Math.min(best,maxIndex(grid,list));
      window.requestAnimationFrame(update);
    },{passive:true});
    new MutationObserver(function(){window.setTimeout(update,60);}).observe(grid,{childList:true});
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

window.addEventListener('resize',function(){window.setTimeout(update,80);});
window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(bind,80);});
window.addEventListener('filitalia:content-updated',function(){window.setTimeout(bind,80);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
[250,700,1500,3200].forEach(function(delay){window.setTimeout(bind,delay);});
})();