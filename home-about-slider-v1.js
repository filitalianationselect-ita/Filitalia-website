(function(){
  'use strict';

  function initAboutSlider(){
    const about=document.getElementById('about');
    const track=about&&about.querySelector('.about-grid');
    if(!about||!track||track.dataset.filAboutSliderReady==='true')return;

    const cards=[...track.querySelectorAll('.about-card')];
    if(cards.length<2)return;

    track.dataset.filAboutSliderReady='true';
    track.classList.add('fil-about-slider-track');

    const slider=document.createElement('div');
    slider.className='fil-about-slider';
    slider.setAttribute('role','region');
    slider.setAttribute('aria-label','Contenuti Chi siamo');

    const viewport=document.createElement('div');
    viewport.className='fil-about-slider-viewport';

    track.parentNode.insertBefore(slider,track);
    slider.appendChild(viewport);
    viewport.appendChild(track);

    const controls=document.createElement('div');
    controls.className='fil-about-slider-controls';

    const status=document.createElement('div');
    status.className='fil-about-slider-status';

    const counter=document.createElement('span');
    counter.className='fil-about-slider-counter';
    counter.setAttribute('aria-live','polite');

    const dots=document.createElement('div');
    dots.className='fil-about-slider-dots';
    dots.setAttribute('aria-hidden','true');

    const dotNodes=cards.map(function(_,index){
      const dot=document.createElement('span');
      dot.className='fil-about-slider-dot';
      dot.dataset.index=String(index);
      dots.appendChild(dot);
      return dot;
    });

    const buttonGroup=document.createElement('div');
    buttonGroup.className='fil-about-slider-buttons';

    const previous=document.createElement('button');
    previous.type='button';
    previous.className='fil-about-slider-arrow fil-about-slider-prev';
    previous.setAttribute('aria-label','Contenuto precedente');
    previous.innerHTML='&#8249;';

    const next=document.createElement('button');
    next.type='button';
    next.className='fil-about-slider-arrow fil-about-slider-next';
    next.setAttribute('aria-label','Contenuto successivo');
    next.innerHTML='&#8250;';

    status.appendChild(counter);
    status.appendChild(dots);
    buttonGroup.appendChild(previous);
    buttonGroup.appendChild(next);
    controls.appendChild(status);
    controls.appendChild(buttonGroup);
    slider.appendChild(controls);

    let current=0;
    let touchStartX=0;
    let touchDeltaX=0;

    function render(animate){
      track.style.transition=animate===false?'none':'transform .42s cubic-bezier(.22,.75,.23,1)';
      track.style.transform='translate3d(-'+(current*100)+'%,0,0)';
      counter.textContent=String(current+1).padStart(2,'0')+' / '+String(cards.length).padStart(2,'0');
      cards.forEach(function(card,index){
        const active=index===current;
        card.classList.toggle('is-active',active);
        card.setAttribute('aria-hidden',active?'false':'true');
      });
      dotNodes.forEach(function(dot,index){
        dot.classList.toggle('is-active',index===current);
      });
    }

    function goTo(index){
      current=(index+cards.length)%cards.length;
      render(true);
    }

    previous.addEventListener('click',function(){goTo(current-1);});
    next.addEventListener('click',function(){goTo(current+1);});

    slider.tabIndex=0;
    slider.addEventListener('keydown',function(event){
      if(event.key==='ArrowLeft'){
        event.preventDefault();
        goTo(current-1);
      }
      if(event.key==='ArrowRight'){
        event.preventDefault();
        goTo(current+1);
      }
    });

    viewport.addEventListener('touchstart',function(event){
      touchStartX=event.touches[0].clientX;
      touchDeltaX=0;
    },{passive:true});

    viewport.addEventListener('touchmove',function(event){
      touchDeltaX=event.touches[0].clientX-touchStartX;
    },{passive:true});

    viewport.addEventListener('touchend',function(){
      if(Math.abs(touchDeltaX)>45)goTo(current+(touchDeltaX<0?1:-1));
      touchStartX=0;
      touchDeltaX=0;
    },{passive:true});

    render(false);
  }

  function boot(){
    initAboutSlider();
    [300,900,1800].forEach(function(delay){window.setTimeout(initAboutSlider,delay);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
