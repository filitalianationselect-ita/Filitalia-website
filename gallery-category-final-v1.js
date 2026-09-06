(function(){
'use strict';
let timer=0;
function language(){try{return String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase()}catch(_){return'it'}}
function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]})}
function monthLabel(value){
  const lang=language();
  const raw=String(value||'').trim();
  if(/coming\s*soon/i.test(raw))return lang==='it'?'IN ARRIVO':'COMING SOON';
  const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(match){const date=new Date(+match[1],+match[2]-1,+match[3]);return date.toLocaleDateString(lang==='it'?'it-IT':'en-GB',{month:'long',year:'numeric'}).toUpperCase()}
  if(lang!=='it')return raw.toUpperCase();
  return raw.toUpperCase().replace('JULY','LUGLIO').replace('AUGUST','AGOSTO').replace('SEPTEMBER','SETTEMBRE').replace('OCTOBER','OTTOBRE').replace('NOVEMBER','NOVEMBRE').replace('DECEMBER','DICEMBRE').replace('MAY','MAGGIO').replace('JUNE','GIUGNO').replace('MARCH','MARZO').replace('APRIL','APRILE').replace('JANUARY','GENNAIO').replace('FEBRUARY','FEBBRAIO');
}
function dateLabel(album){
  const lang=language();
  const raw=String(album&&album.date||'').trim();
  const sortDate=String(album&&album.sortDate||'').trim();
  if(/coming\s*soon/i.test(raw)||/^9999-/.test(sortDate))return lang==='it'?'Prossimamente':'Coming Soon';
  const iso=sortDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso){
    const date=new Date(+iso[1],+iso[2]-1,+iso[3]);
    return date.toLocaleDateString(lang==='it'?'it-IT':'en-GB',{day:'numeric',month:'long',year:'numeric'});
  }
  if(lang!=='it')return raw;
  const months={january:'gennaio',february:'febbraio',march:'marzo',april:'aprile',may:'maggio',june:'giugno',july:'luglio',august:'agosto',september:'settembre',october:'ottobre',november:'novembre',december:'dicembre'};
  const match=raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})$/);
  if(!match)return raw;
  const month=months[match[2].toLowerCase()];
  return month?Number(match[1])+' '+month+' '+match[3]:raw;
}
function groupKey(album){const month=String(album.month||'').trim();const sortDate=String(album.sortDate||'');if(/coming\s*soon/i.test(month)||/^9999-/.test(sortDate))return language()==='it'?'IN ARRIVO':'COMING SOON';return monthLabel(month||sortDate||album.date||'Album')}
function important(element,property,value){if(element)element.style.setProperty(property,value,'important')}
function share(album,event){event.preventDefault();event.stopPropagation();if(typeof window.shareFilitalia==='function')window.shareFilitalia('album',album,album.page||location.href)}
function enforceLayout(container){
  important(container,'display','grid');
  important(container,'grid-template-columns','minmax(0, 1fr)');
  important(container,'grid-auto-flow','row');
  important(container,'width','100%');
  important(container,'gap','48px');
  container.querySelectorAll('.fil-month-group').forEach(function(group){important(group,'grid-column','1 / -1');important(group,'width','100%');important(group,'min-width','0')});
}
function render(){
  const container=document.getElementById('galleryAlbumsGrid');
  if(!container||typeof galleryData==='undefined'||!Array.isArray(galleryData))return;
  const category=document.body.dataset.galleryCategory;
  const albums=galleryData.filter(function(album){return album.category===category}).slice().sort(function(a,b){return String(a.sortDate||'9999-12-31').localeCompare(String(b.sortDate||'9999-12-31'))});
  container.className='fil-month-archive';
  if(!albums.length){container.innerHTML='<div class="fil-gallery-empty"><h3>Coming Soon</h3><p>Nessun album disponibile al momento.</p></div>';enforceLayout(container);return}
  const groups=[];const map=new Map();
  albums.forEach(function(album){const key=groupKey(album);if(!map.has(key)){const group={key:key,items:[]};map.set(key,group);groups.push(group)}map.get(key).items.push(album)});
  container.innerHTML=groups.map(function(group,index){return '<section class="fil-month-group"><header class="fil-month-head"><div><span class="fil-month-index">'+String(index+1).padStart(2,'0')+'</span><h2>'+esc(group.key)+'</h2></div><span>'+group.items.length+' ALBUM</span></header><div class="fil-month-grid">'+group.items.map(function(album){return '<a class="fil-gallery-album-card" href="'+esc(album.page||'#')+'"><span class="fil-gallery-album-media"><img src="'+esc(album.cover||'images/logo.png')+'" alt="'+esc(album.title||'Album FIL-ITALIA')+'" loading="lazy" onerror="this.onerror=null;this.src=\'images/logo.png\'"><span class="fil-gallery-album-date">'+esc(dateLabel(album))+'</span></span><span class="fil-gallery-album-copy"><small>'+esc(category==='idcamp'?'TALENT ID CAMP':'FIL-ITALIA MEDIA')+'</small><h3>'+esc(album.title||'Album FIL-ITALIA')+'</h3><p>'+esc(language()==='it'?'Foto e momenti ufficiali del progetto FIL-ITALIA.':'Official FIL-ITALIA photos and moments.')+'</p><span class="fil-gallery-album-actions"><span class="fil-gallery-album-open">'+esc(language()==='it'?'VEDI ALBUM →':'VIEW ALBUM →')+'</span><button class="fil-gallery-album-share" type="button" data-share="'+esc(album.id||'')+'">CONDIVIDI</button></span></span></a>'}).join('')+'</div></section>'}).join('');
  enforceLayout(container);
  const byId=new Map(albums.map(function(album){return[String(album.id||''),album]}));
  container.querySelectorAll('[data-share]').forEach(function(button){button.addEventListener('click',function(event){share(byId.get(button.dataset.share)||{},event)})});
}
function schedule(){clearTimeout(timer);timer=setTimeout(render,20)}
function boot(){render();[60,180,500,1100,2200,4000].forEach(function(delay){setTimeout(render,delay)});document.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))setTimeout(render,100)});window.addEventListener('filitalia:media-updated',schedule);window.addEventListener('resize',function(){const container=document.getElementById('galleryAlbumsGrid');if(container)enforceLayout(container)},{passive:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
