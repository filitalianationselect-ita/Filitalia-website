(function(){
'use strict';

const STORAGE_KEY='filitalia_admin_media_v1';
const cfg=window.FILITALIA_CONFIG||{};
let dynamicItems=[];
let activeFilter='all';

const COPY={
  it:{kicker:'FIL-ITALIA MEDIA',title:'GALLERIA MEDIA',intro:'Tutti i camp, gli allenamenti, i tornei e i momenti ufficiali FIL-ITALIA, direttamente nella Home.',all:'TUTTO',album:'ALBUM',image:'FOTO',video:'VIDEO',highlights:'HIGHLIGHTS',contents:'CONTENUTI',open:'APRI',empty:'Nessun contenuto disponibile in questa categoria.',featured:'IN EVIDENZA'},
  en:{kicker:'FIL-ITALIA MEDIA',title:'MEDIA GALLERY',intro:'All FIL-ITALIA camps, training sessions, tournaments and official moments, directly on the Home page.',all:'ALL',album:'ALBUMS',image:'PHOTOS',video:'VIDEOS',highlights:'HIGHLIGHTS',contents:'ITEMS',open:'OPEN',empty:'No content is available in this category.',featured:'FEATURED'},
  ph:{kicker:'FIL-ITALIA MEDIA',title:'MEDIA GALLERY',intro:'Lahat ng FIL-ITALIA camps, training, tournaments at official moments, direkta sa Home page.',all:'LAHAT',album:'ALBUMS',image:'PHOTOS',video:'VIDEOS',highlights:'HIGHLIGHTS',contents:'NILALAMAN',open:'BUKSAN',empty:'Walang available na content sa category na ito.',featured:'FEATURED'}
};

function language(){
  try{
    const value=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return COPY[value]?value:'it';
  }catch(_){return'it'}
}
function text(){return COPY[language()]}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]})}
function localized(value){if(value&&typeof value==='object'&&!Array.isArray(value))return value[language()]||value.it||value.en||value.ph||Object.values(value)[0]||'';return String(value==null?'':value)}
function localItems(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[]}catch(_){return[]}}

function normalize(item,index){
  const rawType=String(item.mediaType||item.media_type||item.type||'image').toLowerCase();
  const mediaType=rawType==='video'?'video':rawType==='album'?'album':'image';
  return{
    id:String(item.id||'media-'+index),
    title:item.title&&typeof item.title==='object'?item.title:{it:item.titleIt||item.title||'',en:item.titleEn||item.title||'',ph:item.titlePh||item.title||''},
    caption:item.caption&&typeof item.caption==='object'?item.caption:{it:item.captionIt||item.caption||'',en:item.captionEn||item.caption||'',ph:item.captionPh||item.caption||''},
    mediaType:mediaType,
    mediaUrl:String(item.mediaUrl||item.media_url||item.url||''),
    thumbnailUrl:String(item.thumbnailUrl||item.thumbnail_url||item.cover||item.mediaUrl||item.media_url||'images/logo.png'),
    category:String(item.category||'general').toLowerCase(),
    eventId:String(item.eventId||item.event_id||''),
    status:String(item.status||'published').toLowerCase(),
    featured:Boolean(item.featured),
    displayOrder:Number(item.displayOrder??item.display_order??1000),
    publishedAt:item.publishedAt||item.published_at||item.sortDate||'',
    date:item.date||item.publishedAt||item.published_at||item.sortDate||''
  };
}

function albumItems(){
  try{
    if(typeof galleryData==='undefined'||!Array.isArray(galleryData))return[];
    return galleryData.map(function(item,index){
      return normalize({
        id:'album-'+String(item.id||index),
        title:{it:item.title||'Album FIL-ITALIA',en:item.title||'FIL-ITALIA Album',ph:item.title||'FIL-ITALIA Album'},
        caption:{it:item.date||'',en:item.date||'',ph:item.date||''},
        mediaType:'album',
        mediaUrl:item.page||'#',
        thumbnailUrl:item.cover||'images/logo.png',
        category:item.category||'album',
        eventId:item.id||'',
        status:'published',
        featured:false,
        displayOrder:2000+index,
        publishedAt:item.sortDate||'',
        date:item.date||''
      },index);
    });
  }catch(_){return[]}
}

function sorted(items){
  return items.filter(function(item){return item.status==='published'}).sort(function(a,b){
    if(a.featured!==b.featured)return a.featured?-1:1;
    if(a.displayOrder!==b.displayOrder)return a.displayOrder-b.displayOrder;
    const ad=String(a.publishedAt||''),bd=String(b.publishedAt||'');
    if(/^9999-/.test(ad)!==/^9999-/.test(bd))return /^9999-/.test(ad)?1:-1;
    return bd.localeCompare(ad);
  });
}

function combined(){
  const raw=sorted(dynamicItems).concat(albumItems());
  const seen=new Set();
  return raw.filter(function(item){
    const key=[item.mediaType,item.mediaUrl||item.thumbnailUrl,localized(item.title)].join('|').toLowerCase();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}

function eventSource(){try{if(typeof eventsData!=='undefined'&&Array.isArray(eventsData))return eventsData}catch(_){ }return[]}
function eventFor(item){
  const id=String(item.eventId||'').replace(/^album-/,'');
  return eventSource().find(function(event){return String(event.id||event.slug||'')===id})||null;
}
function cityFrom(value){
  const hay=String(value||'').toLowerCase();
  const cities=[['milano','MILANO'],['milan','MILANO'],['firenze','FIRENZE'],['florence','FIRENZE'],['roma','ROMA'],['rome','ROMA'],['venezia','VENEZIA'],['venice','VENEZIA'],['messina','MESSINA'],['torino','TORINO'],['turin','TORINO'],['bologna','BOLOGNA'],['stoccarda','STOCCARDA'],['stuttgart','STOCCARDA']];
  const match=cities.find(function(pair){return hay.includes(pair[0])});
  return match?match[1]:'';
}
function eventTitle(event){
  if(!event)return'';
  return localized(event.title)||event.name||event.label||event.campCity||event.city||'';
}
function campLabel(item){
  const event=eventFor(item);
  const hay=[localized(item.title),localized(item.caption),item.category,item.eventId,eventTitle(event),event&&event.city,event&&event.campCity].filter(Boolean).join(' ');
  const city=cityFrom(hay);
  const talent=/talent|id\s*camp|idcamp/i.test(hay);
  if(talent&&city)return'TALENT ID CAMP · '+city;
  if(talent)return'TALENT ID CAMP';
  if(event){
    const title=eventTitle(event);
    if(title)return String(title).toUpperCase();
  }
  if(item.category==='training')return'ALLENAMENTO FIL-ITALIA';
  if(item.category==='tournament')return'TORNEO FIL-ITALIA';
  if(item.category==='showcase')return'FIL-ITALIA SHOWCASE';
  if(item.category==='nbtc')return'NBTC MANILA';
  if(city)return'FIL-ITALIA · '+city;
  return'FIL-ITALIA MEDIA';
}
function dateLabel(item){
  const raw=localized(item.caption)||String(item.date||item.publishedAt||'');
  const iso=String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso){
    const date=new Date(+iso[1],+iso[2]-1,+iso[3]);
    return date.toLocaleDateString(language()==='it'?'it-IT':'en-GB',{day:'numeric',month:'long',year:'numeric'});
  }
  return raw||'FIL-ITALIA';
}
function typeLabel(item){const copy=text();return copy[item.mediaType]||item.mediaType.toUpperCase()}
function isHighlight(item){return item.featured||/highlight/i.test([item.category,localized(item.title),localized(item.caption)].join(' '))}

function videoEmbed(url){
  const value=String(url||'');
  let match=value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if(match)return'https://www.youtube.com/embed/'+match[1]+'?autoplay=1&rel=0';
  match=value.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if(match)return'https://player.vimeo.com/video/'+match[1]+'?autoplay=1';
  return value;
}
function ensureModal(){
  let modal=document.getElementById('homeFullMediaModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='homeFullMediaModal';
  modal.className='home-full-media-modal';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<div class="home-full-media-modal-panel" role="dialog" aria-modal="true"><button type="button" class="home-full-media-modal-close" aria-label="Chiudi">×</button><div data-home-full-media-body></div><div class="home-full-media-modal-copy"><small data-home-full-media-label></small><strong data-home-full-media-title></strong></div></div>';
  document.body.appendChild(modal);
  const close=function(){modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');modal.querySelector('[data-home-full-media-body]').replaceChildren()};
  modal.querySelector('.home-full-media-modal-close').onclick=close;
  modal.onclick=function(event){if(event.target===modal)close()};
  document.addEventListener('keydown',function(event){if(event.key==='Escape')close()});
  return modal;
}
function openItem(item){
  if(item.mediaType==='album'){location.href=item.mediaUrl;return}
  const modal=ensureModal();
  const body=modal.querySelector('[data-home-full-media-body]');
  body.replaceChildren();
  if(item.mediaType==='video'){
    const frame=document.createElement('iframe');
    frame.src=videoEmbed(item.mediaUrl);
    frame.allow='autoplay; fullscreen; picture-in-picture';
    frame.allowFullscreen=true;
    frame.title=localized(item.title)||'Video FIL-ITALIA';
    body.appendChild(frame);
  }else{
    const image=document.createElement('img');
    image.src=item.mediaUrl||item.thumbnailUrl;
    image.alt=localized(item.title)||'Media FIL-ITALIA';
    body.appendChild(image);
  }
  modal.querySelector('[data-home-full-media-label]').textContent=campLabel(item);
  modal.querySelector('[data-home-full-media-title]').textContent=localized(item.title)||'FIL-ITALIA Media';
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
}

function card(item,index){
  const title=localized(item.title)||'FIL-ITALIA Media';
  const classes=['home-gallery-full-card'];
  if(index===0)classes.push('is-lead');
  if(index===1||index===2)classes.push('is-side');
  if(item.featured)classes.push('is-featured');
  return '<button type="button" class="'+classes.join(' ')+'" data-home-full-media="'+esc(item.id)+'">'+
    '<span class="home-gallery-full-image"><img src="'+esc(item.thumbnailUrl||'images/logo.png')+'" alt="'+esc(title)+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/logo.png\'">'+
    (item.mediaType==='video'?'<i class="home-gallery-full-play">▶</i>':'')+
    (item.featured?'<em class="home-gallery-full-featured">'+esc(text().featured)+'</em>':'')+'</span>'+
    '<span class="home-gallery-full-copy"><small>'+esc(campLabel(item))+'</small><strong>'+esc(title)+'</strong><span>'+esc(dateLabel(item))+' · '+esc(typeLabel(item))+'</span><b>'+esc(text().open)+' →</b></span></button>';
}

function visibleItems(items){
  if(activeFilter==='all')return items;
  if(activeFilter==='highlights')return items.filter(isHighlight);
  return items.filter(function(item){return item.mediaType===activeFilter});
}
function filterButton(id,label){return'<button type="button" data-home-gallery-filter="'+id+'" class="'+(activeFilter===id?'is-active':'')+'">'+esc(label)+'</button>'}

function render(){
  const section=document.getElementById('gallery');
  if(!section||!document.body.hasAttribute('data-home-layout'))return;
  const items=combined();
  const shown=visibleItems(items);
  const copy=text();
  section.classList.add('home-gallery-full-panel');
  section.innerHTML='<div class="home-gallery-full-shell">'+
    '<header class="home-gallery-full-head"><div><small>'+esc(copy.kicker)+'</small><h2>'+esc(copy.title)+'</h2><p>'+esc(copy.intro)+'</p></div><span><strong>'+String(items.length).padStart(2,'0')+'</strong>'+esc(copy.contents)+'</span></header>'+
    '<nav class="home-gallery-full-filters" aria-label="Filtri Media">'+filterButton('all',copy.all)+filterButton('album',copy.album)+filterButton('image',copy.image)+filterButton('video',copy.video)+filterButton('highlights',copy.highlights)+'</nav>'+
    '<div class="home-gallery-full-grid">'+(shown.length?shown.map(card).join(''):'<p class="home-gallery-full-empty">'+esc(copy.empty)+'</p>')+'</div></div>';
  const byId=new Map(items.map(function(item){return[item.id,item]}));
  section.onclick=function(event){
    const filter=event.target.closest('[data-home-gallery-filter]');
    if(filter){activeFilter=filter.dataset.homeGalleryFilter;render();return}
    const button=event.target.closest('[data-home-full-media]');
    if(button){const item=byId.get(button.dataset.homeFullMedia);if(item)openItem(item)}
  };
}

async function remote(){
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey||!window.supabase)return[];
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const result=await client.from('admin_media').select('id,title,caption,media_type,media_url,thumbnail_url,category,event_id,status,featured,display_order,published_at').eq('status','published').order('featured',{ascending:false}).order('display_order');
  if(result.error)throw result.error;
  return(result.data||[]).map(normalize);
}
function refresh(){
  const local=localItems().map(normalize);
  if(local.length)dynamicItems=local;
  render();
  remote().then(function(items){if(items.length){dynamicItems=items;render()}}).catch(function(error){console.info('Media Home remoti non disponibili',error&&error.message?error.message:error)});
}
function boot(){
  refresh();
  [100,450,1000,2200].forEach(function(delay){setTimeout(render,delay)});
  window.addEventListener('filitalia:media-updated',function(event){dynamicItems=(event&&event.detail&&event.detail.items||localItems()).map(normalize);render()});
  window.addEventListener('filitalia:public-content-updated',function(){setTimeout(render,60)});
  window.addEventListener('storage',function(event){if(!event.key||event.key===STORAGE_KEY)refresh()});
  document.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))setTimeout(render,100)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();