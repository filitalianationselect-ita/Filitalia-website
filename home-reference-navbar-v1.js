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
function loadEventRouting(){
  const old=document.querySelector('script[data-filitalia-event-page-routing]');
  if(old)old.remove();
  const script=document.createElement('script');
  script.src='event-modal-modern-v1.js?v=2';
  script.async=false;
  script.dataset.filitaliaEventPageRouting='true';
  document.body.appendChild(script);
}
function loadHomeEventPlacement(){
  if(!document.querySelector('link[data-filitalia-home-event-placement]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='home-events-placement-final-v1.css?v=1';
    link.dataset.filitaliaHomeEventPlacement='true';
    document.head.appendChild(link);
  }
  if(!document.querySelector('link[data-filitalia-home-event-placement-force]')){
    const force=document.createElement('link');
    force.rel='stylesheet';
    force.href='home-events-placement-force-v2.css?v=2';
    force.dataset.filitaliaHomeEventPlacementForce='true';
    document.head.appendChild(force);
  }
  const old=document.querySelector('script[data-filitalia-home-event-placement]');
  if(old)old.remove();
  const script=document.createElement('script');
  script.src='home-events-placement-final-v1.js?v=3';
  script.async=false;
  script.dataset.filitaliaHomeEventPlacement='true';
  script.addEventListener('load',loadEventRouting,{once:true});
  script.addEventListener('error',loadEventRouting,{once:true});
  document.body.appendChild(script);
}
function loadReviewFixes(){
  if(!document.querySelector('link[data-filitalia-review-fixes]')){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='review-fixes-v1.css?v=2';
    link.dataset.filitaliaReviewFixes='true';
    document.head.appendChild(link);
  }
  const existing=document.querySelector('script[data-filitalia-review-fixes]');
  if(existing){loadHomeEventPlacement();return;}
  const script=document.createElement('script');
  script.src='review-fixes-v1.js?v=2';
  script.async=false;
  script.dataset.filitaliaReviewFixes='true';
  script.addEventListener('load',loadHomeEventPlacement,{once:true});
  script.addEventListener('error',loadHomeEventPlacement,{once:true});
  document.body.appendChild(script);
}
function loadPublicRedesign(){
  if(!document.querySelector('link[data-filitalia-public-redesign]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='fil-public-redesign-v1.css?v=1';link.dataset.filitaliaPublicRedesign='true';document.head.appendChild(link);
  }
  if(!document.querySelector('script[src*="fil-public-redesign-v1.js"]')){
    const script=document.createElement('script');script.src='fil-public-redesign-v1.js?v=20260822-2';script.async=false;script.dataset.filitaliaPublicRedesign='true';script.addEventListener('load',loadReviewFixes,{once:true});script.addEventListener('error',loadReviewFixes,{once:true});document.body.appendChild(script);
  }else loadReviewFixes();
}
function loadFinalizer(){
  if(document.querySelector('script[data-filitalia-staff-events-finalizer]')){loadPublicRedesign();return;}
  const script=document.createElement('script');
  script.src='home-staff-events-finalizer-v1.js?v=2';
  script.async=false;
  script.dataset.filitaliaStaffEventsFinalizer='true';
  script.addEventListener('load',loadPublicRedesign,{once:true});
  script.addEventListener('error',loadPublicRedesign,{once:true});
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
