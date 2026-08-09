(function(){
"use strict";
const U12_FIRST_YEAR=2014;
function apply(){
 const form=document.querySelector(".site-registration-form"); if(!form)return;
 const birth=form.querySelector('input[name="Data Nascita"]');
 const shirt=form.querySelector('select[name="Taglia Maglia"]');
 if(!birth||!shirt)return;
 const year=Number(String(birth.value||"").slice(0,4));
 const isU12=year>=U12_FIRST_YEAR;
 let none=[...shirt.options].find(o=>o.value==="NO_SHIRT");
 if(isU12&&!none){none=document.createElement("option");none.value="NO_SHIRT";none.textContent="Nessuna maglia — partecipazione U12 gratuita";shirt.insertBefore(none,shirt.options[1]||null)}
 if(!isU12&&none){if(shirt.value==="NO_SHIRT")shirt.value="";none.remove()}
 shirt.required=!isU12;
 let note=document.getElementById("campShirtPricingNote");
 if(!note){note=document.createElement("small");note.id="campShirtPricingNote";shirt.insertAdjacentElement("afterend",note)}
 note.textContent=isU12?"U12: partecipazione gratuita senza maglia; maglia facoltativa €20.":"Over U12: quota attuale €50 con maglia inclusa.";
 }
 document.addEventListener("change",e=>{if(e.target&&e.target.name==="Data Nascita")apply()});
 window.addEventListener("filitalia:public-content-updated",apply);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",apply);else apply();
})();
