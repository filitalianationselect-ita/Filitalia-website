(function(){
  'use strict';

  const PANEL_ORDER=[
    ['top','Home'],
    ['about','Chi siamo'],
    ['players','Players'],
    ['gallery','Media'],
    ['staff','Staff'],
    ['news','News'],
    ['events','Eventi']
  ];

  function setNavHeight(){
    const navbar=document.querySelector('.navbar');
    if(!navbar)return;
    document.documentElement.style.setProperty('--fil-nav-height',Math.ceil(navbar.getBoundingClientRect().height)+'px');
  }

  function closeMenu(){
    const nav=document.getElementById('navLinks');
    if(!nav)return;
    nav.classList.remove('active','open','show');
  }

  function init(){
    if(document.querySelector('.home-horizontal-stage'))return;
    const first=document.getElementById('top');
    if(!first)return;

    setNavHeight();
    document.body.dataset.horizontalReady='true';

    const stage=document.createElement('main');
    stage.className='home-horizontal-stage';
    stage.setAttribute('aria-label','Navigazione orizzontale FIL-ITALIA');
    first.parentNode.insertBefore(stage,first);

    const panels=[];
    PANEL_ORDER.forEach(function(entry,index){
      const id=entry[0];
      const label=entry[1];
      const section=document.getElementById(id);
      if(!section)return;
      section.classList.add('home-horizontal-panel');
      section.dataset.panelIndex=String(index);
      section.dataset.panelLabel=label;
      stage.appendChild(section);
      panels.push(section);
    });
    document.body.dataset.horizontalPanelCount=String(panels.length);

    const rail=document.querySelector('.home-event-rail');
    const visual=document.querySelector('.home-hero-visual');
    const shell=document.querySelector('.home-hero-shell');
    if(rail&&visual&&shell&&visual.contains(rail))shell.appendChild(rail);

    const galleryLink=document.querySelector('.nav-links a[href="gallery.html"]');
    if(galleryLink)galleryLink.setAttribute('href','#gallery');

    const controls=document.createElement('div');
    controls.className='home-horizontal-controls';
    controls.innerHTML='<button class="home-horizontal-control-button" type="button" data-horizontal-prev aria-label="Pagina precedente">‹</button><div class="home-horizontal-counter" aria-live="polite"></div><button class="home-horizontal-control-button" type="button" data-horizontal-next aria-label="Pagina successiva">›</button>';
    const controlsSlot=document.querySelector('[data-horizontal-controls-slot]');
    if(controlsSlot)controlsSlot.appendChild(controls);else document.body.appendChild(controls);

    const prevButton=controls.querySelector('[data-horizontal-prev]');
    const nextButton=controls.querySelector('[data-horizontal-next]');
    const counter=controls.querySelector('.home-horizontal-counter');
    let currentIndex=0;
    let wheelLocked=false;
    let scrollFrame=0;

    function panelIndexById(id){return panels.findIndex(function(panel){return panel.id===id;});}

    function updateUi(index){
      currentIndex=Math.max(0,Math.min(index,panels.length-1));
      const panel=panels[currentIndex];
      if(counter)counter.textContent=String(currentIndex+1).padStart(2,'0')+' / '+String(panels.length).padStart(2,'0')+' · '+(panel?.dataset.panelLabel||'');
      prevButton.disabled=currentIndex===0;
      nextButton.disabled=currentIndex===panels.length-1;
      document.querySelectorAll('.nav-links a[href^="#"]').forEach(function(link){
        link.classList.toggle('is-horizontal-active',link.getAttribute('href')==='#'+panel.id);
      });
      const newHash='#'+panel.id;
      if(location.hash!==newHash)history.replaceState(null,'',newHash);
    }

    function goTo(index,behavior){
      const next=Math.max(0,Math.min(index,panels.length-1));
      const panel=panels[next];
      if(!panel)return;
      stage.scrollTo({left:panel.offsetLeft,behavior:behavior||'smooth'});
      updateUi(next);
      closeMenu();
    }

    function goToId(id,behavior){
      const index=panelIndexById(id);
      if(index>=0)goTo(index,behavior);
    }

    document.addEventListener('click',function(event){
      const link=event.target.closest('a[href^="#"]');
      if(!link)return;
      const id=String(link.getAttribute('href')||'').slice(1);
      if(panelIndexById(id)<0)return;
      event.preventDefault();
      goToId(id,'smooth');
    });

    prevButton.addEventListener('click',function(){goTo(currentIndex-1,'smooth');});
    nextButton.addEventListener('click',function(){goTo(currentIndex+1,'smooth');});

    stage.addEventListener('scroll',function(){
      if(scrollFrame)return;
      scrollFrame=requestAnimationFrame(function(){
        scrollFrame=0;
        const index=Math.round(stage.scrollLeft/Math.max(1,stage.clientWidth));
        if(index!==currentIndex)updateUi(index);
      });
    },{passive:true});

    stage.addEventListener('wheel',function(event){
      if(Math.abs(event.deltaX)>Math.abs(event.deltaY)){
        event.preventDefault();
        return;
      }
      const panel=panels[currentIndex];
      if(!panel)return;
      const canScroll=panel.scrollHeight>panel.clientHeight+3;
      const atTop=panel.scrollTop<=1;
      const atBottom=panel.scrollTop+panel.clientHeight>=panel.scrollHeight-1;
      if(canScroll&&((event.deltaY<0&&!atTop)||(event.deltaY>0&&!atBottom)))return;
      event.preventDefault();
    },{passive:false});

    window.addEventListener('keydown',function(event){
      if(event.target&&/input|textarea|select/i.test(event.target.tagName))return;
      if(event.key==='ArrowRight'||event.key==='PageDown'){
        event.preventDefault();
        goTo(currentIndex+1,'smooth');
      }
      if(event.key==='ArrowLeft'||event.key==='PageUp'){
        event.preventDefault();
        goTo(currentIndex-1,'smooth');
      }
      if(event.key==='Home'){
        event.preventDefault();
        goTo(0,'smooth');
      }
      if(event.key==='End'){
        event.preventDefault();
        goTo(panels.length-1,'smooth');
      }
    });

    window.addEventListener('resize',function(){
      setNavHeight();
      stage.scrollTo({left:panels[currentIndex].offsetLeft,behavior:'auto'});
    });

    window.addEventListener('hashchange',function(){
      const id=location.hash.slice(1);
      if(panelIndexById(id)>=0)goToId(id,'smooth');
    });

    const initial=location.hash.slice(1);
    window.setTimeout(function(){
      goToId(panelIndexById(initial)>=0?initial:'top','auto');
    },80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})();
