(function(){
'use strict';
const d=document;
const base=window.FilitaliaAdminData;
const auth=window.FilitaliaAuth;
if(!base||!auth||!auth.client)return;
const client=auth.client;
const n=value=>{const x=Number(String(value==null?'':value).replace(',','.'));return Number.isFinite(x)&&x>=0?x:0};
const special=new Set(['waived','not_required','refunded']);
let activePaymentId='';

function currentEventId(){return String(d.getElementById('lightEventSelect')?.value||d.getElementById('regEvent')?.value||'')}
function categoryFromYear(year){const y=Number(year);if(!y)return '';if(y>=2014)return'U12';if(y>=2012)return'U14';if(y>=2010)return'U16';if(y>=2008)return'U18';if(y===2007)return'U19';return''}
function quoteDue(eventId,row){
  if(special.has(String(row.payment||row.payment_status||'')))return 0;
  try{
    const cat=String(row.cat&&row.cat!=='—'?row.cat:categoryFromYear(row.year)||'Open');
    const shirt=String(row.shirt&&row.shirt!=='—'?row.shirt:'Nessuna');
    const q=window.FilitaliaEventCatalog?.quote?.(eventId,{category:cat,shirtSize:shirt});
    if(q&&Number.isFinite(Number(q.amount)))return n(q.amount);
  }catch(_){ }
  return n(row.amount);
}

async function getOperations(eventId,ids){
  if(!ids.length)return new Map();
  let q=client.from('event_admin_operations').select('registration_id,event_id,payment_status,payment_amount,payment_due_amount,payment_received_amount,payment_method,payment_date,payment_reference');
  if(eventId&&eventId!=='__all__')q=q.eq('event_id',eventId);
  const res=await q.in('registration_id',ids);
  if(res.error)throw res.error;
  return new Map((res.data||[]).map(row=>[String(row.registration_id),row]));
}

async function loadEvent(eventId){
  const rows=await base.loadEvent(eventId);
  const ids=(rows||[]).map(row=>String(row.id)).filter(Boolean);
  if(!ids.length)return rows||[];
  let operations;
  try{operations=await getOperations(eventId,ids)}catch(error){console.warn('Payment accounting overlay unavailable',error);return rows||[]}
  (rows||[]).forEach(row=>{
    const op=operations.get(String(row.id))||{};
    const status=String(op.payment_status||row.payment||'pending');
    let due=op.payment_due_amount==null?quoteDue(eventId,row):n(op.payment_due_amount);
    if(special.has(status))due=0;
    let received=op.payment_received_amount==null?(status==='paid'?n(op.payment_amount==null?due:op.payment_amount):0):n(op.payment_received_amount);
    if(status==='refunded'||status==='waived'||status==='not_required')received=0;
    row.payment=status;
    row.paymentDueAmount=due;
    row.paymentReceivedAmount=received;
    row.amount=due;
    row.paymentMethod=String(op.payment_method||row.paymentMethod||'');
    row.paymentDate=String(op.payment_date||row.paymentDate||'');
    row.paymentReference=String(op.payment_reference||row.paymentReference||'');
  });
  return rows||[];
}

async function registrationDue(eventId,registrationId){
  try{
    const rows=await loadEvent(eventId);
    const row=rows.find(item=>String(item.id)===String(registrationId));
    if(row)return n(row.paymentDueAmount);
  }catch(_){ }
  return 0;
}

async function saveOperation(eventId,registrationId,changes,action){
  const incoming=Object.assign({},changes||{});
  let due=incoming.payment_due_amount==null?null:n(incoming.payment_due_amount);
  let received=incoming.payment_received_amount==null?null:n(incoming.payment_received_amount);
  let status=String(incoming.payment_status||'');

  if(action==='registration_price_snapshot'&&incoming.payment_amount!=null){
    due=n(incoming.payment_amount);received=0;
  }

  if(action==='payment_details_updated'){
    if(due==null)due=await registrationDue(eventId,registrationId);
    if(received==null)received=incoming.payment_amount==null?0:n(incoming.payment_amount);
    if(!special.has(status)){
      status=received<=0?'pending':(due>0&&received<due?'partial':'paid');
      incoming.payment_status=status;
    }
    incoming.payment_amount=received;
  }

  const result=await base.saveOperation(eventId,registrationId,incoming,action);
  if(due!=null||received!=null){
    const patch={};
    if(due!=null)patch.payment_due_amount=due;
    if(received!=null)patch.payment_received_amount=received;
    if(status)patch.payment_status=status;
    const saved=await client.from('event_admin_operations').update(patch).eq('registration_id',String(registrationId));
    if(saved.error)throw saved.error;
  }
  return result;
}

window.FilitaliaAdminData=Object.freeze(Object.assign({},base,{loadEvent,saveOperation}));

function installPaymentUi(){
  const modal=d.getElementById('paymentLightModal');
  const amount=d.getElementById('lpAmount');
  const status=d.getElementById('lpStatus');
  if(!modal||!amount||!status)return false;
  if(!status.querySelector('option[value="partial"]')){
    const option=d.createElement('option');option.value='partial';option.textContent='Parziale';
    status.insertBefore(option,status.querySelector('option[value="paid"]'));
  }
  const amountLabel=amount.closest('label');
  if(amountLabel&&!d.getElementById('lpDueAmount')){
    amountLabel.childNodes[0].textContent='Incassato (€)';
    const dueLabel=d.createElement('label');
    dueLabel.innerHTML='Quota dovuta (€)<input id="lpDueAmount" inputmode="decimal" readonly>';
    amountLabel.parentElement.insertBefore(dueLabel,amountLabel);
  }
  amount.addEventListener('input',()=>{
    const due=n(d.getElementById('lpDueAmount')?.value);
    const received=n(amount.value);
    if(special.has(status.value))return;
    status.value=received<=0?'pending':(due>0&&received<due?'partial':'paid');
  });
  d.addEventListener('click',event=>{
    if(event.target&&event.target.id==='edPayment'){
      activePaymentId=String(d.querySelector('.eventday-player.active')?.dataset.edId||'');
      setTimeout(hydratePaymentUi,0);
    }
  },true);
  const observer=new MutationObserver(()=>{if(modal.classList.contains('show'))hydratePaymentUi()});
  observer.observe(modal,{attributes:true,attributeFilter:['class']});
  return true;
}

let hydrating=false;
async function hydratePaymentUi(){
  if(hydrating||!activePaymentId)return;
  hydrating=true;
  try{
    const eventId=currentEventId();
    const rows=await loadEvent(eventId);
    const row=rows.find(item=>String(item.id)===activePaymentId);
    if(!row)return;
    const due=d.getElementById('lpDueAmount');
    const amount=d.getElementById('lpAmount');
    const status=d.getElementById('lpStatus');
    if(due)due.value=n(row.paymentDueAmount).toFixed(2);
    if(amount)amount.value=n(row.paymentReceivedAmount).toFixed(2);
    if(status)status.value=row.payment||'pending';
  }catch(error){console.warn('Payment form hydrate failed',error)}finally{hydrating=false}
}

let tries=0;const timer=setInterval(()=>{tries++;if(installPaymentUi()||tries>100)clearInterval(timer)},100);
window.FilitaliaPaymentAccounting=Object.freeze({loadEvent,saveOperation,quoteDue});
})();