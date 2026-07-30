(function(){
'use strict';
let observer=null;
let timer=0;
function clean(){
  const old=document.getElementById('filMediaFilters');
  if(old)old.remove();
  const grid=document.getElementById('galleryCategoryGrid');
  if(grid&&grid.classList.contains('fpr-gallery-root')){
    grid.classList.remove('fil-media-grid','events-grid');
    const shell=grid.querySelector(':scope > .fpr-gallery-shell');
    if(shell){shell.style.removeProperty('height');shell.style.removeProperty('min-height')}
  }
}
function schedule(){clearTimeout(timer);timer=setTimeout(clean,10)}
function boot(){
  clean();
  const page=document.querySelector('.players-page');
  if(page&&!observer){observer=new MutationObserver(schedule);observer.observe(page,{childList:true,subtree:true})}
  [40,120,300,700,1300,2300,3800,5600].forEach(delay=>setTimeout(clean,delay));
  window.addEventListener('filitalia:media-updated',()=>setTimeout(clean,80));
  window.addEventListener('filitalia:public-content-updated',()=>setTimeout(clean,80));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
