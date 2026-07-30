(function(){
  'use strict';

  const copy={
    it:{
      contact:'Contatti',title:'PARLIAMONE',subtitle:'Camp, collaborazioni, giocatori e nuove opportunità FIL-ITALIA.',send:'Invia messaggio',name:'Nome',email:'Email',message:'Messaggio',
      about:[
        {
          title:'Identità nazionale',
          text:'FIL-ITALIA Nation Select nasce per dare ai giocatori italo-filippini in Italia una casa sportiva, un’identità chiara e un percorso serio dentro il basket.\n\nIl progetto vuole unire cultura italiana, radici filippine e passione per il gioco, creando una comunità riconoscibile, organizzata e presente sul territorio.\n\nOgni atleta non rappresenta solo sé stesso, ma anche una nuova generazione che vuole crescere, essere vista e costruire opportunità attraverso il basket.'
        },
        {
          title:'Sviluppo giocatori',
          text:'Lo sviluppo del giocatore è il cuore del programma FIL-ITALIA. L’obiettivo non è soltanto individuare talento, ma accompagnare ogni atleta in un percorso di crescita tecnica, mentale e sportiva.\n\nAttraverso camp, allenamenti, valutazioni e feedback, vogliamo aiutare i giocatori a capire il proprio livello, migliorare i fondamentali, leggere meglio il gioco e prepararsi a opportunità future.\n\nIl percorso include lavoro individuale, comprensione del gioco, mentalità, disciplina, collaborazione e capacità di competere in contesti diversi.'
        },
        {
          title:'Visione internazionale',
          text:'FIL-ITALIA vuole creare un ponte tra Italia, Europa e Filippine attraverso il basket.\n\nLa visione è costruire una rete internazionale di giocatori, famiglie, allenatori e organizzazioni che possa aprire nuove opportunità sportive e personali.\n\nAttraverso camp, selezioni, tornei, viaggi sportivi e collaborazioni con realtà come FIL Nation Select, Manila Live e NBTC, vogliamo dare ai giocatori la possibilità di confrontarsi, crescere e rappresentare la propria identità anche fuori dai confini italiani.'
        }
      ]
    },
    en:{
      contact:'Contact',title:'LET’S TALK',subtitle:'Camps, collaborations, players and new FIL-ITALIA opportunities.',send:'Send message',name:'Name',email:'Email',message:'Message',
      about:[
        {
          title:'National Identity',
          text:'FIL-ITALIA Nation Select was created to give Filipino-Italian players in Italy a sporting home, a clear identity and a serious pathway within basketball.\n\nThe project brings together Italian culture, Filipino roots and a passion for the game, building a recognizable, organized community with a real presence across the country.\n\nEach athlete represents not only themselves, but also a new generation determined to grow, gain visibility and create opportunities through basketball.'
        },
        {
          title:'Player Development',
          text:'Player development is at the heart of the FIL-ITALIA program. The goal is not only to identify talent, but to guide every athlete through technical, mental and sporting growth.\n\nThrough camps, training, evaluations and feedback, we help players understand their current level, improve their fundamentals, read the game more effectively and prepare for future opportunities.\n\nThe pathway includes individual work, game understanding, mentality, discipline, teamwork and the ability to compete in different environments.'
        },
        {
          title:'International Vision',
          text:'FIL-ITALIA aims to create a basketball bridge between Italy, Europe and the Philippines.\n\nOur vision is to build an international network of players, families, coaches and organizations capable of opening new sporting and personal opportunities.\n\nThrough camps, selections, tournaments, sports travel and collaborations with organizations such as FIL Nation Select, Manila Live and NBTC, players can compete, grow and represent their identity beyond Italy.'
        }
      ]
    },
    ph:{
      contact:'Contact',title:'USAP TAYO',subtitle:'Camps, collaborations, players at mga bagong FIL-ITALIA opportunities.',send:'Ipadala',name:'Pangalan',email:'Email',message:'Mensahe',
      about:[
        {
          title:'Pambansang Identidad',
          text:'Itinatag ang FIL-ITALIA Nation Select upang bigyan ang mga Filipino-Italian player sa Italy ng sporting home, malinaw na identity at seryosong basketball pathway.\n\nPinag-uugnay ng proyekto ang kulturang Italyano, ugat na Pilipino at pagmamahal sa laro upang bumuo ng organisado at makikilalang community sa iba’t ibang lugar.\n\nHindi lamang sarili ang kinakatawan ng bawat atleta, kundi pati ang bagong henerasyong gustong umunlad, mapansin at makabuo ng mga oportunidad sa pamamagitan ng basketball.'
        },
        {
          title:'Player Development',
          text:'Ang player development ang sentro ng FIL-ITALIA program. Hindi lamang talento ang hinahanap, dahil layunin din naming gabayan ang bawat atleta sa technical, mental at sporting growth.\n\nSa pamamagitan ng camps, training, evaluations at feedback, tutulungan ang players na maintindihan ang kanilang level, pagbutihin ang fundamentals, basahin nang mas mahusay ang laro at maghanda para sa mga susunod na oportunidad.\n\nKasama sa pathway ang individual work, game understanding, mentality, discipline, teamwork at kakayahang makipagkumpitensya sa iba’t ibang environment.'
        },
        {
          title:'International Vision',
          text:'Layunin ng FIL-ITALIA na bumuo ng basketball bridge sa pagitan ng Italy, Europe at Philippines.\n\nAng vision ay makabuo ng international network ng players, families, coaches at organizations na maaaring magbukas ng mga bagong sporting at personal opportunities.\n\nSa pamamagitan ng camps, selections, tournaments, sports travel at collaborations kasama ang FIL Nation Select, Manila Live at NBTC, magkakaroon ang players ng pagkakataong makipagkumpitensya, lumago at katawanin ang kanilang identity sa labas ng Italy.'
        }
      ]
    }
  };

  let aboutObserver=null;
  let aboutTimer=0;

  function language(){
    const raw=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return copy[raw]?raw:'it';
  }

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

  function startAboutObserver(){
    const grid=document.querySelector('#about .about-grid');
    if(!grid)return;
    if(aboutObserver)aboutObserver.disconnect();
    aboutObserver=new MutationObserver(function(){
      window.clearTimeout(aboutTimer);
      aboutTimer=window.setTimeout(syncAbout,20);
    });
    aboutObserver.observe(grid,{childList:true,subtree:true,characterData:true});
  }

  function syncAbout(){
    if(aboutObserver)aboutObserver.disconnect();
    const items=copy[language()].about;
    document.querySelectorAll('#about .about-card').forEach(function(card,index){
      const item=items[index];
      if(!item)return;
      card.classList.add('fil-about-static');
      card.removeAttribute('onclick');
      card.removeAttribute('tabindex');
      card.removeAttribute('data-key');
      card.setAttribute('aria-label',item.title+': '+item.text.replace(/\n+/g,' '));
      const heading=card.querySelector('h3');
      const paragraph=card.querySelector('p');
      if(heading){heading.removeAttribute('data-key');heading.textContent=item.title;}
      if(paragraph){paragraph.removeAttribute('data-key');paragraph.textContent=item.text;}
    });
    const modal=document.getElementById('aboutModal');
    if(modal)modal.remove();
    startAboutObserver();
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

    document.addEventListener('click',function(event){
      const card=event.target.closest('#about .about-card');
      if(!card)return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);

    window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(syncAbout,40);});
    window.addEventListener('filitalia:content-order-updated',function(){window.setTimeout(syncAbout,40);});

    const modal=document.getElementById('homeContactModal');
    if(modal){
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
        window.setTimeout(function(){const first=modal.querySelector('input,textarea,button,a[href]');if(first)first.focus();},80);
      }
      function closeModal(){
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden','true');
        document.body.classList.remove('home-contact-open');
        if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
      }
      document.querySelectorAll('[data-home-contact-trigger]').forEach(function(trigger){trigger.addEventListener('click',openModal);});
      if(close)close.addEventListener('click',closeModal);
      modal.addEventListener('click',function(event){if(event.target===modal)closeModal();});
      if(panel)panel.addEventListener('click',function(event){event.stopPropagation();});
      document.addEventListener('keydown',function(event){if(event.key==='Escape'&&modal.classList.contains('is-open'))closeModal();});
    }

    document.querySelectorAll('.language-switch button').forEach(function(button){
      button.addEventListener('click',function(){window.setTimeout(syncLanguage,50);window.setTimeout(syncAbout,400);});
    });

    syncLanguage();
    [150,500,1000,1800,3000].forEach(function(delay){window.setTimeout(syncAbout,delay);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();