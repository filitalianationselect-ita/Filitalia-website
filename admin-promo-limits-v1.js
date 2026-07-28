(function(){
'use strict';
const d=document,$=id=>d.getElementById(id),original=window.FilitaliaEventCatalog;if(!original)return;
const clean=v=>String(v==null?'':v).trim();
function currentEvent(){const name=clean($('evName3')?.value);return original.events?.().find(e=>clean(e.name)===name)||null}
function maxFor(code){const event=currentEvent(),promo=event?.pricing?.promoCodes?.find(p=>clean(p.code)===clean(code));return promo?.maxUses==null?'':String(promo.maxUses)}
function enhance(){
 d.querySelectorAll('.promo-row').forEach(row=>{
  if(row.querySelector('.pc-max'))return;
  const grid=row.querySelector('.promo-grid');if(!grid)return;
  const code=row.querySelector('.pc-code');
  const label=d.createElement('label');label.className='pc-max-wrap';label.innerHTML='<span>Utilizzi massimi</span><input class="pc-max" type="number" min="1" step="1" placeholder="Illimitati">';
  grid.appendChild(label);
  label.querySelector('.pc-max').value=maxFor(code?.value||'');
  code?.addEventListener('input',()=>{const input=label.querySelector('.pc-max');if(!input.dataset.touched)input.value=maxFor(code.value)});
  label.querySelector('.pc-max').addEventListener('input',e=>e.target.dataset.touched='1');
 });
}
async function save(input){
 const data=JSON.parse(JSON.stringify(input||{}));
 const rows=[...d.querySelectorAll('.promo-row')];
 const promos=data?.pricing?.promoCodes;
 if(Array.isArray(promos))promos.forEach((promo,index)=>{
  const field=rows[index]?.querySelector('.pc-max');
  const value=clean(field?.value);
  promo.maxUses=value===''?null:Math.max(1,Math.floor(Number(value)||1));
 });
 return original.save(data);
}
window.FilitaliaEventCatalog=Object.freeze(Object.assign({},original,{save}));
const style=d.createElement('style');style.textContent='.promo-grid{grid-template-columns:1.15fr .75fr .7fr 1fr 1fr .85fr!important}@media(max-width:850px){.promo-grid{grid-template-columns:1fr!important}}';d.head.appendChild(style);
const observer=new MutationObserver(enhance);observer.observe(d.documentElement,{childList:true,subtree:true});d.addEventListener('click',()=>setTimeout(enhance,20));setInterval(enhance,900);
window.FilitaliaPromoLimits=Object.freeze({enhance});
})();