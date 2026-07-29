(function(){
'use strict';

const DESKTOP_BREAKPOINT=960;

function makeBrand(){
  const link=document.createElement('a');
  link.className='home-reference-brand';
  link.href='#top';
  link.setAttribute('aria-label','FIL-ITALIA Home');
  link.innerHTML='<img src="images/logo.png" alt="FIL-ITALIA"><span><strong>FIL-ITALIA</strong><small>NATION SELECT</small></span>';
  return link;
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
  window.setTimeout(buildNavbar,250);
  window.setTimeout(buildNavbar,1000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
