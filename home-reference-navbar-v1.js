(function(){
'use strict';
function loadStyle(){if(document.querySelector('link[data-filitalia-final-pass]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='site-final-pass-v1.css?v=1';link.dataset.filitaliaFinalPass='true';document.head.appendChild(link)}
function loadScript(){if(document.querySelector('script[data-filitalia-final-pass]'))return;const script=document.createElement('script');script.src='site-final-pass-v1.js?v=1';script.defer=true;script.dataset.filitaliaFinalPass='true';document.body.appendChild(script)}
function boot(){loadStyle();loadScript()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
