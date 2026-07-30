(function(){
'use strict';
function loadStyle(){
  if(document.querySelector('link[data-filitalia-final-pass]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='site-final-pass-v1.css?v=4';
  link.dataset.filitaliaFinalPass='true';
  document.head.appendChild(link);
}
function loadFinalizer(){
  if(document.querySelector('script[data-filitalia-staff-events-finalizer]'))return;
  const script=document.createElement('script');
  script.src='home-staff-events-finalizer-v1.js?v=1';
  script.async=false;
  script.dataset.filitaliaStaffEventsFinalizer='true';
  document.body.appendChild(script);
}
function loadScript(){
  if(document.querySelector('script[data-filitalia-final-pass]')){loadFinalizer();return;}
  const script=document.createElement('script');
  script.src='site-final-pass-v1.js?v=4';
  script.async=false;
  script.dataset.filitaliaFinalPass='true';
  script.addEventListener('load',loadFinalizer,{once:true});
  script.addEventListener('error',loadFinalizer,{once:true});
  document.body.appendChild(script);
}
function boot(){loadStyle();loadScript()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();