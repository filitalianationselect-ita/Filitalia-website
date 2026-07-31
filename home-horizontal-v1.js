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

  function ensureVerticalStyle(){
    if(document.getElementById('filVerticalHomeStyle'))return;
    const style=document.createElement('style');
    style.id='filVerticalHomeStyle';
    style.textContent=[
      'html body.fil-final-site.fil-vertical-home[data-home-theme="tricolore"][data-horizontal-ready="true"],html body.fil-vertical-home[data-home-theme="tricolore"][data-horizontal-ready="true"]{height:auto!important;min-height:100vh!important;overflow-x:hidden!important;overflow-y:auto!important}',
      'html body.fil-final-site.fil-vertical-home[data-horizontal-ready="true"] main.home-horizontal-stage.home-horizontal-stage,html body.fil-vertical-home[data-horizontal-ready="true"] main.home-horizontal-stage.home-horizontal-stage{position:static!important;display:block!important;width:100%!important;max-width:100%!important;height:auto!important;min-height:0!important;padding-top:var(--fil-global-nav,var(--fil-nav-height,92px))!important;overflow:visible!important;scroll-behavior:auto!important;scroll-snap-type:none!important}',
      'html body.fil-final-site.fil-vertical-home[data-horizontal-ready="true"] section.home-horizontal-panel.home-horizontal-panel,html body.fil-vertical-home[data-horizontal-ready="true"] section.home-horizontal-panel.home-horizontal-panel{display:block!important;flex:none!important;width:100%!important;max-width:100%!important;min-width:0!important;height:auto!important;min-height:calc(100vh - var(--fil-global-nav,var(--fil-nav-height,92px)))!important;overflow:visible!important;scroll-snap-align:none!important;scroll-snap-stop:normal!important}',
      'html body.fil-final-site.fil-vertical-home[data-horizontal-ready="true"] .home-horizontal-controls,html body.fil-final-site.fil-vertical-home[data-horizontal-ready="true"] .home-nav-page-controls,html body.fil-vertical-home[data-horizontal-ready="true"] .home-horizontal-controls,html body.fil-vertical-home[data-horizontal-ready="true"] .home-nav-page-controls{display:none!important;visibility:hidden!important;pointer-events:none!important}'
    ].join('');
    document.head.appendChild(style);
  }

  function init(){
    if(document.querySelector('.home-horizontal-stage'))return;
    const first=document.getElementById('top');
    if(!first)return;

    ensureVerticalStyle();
    setNavHeight();
    document.body.dataset.horizontalReady='true';
    document.body.classList.add('fil-vertical-home');

    const stage=document.createElement('main');
    stage.className='home-horizontal-stage';
    stage.setAttribute('aria-label','Contenuti FIL-ITALIA');
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

    let currentIndex=0;
    let scrollFrame=0;

    function panelIndexById(id){return panels.findIndex(function(panel){return panel.id===id;});}

    function updateUi(index){
      currentIndex=Math.max(0,Math.min(index,panels.length-1));
      const panel=panels[currentIndex];
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
      panel.scrollIntoView({block:'start',behavior:behavior||'smooth'});
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

    window.addEventListener('scroll',function(){
      if(scrollFrame)return;
      scrollFrame=requestAnimationFrame(function(){
        scrollFrame=0;
        const index=panels.reduce(function(best,panel,index){
          const distance=Math.abs(panel.getBoundingClientRect().top-(document.querySelector('.navbar')?.getBoundingClientRect().height||0));
          return distance<best.distance?{index:index,distance:distance}:best;
        },{index:currentIndex,distance:Infinity}).index;
        if(index!==currentIndex)updateUi(index);
      });
    },{passive:true});

    window.addEventListener('keydown',function(event){
      if(event.target&&/input|textarea|select/i.test(event.target.tagName))return;
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
      ensureVerticalStyle();
      setNavHeight();
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
