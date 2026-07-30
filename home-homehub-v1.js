(function(){
  'use strict';

  const copy={
    it:{contact:'Contatti',title:'PARLIAMONE',subtitle:'Camp, collaborazioni, giocatori e nuove opportunità FIL-ITALIA.',send:'Invia messaggio',name:'Nome',email:'Email',message:'Messaggio'},
    en:{contact:'Contact',title:'LET’S TALK',subtitle:'Camps, collaborations, players and new FIL-ITALIA opportunities.',send:'Send message',name:'Name',email:'Email',message:'Message'},
    ph:{contact:'Contact',title:'USAP TAYO',subtitle:'Camps, collaborations, players at mga bagong FIL-ITALIA opportunities.',send:'Ipadala',name:'Pangalan',email:'Email',message:'Mensahe'}
  };

  function loadModernEventModal(){
    if(!document.querySelector('link[data-fil-event-modal-modern]')){
      const style=document.createElement('link');
      style.rel='stylesheet';
      style.href='event-modal-modern-v1.css?v=1';
      style.dataset.filEventModalModern='true';
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-fil-event-modal-modern]')){
      const script=document.createElement('script');
      script.src='event-modal-modern-v1.js?v=1';
      script.dataset.filEventModalModern='true';
      document.body.appendChild(script);
    }
  }

  function language(){
    const raw=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return copy[raw]?raw:'it';
  }

  function syncLanguage(){
    const text=copy[language()];
    document.querySelectorAll('[data-home-contact-label]').forEach(function(node){node.textContent=text.contact;});
    const title=document.querySelector('[data-home-contact-title]');
    const subtitle=document.querySelector('[data-home-contact-subtitle]');
    const send=document.querySelector('[data-home-contact-send]');
    const name=document.querySelector('[data-home-contact-name]');
    const email=document.querySelector('[data-home-contact-email]');
    const message=document.querySelector('[data-home-contact-message]');
    if(title)title.textContent=text.title;
    if(subtitle)subtitle.textContent=text.subtitle;
    if(send)send.textContent=text.send;
    if(name)name.placeholder=text.name;
    if(email)email.placeholder=text.email;
    if(message)message.placeholder=text.message;
  }

  function init(){
    loadModernEventModal();
    const modal=document.getElementById('homeContactModal');
    if(!modal)return;
    const panel=modal.querySelector('.home-contact-panel');
    const close=modal.querySelector('[data-home-contact-close]');
    let previousFocus=null;

    function openModal(event){
      if(event)event.preventDefault();
      previousFocus=document.activeElement;
      syncLanguage();
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('home-contact-open');
      window.setTimeout(function(){
        const first=modal.querySelector('input,textarea,button,a[href]');
        if(first)first.focus();
      },80);
    }

    function closeModal(){
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('home-contact-open');
      if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
    }

    document.querySelectorAll('[data-home-contact-trigger]').forEach(function(trigger){
      trigger.addEventListener('click',openModal);
    });

    if(close)close.addEventListener('click',closeModal);
    modal.addEventListener('click',function(event){if(event.target===modal)closeModal();});
    if(panel)panel.addEventListener('click',function(event){event.stopPropagation();});

    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&modal.classList.contains('is-open'))closeModal();
    });

    document.querySelectorAll('.language-switch button').forEach(function(button){
      button.addEventListener('click',function(){window.setTimeout(syncLanguage,0);});
    });

    syncLanguage();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();