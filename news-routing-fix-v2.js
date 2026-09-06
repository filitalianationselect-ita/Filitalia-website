(function(){
'use strict';

function source(){
  try{
    if(typeof newsData!=='undefined'&&Array.isArray(newsData))return newsData;
    if(Array.isArray(window.newsData))return window.newsData;
  }catch(_){ }
  return [];
}
function language(){
  try{return localStorage.getItem('language')||document.documentElement.lang||'it'}catch(_){return'it'}
}
function localized(value){
  if(value&&typeof value==='object')return value[language()]||value.it||value.en||value.ph||Object.values(value)[0]||'';
  return String(value==null?'':value);
}
function slug(value){
  return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function stableId(item,index){
  return String(item&&item.id||item&&item.slug||slug(localized(item&&item.title))||('news-'+index));
}
function resolveOldId(id,list){
  const match=String(id||'').match(/^news-(\d+)$/);
  if(match&&list[Number(match[1])])return list[Number(match[1])];
  return list.find(function(item,index){
    return [stableId(item,index),String(item.id||''),String(item.slug||''),slug(localized(item.title))].includes(String(id||''));
  })||null;
}
function fixLinks(){
  const list=source();
  const root=document.getElementById('allNewsGrid');
  if(!root||!list.length)return;
  root.querySelectorAll('a[href*="news-item.html"]').forEach(function(link){
    let oldId='';
    try{oldId=new URL(link.getAttribute('href'),location.href).searchParams.get('id')||''}catch(_){ }
    let item=resolveOldId(oldId,list);
    if(!item){
      const visibleTitle=(link.querySelector('h2')||link.querySelector('strong'))?.textContent.trim()||'';
      item=list.find(function(candidate){return localized(candidate.title).trim()===visibleTitle})||null;
    }
    if(!item)return;
    const index=list.indexOf(item);
    link.href='news-item.html?id='+encodeURIComponent(stableId(item,index));
    link.dataset.newsId=stableId(item,index);
  });
}

const observer=new MutationObserver(function(){window.setTimeout(fixLinks,20)});
function boot(){
  const root=document.getElementById('allNewsGrid');
  if(root)observer.observe(root,{childList:true,subtree:true});
  fixLinks();
  [150,500,1200,2500].forEach(function(delay){window.setTimeout(fixLinks,delay)});
}
window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(fixLinks,40)});
window.addEventListener('filitalia:content-order-updated',function(){window.setTimeout(fixLinks,40)});
document.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))window.setTimeout(fixLinks,120)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
