(function(){
  'use strict';

  const copy={
    it:{spotlight:'PLAYER IN EVIDENZA',view:'Vedi tutti i giocatori',players:'Scorri i giocatori',next:'Prossimo',scheduled:'In programma',tbc:'Data in arrivo',archive:'Archivio',order:'Eventi ordinati dal prossimo al più lontano. Le date non confermate vengono mostrate dopo.',empty:'Nessun evento disponibile.'},
    en:{spotlight:'PLAYER SPOTLIGHT',view:'View all players',players:'Browse players',next:'Next event',scheduled:'Scheduled',tbc:'Date coming soon',archive:'Archive',order:'Events are ordered from the nearest date onward. Unconfirmed dates appear afterwards.',empty:'No events available.'},
    ph:{spotlight:'PLAYER SPOTLIGHT',view:'Tingnan lahat ng players',players:'Tingnan ang players',next:'Susunod na event',scheduled:'Naka-iskedyul',tbc:'Malapit ang petsa',archive:'Archive',order:'Nakaayos ang events mula sa pinakamalapit na petsa. Ang hindi pa kumpirmadong petsa ay nasa hulihan.',empty:'Walang available na event.'}
  };

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

  function playerSource(){
    try{
      if(Array.isArray(window.playersData))return window.playersData;
      if(typeof playersData!=='undefined'&&Array.isArray(playersData))return playersData;
    }catch(error){}
    return [];
  }

  function eventSource(){
    try{
      if(Array.isArray(window.eventsData))return window.eventsData;
      if(typeof eventsData!=='undefined'&&Array.isArray(eventsData))return eventsData;
    }catch(error){}
    return [];
  }

  function activePlayers(){
    return playerSource().filter(function(player){
      const status=String(player.status||'active').toLowerCase();
      return !['hidden','inactive','disabled','archived'].includes(status);
    });
  }

  function playerImage(player){return player.cardImage||player.image||player.photo||player.profileImage||'images/logo.png';}
  function playerRole(player,lang){return localized(player.role||player.position||player.category,lang);}
  function playerCity(player,lang){return localized(player.city||player.club,lang);}

  let heroItems=[];
  let heroIndex=0;
  let heroTimer=0;

  function buildHeroCaption(frame,player,index,total){
    const lang=language();
    let caption=frame.querySelector('.home-player-caption');
    if(!caption){caption=document.createElement('div');caption.className='home-player-caption';frame.appendChild(caption);}
    caption.replaceChildren();

    const copyBox=document.createElement('div');
    copyBox.className='fil-player-caption-copy';
    const eyebrow=document.createElement('small');
    eyebrow.textContent=copy[lang].spotlight;
    const name=document.createElement('strong');
    name.textContent=localized(player.name,lang)||'FIL-ITALIA Player';
    const meta=document.createElement('span');
    meta.textContent=[playerRole(player,lang),playerCity(player,lang)].filter(Boolean).join(' · ');
    copyBox.append(eyebrow,name,meta);

    const action=document.createElement('a');
    action.className='fil-player-profile-link';
    action.href='players.html'+(player.id?'?player='+encodeURIComponent(player.id):'');
    action.textContent=copy[lang].view;
    action.setAttribute('aria-label',copy[lang].view);

    caption.append(copyBox,action);

    let counter=frame.querySelector('.fil-player-spotlight-counter');
    if(!counter){counter=document.createElement('span');counter.className='fil-player-spotlight-counter';frame.appendChild(counter);}
    counter.textContent=String(index+1).padStart(2,'0')+' / '+String(total).padStart(2,'0');
  }

  function showHeroPlayer(index){
    if(!heroItems.length)return;
    heroIndex=(index+heroItems.length)%heroItems.length;
    const frame=document.querySelector('.home-player-frame');
    if(!frame)return;
    const image=frame.querySelector(':scope > img')||frame.querySelector('img');
    const player=heroItems[heroIndex];
    frame.classList.add('is-player-changing');
    window.setTimeout(function(){
      if(image){
        image.src=playerImage(player);
        image.alt=localized(player.name,language())||'Giocatore FIL-ITALIA';
        image.style.objectPosition=player.imagePosition||'center top';
      }
      buildHeroCaption(frame,player,heroIndex,heroItems.length);
      frame.classList.remove('is-player-changing');
    },150);
  }

  function restartHeroTimer(){
    window.clearInterval(heroTimer);
    if(heroItems.length<2)return;
    heroTimer=window.setInterval(function(){if(!document.hidden)showHeroPlayer(heroIndex+1);},6000);
  }

  function initHeroPlayers(){
    const frame=document.querySelector('.home-player-frame');
    if(!frame)return;
    heroItems=activePlayers();
    if(!heroItems.length)return;

    if(!frame.dataset.filPlayerCarousel){
      frame.dataset.filPlayerCarousel='true';
      const previous=document.createElement('button');
      previous.type='button';previous.className='fil-player-arrow fil-player-arrow-prev';previous.innerHTML='‹';previous.setAttribute('aria-label','Giocatore precedente');
      const next=document.createElement('button');
      next.type='button';next.className='fil-player-arrow fil-player-arrow-next';next.innerHTML='›';next.setAttribute('aria-label','Giocatore successivo');
      frame.append(previous,next);
      previous.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();showHeroPlayer(heroIndex-1);restartHeroTimer();});
      next.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();showHeroPlayer(heroIndex+1);restartHeroTimer();});
      frame.addEventListener('mouseenter',function(){window.clearInterval(heroTimer);});
      frame.addEventListener('mouseleave',restartHeroTimer);
      frame.addEventListener('focusin',function(){window.clearInterval(heroTimer);});
      frame.addEventListener('focusout',restartHeroTimer);
    }

    heroIndex=heroItems.length>1?Math.floor(Math.random()*heroItems.length):0;
    showHeroPlayer(heroIndex);
    restartHeroTimer();
  }

  function initPlayersPanelCarousel(){
    const section=document.getElementById('players');
    const grid=document.getElementById('homePlayersGrid');
    if(!section||!grid)return;
    grid.classList.add('fil-player-carousel-track');

    let controls=section.querySelector('.fil-player-panel-controls');
    if(!controls){
      controls=document.createElement('div');
      controls.className='fil-player-panel-controls';
      controls.innerHTML='<span class="fil-player-panel-label"></span><div><button type="button" data-fil-player-prev aria-label="Giocatori precedenti">‹</button><span data-fil-player-count>01 / 01</span><button type="button" data-fil-player-next aria-label="Giocatori successivi">›</button></div>';
      const row=section.querySelector('.players-button-row');
      if(row)row.insertAdjacentElement('afterend',controls);else section.insertBefore(controls,grid);
    }

    const label=controls.querySelector('.fil-player-panel-label');
    if(label)label.textContent=copy[language()].players;
    const prev=controls.querySelector('[data-fil-player-prev]');
    const next=controls.querySelector('[data-fil-player-next]');
    const count=controls.querySelector('[data-fil-player-count]');

    function cards(){return Array.from(grid.querySelectorAll(':scope > .player-card'));}
    function step(){const first=cards()[0];return first?first.getBoundingClientRect().width+18:Math.max(260,grid.clientWidth*.78);}
    function update(){
      const all=cards();
      if(!all.length){if(count)count.textContent='00 / 00';return;}
      const index=Math.max(0,Math.min(all.length-1,Math.round(grid.scrollLeft/Math.max(1,step()))));
      if(count)count.textContent=String(index+1).padStart(2,'0')+' / '+String(all.length).padStart(2,'0');
      if(prev)prev.disabled=index===0;
      if(next)next.disabled=index>=all.length-1;
    }

    if(!controls.dataset.bound){
      controls.dataset.bound='true';
      prev.addEventListener('click',function(){grid.scrollBy({left:-step(),behavior:'smooth'});});
      next.addEventListener('click',function(){grid.scrollBy({left:step(),behavior:'smooth'});});
      grid.addEventListener('scroll',function(){window.requestAnimationFrame(update);},{passive:true});
      const observer=new MutationObserver(function(){window.setTimeout(update,50);});
      observer.observe(grid,{childList:true});
    }
    window.setTimeout(update,100);
  }

  function parseEventDate(event){
    const raw=String(event.sortDate||event.startDate||event.dateISO||'');
    const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!match)return null;
    const date=new Date(Number(match[1]),Number(match[2])-1,Number(match[3]));
    return Number.isNaN(date.getTime())?null:date;
  }

  function eventState(event,lang,today){
    const label=localized(event.date||event.campDate,lang);
    const tbc=!parseEventDate(event)||/arrivo|coming soon|tbc|confermare|malapit|confirm/i.test(label);
    const date=parseEventDate(event);
    const past=Boolean(date&&!tbc&&date<today);
    return {label,date,tbc,past};
  }

  function sortedEvents(){
    const lang=language();
    const today=new Date();today.setHours(0,0,0,0);
    return eventSource().slice().sort(function(a,b){
      const sa=eventState(a,lang,today);const sb=eventState(b,lang,today);
      const wa=sa.past?2:(sa.tbc?1:0);const wb=sb.past?2:(sb.tbc?1:0);
      if(wa!==wb)return wa-wb;
      if(sa.date&&sb.date)return sa.past?sb.date-sa.date:sa.date-sb.date;
      if(sa.date)return-1;if(sb.date)return 1;
      return localized(a.title,lang).localeCompare(localized(b.title,lang));
    });
  }

  function eventCard(event,index,firstUpcoming){
    const lang=language();
    const t=copy[lang];
    const today=new Date();today.setHours(0,0,0,0);
    const state=eventState(event,lang,today);
    const card=document.createElement('article');
    card.className='fil-event-card-v2'+(firstUpcoming===event?' is-next-event':'')+(state.past?' is-past-event':'');
    card.dataset.eventId=event.id||'';

    const link=document.createElement('a');
    link.href=event.page||('events.html'+(event.id?'?event='+encodeURIComponent(event.id):''));
    const media=document.createElement('div');media.className='fil-event-card-media';
    const image=document.createElement('img');image.src=event.image||event.coverImage||'images/ita.jpg';image.alt=localized(event.title,lang)||'Evento FIL-ITALIA';
    const badge=document.createElement('span');badge.className='fil-event-status';
    badge.textContent=state.past?t.archive:(state.tbc?t.tbc:(firstUpcoming===event?t.next:t.scheduled));
    media.append(image,badge);

    const body=document.createElement('div');body.className='fil-event-card-body';
    const date=document.createElement('time');date.textContent=state.label||t.tbc;
    const title=document.createElement('h3');title.textContent=localized(event.title,lang)||event.campCity||'FIL-ITALIA Event';
    const location=document.createElement('p');location.textContent=localized(event.location||event.campCity,lang)||'';
    const meta=document.createElement('div');meta.className='fil-event-meta';
    const time=document.createElement('span');time.textContent=event.time||'';
    const city=document.createElement('span');city.textContent=event.campCity||'';
    meta.append(time,city);
    body.append(date,title,location,meta);
    link.append(media,body);card.appendChild(link);
    return card;
  }

  let eventRenderTimer=0;
  function renderChronologicalEvents(){
    const container=document.getElementById('homeEventsGrid');
    const section=document.getElementById('events');
    if(!container||!section)return;
    const lang=language();
    const t=copy[lang];
    const events=sortedEvents();
    const today=new Date();today.setHours(0,0,0,0);
    const firstUpcoming=events.find(function(event){const state=eventState(event,lang,today);return !state.past&&!state.tbc;})||null;

    let note=section.querySelector('.fil-event-order-note');
    if(!note){note=document.createElement('p');note.className='fil-event-order-note';const subtitle=section.querySelector('.section-subtitle');if(subtitle)subtitle.insertAdjacentElement('afterend',note);}
    note.textContent=t.order;

    container.dataset.filRendering='1';
    container.classList.add('fil-chronological-events');
    container.replaceChildren();
    if(!events.length){const empty=document.createElement('p');empty.className='fil-events-empty';empty.textContent=t.empty;container.appendChild(empty);}
    else events.slice(0,4).forEach(function(event,index){container.appendChild(eventCard(event,index,firstUpcoming));});
    window.setTimeout(function(){delete container.dataset.filRendering;},0);

    if(!container.__filChronologicalObserver){
      container.__filChronologicalObserver=new MutationObserver(function(){
        if(container.dataset.filRendering)return;
        window.clearTimeout(eventRenderTimer);
        eventRenderTimer=window.setTimeout(renderChronologicalEvents,80);
      });
      container.__filChronologicalObserver.observe(container,{childList:true});
    }
  }

  function markPanels(){
    [['gallery','media'],['staff','team'],['news','editorial'],['events','schedule']].forEach(function(pair){const node=document.getElementById(pair[0]);if(node)node.dataset.filPanelStyle=pair[1];});
  }

  function refresh(){
    markPanels();
    initHeroPlayers();
    initPlayersPanelCarousel();
    renderChronologicalEvents();
  }

  document.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))window.setTimeout(refresh,80);});
  window.addEventListener('storage',refresh);
  window.addEventListener('filitalia:public-content-updated',refresh);
  window.addEventListener('filitalia:content-updated',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
  [450,1300,3200].forEach(function(delay){window.setTimeout(refresh,delay);});
})();