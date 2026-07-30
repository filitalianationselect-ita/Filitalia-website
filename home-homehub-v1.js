(function(){
  'use strict';

  const copy={
    it:{
      contact:'Contatti',title:'PARLIAMONE',subtitle:'Camp, collaborazioni, giocatori e nuove opportunità FIL-ITALIA.',send:'Invia messaggio',name:'Nome',email:'Email',message:'Messaggio',
      staff:{eyebrow:'LE PERSONE DIETRO IL PROGETTO',title:'IL TEAM FIL-ITALIA',intro:'Allenatori, coordinatori e professionisti che trasformano il progetto in lavoro quotidiano, dentro e fuori dal campo.',view:'Scopri tutto lo staff',previous:'Persona precedente',next:'Persona successiva',departments:{Directors:'Leadership',Coaches:'Coaching e territorio',Media:'Media Team'}},
      about:[
        {title:'Identità nazionale',text:'FIL-ITALIA Nation Select nasce per dare ai giocatori italo-filippini in Italia una casa sportiva, un’identità chiara e un percorso serio dentro il basket.\n\nIl progetto vuole unire cultura italiana, radici filippine e passione per il gioco, creando una comunità riconoscibile, organizzata e presente sul territorio.\n\nOgni atleta non rappresenta solo sé stesso, ma anche una nuova generazione che vuole crescere, essere vista e costruire opportunità attraverso il basket.'},
        {title:'Sviluppo giocatori',text:'Lo sviluppo del giocatore è il cuore del programma FIL-ITALIA. L’obiettivo non è soltanto individuare talento, ma accompagnare ogni atleta in un percorso di crescita tecnica, mentale e sportiva.\n\nAttraverso camp, allenamenti, valutazioni e feedback, vogliamo aiutare i giocatori a capire il proprio livello, migliorare i fondamentali, leggere meglio il gioco e prepararsi a opportunità future.\n\nIl percorso include lavoro individuale, comprensione del gioco, mentalità, disciplina, collaborazione e capacità di competere in contesti diversi.'},
        {title:'Visione internazionale',text:'FIL-ITALIA vuole creare un ponte tra Italia, Europa e Filippine attraverso il basket.\n\nLa visione è costruire una rete internazionale di giocatori, famiglie, allenatori e organizzazioni che possa aprire nuove opportunità sportive e personali.\n\nAttraverso camp, selezioni, tornei, viaggi sportivi e collaborazioni con realtà come FIL Nation Select, Manila Live e NBTC, vogliamo dare ai giocatori la possibilità di confrontarsi, crescere e rappresentare la propria identità anche fuori dai confini italiani.'}
      ]
    },
    en:{
      contact:'Contact',title:'LET’S TALK',subtitle:'Camps, collaborations, players and new FIL-ITALIA opportunities.',send:'Send message',name:'Name',email:'Email',message:'Message',
      staff:{eyebrow:'THE PEOPLE BEHIND THE PROJECT',title:'THE FIL-ITALIA TEAM',intro:'Coaches, coordinators and professionals turning the project into daily work, on and off the court.',view:'Meet the full staff',previous:'Previous person',next:'Next person',departments:{Directors:'Leadership',Coaches:'Coaching and territory',Media:'Media Team'}},
      about:[
        {title:'National Identity',text:'FIL-ITALIA Nation Select was created to give Filipino-Italian players in Italy a sporting home, a clear identity and a serious pathway within basketball.\n\nThe project brings together Italian culture, Filipino roots and a passion for the game, building a recognizable, organized community with a real presence across the country.\n\nEach athlete represents not only themselves, but also a new generation determined to grow, gain visibility and create opportunities through basketball.'},
        {title:'Player Development',text:'Player development is at the heart of the FIL-ITALIA program. The goal is not only to identify talent, but to guide every athlete through technical, mental and sporting growth.\n\nThrough camps, training, evaluations and feedback, we help players understand their current level, improve their fundamentals, read the game more effectively and prepare for future opportunities.\n\nThe pathway includes individual work, game understanding, mentality, discipline, teamwork and the ability to compete in different environments.'},
        {title:'International Vision',text:'FIL-ITALIA aims to create a basketball bridge between Italy, Europe and the Philippines.\n\nOur vision is to build an international network of players, families, coaches and organizations capable of opening new sporting and personal opportunities.\n\nThrough camps, selections, tournaments, sports travel and collaborations with organizations such as FIL Nation Select, Manila Live and NBTC, players can compete, grow and represent their identity beyond Italy.'}
      ]
    },
    ph:{
      contact:'Contact',title:'USAP TAYO',subtitle:'Camps, collaborations, players at mga bagong FIL-ITALIA opportunities.',send:'Ipadala',name:'Pangalan',email:'Email',message:'Mensahe',
      staff:{eyebrow:'ANG MGA TAO SA LIKOD NG PROYEKTO',title:'ANG FIL-ITALIA TEAM',intro:'Mga coach, coordinator at professional na nagpapatakbo ng proyekto araw-araw, sa loob at labas ng court.',view:'Kilalanin ang buong staff',previous:'Nakaraang tao',next:'Susunod na tao',departments:{Directors:'Leadership',Coaches:'Coaching at territory',Media:'Media Team'}},
      about:[
        {title:'Pambansang Identidad',text:'Itinatag ang FIL-ITALIA Nation Select upang bigyan ang mga Filipino-Italian player sa Italy ng sporting home, malinaw na identity at seryosong basketball pathway.\n\nPinag-uugnay ng proyekto ang kulturang Italyano, ugat na Pilipino at pagmamahal sa laro upang bumuo ng organisado at makikilalang community sa iba’t ibang lugar.\n\nHindi lamang sarili ang kinakatawan ng bawat atleta, kundi pati ang bagong henerasyong gustong umunlad, mapansin at makabuo ng mga oportunidad sa pamamagitan ng basketball.'},
        {title:'Player Development',text:'Ang player development ang sentro ng FIL-ITALIA program. Hindi lamang talento ang hinahanap, dahil layunin din naming gabayan ang bawat atleta sa technical, mental at sporting growth.\n\nSa pamamagitan ng camps, training, evaluations at feedback, tutulungan ang players na maintindihan ang kanilang level, pagbutihin ang fundamentals, basahin nang mas mahusay ang laro at maghanda para sa mga susunod na oportunidad.\n\nKasama sa pathway ang individual work, game understanding, mentality, discipline, teamwork at kakayahang makipagkumpitensya sa iba’t ibang environment.'},
        {title:'International Vision',text:'Layunin ng FIL-ITALIA na bumuo ng basketball bridge sa pagitan ng Italy, Europe at Philippines.\n\nAng vision ay makabuo ng international network ng players, families, coaches at organizations na maaaring magbukas ng mga bagong sporting at personal opportunities.\n\nSa pamamagitan ng camps, selections, tournaments, sports travel at collaborations kasama ang FIL Nation Select, Manila Live at NBTC, magkakaroon ang players ng pagkakataong makipagkumpitensya, lumago at katawanin ang kanilang identity sa labas ng Italy.'}
      ]
    }
  };

  let aboutObserver=null;
  let aboutTimer=0;
  let staffItems=[];
  let staffIndex=0;
  let staffInterval=0;
  let staffTouchStart=null;

  function language(){
    const raw=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return copy[raw]?raw:'it';
  }

  function localized(value,lang){
    if(typeof window.filText==='function'){
      try{return window.filText(value)||'';}catch(error){}
    }
    if(value&&typeof value==='object'&&!Array.isArray(value))return value[lang]||value.it||value.en||value.ph||Object.values(value)[0]||'';
    return value==null?'':String(value);
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

  function loadStaffShowcaseStyle(){
    if(document.querySelector('link[data-fil-staff-showcase]'))return;
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='home-staff-showcase-v1.css?v=1';
    style.dataset.filStaffShowcase='true';
    document.head.appendChild(style);
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

  function staffSource(){
    try{
      if(Array.isArray(window.staffData))return window.staffData;
      if(typeof staffData!=='undefined'&&Array.isArray(staffData))return staffData;
    }catch(error){}
    return [];
  }

  function activeStaff(){
    return staffSource().filter(function(person){
      const status=String(person.status||'active').toLowerCase();
      return !['hidden','inactive','disabled','archived'].includes(status);
    });
  }

  function initials(name){
    return String(name||'FIL ITALIA').trim().split(/\s+/).slice(0,2).map(function(part){return part.charAt(0).toUpperCase();}).join('');
  }

  function isPlaceholderImage(path){
    const normalized=String(path||'').toLowerCase().split('?')[0];
    return !normalized||normalized.endsWith('/coach.jpg')||normalized.endsWith('/logo.png')||normalized==='coach.jpg'||normalized==='logo.png';
  }

  function departmentLabel(person,lang){
    const raw=localized(person.department,lang)||'Staff';
    return copy[lang].staff.departments[raw]||raw;
  }

  function buildStaffTabs(section){
    const tabs=section.querySelector('[data-fil-staff-tabs]');
    if(!tabs)return;
    tabs.replaceChildren();
    staffItems.forEach(function(person,index){
      const button=document.createElement('button');
      button.type='button';
      button.className='fil-staff-tab';
      button.dataset.filStaffIndex=String(index);
      button.setAttribute('role','tab');
      button.setAttribute('aria-label',(localized(person.name,language())||'Staff')+' '+String(index+1));
      button.innerHTML='<span>'+String(index+1).padStart(2,'0')+'</span><span class="fil-staff-tab-progress" aria-hidden="true"></span>';
      tabs.appendChild(button);
    });
  }

  function staffMarkup(){
    return '<span class="fil-staff-showcase-accent" aria-hidden="true"></span>'+ 
      '<div class="fil-staff-showcase-shell">'+
        '<div class="fil-staff-showcase-copy">'+
          '<span class="fil-staff-showcase-eyebrow" data-fil-staff-eyebrow></span>'+
          '<h2 class="fil-staff-showcase-title" data-fil-staff-title></h2>'+
          '<p class="fil-staff-showcase-intro" data-fil-staff-intro></p>'+
          '<article class="fil-staff-person-copy" data-fil-staff-copy aria-live="off">'+
            '<div class="fil-staff-person-meta"><span class="fil-staff-person-count" data-fil-staff-count></span><span class="fil-staff-person-department" data-fil-staff-department></span></div>'+
            '<h3 class="fil-staff-person-name" data-fil-staff-name></h3>'+
            '<p class="fil-staff-person-role" data-fil-staff-role></p>'+
            '<p class="fil-staff-person-bio" data-fil-staff-bio></p>'+
            '<a class="fil-staff-showcase-link" href="staff.html" data-fil-staff-view></a>'+
          '</article>'+
          '<div class="fil-staff-showcase-controls">'+
            '<button class="fil-staff-arrow" type="button" data-fil-staff-prev aria-label="Previous">‹</button>'+
            '<div class="fil-staff-tabs" data-fil-staff-tabs role="tablist" aria-label="Staff FIL-ITALIA"></div>'+
            '<button class="fil-staff-arrow" type="button" data-fil-staff-next aria-label="Next">›</button>'+
          '</div>'+
        '</div>'+
        '<div class="fil-staff-showcase-card-wrap">'+
          '<figure class="fil-staff-showcase-card" data-fil-staff-card>'+ 
            '<div class="fil-staff-card-media" data-fil-staff-media></div>'+
            '<span class="fil-staff-card-shade" aria-hidden="true"></span>'+
            '<span class="fil-staff-card-index" data-fil-staff-card-index></span>'+
            '<figcaption class="fil-staff-card-footer">'+
              '<span class="fil-staff-card-department" data-fil-staff-card-department></span>'+
              '<strong class="fil-staff-card-name" data-fil-staff-card-name></strong>'+
              '<span class="fil-staff-card-role" data-fil-staff-card-role></span>'+
            '</figcaption>'+
          '</figure>'+
        '</div>'+
      '</div>';
  }

  function updateStaffStaticCopy(section){
    const lang=language();
    const text=copy[lang].staff;
    const eyebrow=section.querySelector('[data-fil-staff-eyebrow]');
    const title=section.querySelector('[data-fil-staff-title]');
    const intro=section.querySelector('[data-fil-staff-intro]');
    const view=section.querySelector('[data-fil-staff-view]');
    const previous=section.querySelector('[data-fil-staff-prev]');
    const next=section.querySelector('[data-fil-staff-next]');
    if(eyebrow)eyebrow.textContent=text.eyebrow;
    if(title)title.textContent=text.title;
    if(intro)intro.textContent=text.intro;
    if(view)view.textContent=text.view+' →';
    if(previous)previous.setAttribute('aria-label',text.previous);
    if(next)next.setAttribute('aria-label',text.next);
  }

  function renderStaff(index,animate){
    const section=document.getElementById('staff');
    if(!section||!staffItems.length)return;
    staffIndex=(index+staffItems.length)%staffItems.length;
    const person=staffItems[staffIndex];
    const lang=language();
    const copyNode=section.querySelector('[data-fil-staff-copy]');
    const card=section.querySelector('[data-fil-staff-card]');
    if(animate){if(copyNode)copyNode.classList.add('is-changing');if(card)card.classList.add('is-changing');}

    const apply=function(){
      const name=localized(person.name,lang)||'FIL-ITALIA Staff';
      const role=localized(person.role,lang)||'';
      const bio=localized(person.bio,lang)||'';
      const department=departmentLabel(person,lang);
      const count=String(staffIndex+1).padStart(2,'0')+' / '+String(staffItems.length).padStart(2,'0');
      const media=section.querySelector('[data-fil-staff-media]');
      if(media){
        media.replaceChildren();
        if(isPlaceholderImage(person.image)){
          const placeholder=document.createElement('div');
          placeholder.className='fil-staff-card-placeholder';
          const mark=document.createElement('span');mark.className='fil-staff-card-initials';mark.textContent=initials(name);
          const logo=document.createElement('img');logo.src='images/logo.png';logo.alt='';logo.setAttribute('aria-hidden','true');
          placeholder.append(mark,logo);media.appendChild(placeholder);
        }else{
          const image=document.createElement('img');image.src=person.image;image.alt=name;image.style.objectPosition=person.imagePosition||'center top';media.appendChild(image);
        }
      }
      const values={
        '[data-fil-staff-count]':count,
        '[data-fil-staff-department]':department,
        '[data-fil-staff-name]':name,
        '[data-fil-staff-role]':role,
        '[data-fil-staff-bio]':bio,
        '[data-fil-staff-card-index]':String(staffIndex+1).padStart(2,'0'),
        '[data-fil-staff-card-department]':department,
        '[data-fil-staff-card-name]':name,
        '[data-fil-staff-card-role]':role
      };
      Object.keys(values).forEach(function(selector){const node=section.querySelector(selector);if(node)node.textContent=values[selector];});
      section.querySelectorAll('.fil-staff-tab').forEach(function(tab,tabIndex){
        const active=tabIndex===staffIndex;
        tab.setAttribute('aria-selected',active?'true':'false');
        tab.tabIndex=active?0:-1;
        const progress=tab.querySelector('.fil-staff-tab-progress');
        if(progress&&active){progress.style.animation='none';void progress.offsetWidth;progress.style.animation='';}
      });
      const activeTab=section.querySelector('.fil-staff-tab[aria-selected="true"]');
      const tabList=activeTab&&activeTab.parentElement;
      if(activeTab&&tabList&&typeof tabList.scrollTo==='function'){
        const target=Math.max(0,activeTab.offsetLeft-(tabList.clientWidth-activeTab.offsetWidth)/2);
        tabList.scrollTo({left:target,behavior:animate?'smooth':'auto'});
      }
      if(copyNode)copyNode.classList.remove('is-changing');
      if(card)card.classList.remove('is-changing');
    };

    if(animate)window.setTimeout(apply,170);else apply();
  }

  function stopStaffTimer(){
    window.clearInterval(staffInterval);
    staffInterval=0;
  }

  function restartStaffTimer(){
    stopStaffTimer();
    if(staffItems.length<2||document.hidden||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    staffInterval=window.setInterval(function(){renderStaff(staffIndex+1,true);},8000);
  }

  function bindStaffShowcase(section){
    if(section.dataset.filStaffBound)return;
    section.dataset.filStaffBound='true';
    section.addEventListener('click',function(event){
      const tab=event.target.closest('[data-fil-staff-index]');
      const previous=event.target.closest('[data-fil-staff-prev]');
      const next=event.target.closest('[data-fil-staff-next]');
      if(tab){renderStaff(Number(tab.dataset.filStaffIndex)||0,true);restartStaffTimer();}
      if(previous){renderStaff(staffIndex-1,true);restartStaffTimer();}
      if(next){renderStaff(staffIndex+1,true);restartStaffTimer();}
    });
    section.addEventListener('mouseenter',stopStaffTimer);
    section.addEventListener('mouseleave',restartStaffTimer);
    section.addEventListener('focusin',stopStaffTimer);
    section.addEventListener('focusout',function(event){if(!section.contains(event.relatedTarget))restartStaffTimer();});
    section.addEventListener('keydown',function(event){
      if(event.key==='ArrowLeft'){event.preventDefault();renderStaff(staffIndex-1,true);restartStaffTimer();}
      if(event.key==='ArrowRight'){event.preventDefault();renderStaff(staffIndex+1,true);restartStaffTimer();}
    });
    section.addEventListener('touchstart',function(event){staffTouchStart=event.changedTouches[0]?.clientX??null;},{passive:true});
    section.addEventListener('touchend',function(event){
      if(staffTouchStart==null)return;
      const end=event.changedTouches[0]?.clientX??staffTouchStart;
      const distance=end-staffTouchStart;
      staffTouchStart=null;
      if(Math.abs(distance)<46)return;
      renderStaff(staffIndex+(distance<0?1:-1),true);restartStaffTimer();
    },{passive:true});
  }

  function initStaffShowcase(force){
    const section=document.getElementById('staff');
    if(!section)return;
    loadStaffShowcaseStyle();
    const items=activeStaff();
    if(!items.length)return;
    const changed=items.length!==staffItems.length||items.some(function(item,index){return item!==staffItems[index];});
    staffItems=items;
    if(!section.classList.contains('fil-staff-showcase-ready')||force||changed){
      const previousIndex=Math.min(staffIndex,staffItems.length-1);
      section.className='staff-section fil-staff-showcase-ready';
      section.dataset.filStaffShowcaseVersion='staff-story-v1';
      section.innerHTML=staffMarkup();
      delete section.dataset.filStaffBound;
      buildStaffTabs(section);
      bindStaffShowcase(section);
      updateStaffStaticCopy(section);
      renderStaff(previousIndex,false);
    }else{
      updateStaffStaticCopy(section);
      renderStaff(staffIndex,false);
    }
    restartStaffTimer();
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
    initStaffShowcase(false);
  }

  function init(){
    loadModernEventModal();
    loadStaffShowcaseStyle();
    syncAbout();
    initStaffShowcase(true);

    document.addEventListener('click',function(event){
      const card=event.target.closest('#about .about-card');
      if(!card)return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },true);

    window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(function(){syncAbout();initStaffShowcase(true);},40);});
    window.addEventListener('filitalia:content-order-updated',function(){window.setTimeout(function(){syncAbout();initStaffShowcase(true);},40);});
    document.addEventListener('visibilitychange',function(){if(document.hidden)stopStaffTimer();else restartStaffTimer();});

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
      button.addEventListener('click',function(){window.setTimeout(syncLanguage,50);window.setTimeout(function(){syncAbout();initStaffShowcase(false);},400);});
    });

    syncLanguage();
    [150,500,1000,1800,3000].forEach(function(delay){window.setTimeout(function(){syncAbout();initStaffShowcase(false);},delay);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
