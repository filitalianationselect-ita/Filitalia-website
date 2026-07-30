(function(){
'use strict';

let activeEvent=null;
let activeIndex=0;
let eventList=[];
let legacyOpenInfo=null;
let legacyCloseInfo=null;

function language(){
  try{return String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase()}
  catch(_){return'it'}
}
function localized(value){
  const current=language();
  if(value&&typeof value==='object')return value[current]||value.it||value.en||value.ph||Object.values(value)[0]||'';
  return String(value==null?'':value);
}
function escapeHtml(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]});
}
function source(){
  try{if(typeof eventsData!=='undefined'&&Array.isArray(eventsData))return eventsData}
  catch(_){ }
  if(Array.isArray(window.eventsData))return window.eventsData;
  return[];
}
function isVisible(item){
  return !['draft','archived','hidden','inactive','disabled'].includes(String(item&&item.status||'active').toLowerCase());
}
function eventId(item,index){return String(item&&item.id||item&&item.slug||('event-'+index))}
function titleOf(item){return localized(item&&item.title)||item&&item.name||item&&item.campCity||'Evento FIL-ITALIA'}
function richText(value){
  const content=localized(value).trim();
  if(!content)return'';
  const hasHtml=/<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|br|blockquote)\b[^>]*>/i.test(content);
  if(hasHtml&&typeof window.sanitizeFilitaliaRichHtml==='function')return window.sanitizeFilitaliaRichHtml(content);
  if(hasHtml)return content;
  return content.split(/\n{2,}/).map(function(paragraph){return'<p>'+escapeHtml(paragraph).replace(/\n/g,'<br>')+'</p>'}).join('');
}
function labels(){
  const current=language();
  if(current==='en')return{eyebrow:'FIL-ITALIA EVENT',date:'DATE',time:'TIME',place:'LOCATION',city:'CITY',register:'REGISTER NOW',share:'SHARE',page:'EVENT PAGE'};
  if(current==='ph')return{eyebrow:'FIL-ITALIA EVENT',date:'PETSA',time:'ORAS',place:'LUGAR',city:'LUNGSOD',register:'MAG-REGISTER',share:'I-SHARE',page:'EVENT PAGE'};
  return{eyebrow:'EVENTO FIL-ITALIA',date:'DATA',time:'ORARIO',place:'LUOGO',city:'CITTÀ',register:'REGISTRATI ORA',share:'CONDIVIDI',page:'PAGINA EVENTO'};
}
function findEventById(id){
  const wanted=String(id||'');
  const list=source();
  return list.find(function(item,index){return[eventId(item,index),String(item.id||''),String(item.slug||'')].includes(wanted)})||null;
}
function findEventFromElement(element){
  if(!element)return null;
  const direct=element.dataset&&element.dataset.eventId;
  if(direct){const found=findEventById(direct);if(found)return found}
  const anchor=element.closest('a[href]')||element.querySelector&&element.querySelector('a[href]');
  if(anchor){
    try{
      const url=new URL(anchor.getAttribute('href'),location.href);
      const id=url.searchParams.get('event')||url.searchParams.get('id');
      if(id){const found=findEventById(id);if(found)return found}
      const page=url.pathname.split('/').filter(Boolean).pop();
      const byPage=source().find(function(item){return item.page&&String(item.page).split('/').pop()===page});
      if(byPage)return byPage;
    }catch(_){ }
  }
  const visibleTitle=(element.querySelector('h2,strong,h3')||element).textContent.trim().replace(/\s+/g,' ');
  return source().find(function(item){
    const title=titleOf(item).trim().replace(/\s+/g,' ');
    return title===visibleTitle||visibleTitle.includes(title)||title.includes(visibleTitle);
  })||null;
}
function shareEvent(item,button){
  if(typeof window.shareFilitalia==='function'){
    window.shareFilitalia('event',item);
    return;
  }
  const id=eventId(item,source().indexOf(item));
  const url=new URL(location.pathname,location.origin);
  url.searchParams.set('type','event');
  url.searchParams.set('id',id);
  const title=titleOf(item);
  if(navigator.share){navigator.share({title:title,text:localized(item.excerpt||item.description),url:url.href}).catch(function(){})}
  else if(navigator.clipboard){navigator.clipboard.writeText(url.href).then(function(){if(button)button.textContent=language()==='it'?'LINK COPIATO':'LINK COPIED'}).catch(function(){})}
}
function modernControls(){
  const modal=document.getElementById('infoModal');
  if(!modal)return;
  const previous=modal.querySelector(':scope > .modal-prev');
  const next=modal.querySelector(':scope > .modal-next');
  if(previous&&!previous.dataset.modernEventBound){
    previous.removeAttribute('onclick');
    previous.dataset.modernEventBound='true';
    previous.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();if(!eventList.length)return;activeIndex=(activeIndex-1+eventList.length)%eventList.length;render(eventList[activeIndex])});
  }
  if(next&&!next.dataset.modernEventBound){
    next.removeAttribute('onclick');
    next.dataset.modernEventBound='true';
    next.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();if(!eventList.length)return;activeIndex=(activeIndex+1)%eventList.length;render(eventList[activeIndex])});
  }
}
function restoreLegacyControls(){
  const modal=document.getElementById('infoModal');
  if(!modal)return;
  const previous=modal.querySelector(':scope > .modal-prev');
  const next=modal.querySelector(':scope > .modal-next');
  if(previous){previous.removeAttribute('data-modern-event-bound');previous.setAttribute('onclick','prevInfo()')}
  if(next){next.removeAttribute('data-modern-event-bound');next.setAttribute('onclick','nextInfo()')}
}
function render(item){
  const modal=document.getElementById('infoModal');
  const content=modal&&modal.querySelector('.modal-content');
  if(!modal||!content||!item)return;
  eventList=source().filter(isVisible);
  activeEvent=item;
  activeIndex=Math.max(0,eventList.indexOf(item));
  const text=labels();
  const id=eventId(item,source().indexOf(item));
  const title=titleOf(item);
  const date=localized(item.date||item.campDate)||'Da confermare';
  const time=localized(item.time)||'Da confermare';
  const place=localized(item.location)||item.venue||item.campCity||item.city||'Da confermare';
  const city=item.campCity||item.city||'';
  const image=item.image||item.imageUrl||item.image_url||'images/logo.png';
  const description=richText(item.description||item.excerpt||'');
  const register=item.ticket||('camp-register.html?event='+encodeURIComponent(id));
  const page=item.page||'';

  modal.classList.add('fil-event-modal-modern','is-open');
  modal.setAttribute('aria-hidden','false');
  modal.style.display='flex';
  document.body.classList.add('fil-event-modal-open');
  content.innerHTML='\
    <div class="fil-event-modal-media">\
      <img src="'+escapeHtml(image)+'" alt="'+escapeHtml(title)+'" onerror="this.onerror=null;this.src=\'images/news-placeholder.svg\'">\
      <span class="fil-event-modal-media-label">FIL-ITALIA NATION SELECT</span>\
    </div>\
    <div class="fil-event-modal-copy">\
      <span class="fil-event-modal-eyebrow">'+escapeHtml(text.eyebrow)+'</span>\
      <h2>'+escapeHtml(title)+'</h2>\
      <div class="fil-event-modal-meta">\
        <article><small>'+escapeHtml(text.date)+'</small><strong>'+escapeHtml(date)+'</strong></article>\
        <article><small>'+escapeHtml(text.time)+'</small><strong>'+escapeHtml(time)+'</strong></article>\
        <article><small>'+escapeHtml(text.place)+'</small><strong>'+escapeHtml(place)+'</strong></article>\
        <article><small>'+escapeHtml(text.city)+'</small><strong>'+escapeHtml(city||place)+'</strong></article>\
      </div>\
      <div class="fil-event-modal-description">'+(description||'<p>'+escapeHtml(localized(item.excerpt)||'Dettagli in aggiornamento.')+'</p>')+'</div>\
      <div class="fil-event-modal-actions">\
        <a class="fil-event-modal-action fil-event-modal-register" href="'+escapeHtml(register)+'">'+escapeHtml(text.register)+'</a>\
        <button class="fil-event-modal-action fil-event-modal-share" type="button">'+escapeHtml(text.share)+'</button>\
        '+(page?'<a class="fil-event-modal-action fil-event-modal-page" href="'+escapeHtml(page)+'">'+escapeHtml(text.page)+'</a>':'')+'\
      </div>\
    </div>';
  const share=content.querySelector('.fil-event-modal-share');
  if(share)share.addEventListener('click',function(){shareEvent(item,share)});
  modernControls();
}
function closeModern(){
  const modal=document.getElementById('infoModal');
  if(modal){modal.classList.remove('is-open','fil-event-modal-modern');modal.setAttribute('aria-hidden','true')}
  document.body.classList.remove('fil-event-modal-open');
  activeEvent=null;
}
function install(){
  legacyOpenInfo=typeof window.openInfo==='function'?window.openInfo:null;
  legacyCloseInfo=typeof window.closeInfo==='function'?window.closeInfo:null;
  window.openInfo=function(item){
    if(item&&item.type==='event'&&item.data){render(item.data);return}
    closeModern();
    restoreLegacyControls();
    if(legacyOpenInfo)return legacyOpenInfo(item);
  };
  window.closeInfo=function(){
    closeModern();
    if(legacyCloseInfo)return legacyCloseInfo();
    const modal=document.getElementById('infoModal');if(modal)modal.style.display='none';
  };

  document.addEventListener('click',function(event){
    const target=event.target.closest('#homeEventsGrid > *, #allEventsGrid a, #allEventsGrid [data-event-id], #events .event-card, #events .home-event-card');
    if(!target)return;
    const item=findEventFromElement(target);
    if(!item)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    render(item);
  },true);

  const modal=document.getElementById('infoModal');
  if(modal)modal.addEventListener('click',function(event){if(event.target===modal)window.closeInfo()});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&activeEvent)window.closeInfo()});
  document.querySelectorAll('.language-switch button').forEach(function(button){button.addEventListener('click',function(){if(activeEvent)window.setTimeout(function(){render(activeEvent)},60)})});

  const params=new URLSearchParams(location.search);
  if(params.get('type')==='event'&&params.get('id')){
    const requested=findEventById(params.get('id'));
    if(requested)window.setTimeout(function(){render(requested)},350);
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();