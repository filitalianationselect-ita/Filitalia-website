(function(){
'use strict';

function eventSource(){
  try{if(typeof eventsData!=='undefined'&&Array.isArray(eventsData))return eventsData}catch(_){ }
  return Array.isArray(window.eventsData)?window.eventsData:[];
}
function currentLanguage(){
  try{return String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase()}
  catch(_){return'it'}
}
function localized(value){
  const language=currentLanguage();
  if(value&&typeof value==='object')return value[language]||value.it||value.en||value.ph||Object.values(value)[0]||'';
  return String(value==null?'':value);
}
function escapeHtml(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(character){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character]});
}
function eventId(item,index){return String(item&&item.id||item&&item.slug||('event-'+index))}
function findEvent(id){
  if(typeof window.getEventByIdFinal==='function'){
    const direct=window.getEventByIdFinal(id);
    if(direct)return direct;
  }
  const wanted=String(id||'');
  return eventSource().find(function(item,index){return[eventId(item,index),String(item.id||''),String(item.slug||'')].includes(wanted)})||eventSource()[0]||null;
}
function titleOf(item){
  if(typeof window.eventTitle==='function')return window.eventTitle(item);
  return localized(item&&item.title)||item&&item.name||'Evento FIL-ITALIA';
}
function dateOf(item){
  if(typeof window.eventDate==='function')return window.eventDate(item);
  return localized(item&&item.date)||'Da confermare';
}
function descriptionOf(item){
  if(typeof window.eventDescription==='function')return window.eventDescription(item);
  return localized(item&&item.description)||localized(item&&item.excerpt)||'';
}
function locationOf(item){
  if(typeof window.eventLocation==='function')return window.eventLocation(item);
  return localized(item&&item.location)||item&&item.venue||item&&item.city||'';
}
function imageOf(item){
  if(typeof window.eventImage==='function')return window.eventImage(item);
  return item&&item.image||item&&item.cardImage||item&&item.imageUrl||'images/logo.png';
}
function registerOf(item){
  if(typeof window.eventRegisterLink==='function')return window.eventRegisterLink(item);
  return item&&item.ticket||('camp-register.html?event='+encodeURIComponent(eventId(item,eventSource().indexOf(item))));
}
function editableHtml(item,key,fallback){
  if(typeof window.autoTextHTML==='function')return window.autoTextHTML(item,key,fallback,0);
  return escapeHtml(fallback);
}
function descriptionHtml(item,description){
  if(typeof window.autoTextHTML==='function')return window.autoTextHTML(item,'description',description,0);
  return String(description||'').split(/\n{2,}/).map(function(paragraph){return'<p>'+escapeHtml(paragraph).replace(/\n/g,'<br>')+'</p>'}).join('');
}
function stripText(value){return String(value||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim()}
function shortLead(item,description){
  const excerpt=localized(item&&item.excerpt);
  if(excerpt)return excerpt;
  const clean=stripText(description);
  if(clean.length>210)return clean.slice(0,207).trim()+'…';
  return clean||'Allenamento, valutazione e opportunità per i giovani atleti FIL-ITALIA.';
}
function labels(){
  const language=currentLanguage();
  if(language==='en')return{badge:'FIL-ITALIA EVENT',date:'DATE',time:'TIME',place:'LOCATION',city:'CITY',story:'THE PROGRAM',details:'EVENT DETAILS',aside:'FIL-ITALIA NATION SELECT',asideText:'Development, competition and international opportunities through basketball.',register:'REGISTER NOW',share:'SHARE'};
  if(language==='ph')return{badge:'FIL-ITALIA EVENT',date:'PETSA',time:'ORAS',place:'LUGAR',city:'LUNGSOD',story:'ANG PROGRAMA',details:'DETALYE NG EVENT',aside:'FIL-ITALIA NATION SELECT',asideText:'Development, competition at international opportunities sa pamamagitan ng basketball.',register:'MAG-REGISTER',share:'I-SHARE'};
  return{badge:'EVENTO FIL-ITALIA',date:'DATA',time:'ORARIO',place:'LUOGO',city:'CITTÀ',story:'IL PROGRAMMA',details:'DETTAGLI DELL’EVENTO',aside:'FIL-ITALIA NATION SELECT',asideText:'Sviluppo, competizione e opportunità internazionali attraverso il basket.',register:'REGISTRATI ORA',share:'CONDIVIDI'};
}
function setCover(element,image){
  if(!element)return;
  const clean=String(image||'images/logo.png').replace(/["\\\n\r]/g,'');
  element.style.setProperty('--event-cover','url("'+clean+'")');
}
function updateMetadata(title,image,description){
  document.title=title+' | FIL-ITALIA';
  const titleMeta=document.querySelector('meta[property="og:title"]');
  const imageMeta=document.querySelector('meta[property="og:image"]');
  const descriptionMeta=document.querySelector('meta[property="og:description"]');
  if(titleMeta)titleMeta.content=title;
  if(imageMeta)imageMeta.content=image;
  if(descriptionMeta)descriptionMeta.content=stripText(description).slice(0,180);
}
function renderPremiumEventDetail(){
  const container=document.getElementById('eventDetailContainer');
  if(!container)return;
  const params=new URLSearchParams(window.location.search);
  const item=findEvent(params.get('id')||params.get('event'));
  if(!item){
    container.innerHTML='<div class="event-premium-shell"><section class="event-premium-story"><span class="event-premium-kicker">FIL-ITALIA</span><h2>Evento non trovato</h2><a class="event-main-action" href="events.html">Torna agli Eventi</a></section></div>';
    return;
  }
  const text=labels();
  const title=titleOf(item);
  const description=descriptionOf(item);
  const image=imageOf(item);
  const location=locationOf(item);
  const city=item.campCity||item.city||String(location||'').split(',')[0]||'';
  const date=dateOf(item)||'Da confermare';
  const time=item.time||item.orario||(String(description).match(/\b\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\b/)||['Da confermare'])[0];
  const place=item.place||item.venue||item.luogo||location||city||'Da confermare';
  const register=registerOf(item);
  const objectPosition=item.imagePosition||'center center';

  container.innerHTML='\
    <div class="event-premium-shell">\
      <div class="event-premium-backdrop" aria-hidden="true"></div>\
      <section class="event-premium-hero">\
        <figure class="event-premium-poster">\
          <img src="'+escapeHtml(image)+'" alt="'+escapeHtml(title)+'" style="object-position:'+escapeHtml(objectPosition)+'" onerror="this.onerror=null;this.src=\'images/logo.png\'">\
          <figcaption>FIL-ITALIA NATION SELECT</figcaption>\
        </figure>\
        <div class="event-premium-intro">\
          <div class="event-premium-topline"><span class="event-detail-badge">'+escapeHtml(text.badge)+'</span><span class="event-premium-city">'+escapeHtml(city||place)+'</span></div>\
          <h1>'+editableHtml(item,'title',title)+'</h1>\
          <p class="event-premium-lead">'+escapeHtml(shortLead(item,description))+'</p>\
          <div class="event-detail-fields">\
            <div><strong>'+escapeHtml(text.date)+'</strong><span>'+editableHtml(item,'date',date)+'</span></div>\
            <div><strong>'+escapeHtml(text.time)+'</strong><span>'+escapeHtml(time)+'</span></div>\
            <div><strong>'+escapeHtml(text.place)+'</strong><span>'+escapeHtml(place)+'</span></div>\
            <div><strong>'+escapeHtml(text.city)+'</strong><span>'+escapeHtml(city||place)+'</span></div>\
          </div>\
          <div class="event-detail-actions">\
            <a class="event-main-action" href="'+escapeHtml(register)+'">'+escapeHtml(text.register)+'</a>\
            <button type="button" class="event-main-action event-share-action" data-event-premium-share>'+escapeHtml(text.share)+'</button>\
          </div>\
        </div>\
      </section>\
      <section class="event-premium-content">\
        <article class="event-premium-story">\
          <span class="event-premium-kicker">'+escapeHtml(text.story)+'</span>\
          <h2>'+escapeHtml(text.details)+'</h2>\
          <div class="event-detail-description">'+descriptionHtml(item,description)+'</div>\
        </article>\
        <aside class="event-premium-aside">\
          <img src="images/logo.png" alt="FIL-ITALIA">\
          <div><h3>'+escapeHtml(text.aside)+'</h3><p>'+escapeHtml(text.asideText)+'</p></div>\
          <a class="event-main-action" href="'+escapeHtml(register)+'">'+escapeHtml(text.register)+'</a>\
          <span class="event-premium-tricolor" aria-hidden="true"><i></i><i></i><i></i></span>\
        </aside>\
      </section>\
    </div>';

  const shell=container.querySelector('.event-premium-shell');
  setCover(shell,image);
  const share=container.querySelector('[data-event-premium-share]');
  if(share)share.addEventListener('click',function(){
    if(typeof window.shareFilitalia==='function')window.shareFilitalia('event',item);
  });
  updateMetadata(title,image,description);
  document.body.classList.remove('fil-event-modal-open');
  document.documentElement.style.removeProperty('overflow');
  document.body.style.removeProperty('overflow');
}

window.renderEventDetailPage=renderPremiumEventDetail;
window.renderPremiumEventDetail=renderPremiumEventDetail;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',renderPremiumEventDetail);else window.setTimeout(renderPremiumEventDetail,0);
window.addEventListener('filitalia:content-updated',function(){window.setTimeout(renderPremiumEventDetail,80)});
})();
