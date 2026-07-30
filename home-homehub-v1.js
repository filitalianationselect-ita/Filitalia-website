(function(){
  'use strict';

  const copy={
    it:{
      contact:'Contatti',title:'PARLIAMONE',subtitle:'Camp, collaborazioni, giocatori e nuove opportunità FIL-ITALIA.',send:'Invia messaggio',name:'Nome',email:'Email',message:'Messaggio',
      about:[
        {title:'Identità nazionale',text:'Costruiamo una cultura cestistica FIL-ITALIA che unisce appartenenza, responsabilità e rappresentanza della comunità filippino-italiana.'},
        {title:'Sviluppo dei giocatori',text:'Accompagniamo ogni atleta attraverso camp, allenamenti, valutazioni e percorsi di crescita tecnica, fisica e personale.'},
        {title:'Visione internazionale',text:'Colleghiamo giocatori, allenatori e partner in Italia e all’estero per creare opportunità in tornei, selezioni, college ed esperienze internazionali.'}
      ]
    },
    en:{
      contact:'Contact',title:'LET’S TALK',subtitle:'Camps, collaborations, players and new FIL-ITALIA opportunities.',send:'Send message',name:'Name',email:'Email',message:'Message',
      about:[
        {title:'National Identity',text:'We build a FIL-ITALIA basketball culture based on belonging, responsibility and representation of the Filipino-Italian community.'},
        {title:'Player Development',text:'We support every athlete through camps, training, evaluations and pathways for technical, physical and personal growth.'},
        {title:'International Vision',text:'We connect players, coaches and partners in Italy and abroad to create opportunities through tournaments, selections, colleges and international experiences.'}
      ]
    },
    ph:{
      contact:'Contact',title:'USAP TAYO',subtitle:'Camps, collaborations, players at mga bagong FIL-ITALIA opportunities.',send:'Ipadala',name:'Pangalan',email:'Email',message:'Mensahe',
      about:[
        {title:'Pambansang Identidad',text:'Bumubuo kami ng FIL-ITALIA basketball culture na nakabatay sa pagkakaisa, responsibilidad at representasyon ng Filipino-Italian community.'},
        {title:'Player Development',text:'Sinusuportahan namin ang bawat atleta sa pamamagitan ng camps, training, evaluations at tuloy-tuloy na technical, physical at personal growth.'},
        {title:'International Vision',text:'Pinag-uugnay namin ang players, coaches at partners sa Italy at ibang bansa para lumikha ng opportunities sa tournaments, selections, colleges at international experiences.'}
      ]
    }
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

  function installStaticAboutStyle(){
    if(document.querySelector('style[data-fil-about-static]'))return;
    const style=document.createElement('style');
    style.dataset.filAboutStatic='true';
    style.textContent='\n      #about .about-card.fil-about-static{cursor:default!important;pointer-events:auto!important}\n      #about .about-card.fil-about-static:hover{transform:none!important;border-color:rgba(255,255,255,.12)!important;background:rgba(1,19,12,.48)!important}\n      #about .about-card.fil-about-static p{font-size:.82rem!important;line-height:1.52!important}\n      #aboutModal{display:none!important}\n    ';
    document.head.appendChild(style);
  }

  function language(){
    const raw=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return copy[raw]?raw:'it';
  }

  function syncAbout(){
    installStaticAboutStyle();
    const cards=[...document.querySelectorAll('#about .about-card')];
    const items=copy[language()].about;
    cards.forEach(function(card,index){
      const item=items[index];
      if(!item)return;
      card.classList.add('fil-about-static');
      card.removeAttribute('onclick');
      card.removeAttribute('role');
      card.removeAttribute('tabindex');
      card.setAttribute('aria-label',item.title+': '+item.text);
      const heading=card.querySelector('h3');
      const paragraph=card.querySelector('p');
      if(heading)heading.textContent=item.title;
      if(paragraph)paragraph.textContent=item.text;
    });
    const modal=document.getElementById('aboutModal');
    if(modal)modal.style.display='none';
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
    syncAbout();
  }

  function init(){
    loadModernEventModal();
    syncAbout();
    const modal=document.getElementById('homeContactModal');
    if(!modal){syncLanguage();return;}
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
      button.addEventListener('click',function(){window.setTimeout(syncLanguage,40);});
    });

    syncLanguage();
    [250,700,1400].forEach(function(delay){window.setTimeout(syncAbout,delay);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();