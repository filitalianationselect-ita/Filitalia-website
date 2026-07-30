(function(){
  'use strict';

  const icons=[
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="18" cy="15" r="6"></circle><circle cx="31" cy="17" r="5"></circle><path d="M7 36c1-8 5-12 11-12s10 4 11 12"></path><path d="M25 27c2-3 4-5 7-5 5 0 8 4 9 11"></path><circle cx="24" cy="35" r="8"></circle><path d="M16 35h16M24 27c-3 3-4 6-4 8s1 5 4 8M24 27c3 3 4 6 4 8s-1 5-4 8"></path></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 40h34"></path><path d="M10 40V29h7v11M21 40V22h7v18M32 40V14h7v26"></path><path d="m9 22 9-7 7 3 13-11"></path><path d="m32 7 6 0 0 6"></path></svg>',
    '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="18"></circle><path d="M6 24h36M24 6c6 6 9 12 9 18s-3 12-9 18M24 6c-6 6-9 12-9 18s3 12 9 18M10 14c4 3 9 5 14 5s10-2 14-5M10 34c4-3 9-5 14-5s10 2 14 5"></path></svg>'
  ];

  const socialCopy={
    it:{small:'FIL-ITALIA SOCIAL',title:'SEGUICI SUI SOCIAL',text:'Camp, giocatori, tornei, risultati e dietro le quinte del progetto.'},
    en:{small:'FIL-ITALIA SOCIAL',title:'FOLLOW US ON SOCIAL MEDIA',text:'Camps, players, tournaments, results and behind-the-scenes moments from the project.'},
    ph:{small:'FIL-ITALIA SOCIAL',title:'SUNDAN KAMI SA SOCIAL MEDIA',text:'Camps, players, tournaments, results at mga behind-the-scenes moment ng project.'}
  };

  function language(){
    const raw=String(localStorage.getItem('language')||document.documentElement.lang||'it').toLowerCase();
    return socialCopy[raw]?raw:'it';
  }

  function initAboutShowcase(){
    const about=document.getElementById('about');
    if(!about||about.dataset.filAboutShowcaseReady==='true')return;

    const layout=about.querySelector('.fil-about-layout');
    const copy=layout&&layout.querySelector('.fil-about-layout-copy');
    const track=copy&&copy.querySelector('.about-grid');
    const media=layout&&layout.querySelector('.fil-about-story-media');
    const cards=track?[...track.querySelectorAll('.about-card')]:[];
    if(!layout||!copy||!track||!media||cards.length!==3)return;

    about.dataset.filAboutShowcaseReady='true';
    track.classList.add('fil-about-slider-track');

    const slider=document.createElement('div');
    slider.className='fil-about-slider';
    slider.setAttribute('role','region');
    slider.setAttribute('aria-label','Contenuti Chi siamo');
    slider.tabIndex=0;

    const viewport=document.createElement('div');
    viewport.className='fil-about-slider-viewport';
    track.parentNode.insertBefore(slider,track);
    slider.appendChild(viewport);
    viewport.appendChild(track);

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

    const stage=document.createElement('div');
    stage.className='fil-about-showcase-stage';
    layout.insertBefore(stage,layout.firstChild);
    stage.appendChild(previous);
    stage.appendChild(copy);
    stage.appendChild(next);
    stage.appendChild(media);

    const tabs=document.createElement('div');
    tabs.className='fil-about-slider-tabs';
    tabs.setAttribute('role','tablist');
    tabs.setAttribute('aria-label','Sezioni Chi siamo');
    layout.appendChild(tabs);

    let current=0;
    let touchStartX=0;
    let touchDeltaX=0;

    const tabNodes=cards.map(function(card,index){
      const button=document.createElement('button');
      button.type='button';
      button.className='fil-about-slider-tab';
      button.setAttribute('role','tab');
      button.setAttribute('aria-controls','fil-about-panel-'+(index+1));
      button.innerHTML=
        '<span class="fil-about-slider-tab-copy">'+
          '<span class="fil-about-slider-tab-number">'+String(index+1).padStart(2,'0')+'</span>'+
          '<span class="fil-about-slider-tab-label"></span>'+
        '</span>'+
        '<span class="fil-about-slider-tab-icon">'+icons[index]+'</span>';
      card.id='fil-about-panel-'+(index+1);
      card.setAttribute('role','tabpanel');
      button.addEventListener('click',function(){goTo(index);});
      tabs.appendChild(button);
      return button;
    });

    function syncLabels(){
      cards.forEach(function(card,index){
        const heading=card.querySelector('h3');
        const label=tabNodes[index].querySelector('.fil-about-slider-tab-label');
        if(label)label.textContent=heading?heading.textContent.trim():'';
      });
      const social=about.querySelector('.fil-about-social-cta');
      const text=socialCopy[language()];
      if(social&&text){
        const small=social.querySelector('.fil-about-social-copy small');
        const title=social.querySelector('.fil-about-social-copy strong');
        const paragraph=social.querySelector('.fil-about-social-copy p');
        if(small)small.textContent=text.small;
        if(title)title.textContent=text.title;
        if(paragraph)paragraph.textContent=text.text;
      }
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

    const observer=new MutationObserver(function(){syncLabels();});
    cards.forEach(function(card){
      const heading=card.querySelector('h3');
      if(heading)observer.observe(heading,{childList:true,subtree:true,characterData:true});
    });

    document.querySelectorAll('.language-switch button').forEach(function(button){
      button.addEventListener('click',function(){window.setTimeout(syncLabels,120);window.setTimeout(syncLabels,500);});
    });

    syncLabels();
    render(false);
  }

  function boot(){
    initAboutShowcase();
    [180,500,1100,2200].forEach(function(delay){window.setTimeout(initAboutShowcase,delay);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
