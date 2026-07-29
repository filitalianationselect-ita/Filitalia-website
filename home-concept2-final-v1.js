(function(){
'use strict';

function loadFinalFixes(){
  if(document.querySelector('link[data-filitalia-concept2-fixes]'))return;
  const style=document.createElement('link');
  style.rel='stylesheet';
  style.href='home-concept2-fixes-v1.css?v=1';
  style.dataset.filitaliaConcept2Fixes='true';
  document.head.appendChild(style);
}

function addAboutLink(){
  const nav=document.getElementById('navLinks');
  if(!nav||nav.querySelector('a[href="#about"]'))return;
  const home=nav.querySelector('a[href="#top"]');
  const link=document.createElement('a');
  link.href='#about';
  link.textContent='Chi siamo';
  link.dataset.key='navAbout';
  if(home&&home.nextSibling)nav.insertBefore(link,home.nextSibling);else nav.prepend(link);
}

function removePublicAccountLink(){
  const nav=document.getElementById('navLinks');
  if(!nav)return;
  nav.querySelectorAll('a[href*="account"],[data-filitalia-account-link]').forEach(function(link){link.remove()});
}

function addProgramCta(){
  const hero=document.getElementById('top');
  const values=hero&&hero.querySelector('.home-value-strip');
  if(!hero||!values||hero.querySelector('.home-program-cta'))return;
  const section=document.createElement('section');
  section.className='home-program-cta';
  section.setAttribute('aria-labelledby','homeProgramTitle');
  section.innerHTML='\
    <div class="home-program-cta-copy">\
      <small>FIL-ITALIA NATION SELECT</small>\
      <h2 id="homeProgramTitle">ENTRA NEL PROGRAMMA FIL-ITALIA</h2>\
      <p>Crea il tuo profilo, partecipa ai camp e costruisci il tuo percorso nel network FIL-ITALIA. I dati restano nel tuo account e non dovrai inserirli di nuovo a ogni iscrizione.</p>\
      <div class="home-program-roles"><span>Giocatori</span><span>Genitori</span><span>Coach</span><span>Staff e collaboratori</span></div>\
    </div>\
    <div class="home-program-actions">\
      <a class="primary" href="login.html?mode=signup">UNISCITI AL PROGRAMMA</a>\
      <a class="secondary" href="login.html">ACCEDI</a>\
    </div>';
  values.insertAdjacentElement('afterend',section);
}

function enrichAbout(){
  const about=document.getElementById('about');
  const grid=about&&about.querySelector('.about-grid');
  if(!about||!grid)return;
  if(!about.querySelector('.fil-about-story')){
    const story=document.createElement('div');
    story.className='fil-about-story';
    story.innerHTML='\
      <div class="fil-about-story-copy">\
        <small>LA NOSTRA IDENTITÀ</small>\
        <h3>Un percorso cestistico che unisce sviluppo e appartenenza.</h3>\
        <p>FIL-ITALIA accompagna atleti e famiglie attraverso camp, allenamenti, selezioni ed esperienze internazionali. Il progetto cresce insieme alle persone che ne fanno parte.</p>\
      </div>\
      <figure class="fil-about-story-media"><img src="images/media2.jpg" alt="Community FIL-ITALIA"></figure>';
    grid.insertAdjacentElement('beforebegin',story);
  }
  if(!about.querySelector('.fil-about-pathway')){
    const pathway=document.createElement('div');
    pathway.className='fil-about-pathway';
    pathway.innerHTML='<span><strong>01</strong>CAMP</span><span><strong>02</strong>SVILUPPO</span><span><strong>03</strong>SELEZIONE</span><span><strong>04</strong>OPPORTUNITÀ</span>';
    grid.insertAdjacentElement('afterend',pathway);
  }
}

function removePageArrows(){
  document.querySelectorAll('.home-nav-page-controls,.home-horizontal-controls').forEach(function(node){
    node.hidden=true;
    node.setAttribute('aria-hidden','true');
  });
}

function closeMenuAfterNavigation(){
  const nav=document.getElementById('navLinks');
  if(!nav||nav.dataset.concept2Bound)return;
  nav.dataset.concept2Bound='true';
  nav.addEventListener('click',function(event){
    if(event.target.closest('a'))nav.classList.remove('active');
  });
}

function apply(){
  loadFinalFixes();
  document.body.classList.add('fil-concept2');
  addAboutLink();
  removePublicAccountLink();
  addProgramCta();
  enrichAbout();
  removePageArrows();
  closeMenuAfterNavigation();
}

const observer=new MutationObserver(function(){apply()});
function boot(){
  apply();
  observer.observe(document.body,{childList:true,subtree:true});
  window.setTimeout(apply,250);
  window.setTimeout(apply,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
