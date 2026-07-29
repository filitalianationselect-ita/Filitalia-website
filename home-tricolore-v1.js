(function(){
  'use strict';

  const copy={
    it:{
      eyebrow:'FIL-ITALIA NATION SELECT',
      line1:'IL TALENTO',line2:'CRESCE.',line3:'IL FUTURO',line4:'CI ASPETTA.',
      description:'Allenamento, competizione e opportunità per costruire il futuro dei giovani atleti italiani e di origine filippina.',
      events:'I prossimi eventi',discover:'Scopri di più',note:'Un unico percorso: sviluppo, selezione e opportunità internazionali.',
      rail:'Prossimi eventi',all:'Vedi tutti',
      values:[
        ['Sviluppo','Programmi tecnici avanzati e crescita continua.'],
        ['Visibilità','Eventi e selezioni per farti notare dai migliori.'],
        ['Opportunità','Percorsi in Italia e all’estero, college e borse di studio.'],
        ['Network','Allenatori, scout e partner a livello internazionale.']
      ]
    },
    en:{
      eyebrow:'FIL-ITALIA NATION SELECT',
      line1:'TALENT',line2:'GROWS.',line3:'THE FUTURE',line4:'AWAITS US.',
      description:'Training, competition and opportunities to build the future of young Italian athletes and players of Filipino heritage.',
      events:'Upcoming events',discover:'Discover more',note:'One pathway: development, selection and international opportunities.',
      rail:'Upcoming events',all:'View all',
      values:[
        ['Development','Advanced technical programs and continuous growth.'],
        ['Visibility','Events and selections designed to get players noticed.'],
        ['Opportunities','Pathways in Italy and abroad, colleges and scholarships.'],
        ['Network','Coaches, scouts and partners across an international network.']
      ]
    },
    ph:{
      eyebrow:'FIL-ITALIA NATION SELECT',
      line1:'LUMALAGO ANG',line2:'TALENTO.',line3:'MAGKASAMA SA',line4:'KINABUKASAN.',
      description:'Training, kompetisyon at mga oportunidad para sa kinabukasan ng mga batang atletang Italian at may dugong Filipino.',
      events:'Mga susunod na event',discover:'Alamin pa',note:'Isang pathway para sa development, selection at international opportunities.',
      rail:'Mga susunod na event',all:'Tingnan lahat',
      values:[
        ['Development','Advanced training programs at tuloy-tuloy na paglago.'],
        ['Visibility','Events at selections para mapansin ang talento.'],
        ['Opportunities','Mga pathway sa Italy at abroad, college at scholarships.'],
        ['Network','Coaches, scouts at partners sa international network.']
      ]
    }
  };

  const months={
    it:['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'],
    en:['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
    ph:['ENE','PEB','MAR','ABR','MAY','HUN','HUL','AGO','SET','OKT','NOB','DIS']
  };

  function language(){
    const saved=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return copy[saved]?saved:'it';
  }

  function setText(id,value){
    const node=document.getElementById(id);
    if(node) node.textContent=value;
  }

  function localized(value,lang){
    if(value&&typeof value==='object') return value[lang]||value.it||value.en||Object.values(value)[0]||'';
    return String(value||'');
  }

  function eventDateParts(event,lang){
    const label=localized(event.date||event.campDate,lang);
    if(/arrivo|coming|malapit|tbc|confermare/i.test(label)) return {day:'TBC',month:''};
    const raw=String(event.sortDate||'');
    const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(!match) return {day:'--',month:''};
    return {day:String(Number(match[3])).padStart(2,'0'),month:months[lang][Number(match[2])-1]||''};
  }

  function upcomingEvents(){
    if(typeof eventsData==='undefined'||!Array.isArray(eventsData)) return [];
    const today=new Date();
    today.setHours(0,0,0,0);
    const future=eventsData.filter(function(event){
      const parsed=new Date(String(event.sortDate||'')+'T00:00:00');
      return !Number.isNaN(parsed.getTime())&&parsed>=today;
    });
    const source=future.length?future:eventsData;
    return source.slice().sort(function(a,b){return String(a.sortDate||'').localeCompare(String(b.sortDate||''));}).slice(0,4);
  }

  function renderEvents(lang){
    const container=document.getElementById('homeHeroEvents');
    if(!container) return;
    container.replaceChildren();
    upcomingEvents().forEach(function(event){
      const parts=eventDateParts(event,lang);
      const link=document.createElement('a');
      link.className='home-hero-event';
      link.href=event.page||'events.html';

      const date=document.createElement('span');
      date.className='home-hero-event-date';
      const day=document.createElement('strong');
      day.textContent=parts.day;
      const month=document.createElement('small');
      month.textContent=parts.month;
      date.append(day,month);

      const info=document.createElement('span');
      info.className='home-hero-event-copy';
      const title=document.createElement('strong');
      title.textContent=localized(event.title,lang)||event.campCity||'FIL-ITALIA Event';
      const meta=document.createElement('span');
      meta.textContent=[localized(event.location,lang),event.time].filter(Boolean).join(' · ');
      info.append(title,meta);
      link.append(date,info);
      container.appendChild(link);
    });
  }

  function apply(){
    const lang=language();
    const t=copy[lang];
    setText('homeHeroEyebrow',t.eyebrow);
    setText('homeHeroLine1',t.line1);
    setText('homeHeroLine2',t.line2);
    setText('homeHeroLine3',t.line3);
    setText('homeHeroLine4',t.line4);
    setText('homeHeroDescription',t.description);
    setText('homeHeroEventsLabel',t.events);
    setText('homeHeroDiscoverLabel',t.discover);
    setText('homeHeroNote',t.note);
    setText('homeHeroRailTitle',t.rail);
    setText('homeHeroAllEvents',t.all);
    t.values.forEach(function(value,index){
      setText('homeValueTitle'+(index+1),value[0]);
      setText('homeValueText'+(index+1),value[1]);
    });
    renderEvents(lang);
  }

  function loadHorizontalLayout(){
    if(!document.querySelector('link[data-filitalia-horizontal]')){
      const style=document.createElement('link');
      style.rel='stylesheet';
      style.href='home-horizontal-v1.css?v=1';
      style.dataset.filitaliaHorizontal='true';
      document.head.appendChild(style);
    }
    if(!document.querySelector('script[data-filitalia-horizontal]')){
      const script=document.createElement('script');
      script.src='home-horizontal-v1.js?v=1';
      script.defer=true;
      script.dataset.filitaliaHorizontal='true';
      document.body.appendChild(script);
    }
  }

  function loadPanelRedesign(){
    if(document.querySelector('link[data-filitalia-panels-v4]')) return;
    const style=document.createElement('link');
    style.rel='stylesheet';
    style.href='home-panels-v4.css?v=4';
    style.dataset.filitaliaPanelsV4='true';
    document.head.appendChild(style);
  }

  function boot(){
    loadPanelRedesign();
    apply();
    loadHorizontalLayout();
  }

  document.addEventListener('click',function(event){
    if(event.target.closest('.language-switch button')) window.setTimeout(apply,0);
  });
  window.addEventListener('storage',apply);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();