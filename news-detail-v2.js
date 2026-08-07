(function(){
'use strict';

let requestedId='';
try{
  requestedId=new URLSearchParams(location.search).get('id')||'';
  if(!requestedId){
    const parts=location.pathname.split('/').filter(Boolean);
    const marker=parts.indexOf('news');
    if(marker>=0&&parts[marker+1])requestedId=decodeURIComponent(parts[marker+1]);
  }
}catch(_){ }

function language(){
  try{return localStorage.getItem('language')||document.documentElement.lang||'it'}catch(_){return'it'}
}
function localized(value){
  if(value&&typeof value==='object')return value[language()]||value.it||value.en||value.ph||Object.values(value)[0]||'';
  return String(value==null?'':value);
}
function escapeHtml(value){
  return String(value==null?'':value).replace(/[&<>"']/g,function(char){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]});
}
function slug(value){
  return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}
function source(){
  try{
    if(typeof newsData!=='undefined'&&Array.isArray(newsData))return newsData;
    if(Array.isArray(window.newsData))return window.newsData;
  }catch(_){ }
  return [];
}
function stableId(item,index){
  return String(item&&item.id||item&&item.slug||slug(localized(item&&item.title))||('news-'+index));
}
function findNews(id){
  const list=source();
  const wanted=String(id||'');
  const indexMatch=wanted.match(/^news-(\d+)$/);
  if(indexMatch&&list[Number(indexMatch[1])])return list[Number(indexMatch[1])];
  return list.find(function(item,index){
    const candidates=[
      stableId(item,index),
      String(item.id||''),
      String(item.slug||''),
      slug(localized(item.title)),
      slug(item.title&&item.title.it),
      slug(item.title&&item.title.en),
      slug(item.title&&item.title.ph)
    ].filter(Boolean);
    return candidates.includes(wanted);
  })||null;
}
function richDescription(value){
  const content=localized(value).trim();
  if(!content)return'';
  const containsHtml=/<\/?(?:p|h[1-6]|ul|ol|li|strong|b|em|i|br|blockquote)\b[^>]*>/i.test(content);
  if(containsHtml&&typeof window.sanitizeFilitaliaRichHtml==='function')return window.sanitizeFilitaliaRichHtml(content);
  if(containsHtml)return content;
  return content.split(/\n{2,}/).map(function(paragraph){return'<p>'+escapeHtml(paragraph).replace(/\n/g,'<br>')+'</p>'}).join('');
}
function labels(){
  const current=language();
  if(current==='en')return{back:'← Back to News',share:'Share article',missing:'Article not found',missingText:'This article is not available or has been removed.'};
  if(current==='ph')return{back:'← Bumalik sa News',share:'I-share ang article',missing:'Hindi makita ang article',missingText:'Hindi available ang article na ito o tinanggal na ito.'};
  return{back:'← Torna alle News',share:'Condividi articolo',missing:'Articolo non trovato',missingText:'Questo articolo non è disponibile oppure è stato rimosso.'};
}
function updateMeta(title,image,description){
  document.title=title+' | FIL-ITALIA';
  const titleMeta=document.querySelector('meta[property="og:title"]');
  const imageMeta=document.querySelector('meta[property="og:image"]');
  const descriptionMeta=document.querySelector('meta[property="og:description"]');
  const standardDescription=document.querySelector('meta[name="description"]');
  if(titleMeta)titleMeta.content=title;
  if(imageMeta)imageMeta.content=image;
  if(descriptionMeta)descriptionMeta.content=description;
  if(standardDescription)standardDescription.content=description;
}
function render(){
  const container=document.getElementById('newsDetailContainer');
  if(!container)return;
  const text=labels();
  const back=document.getElementById('backToNews');
  if(back)back.textContent=text.back;
  const item=findNews(requestedId);
  if(!item){
    container.innerHTML='<div class="news-detail-empty"><h1>'+escapeHtml(text.missing)+'</h1><p>'+escapeHtml(text.missingText)+'</p><a class="players-list-link" href="news.html">'+escapeHtml(text.back)+'</a></div>';
    return;
  }
  const list=source();
  const index=list.indexOf(item);
  const id=stableId(item,index);
  const title=localized(item.title)||'FIL-ITALIA News';
  const date=localized(item.date||'');
  const image=item.image||item.imageUrl||item.image_url||'images/logo.png';
  const excerpt=localized(item.excerpt)||localized(item.description).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,190);
  const body=richDescription(item.description||item.excerpt||'');
  updateMeta(title,image,excerpt);
  container.innerHTML='\
    <article class="news-detail-card" data-news-id="'+escapeHtml(id)+'">\
      <header class="news-detail-header">\
        <span class="event-detail-badge">FIL-ITALIA NEWS</span>\
        <h1>'+escapeHtml(title)+'</h1>\
        <p class="news-detail-date">'+escapeHtml(date)+'</p>\
      </header>\
      <div class="news-detail-image-wrap">\
        <img src="'+escapeHtml(image)+'" alt="'+escapeHtml(title)+'" style="object-position:'+escapeHtml(item.imagePosition||'center center')+'" onerror="this.onerror=null;this.src=\'images/logo.png\'">\
      </div>\
      <div class="news-detail-content">'+(body||'<p>'+escapeHtml(excerpt)+'</p>')+'</div>\
      <div class="news-detail-actions"><button type="button" class="news-share-button" id="newsShareButton">'+escapeHtml(text.share)+'</button></div>\
    </article>';
  const share=document.getElementById('newsShareButton');
  if(share)share.onclick=function(){
    const url=new URL('news-item.html?id='+encodeURIComponent(id),location.origin).href;
    if(navigator.share){navigator.share({title:title,text:excerpt,url:url}).catch(function(){})}
    else if(navigator.clipboard){navigator.clipboard.writeText(url).then(function(){share.textContent=language()==='en'?'Link copied':language()==='ph'?'Nakopya ang link':'Link copiato'}).catch(function(){})}
  };
}

window.changeNewsLanguage=function(nextLanguage){
  if(typeof setLanguage==='function')setLanguage(nextLanguage);
  else try{localStorage.setItem('language',nextLanguage)}catch(_){ }
  window.setTimeout(render,40);
};
window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(render,60)});
window.addEventListener('filitalia:content-order-updated',function(){window.setTimeout(render,60)});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render);else render();
window.setTimeout(render,700);
})();
