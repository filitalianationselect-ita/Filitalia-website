(function(){
'use strict';
const d=document,$=id=>d.getElementById(id);
function addStyle(){if($('communicationsEntryStyle'))return;const s=d.createElement('style');s.id='communicationsEntryStyle';s.textContent=`
#communicationsMailEntry{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:18px 0;padding:24px 26px;border-radius:22px;background:linear-gradient(135deg,#083b29,#1a805a);color:#fff;box-shadow:0 18px 42px rgba(7,48,34,.22)}
#communicationsMailEntry h2{margin:3px 0 7px!important;color:#fff!important;font-size:27px!important}#communicationsMailEntry p{margin:0;color:#cce7da;font-size:15px;line-height:1.55}#communicationsMailEntry .btn{min-width:260px;padding:15px 20px!important;font-size:16px!important;font-weight:900!important;background:#fff!important;color:#0b543a!important;border-color:#fff!important}
#communicationsStartTop{font-size:14px!important;padding:12px 16px!important}.communications-entry-hide{display:none!important}
@media(max-width:760px){#communicationsMailEntry{align-items:flex-start;flex-direction:column;padding:21px}#communicationsMailEntry .btn{width:100%;min-width:0}}
`;d.head.appendChild(s)}
function openLauncher(){
 if(window.FilitaliaCommunicationLauncher&&typeof window.FilitaliaCommunicationLauncher.open==='function'){
  window.FilitaliaCommunicationLauncher.open();return;
 }
 const layout=d.querySelector('#communications .comms2-layout');
 if(layout){layout.classList.remove('comms-launch-collapsed');layout.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('c2Event')?.focus(),250);}
 else setTimeout(openLauncher,250);
}
function mount(){
 const section=$('communications');if(!section)return false;addStyle();
 const topbar=section.querySelector('.topbar');if(!topbar)return false;
 let actions=topbar.querySelector('.actions');if(!actions){actions=d.createElement('div');actions.className='actions';topbar.appendChild(actions)}
 let top=$('communicationsStartTop');if(!top){top=d.createElement('button');top.id='communicationsStartTop';top.className='btn primary';top.textContent='✉ Avvia comunicazione via mail';actions.appendChild(top)}top.onclick=openLauncher;
 const old=$('c2Focus');if(old&&old!==top){old.textContent='✉ Avvia comunicazione via mail';old.onclick=openLauncher}
 let entry=$('communicationsMailEntry');if(!entry){entry=d.createElement('section');entry.id='communicationsMailEntry';entry.innerHTML=`<div><span class="eyebrow" style="color:#a9d8c1">INVIO EMAIL</span><h2>Avvia comunicazione via mail</h2><p>Prima scegli chi contattare: tutto il Camp Roma, un altro evento, una categoria oppure un giocatore singolo.</p></div><button id="communicationsStartMain" class="btn primary">✉ Avvia comunicazione via mail</button>`;topbar.insertAdjacentElement('afterend',entry)}
 $('communicationsStartMain').onclick=openLauncher;
 const previous=$('communicationsLaunchHero');if(previous)previous.classList.add('communications-entry-hide');
 return true;
}
let attempts=0;const timer=setInterval(()=>{attempts++;if(mount()&&attempts>12)clearInterval(timer);if(attempts>100)clearInterval(timer)},200);
const observer=new MutationObserver(()=>mount());observer.observe(d.documentElement,{childList:true,subtree:true});
d.addEventListener('click',e=>{if(e.target.closest?.('[data-section="communications"],[data-page="communications"]'))setTimeout(mount,120)});
window.FilitaliaCommunicationsEntry=Object.freeze({mount,open:openLauncher});
})();