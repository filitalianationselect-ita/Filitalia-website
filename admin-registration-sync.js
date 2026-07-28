(function(){
'use strict';
const d=document,$=id=>d.getElementById(id),KEY='filitalia_admin_light_eventday_v2';
const events=[['idcamp-roma-2026','Roma','Roma · 5 agosto 2026'],['idcamp-firenze-2026','Firenze','Firenze · 6 settembre 2026'],['idcamp-venezia-2026','Venezia','Venezia · 13 settembre 2026'],['idcamp-milano-2026','Milano','Milano · data da confermare']];
const seed={
'idcamp-roma-2026':[
{id:'demo-1',name:'Marco Rossi',year:'2011',cat:'U16',shirt:'XL',email:'marco.rossi@email.it',phone:'',parent:'Andrea Rossi',payment:'paid',amount:50,certificate:true,checked:true,shirtDone:true,present:true,notes:'Buon ball handling.'},
{id:'demo-2',name:'Luca Bianchi',year:'2013',cat:'U14',shirt:'M',email:'famiglia.bianchi@email.it',phone:'',parent:'Paolo Bianchi',payment:'pending',amount:50,certificate:false,checked:false,shirtDone:false,present:false,notes:''},
{id:'demo-3',name:'David Panopio',year:'2010',cat:'U16',shirt:'L',email:'d.panopio@email.it',phone:'',parent:'Maria Panopio',payment:'paid',amount:50,certificate:true,checked:false,shirtDone:false,present:false,notes:'Gruppo avanzato.'},
{id:'demo-4',name:'Jayson Mendoza',year:'2014',cat:'U12',shirt:'Nessuna',email:'mendoza.family@email.it',phone:'',parent:'Carlo Mendoza',payment:'not_required',amount:0,certificate:false,checked:false,shirtDone:false,present:false,notes:'U12 gratuito senza maglia.'},
{id:'demo-5',name:'Nico De Luca',year:'2009',cat:'U18',shirt:'XL',email:'nico.deluca@email.it',phone:'',parent:'Elena De Luca',payment:'pending',amount:50,certificate:false,checked:false,shirtDone:false,present:false,notes:'Certificato da controllare.'}
],
'idcamp-firenze-2026':[],
'idcamp-venezia-2026':[],
'idcamp-milano-2026':[]
};
let rows=[],busy=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const eventId=()=>$('lightEventSelect')?.value||events[0][0];
const eventInfo=()=>events.find(e=>e[0]===eventId())||events[0];
function demo(){
 try{
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  if(stored&&Array.isArray(stored[eventId()]))return stored[eventId()];
  const fallback=JSON.parse(JSON.stringify(seed[eventId()]||[]));
  const next=stored&&typeof stored==='object'?stored:{};
  next[eventId()]=fallback;
  localStorage.setItem(KEY,JSON.stringify(next));
  return fallback;
 }catch(_){return JSON.parse(JSON.stringify(seed[eventId()]||[]));}
}
const complete=p=>['paid','not_required','waived'].includes(p.payment);
function payLabel(p){if(p.payment==='paid')return'Pagato';if(p.payment==='not_required'||p.payment==='waived')return p.cat==='U12'&&Number(p.amount||0)===20?'Maglia €20':'Gratuito';if(p.payment==='refunded')return'Rimborsato';if(p.payment==='pending')return'Da pagare';return'Da verificare'}
function payClass(v){return v==='Pagato'||v==='Gratuito'?'green':v==='Da pagare'||v==='Rimborsato'?'red':'orange'}
function docs(p){return p.certificate?'Completi':'Certificato mancante'}
function state(p){return complete(p)&&p.certificate?'Confermata':!complete(p)&&!p.certificate?'Incompleta':'In attesa'}
function initials(n){return String(n||'?').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}
function row(p){const ev=eventInfo(),pay=payLabel(p),doc=docs(p),st=state(p),search=[p.name,p.year,ev[1],p.email,p.parent].join(' ').toLowerCase();return `<tr data-id="${esc(p.id)}" data-search="${esc(search)}" data-event="${esc(ev[0])}" data-cat="${esc(p.cat)}" data-pay="${esc(pay)}" data-docs="${esc(doc)}"><td><input type="checkbox" class="reg-check table-select"></td><td><div class="person"><div class="avatar">${esc(initials(p.name))}</div><div><b>${esc(p.name)}</b><div class="muted">${esc(p.year||'—')} · ${esc(p.email||'Nessuna email')}</div></div></div></td><td>${esc(ev[1])}</td><td>${esc(p.cat||'—')}</td><td><span class="pill ${payClass(pay)}">${esc(pay)}</span></td><td><span class="pill ${doc==='Completi'?'green':'red'}">${esc(doc)}</span></td><td><span class="pill ${st==='Confermata'?'green':st==='Incompleta'?'red':'orange'}">${esc(st)}</span></td><td><button class="btn small secondary reg-sync-open" data-player="${esc(p.id)}">Apri</button></td></tr>`}
function stats(){const sec=$('registrations'),v=sec?.querySelectorAll('.grid4 .stat strong'),s=sec?.querySelectorAll('.grid4 .stat small');if(!v)return;v[0]&&(v[0].textContent=rows.length);v[1]&&(v[1].textContent=rows.filter(p=>state(p)!=='Confermata').length);v[2]&&(v[2].textContent=rows.filter(p=>!complete(p)).length);v[3]&&(v[3].textContent=rows.filter(p=>p.cat==='U12').length);s?.[0]&&(s[0].textContent=eventInfo()[2]);s?.[1]&&(s[1].textContent='Dati, documenti o pagamento');s?.[2]&&(s[2].textContent='Da verificare o incassare');s?.[3]&&(s[3].textContent=rows.filter(p=>p.cat==='U12'&&p.shirt&&p.shirt!=='Nessuna'&&p.shirt!=='—').length+' con maglia')}
function bindChecks(){const checks=[...d.querySelectorAll('#regTable .reg-check')],counter=$('regCount');const count=()=>{const n=checks.filter(x=>x.checked).length;counter&&(counter.textContent=n+' selezionat'+(n===1?'a':'e'))};checks.forEach(x=>x.onchange=count);if($('regAll'))$('regAll').onchange=e=>{checks.forEach(x=>{if(x.closest('tr').style.display!=='none')x.checked=e.target.checked});count()};d.querySelectorAll('.bulk').forEach(b=>b.onclick=()=>{const selected=checks.filter(x=>x.checked);if(!selected.length)return alert('Seleziona almeno una registrazione.');if(b.textContent.includes('Promemoria'))d.querySelector('[data-section="communications"],[data-page="communications"],[data-section="email"]')?.click();else if(b.textContent.includes('Esporta'))exportCsv(selected.map(x=>x.closest('tr').dataset.id));else alert('Operazione preparata su '+selected.length+' registrazioni.')})}
async function openPlayer(id){await window.FilitaliaAdminLight.openEventDay();setTimeout(()=>d.querySelector(`[data-ed-id="${String(id).replace(/"/g,'')}"]`)?.click(),250)}
function exportCsv(ids){const list=ids?rows.filter(p=>ids.includes(String(p.id))):rows;window.FilitaliaAdminData?.exportCsv(list,'filitalia-'+eventInfo()[1].toLowerCase()+'-registrazioni.csv')}
function render(){const body=$('regTable')?.querySelector('tbody');if(!body)return;body.innerHTML=rows.length?rows.map(row).join(''):`<tr><td colspan="8" class="muted" style="padding:25px;text-align:center">Nessuna registrazione per ${esc(eventInfo()[1])}.</td></tr>`;stats();d.querySelectorAll('.reg-sync-open').forEach(b=>b.onclick=()=>openPlayer(b.dataset.player));bindChecks();$('regEmpty')&&($('regEmpty').style.display='none')}
async function load(){if(busy||!$('regTable'))return;busy=true;try{rows=window.FilitaliaAdminLight?.getMode()==='real'&&window.FilitaliaAdminData?await window.FilitaliaAdminData.loadEvent(eventId()):demo()}catch(e){console.error(e);rows=demo()}render();busy=false}
function controls(){if($('regEvent')){$('regEvent').innerHTML=events.map(e=>`<option value="${e[0]}">${e[2]}</option>`).join('');$('regEvent').value=eventId();$('regEvent').addEventListener('change',()=>{if($('lightEventSelect')){$('lightEventSelect').value=$('regEvent').value;$('lightEventSelect').dispatchEvent(new Event('change',{bubbles:true}))}setTimeout(load,50)})}if($('lightEventSelect'))$('lightEventSelect').addEventListener('change',()=>{$('regEvent')&&($('regEvent').value=eventId());setTimeout(load,50)});if($('regAdd'))$('regAdd').onclick=async()=>{await window.FilitaliaAdminLight.openEventDay();setTimeout(()=>$('eventDayAdd')?.click(),200)};if($('regExport'))$('regExport').onclick=()=>exportCsv()}
let tries=0;const timer=setInterval(()=>{tries++;if($('regTable')&&$('lightEventSelect')&&window.FilitaliaAdminLight){clearInterval(timer);controls();load();d.addEventListener('click',e=>{if(e.target.closest?.('#eventDayLight,#registrationLightModal,#paymentLightModal'))setTimeout(load,350)});d.addEventListener('change',e=>{if(e.target.closest?.('#eventDayLight,#registrationLightModal,#paymentLightModal'))setTimeout(load,350)});setInterval(()=>{const s=$('registrations');if(s&&!s.classList.contains('hidden'))load()},4000)}else if(tries>50)clearInterval(timer)},200);
window.FilitaliaRegistrationSync=Object.freeze({refresh:load});
})();