(function(){
  function fixMessinaPreview(){
    document.querySelectorAll('.event-card').forEach(function(card){
      const text=(card.textContent||'').toLowerCase();
      if(!text.includes('messina')) return;
      const img=card.querySelector('.event-card-image, img');
      if(!img) return;
      const correct='images/camp-messina-2026.jpg?v=906';
      if(!img.src.includes('camp-messina-2026.jpg') || !img.src.includes('v=906')){
        img.onerror=null;
        img.src=correct;
      }
    });
  }
  document.addEventListener('DOMContentLoaded',function(){
    fixMessinaPreview();
    setTimeout(fixMessinaPreview,150);
    setTimeout(fixMessinaPreview,700);
  });
})();
