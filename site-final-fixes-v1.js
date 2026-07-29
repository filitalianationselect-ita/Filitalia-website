(function(){
'use strict';
function loadAuthoritativePass(){if(!document.querySelector('link[data-filitalia-final-pass]')){const style=document.createElement('link');style.rel='stylesheet';style.href='site-final-pass-v1.css?v=1';style.dataset.filitaliaFinalPass='true';document.head.appendChild(style)}if(!document.querySelector('script[data-filitalia-final-pass]')){const script=document.createElement('script');script.src='site-final-pass-v1.js?v=1';script.defer=true;script.dataset.filitaliaFinalPass='true';document.body.appendChild(script)}}
function timeValue(item){
 const raw=item&&(item.sortDate||item.publishDate||item.dateISO||item.date);
 const value=raw&&typeof raw==='object'?(raw.it||raw.en||raw.ph||''):String(raw||'');
 const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(iso)return new Date(Number(iso[1]),Number(iso[2])-1,Number(iso[3]),12).getTime();
 const parsed=Date.parse(value);return Number.isNaN(parsed)?0:parsed;
}
function sortNews(){try{if(typeof newsData!=='undefined'&&Array.isArray(newsData))newsData.sort(function(a,b){return timeValue(b)-timeValue(a)})}catch(_){}}
function normalizeStandaloneNav(){
 if(!document.body.matches('[data-gallery-category],[data-album-id]'))return;
 const nav=document.getElementById('navLinks');if(!nav)return;
 const labels=[['index.html','Home'],['index.html#about','Chi siamo'],['players.html','Giocatori'],['gallery.html','Media'],['staff.html','Staff'],['news.html','News'],['events.html','Eventi'],['camp-register.html','Camp'],['index.html#contact-modal','Contatti']];
 nav.innerHTML=labels.map(function(pair){return'<a href="'+pair[0]+'">'+pair[1]+'</a>'}).join('');
}
function boot(){loadAuthoritativePass();sortNews();normalizeStandaloneNav();document.body.classList.remove('mobile-menu-open')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
