(function(){
'use strict';

const STORAGE_MEDIA='filitalia_admin_media_v1';
const NEWS_CATEGORIES=['all','tournaments','events','players','announcements','media'];
let homeNewsObserver=null;
let galleryObserver=null;
let homeNewsBusy=false;
let galleryBusy=false;
let galleryFilter='all';
let galleryRemote=[];

function lang(){
  try{
    const value=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return ['it','en','ph'].includes(value)?value:'it';
  }catch(_){return'it'}
}
function localized(value,l){
  const locale=l||lang();
  if(value&&typeof value==='object'&&!Array.isArray(value))return value[locale]||value.it||value.en||value.ph||Object.values(value)[0]||'';
  return value==null?'':String(value);
}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function visible(item){return !['draft','archived','hidden','inactive','disabled'].includes(String(item&&item.status||'active').toLowerCase())}
function imageOf(item){return item&&(item.cardImage||item.card_image_url||item.image||item.imageUrl||item.image_url||item.coverImage||item.cover||item.thumbnailUrl||item.thumbnail_url)||'images/logo.png'}
function itemKey(item,prefix){
  const id=String(item&&item.id||item&&item.slug||'').trim().toLowerCase();
  if(id)return(prefix||'item')+':'+id;
  return(prefix||'item')+':'+localized(item&&item.title).trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
}
function unique(items,prefix){
  const map=new Map();
  (items||[]).forEach(item=>{const key=itemKey(item,prefix);if(!map.has(key))map.set(key,item);else map.set(key,Object.assign({},map.get(key),item))});
  return Array.from(map.values());
}
function source(name){
  try{
    if(name==='news'&&typeof newsData!=='undefined'&&Array.isArray(newsData))return newsData;
    if(name==='gallery'&&typeof galleryData!=='undefined'&&Array.isArray(galleryData))return galleryData;
  }catch(_){ }
  const value=window[name+'Data'];
  return Array.isArray(value)?value:[];
}
function parseDate(item){
  const raw=localized(item&&(item.publishDate||item.sortDate||item.dateISO||item.date)).toLowerCase().trim();
  const iso=raw.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
  if(iso)return new Date(+iso[1],+iso[2]-1,+iso[3]).getTime();
  const months={gennaio:0,january:0,enero:0,febbraio:1,february:1,pebrero:1,marzo:2,march:2,aprile:3,april:3,maggio:4,may:4,giugno:5,june:5,hunyo:5,luglio:6,july:6,hulyo:6,agosto:7,august:7,settembre:8,september:8,ottobre:9,october:9,novembre:10,november:10,dicembre:11,december:11};
  const match=raw.match(/(\d{1,2})\s+([a-zà-ù]+)\s+(20\d{2})/);
  if(match&&months[match[2]]!=null)return new Date(+match[3],months[match[2]],+match[1]).getTime();
  const parsed=Date.parse(raw);
  return Number.isNaN(parsed)?0:parsed;
}
function dateParts(item){
  const timestamp=parseDate(item);
  if(!timestamp)return{day:'',month:'',year:''};
  const date=new Date(timestamp);
  return{day:String(date.getDate()).padStart(2,'0'),month:date.toLocaleDateString(lang()==='it'?'it-IT':'en-GB',{month:'short'}).replace('.','').toUpperCase(),year:String(date.getFullYear())};
}
function newsCategory(item){
  const explicit=String(item&&item.category||item&&item.type||item&&item.newsType||'').toLowerCase();
  const text=[explicit,localized(item&&item.title),localized(item&&item.excerpt)].join(' ').toLowerCase();
  if(/torne|tournament|cup|nbtc|campionat/.test(text))return'tournaments';
  if(/player|giocator|atlet|mvp|roster|convocat/.test(text))return'players';
  if(/media|foto|video|magli|divis|brand/.test(text))return'media';
  if(/comunicat|annunc|partnership|collabor|sponsor|official/.test(text))return'announcements';
  return'events';
}
function newsItems(){return unique(source('news').filter(visible),'news').slice().sort((a,b)=>parseDate(b)-parseDate(a))}
function newsHref(item,index){return'news-item.html?id='+encodeURIComponent(String(item.id||item.slug||('news-'+index)))}
function categoryLabel(category){
  const copy={
    it:{all:'Tutte',tournaments:'Tornei',events:'Eventi',players:'Giocatori',announcements:'Comunicati',media:'Media'},
    en:{all:'All',tournaments:'Tournaments',events:'Events',players:'Players',announcements:'Announcements',media:'Media'},
    ph:{all:'Lahat',tournaments:'Tournaments',events:'Events',players:'Players',announcements:'Announcements',media:'Media'}
  };
  return copy[lang()][category]||category;
}
function cardDate(item){return localized(item.date)||localized(item.publishDate)||localized(item.sortDate)||''}
function newsCard(item,index,feature){
  const title=localized(item.title)||'FIL-ITALIA News';
  const excerpt=localized(item.excerpt)||'';
  const category=newsCategory(item);
  const parts=dateParts(item);
  return '<a class="'+(feature?'fpr-news-feature':'fpr-news-card')+'" href="'+esc(newsHref(item,index))+'">'+
    '<img src="'+esc(imageOf(item))+'" alt="'+esc(title)+'" onerror="this.onerror=null;this.src=\'images/logo.png\'">'+
    '<span class="fpr-news-overlay"></span>'+
    (feature?'<span class="fpr-featured-badge">FEATURED</span>':'')+
    '<span class="fpr-date-block"><strong>'+esc(parts.day||'--')+'</strong><small>'+esc(parts.month||'NEWS')+'</small><em>'+esc(parts.year||'')+'</em></span>'+
    '<span class="fpr-news-copy"><small>'+esc(categoryLabel(category))+'</small><'+(feature?'h2':'h3')+'>'+esc(title)+'</'+(feature?'h2':'h3')+'>'+(feature&&excerpt?'<p>'+esc(excerpt)+'</p>':'')+'<span class="fpr-news-meta">'+esc(cardDate(item))+' · '+esc(categoryLabel(category))+'</span></span>'+
    '<span class="fpr-card-arrow">→</span></a>';
}

function installContactLinks(){
  document.querySelectorAll('a[data-key="navContact"],a[href*="#contact-modal"],a[data-home-contact-trigger]').forEach(link=>{
    link.href='contact.html';
    link.removeAttribute('data-home-contact-trigger');
  });
  document.querySelectorAll('button[data-home-contact-trigger]').forEach(button=>{
    if(button.dataset.fprContactBound)return;
    button.dataset.fprContactBound='1';
    button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();location.href='contact.html'},true);
  });
}

function renderHomeNews(force){
  const section=document.getElementById('news');
  const grid=document.getElementById('homeNewsGrid');
  if(!section||!grid)return;
  const items=newsItems();
  if(!items.length)return;
  const signature=JSON.stringify(items.map(item=>[item.id,item.title,item.date,item.image,item.status]));
  if(!force&&grid.dataset.fprNewsSignature===signature&&grid.querySelector('.fpr-home-news'))return;
  homeNewsBusy=true;
  grid.dataset.fprNewsSignature=signature;
  grid.className='news-grid fpr-home-news-root';
  const lead=items[0];
  const side=items.slice(1,4);
  grid.innerHTML='<div class="fpr-home-news"><header class="fpr-home-news-heading"><div><small>ULTIME NOTIZIE</small><h2>NEWS</h2><p>Storie, tornei, giocatori e aggiornamenti dal mondo FIL-ITALIA.</p></div><a href="news.html">VEDI TUTTE LE NEWS →</a></header><div class="fpr-home-news-layout">'+newsCard(lead,0,true)+'<div class="fpr-home-news-side">'+side.map((item,index)=>newsCard(item,index+1,false)).join('')+'</div></div></div>';
  section.classList.add('fpr-home-news-section');
  homeNewsBusy=false;
  if(!homeNewsObserver){
    homeNewsObserver=new MutationObserver(()=>{if(!homeNewsBusy&&!grid.querySelector('.fpr-home-news'))setTimeout(()=>renderHomeNews(true),20)});
    homeNewsObserver.observe(grid,{childList:true});
  }
}

function renderNewsArchive(){
  const container=document.getElementById('allNewsGrid');
  if(!container||!document.body.classList.contains('fil-page-news'))return;
  const items=newsItems();
  const page=document.querySelector('.players-page');
  if(!page||!items.length)return;
  page.classList.add('fpr-news-page');
  page.querySelector(':scope>.fil-page-brand')?.remove();
  page.querySelector(':scope>h1')?.setAttribute('hidden','');
  page.querySelector(':scope>.page-subtitle')?.setAttribute('hidden','');
  page.querySelector(':scope>.players-button-row')?.setAttribute('hidden','');
  let hero=page.querySelector('.fpr-news-page-hero');
  if(!hero){
    hero=document.createElement('header');hero.className='fpr-news-page-hero';
    hero.innerHTML='<div><small>ULTIME NOTIZIE</small><h1>NEWS</h1><p>Resta aggiornato su tornei, eventi, giocatori e tutto ciò che riguarda FIL-ITALIA Nation Select.</p></div><a href="index.html#news">← TORNA ALLA HOME</a>';
    page.insertBefore(hero,container);
  }
  let controls=page.querySelector('.fpr-news-controls');
  if(!controls){
    controls=document.createElement('div');controls.className='fpr-news-controls';
    controls.innerHTML='<div class="fpr-news-filter-list"></div><label class="fpr-news-search"><input type="search" placeholder="Cerca notizie..."><span>⌕</span></label>';
    container.before(controls);
  }
  let current=controls.dataset.currentFilter||'all';
  const input=controls.querySelector('input');
  function draw(){
    const query=String(input.value||'').trim().toLowerCase();
    const shown=items.filter(item=>(current==='all'||newsCategory(item)===current)&&(!query||[localized(item.title),localized(item.excerpt),cardDate(item)].join(' ').toLowerCase().includes(query)));
    const lead=shown[0];
    const rest=shown.slice(1);
    container.className='fpr-news-archive';
    container.innerHTML=lead?'<div class="fpr-news-archive-feature">'+newsCard(lead,items.indexOf(lead),true)+'</div><div class="fpr-news-card-grid">'+rest.map(item=>newsCard(item,items.indexOf(item),false)).join('')+'</div>':'<p class="fpr-empty">Nessuna notizia trovata.</p>';
  }
  const filterList=controls.querySelector('.fpr-news-filter-list');
  filterList.innerHTML=NEWS_CATEGORIES.map(category=>'<button type="button" data-news-filter="'+category+'" class="'+(category===current?'is-active':'')+'">'+esc(categoryLabel(category))+'</button>').join('');
  filterList.onclick=event=>{const button=event.target.closest('[data-news-filter]');if(!button)return;current=button.dataset.newsFilter;controls.dataset.currentFilter=current;filterList.querySelectorAll('button').forEach(node=>node.classList.toggle('is-active',node===button));draw()};
  input.oninput=draw;
  draw();
}

function mediaLocal(){
  try{const raw=JSON.parse(localStorage.getItem(STORAGE_MEDIA)||'[]');return Array.isArray(raw)?raw:[]}catch(_){return[]}
}
function normalizeMedia(item,index){
  const rawType=String(item.mediaType||item.media_type||item.type||'image').toLowerCase();
  const type=rawType==='video'?'video':rawType==='album'?'album':'image';
  return{
    id:String(item.id||'media-'+index),
    title:item.title&&typeof item.title==='object'?item.title:{it:item.titleIt||item.title||'',en:item.titleEn||item.title||'',ph:item.titlePh||item.title||''},
    caption:item.caption&&typeof item.caption==='object'?item.caption:{it:item.captionIt||item.caption||'',en:item.captionEn||item.caption||'',ph:item.captionPh||item.caption||''},
    mediaType:type,
    mediaUrl:String(item.mediaUrl||item.media_url||item.url||''),
    thumbnailUrl:String(item.thumbnailUrl||item.thumbnail_url||item.cover||item.mediaUrl||item.media_url||'images/logo.png'),
    category:String(item.category||'general').toLowerCase(),
    status:String(item.status||'published').toLowerCase(),
    featured:Boolean(item.featured),
    displayOrder:Number(item.displayOrder??item.display_order??1000),
    publishedAt:item.publishedAt||item.published_at||item.sortDate||''
  }
}
function albumMedia(){return source('gallery').map((item,index)=>normalizeMedia({id:'album-'+String(item.id||index),title:item.title,caption:item.date,mediaType:'album',mediaUrl:item.page||'#',thumbnailUrl:item.cover||'images/logo.png',category:item.category||'album',status:'published',displayOrder:2000+index,publishedAt:item.sortDate},index))}
function mediaItems(){
  const items=mediaLocal().map(normalizeMedia).concat(galleryRemote).filter(item=>item.status==='published').concat(albumMedia());
  return unique(items,'media').sort((a,b)=>(b.featured-a.featured)||(a.displayOrder-b.displayOrder)||String(b.publishedAt).localeCompare(String(a.publishedAt)));
}
function youtube(url){const match=String(url||'').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);return match?'https://www.youtube.com/embed/'+match[1]+'?autoplay=1&rel=0':''}
function vimeo(url){const match=String(url||'').match(/vimeo\.com\/(?:video\/)?(\d+)/);return match?'https://player.vimeo.com/video/'+match[1]+'?autoplay=1':''}
function videoEmbed(url){return youtube(url)||vimeo(url)||String(url||'')}
function openMedia(item){
  if(item.mediaType==='album'){location.href=item.mediaUrl;return}
  let modal=document.getElementById('fprMediaModal');
  if(!modal){
    modal=document.createElement('div');modal.id='fprMediaModal';modal.className='fpr-media-modal';modal.innerHTML='<div class="fpr-media-modal-panel"><button type="button" aria-label="Chiudi">×</button><div data-fpr-media-body></div><strong data-fpr-media-title></strong></div>';document.body.appendChild(modal);
    const close=()=>{modal.classList.remove('is-open');modal.querySelector('[data-fpr-media-body]').replaceChildren()};
    modal.querySelector('button').onclick=close;modal.onclick=event=>{if(event.target===modal)close()};document.addEventListener('keydown',event=>{if(event.key==='Escape')close()});
  }
  const body=modal.querySelector('[data-fpr-media-body]');
  if(item.mediaType==='video'){const frame=document.createElement('iframe');frame.src=videoEmbed(item.mediaUrl);frame.allow='autoplay; fullscreen; picture-in-picture';frame.allowFullscreen=true;frame.title=localized(item.title)||'Video FIL-ITALIA';body.appendChild(frame)}else{const image=document.createElement('img');image.src=item.mediaUrl||item.thumbnailUrl;image.alt=localized(item.title)||'FIL-ITALIA Media';body.appendChild(image)}
  modal.querySelector('[data-fpr-media-title]').textContent=[localized(item.title),localized(item.caption)].filter(Boolean).join(' · ');modal.classList.add('is-open');
}
function mediaCard(item,compact){
  const title=localized(item.title)||'FIL-ITALIA Media';
  return '<button class="'+(compact?'fpr-media-compact':'fpr-media-card')+'" type="button" data-fpr-media="'+esc(item.id)+'"><span class="fpr-media-image"><img src="'+esc(item.thumbnailUrl)+'" alt="'+esc(title)+'" onerror="this.onerror=null;this.src=\'images/logo.png\'">'+(item.mediaType==='video'?'<i>▶</i>':'')+'</span><span class="fpr-media-card-copy"><small>'+esc(item.mediaType==='video'?'VIDEO':item.mediaType==='album'?'ALBUM':'FOTO')+'</small><strong>'+esc(title)+'</strong><em>'+esc(localized(item.caption))+'</em></span></button>';
}
function renderGallery(force){
  const grid=document.getElementById('galleryCategoryGrid');
  if(!grid||!document.body.classList.contains('fil-page-gallery'))return;
  const page=document.querySelector('.players-page');if(!page)return;
  const items=mediaItems();
  const signature=JSON.stringify(items.map(item=>[item.id,item.title,item.mediaType,item.mediaUrl,item.thumbnailUrl,item.status]));
  if(!force&&grid.dataset.fprGallerySignature===signature&&grid.querySelector('.fpr-gallery-shell'))return;
  galleryBusy=true;grid.dataset.fprGallerySignature=signature;
  page.classList.add('fpr-gallery-page');
  page.querySelector(':scope>.fil-page-brand')?.remove();page.querySelector(':scope>h1')?.setAttribute('hidden','');page.querySelector(':scope>.page-subtitle')?.setAttribute('hidden','');page.querySelector(':scope>.players-button-row')?.setAttribute('hidden','');
  const videos=items.filter(item=>item.mediaType==='video');
  const albums=items.filter(item=>item.mediaType==='album');
  const photos=items.filter(item=>item.mediaType==='image');
  const feature=videos.find(item=>item.featured)||videos[0]||albums[0]||photos[0];
  const recentVideos=videos.filter(item=>item!==feature).slice(0,3);
  let shown=items;
  if(galleryFilter==='album')shown=albums;
  if(galleryFilter==='image')shown=photos;
  if(galleryFilter==='video')shown=videos;
  if(galleryFilter==='highlights')shown=videos.filter(item=>item.featured||/highlight/i.test(item.category+' '+localized(item.title)));
  grid.className='fpr-gallery-root';
  grid.innerHTML='<div class="fpr-gallery-shell"><header class="fpr-gallery-hero"><div><small>FIL-ITALIA MEDIA</small><h1>GALLERIA MEDIA</h1><p>Rivivi camp, allenamenti, tornei e momenti della community attraverso foto, video e highlights.</p><a href="index.html#gallery">← TORNA ALLA HOME</a></div><span class="fpr-gallery-hero-art"><img src="'+esc(feature?feature.thumbnailUrl:'images/roma-u21.jpg')+'" alt=""></span></header><div class="fpr-gallery-filters">'+[['all','Tutto'],['album','Album'],['image','Foto'],['video','Video'],['highlights','Highlights']].map(pair=>'<button type="button" data-gallery-filter="'+pair[0]+'" class="'+(galleryFilter===pair[0]?'is-active':'')+'">'+pair[1]+'</button>').join('')+'</div>'+
    (feature?'<section class="fpr-gallery-feature"><button type="button" data-fpr-media="'+esc(feature.id)+'"><img src="'+esc(feature.thumbnailUrl)+'" alt="'+esc(localized(feature.title))+'"><span></span><div><small>'+(feature.mediaType==='video'?'VIDEO IN EVIDENZA':'CONTENUTO IN EVIDENZA')+'</small><h2>'+esc(localized(feature.title))+'</h2><p>'+esc(localized(feature.caption))+'</p><strong>'+(feature.mediaType==='video'?'▶ GUARDA IL VIDEO':'APRI IL CONTENUTO →')+'</strong></div></button><aside><header><strong>VIDEO RECENTI</strong><span>'+videos.length+' video</span></header>'+recentVideos.map(item=>mediaCard(item,true)).join('')+(recentVideos.length?'':'<p class="fpr-gallery-soon">Collega i video dal pannello Media e appariranno qui automaticamente.</p>')+'</aside></section>':'')+
    '<section class="fpr-gallery-library"><header><div><small>ARCHIVIO MEDIA</small><h2>'+(galleryFilter==='all'?'ALBUM, FOTO E VIDEO':galleryFilter==='album'?'ALBUM':galleryFilter==='image'?'FOTO':galleryFilter==='video'?'VIDEO':'HIGHLIGHTS')+'</h2></div><span>'+shown.length+' contenuti</span></header><div class="fpr-gallery-grid">'+shown.map(item=>mediaCard(item,false)).join('')+'</div></section></div>';
  const byId=new Map(items.map(item=>[item.id,item]));
  grid.onclick=event=>{const filter=event.target.closest('[data-gallery-filter]');if(filter){galleryFilter=filter.dataset.galleryFilter;renderGallery(true);return}const button=event.target.closest('[data-fpr-media]');if(button){const item=byId.get(button.dataset.fprMedia);if(item)openMedia(item)}};
  galleryBusy=false;
  if(!galleryObserver){galleryObserver=new MutationObserver(()=>{if(!galleryBusy&&!grid.querySelector('.fpr-gallery-shell'))setTimeout(()=>renderGallery(true),20)});galleryObserver.observe(grid,{childList:true})}
}
async function remoteMedia(){
  const cfg=window.FILITALIA_CONFIG||{};
  if(!cfg.supabaseUrl||!cfg.supabasePublishableKey||!window.FilitaliaSupabase)return;
  try{
    const client=window.FilitaliaSupabase.getPublicClient();if(!client)return;
    const result=await client.from('admin_media').select('id,title,caption,media_type,media_url,thumbnail_url,category,event_id,status,featured,display_order,published_at').eq('status','published').order('featured',{ascending:false}).order('display_order');
    if(result.error)throw result.error;
    galleryRemote=(result.data||[]).map(normalizeMedia);renderGallery(true);
  }catch(error){console.info('Media remoti non disponibili',error&&error.message?error.message:error)}
}

function initContactPage(){
  if(!document.body.classList.contains('fpr-contact-page'))return;
  document.querySelectorAll('[data-fpr-faq]').forEach(button=>button.onclick=()=>{const item=button.closest('.fpr-faq-item');const open=!item.classList.contains('is-open');document.querySelectorAll('.fpr-faq-item').forEach(node=>node.classList.remove('is-open'));if(open)item.classList.add('is-open')});
}
function refresh(){installContactLinks();renderHomeNews(false);renderNewsArchive();renderGallery(false);initContactPage()}
function boot(){
  refresh();
  [120,500,1100,2200,3800].forEach(delay=>setTimeout(refresh,delay));
  remoteMedia();
  document.addEventListener('click',event=>{if(event.target.closest('.language-switch button'))setTimeout(()=>{renderHomeNews(true);renderNewsArchive();renderGallery(true)},100)});
  window.addEventListener('filitalia:public-content-updated',()=>setTimeout(()=>{renderHomeNews(true);renderNewsArchive();renderGallery(true)},80));
  window.addEventListener('filitalia:content-updated',()=>setTimeout(()=>{renderHomeNews(true);renderNewsArchive();renderGallery(true)},80));
  window.addEventListener('filitalia:media-updated',()=>setTimeout(()=>renderGallery(true),80));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
