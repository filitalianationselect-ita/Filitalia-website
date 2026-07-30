(function(){
'use strict';

function source(){
  try{if(typeof eventsData!=='undefined'&&Array.isArray(eventsData))return eventsData}
  catch(_){ }
  return Array.isArray(window.eventsData)?window.eventsData:[];
}
function localized(value){
  let language='it';
  try{language=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase()}
  catch(_){ }
  if(value&&typeof value==='object')return value[language]||value.it||value.en||value.ph||Object.values(value)[0]||'';
  return String(value==null?'':value);
}
function eventId(item,index){return String(item&&item.id||item&&item.slug||('event-'+index))}
function isVisible(item){return !['draft','archived','hidden','inactive','disabled'].includes(String(item&&item.status||'active').toLowerCase())}
function eventTime(item){
  const raw=item&&item.sortDate||item&&item.eventDate||item&&item.dateISO||item&&item.date;
  if(raw&&typeof raw==='object')return eventTime({sortDate:raw.it||raw.en||raw.ph||Object.values(raw)[0]});
  if(!raw)return Number.MAX_SAFE_INTEGER;
  const value=String(raw).trim();
  const iso=value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso)return new Date(+iso[1],+iso[2]-1,+iso[3],23,59,59).getTime();
  const parsed=Date.parse(value);
  return Number.isNaN(parsed)?Number.MAX_SAFE_INTEGER:parsed;
}
function visibleEvents(){return source().filter(isVisible).slice().sort(function(a,b){return eventTime(a)-eventTime(b)})}
function findById(id){
  const wanted=String(id||'');
  return source().find(function(item,index){return [eventId(item,index),String(item.id||''),String(item.slug||'')].includes(wanted)})||null;
}
function findFromElement(element){
  if(!element)return null;
  const direct=element.dataset&&element.dataset.eventId;
  if(direct){const found=findById(direct);if(found)return found}
  const indexValue=element.dataset&&(element.dataset.fheIndex||element.dataset.fheOpen);
  if(indexValue!=null&&indexValue!==''){
    const item=visibleEvents()[Number(indexValue)];
    if(item)return item;
  }
  const anchor=element.closest('a[href]')||(element.querySelector&&element.querySelector('a[href]'));
  if(anchor){
    try{
      const url=new URL(anchor.getAttribute('href'),location.href);
      const id=url.searchParams.get('event')||url.searchParams.get('id');
      if(id){const found=findById(id);if(found)return found}
      const page=url.pathname.split('/').filter(Boolean).pop();
      const found=source().find(function(item){return item.page&&String(item.page).split('/').pop()===page});
      if(found)return found;
    }catch(_){ }
  }
  const titleNode=element.querySelector&&element.querySelector('h2,h3,h4,strong');
  const visibleTitle=String(titleNode&&titleNode.textContent||'').trim().replace(/\s+/g,' ');
  if(!visibleTitle)return null;
  return source().find(function(item){
    const title=localized(item.title||item.name).trim().replace(/\s+/g,' ');
    return title===visibleTitle||visibleTitle.includes(title)||title.includes(visibleTitle);
  })||null;
}
function pageUrl(item){
  const index=Math.max(0,source().indexOf(item));
  return 'event.html?id='+encodeURIComponent(eventId(item,index));
}
function go(item){if(item)window.location.assign(pageUrl(item))}
function install(){
  const legacyOpenInfo=typeof window.openInfo==='function'?window.openInfo:null;
  window.openInfo=function(payload){
    if(payload&&payload.type==='event'&&payload.data){go(payload.data);return}
    if(legacyOpenInfo)return legacyOpenInfo(payload);
  };
  window.openEventByIndex=function(index){const item=visibleEvents()[Number(index)||0];if(item)go(item)};

  document.addEventListener('click',function(event){
    if(event.target.closest('[data-fhe-register], .ticket-button, a[href*="camp-register"]'))return;
    const target=event.target.closest('#homeEventsGrid [data-fhe-index], #homeEventsGrid [data-fhe-open], #allEventsGrid a, #allEventsGrid [data-event-id], #events .event-card, #events .home-event-card');
    if(!target)return;
    const item=findFromElement(target);
    if(!item)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go(item);
  },true);

  const params=new URLSearchParams(location.search);
  if(/(?:^|\/)events\.html$/i.test(location.pathname)&&params.get('type')==='event'&&params.get('id')){
    const requested=findById(params.get('id'));
    if(requested)window.location.replace(pageUrl(requested));
  }
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();