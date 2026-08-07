(function(){
  'use strict';

  function rebuildAboutSlider(){
    const about=document.getElementById('about');
    if(!about||about.dataset.filAboutSliderV2==='true')return;

    const track=about.querySelector('.about-grid');
    const cards=track?[...track.querySelectorAll('.about-card')]:[];
    const media=about.querySelector('.fil-about-story-media');
    const social=about.querySelector('.fil-about-social-cta');
    if(!track||cards.length!==3)return;

    about.dataset.filAboutSliderV2='true';

    if(media){
      media.style.setProperty('display','block','important');
      media.style.setProperty('visibility','visible','important');
      media.style.setProperty('opacity','1','important');
    }
    if(social){
      social.style.setProperty('display','grid','important');
      social.style.setProperty('visibility','visible','important');
      social.style.setProperty('opacity','1','important');
    }

    const oldSlider=track.closest('.fil-about-slider');
    const insertionParent=(oldSlider&&oldSlider.parentNode)||track.parentNode;
    const insertionBefore=oldSlider||track;

    const slider=document.createElement('div');
    slider.className='fil-about-slider fil-about-slider-v2';
    slider.setAttribute('role','region');
    slider.setAttribute('aria-label','Contenuti Chi siamo');
    slider.tabIndex=0;

    const viewport=document.createElement('div');
    viewport.className='fil-about-slider-viewport';

    insertionParent.insertBefore(slider,insertionBefore);
    slider.appendChild(viewport);
    viewport.appendChild(track);
    if(oldSlider)oldSlider.remove();

    track.classList.add('fil-about-slider-track');
    track.dataset.filAboutSliderReady='v2';

    const footer=document.createElement('div');
    footer.className='fil-about-slider-footer';

    const tabs=document.createElement('div');
    tabs.className='fil-about-slider-tabs';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Sezioni Chi siamo');

    const buttonGroup=document.createElement('div');
    buttonGroup.className='fil-about-slider-buttons';

    const previous=document.createElement('button');
    previous.type='button';
    previous.className='fil-about-slider-arrow fil-about-slider-prev';
    previous.setAttribute('aria-label','Slide precedente');
    previous.innerHTML='&#8249;';

    const next=document.createElement('button');
    next.type='button';
    next.className='fil-about-slider-arrow fil-about-slider-next';
    next.setAttribute('aria-label','Slide successiva');
    next.innerHTML='&#8250;';

    let current=0;
    let touchStartX=0;
    let touchDeltaX=0;

    const tabNodes=cards.map(function(card,index){
      const button=document.createElement('button');
      button.type='button';
      button.className='fil-about-slider-tab';
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','fil-about-slide-'+(index+1));
      button.innerHTML='<span class="fil-about-slider-tab-number">'+String(index+1).padStart(2,'0')+'</span><span class="fil-about-slider-tab-label"></span>';
      card.id='fil-about-slide-'+(index+1);
      card.setAttribute('role','tabpanel');
      button.addEventListener('click',function(){goTo(index);});
      tabs.appendChild(button);
      return button;
    });

    buttonGroup.appendChild(previous);
    buttonGroup.appendChild(next);
    footer.appendChild(tabs);
    footer.appendChild(buttonGroup);
    slider.appendChild(footer);

    function syncTabLabels(){
      cards.forEach(function(card,index){
        const heading=card.querySelector('h3');
        const label=tabNodes[index].querySelector('.fil-about-slider-tab-label');
        if(label)label.textContent=heading?heading.textContent.trim():'';
      });
    }

    function render(animate){
      track.style.transition=animate===false?'none':'transform .42s cubic-bezier(.22,.75,.23,1)';
      track.style.transform='translate3d(-'+(current*100)+'%,0,0)';
      cards.forEach(function(card,index){
        const active=index===current;
        card.classList.toggle('is-active',active);
        card.setAttribute('aria-hidden',active?'false':'true');
        tabNodes[index].classList.toggle('is-active',active);
        tabNodes[index].setAttribute('aria-selected',active?'true':'false');
        tabNodes[index].tabIndex=active?0:-1;
      });
    }

    function goTo(index){
      current=(index+cards.length)%cards.length;
      render(true);
    }

    previous.addEventListener('click',function(){goTo(current-1);});
    next.addEventListener('click',function(){goTo(current+1);});

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

    const observer=new MutationObserver(function(){syncTabLabels();});
    cards.forEach(function(card){
      const heading=card.querySelector('h3');
      if(heading)observer.observe(heading,{childList:true,subtree:true,characterData:true});
    });

    syncTabLabels();
    render(false);
  }

  function boot(){
    rebuildAboutSlider();
    [200,650,1300,2200].forEach(function(delay){window.setTimeout(rebuildAboutSlider,delay);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
