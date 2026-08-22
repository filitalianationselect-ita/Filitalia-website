(function(){
'use strict';
const STORAGE_KEY='filitalia_content_layout_v1';
const cfg=window.FILITALIA_CONFIG||{};
let records=[];
let refreshTimer=0;

function ensureTheme(){if(document.querySelector('link[data-filitalia-public-pages]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='public-pages-v1.css?v=1';link.dataset.filitaliaPublicPages='true';document.head.appendChild(link)}
function readLocal(){try{const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');return Array.isArray(value)?value:[]}catch(_){return[]}}
function slug(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function source(type){try{
 if(type==='player'&&typeof playersData!=='undefined'&&Array.isArray(playersData))return playersData;
 if(type==='staff'&&typeof staffData!=='undefined'&&Array.isArray(staffData))return staffData;
 if(type==='news'&&typeof newsData!=='undefined'&&Array.isArray(newsData))return newsData;
 if(type==='event'&&typeof eventsData!=='undefined'&&Array.isArray(eventsData))return eventsData;
}catch(_){}return[]}
function itemId(type,item,index){const direct=item&&String(item.id||item.slug||'').trim();if(direct)return direct;const title=type==='staff'||type==='player'?item&&item.name:item&&item.title;const text=title&&typeof title==='object'?(title.it||title.en||title.ph||''):title;return slug(text)||type+'-'+index}
function numeric(value,fallback){const n=Number(value);return Number.isFinite(n)?n:fallback}
function text(value){if(value&&typeof value==='object')return value.it||value.en||value.ph||'';return String(value||'')}
function dateValue(item){const raw=String(item&& (item.sortDate||item.startDate||item.eventDate||item.dateISO||item.date?.it||item.date)||'');const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);if(match)return new Date(Number(match[1]),Number(match[2])-1,Number(match[3])).getTime();const parsed=Date.parse(raw);return Number.isNaN(parsed)?Number.MAX_SAFE_INTEGER:parsed}
function key(type,id){return type+':'+id}
function applyLayout(list){records=Array.isArray(list)?list:[];const map=new Map(records.map(row=>[key(String(row.content_type||row.contentType||''),String(row.item_id||row.itemId||'')),row]));
 ['player','staff','news','event'].forEach(function(type){const items=source(type);if(!items.length)return;items.forEach(function(item,index){const id=itemId(type,item,index);const row=map.get(key(type,id));item.__filitaliaId=id;item.displayOrder=numeric(row&&(row.display_order??row.displayOrder),numeric(item.displayOrder,1000+index));item.featured=Boolean(row?row.featured:item.featured);item.homeSection=String(row&&(row.home_section??row.homeSection)||item.homeSection||'default')});
  items.sort(function(a,b){if(type==='event')return dateValue(a)-dateValue(b)||text(a.title).localeCompare(text(b.title),'it');if(type==='news'){if(Boolean(a.featured)!==Boolean(b.featured))return a.featured?-1:1;const order=numeric(a.displayOrder,1000)-numeric(b.displayOrder,1000);if(order)return order;return String(b.sortDate||b.publishDate||'').localeCompare(String(a.sortDate||a.publishDate||''))}if(type==='staff'){const group=function(item){return item.homeSection==='leadership'?0:item.homeSection==='team'?1:2};const section=group(a)-group(b);if(section)return section}if(type==='player'&&Boolean(a.featured)!==Boolean(b.featured))return a.featured?-1:1;return numeric(a.displayOrder,1000)-numeric(b.displayOrder,1000)||text(a.name||a.title).localeCompare(text(b.name||b.title),'it')})
 });rerender()}
function rerender(){window.clearTimeout(refreshTimer);refreshTimer=window.setTimeout(function(){['renderHomePlayers','renderPlayersPage','renderHomeStaff','renderStaffPage','renderNews','renderEvents'].forEach(function(name){try{if(typeof window[name]==='function')window[name]()}catch(error){console.warn('FIL-ITALIA layout render',name,error)}});window.dispatchEvent(new CustomEvent('filitalia:content-order-updated',{detail:{records:records.slice()}}))},20)}
async function loadRemote(){if(!cfg.supabaseUrl||!cfg.supabasePublishableKey||!window.FilitaliaSupabase)return null;const client=window.FilitaliaSupabase.getPublicClient();if(!client)return null;const result=await client.from('admin_content_layout').select('content_type,item_id,display_order,featured,home_section').order('content_type').order('display_order');if(result.error)throw result.error;return result.data||[]}
function refresh(){ensureTheme();const local=readLocal();if(local.length)applyLayout(local);else applyLayout(records);loadRemote().then(function(remote){if(remote&&remote.length)applyLayout(remote)}).catch(function(error){console.info('Ordine contenuti remoto non ancora disponibile',error&&error.message?error.message:error)})}
window.addEventListener('filitalia:public-content-updated',function(){window.setTimeout(function(){applyLayout(records.length?records:readLocal())},30)});window.addEventListener('filitalia:layout-updated',function(event){applyLayout(event&&event.detail&&event.detail.records||readLocal())});window.addEventListener('storage',function(event){if(!event.key||event.key===STORAGE_KEY)applyLayout(readLocal())});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();window.setTimeout(refresh,500);
})();
