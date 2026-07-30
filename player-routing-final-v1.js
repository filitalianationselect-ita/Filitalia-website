(function(){
'use strict';
function source(){try{if(typeof playersData!=='undefined'&&Array.isArray(playersData))return playersData}catch(_){ }return Array.isArray(window.playersData)?window.playersData:[]}
function slug(value){return String(value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function idOf(player,index){return String(player&&player.id||player&&player.slug||slug(player&&player.name)||('player-'+index))}
function go(index){const list=source();const player=list[Number(index)||0];if(!player)return;location.href='player.html?id='+encodeURIComponent(idOf(player,Number(index)||0))}
function install(){
  window.openPlayerByIndex=go;
  const modal=document.getElementById('playerModal');if(modal){modal.style.display='none';modal.setAttribute('aria-hidden','true')}
  document.addEventListener('click',function(event){const card=event.target.closest('[data-player-index]');if(!card)return;event.preventDefault();event.stopImmediatePropagation();go(Number(card.dataset.playerIndex)||0)},true);
  document.addEventListener('keydown',function(event){if(event.key!=='Enter'&&event.key!==' ')return;const card=event.target.closest('[data-player-index]');if(!card)return;event.preventDefault();go(Number(card.dataset.playerIndex)||0)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
[100,500,1200,2600].forEach(function(delay){setTimeout(function(){window.openPlayerByIndex=go},delay)});
})();
