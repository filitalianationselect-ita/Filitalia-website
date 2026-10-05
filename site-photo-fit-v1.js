(function(){
'use strict';
const selector=[
  '.fil-media-card img',
  '.fpr-media-image img',
  '.home-gallery-full-image img',
  '#albumImagesGrid img',
  '[data-gallery-category] img',
  '.fil-staff-profile img',
  '#staff .staff-card img'
].join(',');

function classify(img){
  if(!img||img.dataset.filSmartPhoto==='done')return;
  if(!img.complete||!img.naturalWidth||!img.naturalHeight){
    img.addEventListener('load',function(){classify(img)},{once:true});
    return;
  }
  const ratio=img.naturalWidth/img.naturalHeight;
  const gallery=Boolean(img.closest('.fil-media-card,.fpr-media-image,.home-gallery-full-image,#albumImagesGrid,[data-gallery-category],.fil-next-event-media'));
  const staff=Boolean(img.closest('.fil-staff-profile,#staff .staff-card'));
  img.classList.add('fil-smart-photo');

  if(gallery&&(ratio>1.2||ratio<.84)){
    img.classList.add('fil-smart-contain');
    if(img.parentElement)img.parentElement.classList.add('fil-smart-photo-shell');
  }else if(staff&&(ratio>1.38||ratio<.62)){
    img.classList.add('fil-smart-contain');
    if(img.parentElement)img.parentElement.classList.add('fil-smart-photo-shell');
  }else if(staff||ratio<.95){
    img.classList.add('fil-smart-portrait');
  }
  img.dataset.filSmartPhoto='done';
}
function scan(root){
  (root||document).querySelectorAll(selector).forEach(classify);
}
function boot(){
  scan(document);
  const observer=new MutationObserver(function(records){
    records.forEach(function(record){
      record.addedNodes.forEach(function(node){
        if(node.nodeType!==1)return;
        if(node.matches&&node.matches(selector))classify(node);
        scan(node);
      });
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
  [300,900,1800,3500].forEach(function(delay){setTimeout(function(){scan(document)},delay)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
