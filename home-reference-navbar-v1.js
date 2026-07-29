(function(){
'use strict';

const DESKTOP_BREAKPOINT=960;
const NAV_COPY={
  it:{home:'Home',about:'Chi siamo',players:'Giocatori',media:'Media',staff:'Staff',news:'News',events:'Eventi',camp:'Camp',contact:'Contatti'},
  en:{home:'Home',about:'About',players:'Players',media:'Media',staff:'Staff',news:'News',events:'Events',camp:'Camp',contact:'Contact'},
  ph:{home:'Home',about:'Tungkol',players:'Players',media:'Media',staff:'Staff',news:'News',events:'Events',camp:'Camp',contact:'Contact'}
};

function currentLanguage(){
  const raw=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
  return NAV_COPY[raw]?raw:'it';
}

function makeBrand(){
  const link=document.createElement('a');
  link.className='home-reference-brand';
  link.href='#top';
  link.setAttribute('aria-label','FIL-ITALIA Home');
  link.innerHTML='<img src="images/logo.png" alt="FIL-ITALIA"><span><strong>FIL-ITALIA</strong><small>NATION SELECT</small></span>';
  return link;
}

function navKey(link){
  const href=String(link.getAttribute('href')||'');
  if(href==='#top')return'home';
  if(href==='#about')return'about';
  if(href==='#players')return'players';
  if(href==='#gallery')return'media';
  if(href==='#staff')return'staff';
  if(href==='#news')return'news';
  if(href==='#events')return'events';
  if(href.includes('camp-register'))return'camp';
  if(link.hasAttribute('data-home-contact-trigger')||href.includes('contact'))return'contact';
  return'';
}

function syncCompactLabels(){
  const copy=NAV_COPY[currentLanguage()];
  document.querySelectorAll('#navLinks a').forEach(function(link){
    const key=navKey(link);
    if(!key)return;
    link.removeAttribute('data-key');
    link.textContent=copy[key];
  });
}

function buildNavbar(){
  const navbar=document.querySelector('.navbar');
  const navLinks=document.getElementById('navLinks');
  const mobileGroup=document.querySelector('.home-nav-left');
  const auth=document.querySelector('.home-auth-actions');
  const language=document.querySelector('.language-switch');
  if(!navbar||!navLinks||!mobileGroup||!auth||!language)return;

  let brand=navbar.querySelector('.home-reference-brand');
  if(!brand){
    brand=makeBrand();
    navbar.insertBefore(brand,navbar.firstChild);
  }

  let actions=navbar.querySelector('.home-reference-actions');
  if(!actions){
    actions=document.createElement('div');
    actions.className='home-reference-actions';
    navbar.appendChild(actions);
  }

  if(language.parentElement!==actions)actions.appendChild(language);
  if(auth.parentElement!==actions)actions.appendChild(auth);

  syncCompactLabels();
  navbar.classList.add('home-reference-navbar');
  document.body.classList.add('home-reference-navbar-ready');
}

function normalizeViewport(){
  const nav=document.getElementById('navLinks');
  if(window.innerWidth>=DESKTOP_BREAKPOINT){
    document.body.classList.remove('mobile-menu-open');
    if(nav)nav.classList.remove('active');
  }
}

function boot(){
  buildNavbar();
  normalizeViewport();
  window.addEventListener('resize',normalizeViewport,{passive:true});
  window.addEventListener('storage',syncCompactLabels);
  document.addEventListener('click',function(event){
    if(event.target.closest('.language-switch button'))window.setTimeout(syncCompactLabels,20);
  });
  window.setTimeout(buildNavbar,250);
  window.setTimeout(buildNavbar,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
