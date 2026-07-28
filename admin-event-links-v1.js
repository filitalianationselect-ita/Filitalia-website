(function(){
'use strict';
const KEY='filitalia_admin_event_links_v1';
let cache=null;
const clean=(v,n=220)=>String(v==null?'':v).trim().slice(0,n);
const clone=v=>JSON.parse(JSON.stringify(v));
function read(){if(cache)return cache;try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');cache=Array.isArray(value)?value:[]}catch(_){cache=[]}return cache}
function write(rows){cache=clone(rows);localStorage.setItem(KEY,JSON.stringify(cache));window.dispatchEvent(new CustomEvent('filitalia:event-links-updated',{detail:{links:cache}}));return cache}
async function real(){try{if(!window.FilitaliaAuth?.client)return false;const profile=await window.FilitaliaAuth.getOwnProfile();return Boolean(profile&&['admin','super_admin'].includes(profile.role)&&profile.status==='active')}catch(_){return false}}
function norm(row){return{id:clean(row.id,80),eventId:clean(row.eventId||row.event_id),entityType:clean(row.entityType||row.entity_type,30),entityId:clean(row.entityId||row.entity_id),role:clean(row.role||row.link_role,100),metadata:row.metadata&&typeof row.metadata==='object'?row.metadata:{}}}
async function sync(){if(!(await real()))return read();const result=await window.FilitaliaAuth.client.from('admin_event_links').select('id,event_id,entity_type,entity_id,link_role,metadata');if(result.error){console.warn(result.error);return read()}return write((result.data||[]).map(norm))}
async function list(filters={}){const rows=await sync();return rows.filter(row=>(!filters.eventId||String(row.eventId)===String(filters.eventId))&&(!filters.entityType||row.entityType===filters.entityType)&&(!filters.entityId||String(row.entityId)===String(filters.entityId)))}
async function setEntityLinks(entityType,entityId,eventIds,role){entityType=clean(entityType,30);entityId=clean(entityId);const ids=[...new Set((Array.isArray(eventIds)?eventIds:[]).map(x=>clean(x)).filter(Boolean))];if(!entityType||!entityId)throw new Error('Collegamento non valido');let rows=read().filter(row=>!(row.entityType===entityType&&String(row.entityId)===String(entityId)));ids.forEach(eventId=>rows.push(norm({id:'local-'+Date.now()+'-'+Math.random().toString(36).slice(2),eventId,entityType,entityId,role:role||'',metadata:{}})));write(rows);if(await real()){const client=window.FilitaliaAuth.client;const removed=await client.from('admin_event_links').delete().eq('entity_type',entityType).eq('entity_id',entityId);if(removed.error)throw removed.error;if(ids.length){const inserted=await client.from('admin_event_links').insert(ids.map(eventId=>({event_id:eventId,entity_type:entityType,entity_id:entityId,link_role:clean(role,100)||null})));if(inserted.error)throw inserted.error}await sync()}return ids}
async function removeEntity(entityType,entityId){return setEntityLinks(entityType,entityId,[],'')}
async function eventEntityIds(eventId,entityType){return(await list({eventId,entityType})).map(row=>String(row.entityId))}
async function entityEventIds(entityType,entityId){return(await list({entityType,entityId})).map(row=>String(row.eventId))}
window.FilitaliaEventLinks=Object.freeze({sync,list,setEntityLinks,removeEntity,eventEntityIds,entityEventIds});
})();