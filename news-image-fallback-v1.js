(function(){
'use strict';

const fallback='images/news-placeholder.svg';

function replaceBrokenImage(image){
  if(!image||image.dataset.filNewsFallbackApplied==='true')return;
  image.dataset.filNewsFallbackApplied='true';
  image.classList.add('fil-news-image-fallback');
  image.alt=image.alt||'FIL-ITALIA News';
  image.src=fallback;
}

function bindImage(image){
  if(!image||image.dataset.filNewsFallbackBound==='true')return;
  image.dataset.filNewsFallbackBound='true';
  image.addEventListener('error',function(){replaceBrokenImage(image)},{once:true});
  if(image.complete&&image.naturalWidth===0)replaceBrokenImage(image);
}

function apply(){
  const root=document.getElementById('allNewsGrid');
  if(!root)return;
  root.querySelectorAll('img').forEach(bindImage);
}

const observer=new MutationObserver(function(){window.setTimeout(apply,10)});
function boot(){
  const root=document.getElementById('allNewsGrid');
  if(root)observer.observe(root,{childList:true,subtree:true});
  apply();
  [100,400,1000,2200].forEach(function(delay){window.setTimeout(apply,delay)});
}

window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(apply,30)});
window.addEventListener('filitalia:content-order-updated',function(){window.setTimeout(apply,30)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
