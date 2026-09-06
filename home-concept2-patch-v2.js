(function(){
'use strict';
function clean(){
  const nav=document.getElementById('navLinks');
  if(nav)nav.querySelectorAll('a[href*="account"],[data-filitalia-account-link]').forEach(function(link){link.remove()});
  document.querySelectorAll('.home-nav-page-controls,.home-horizontal-controls').forEach(function(node){node.hidden=true;node.setAttribute('aria-hidden','true')});
}
const observer=new MutationObserver(clean);
function boot(){clean();observer.observe(document.body,{childList:true,subtree:true});setTimeout(clean,250);setTimeout(clean,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
