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
function loadReviewFixes(){
  if(document.querySelector('script[data-filitalia-review-fixes]'))return;
  const script=document.createElement('script');
  script.src='review-fixes-v1.js?v=1';
  script.async=false;
  script.dataset.filitaliaReviewFixes='true';
  document.body.appendChild(script);
}
function loadPublicRedesign(){
  if(!document.querySelector('link[data-filitalia-public-redesign]')){
    const link=document.createElement('link');link.rel='stylesheet';link.href='fil-public-redesign-v1.css?v=1';link.dataset.filitaliaPublicRedesign='true';document.head.appendChild(link);
  }
  if(!document.querySelector('script[src*="fil-public-redesign-v1.js"]')){
    const script=document.createElement('script');script.src='fil-public-redesign-v1.js?v=1';script.async=false;script.dataset.filitaliaPublicRedesign='true';script.addEventListener('load',loadReviewFixes,{once:true});script.addEventListener('error',loadReviewFixes,{once:true});document.body.appendChild(script);
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
