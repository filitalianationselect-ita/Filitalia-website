(function(){
  'use strict';

  const d=document;
  const labels={it:'Volontario',en:'Volunteer',ph:'Volunteer'};

  function language(){
    const value=String(localStorage.getItem('language')||d.documentElement.lang||'it').toLowerCase();
    return labels[value]?value:'it';
  }

  function label(){return labels[language()];}

  function replaceVolunteerText(node){
    if(!node)return;
    const value=String(node.textContent||'');
    if(!/\b(volunteer|volontario)\b/i.test(value))return;
    node.textContent=value.replace(/\b(volunteer|volontario)\b/gi,label());
  }

  function ensureRoleOption(select,row){
    if(!select)return;
    let option=select.querySelector('option[value="volunteer"]');
    if(!option){
      option=d.createElement('option');
      option.value='volunteer';
      const admin=select.querySelector('option[value="admin"]');
      select.insertBefore(option,admin||null);
    }
    option.textContent=label();
    const rowText=String(row?.textContent||'');
    if(/richiesta:\s*(volunteer|volontario)/i.test(rowText))select.value='volunteer';
  }

  function apply(){
    ['accountRole','accountRolePill','accountRoleSummary'].forEach(function(id){replaceVolunteerText(d.getElementById(id));});
    d.querySelectorAll('.managed-account-row').forEach(function(row){
      row.querySelectorAll('span').forEach(replaceVolunteerText);
      ensureRoleOption(row.querySelector('.pending-account-actions select'),row);
    });
  }

  const observer=new MutationObserver(function(){apply();});
  observer.observe(d.documentElement,{subtree:true,childList:true,characterData:true});
  d.addEventListener('click',function(event){if(event.target.closest('.language-switch button'))setTimeout(apply,0);});
  window.addEventListener('storage',apply);
  apply();
})();
