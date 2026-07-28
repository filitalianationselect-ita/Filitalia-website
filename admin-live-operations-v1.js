(function(){
'use strict';
const d=document,$=id=>d.getElementById(id),KEY='filitalia_admin_light_eventday_v2',catalog=window.FilitaliaEventCatalog;
let refreshing=false;
function readDemo(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(_){return {}}}
function events(){return catalog?.events?.()||[]}
function currentEventId(){return $('cEvent')?.value||window.FilitaliaAdminLight?.getCurrentEvent?.()?.id||events()[0]?.id||''}
async function rowsFor(id){
 if(!id)return [];
 try{
  if(window.FilitaliaAdminLight?.getMode?.()==='real'&&window.FilitaliaAdminData)return await window.FilitaliaAdminData.loadEvent(id);
 }catch(e){console.warn(e)}
 const store=readDemo();return Array.isArray(store[id])?store[id]:[];
}
async function allRows(){const lists=await Promise.all(events().map(e=>rowsFor(e.id)));return lists.flat()}
const paid=p=>['paid','not_required','waived'].includes(p.payment);
function setStat(card,label,value,note){if(!card)return;const s=card.querySelector('span'),v=card.querySelector('strong'),sm=card.querySelector('small');if(s)s.textContent=label;if(v)v.textContent=value;if(sm)sm.textContent=note}
async function updateDashboard(){
 const sec=$('dashboard');if(!sec)return;
 const cards=[...sec.querySelectorAll('.grid4 .stat')].slice(0,4);if(cards.length<4)return;
 const evs=events(),rows=await allRows(),pending=rows.filter(p=>!paid(p)).length,missing=rows.filter(p=>!p.certificate).length;
 setStat(cards[0],'EVENTI',evs.length,evs.filter(e=>e.status==='published').length+' pubblicati');
 setStat(cards[1],'REGISTRAZIONI',rows.length,'su tutti gli eventi');
 setStat(cards[2],'PAGAMENTI DA COMPLETARE',pending,pending?'richiedono attenzione':'tutto regolare');
 setStat(cards[3],'DOCUMENTI MANCANTI',missing,missing?'certificati da raccogliere':'documenti completi');
}
function eventOptions(){
 const select=$('cEvent');if(!select)return;
 const chosen=select.value||window.FilitaliaAdminLight?.getCurrentEvent?.()?.id||events()[0]?.id;
 select.innerHTML=events().map(e=>`<option value="${String(e.id).replace(/"/g,'&quot;')}">${e.name||e.label||e.city}</option>`).join('');
 if(events().some(e=>e.id===chosen))select.value=chosen;
}
function groupOptions(event){
 const select=$('cGroup');if(!select)return;
 const chosen=select.value;
 const base=[['all','Tutti i partecipanti'],['parents','Solo genitori'],['players','Solo giocatori'],['pending_payments','Pagamenti mancanti'],['missing_documents','Documenti mancanti'],['present','Presenti'],['staff','Solo staff'],['coordinators','City Coordinator']];
 const cats=(event?.categories||[]).map(c=>['category:'+encodeURIComponent(c),'Categoria: '+c]);
 select.innerHTML=base.concat(cats).map(x=>`<option value="${x[0]}">${x[1]}</option>`).join('');
 if([...select.options].some(o=>o.value===chosen))select.value=chosen;
}
function filterRows(rows,group){
 if(group?.startsWith('category:')){const cat=decodeURIComponent(group.slice(9));return rows.filter(p=>p.cat===cat)}
 if(group==='parents')return rows.filter(p=>p.parent);
 if(group==='players')return rows.filter(p=>p.email);
 if(group==='pending_payments')return rows.filter(p=>!paid(p));
 if(group==='missing_documents')return rows.filter(p=>!p.certificate);
 if(group==='present')return rows.filter(p=>p.present);
 if(group==='staff'||group==='coordinators')return [];
 return rows;
}
async function updateCommunications(){
 const sec=$('communications');if(!sec||!$('cEvent')||!$('cGroup'))return;
 eventOptions();
 const ev=catalog?.get?.(currentEventId())||events()[0];groupOptions(ev);
 const rows=await rowsFor(ev?.id),selected=filterRows(rows,$('cGroup').value),cards=[...sec.querySelectorAll('.grid4 .stat')].slice(0,4);
 setStat(cards[0],'DESTINATARI DISPONIBILI',rows.filter(p=>p.email).length,ev?.name||'Evento selezionato');
 setStat(cards[1],'PAGAMENTI MANCANTI',rows.filter(p=>!paid(p)).length,'partecipanti da sollecitare');
 setStat(cards[2],'DOCUMENTI MANCANTI',rows.filter(p=>!p.certificate).length,'certificati da richiedere');
 setStat(cards[3],'CATEGORIE',ev?.categories?.length||0,(ev?.categories||[]).join(' · ')||'Nessuna categoria');
 if($('cCount'))$('cCount').textContent=selected.length+' destinatari selezionati';
 if($('cCountSub'))$('cCountSub').textContent=(ev?.name||'Evento')+' · '+($('cGroup').selectedOptions[0]?.textContent||'Tutti');
 if($('pCount'))$('pCount').textContent=selected.length;
}
async function refresh(){if(refreshing)return;refreshing=true;try{await updateDashboard();await updateCommunications()}finally{refreshing=false}}
function bind(){
 if($('cEvent')&&!$('cEvent').dataset.live){$('cEvent').dataset.live='1';$('cEvent').addEventListener('change',async()=>{await window.FilitaliaAdminLight?.setEvent?.($('cEvent').value);await refresh()})}
 if($('cGroup')&&!$('cGroup').dataset.live){$('cGroup').dataset.live='1';$('cGroup').addEventListener('change',refresh)}
}
let tries=0;const timer=setInterval(()=>{tries++;if(catalog&&window.FilitaliaAdminLight){bind();refresh();if(tries>20)clearInterval(timer)}if(tries>80)clearInterval(timer)},250);
window.addEventListener('filitalia:events-updated',()=>{bind();refresh()});
window.addEventListener('storage',refresh);
d.addEventListener('click',e=>{if(e.target.closest?.('[data-section="dashboard"],[data-page="dashboard"],[data-section="communications"],[data-page="communications"]'))setTimeout(()=>{bind();refresh()},100)});
setInterval(()=>{bind();refresh()},5000);
window.FilitaliaLiveOperations=Object.freeze({refresh});
})();